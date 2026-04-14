import asyncio
import json
import subprocess
import tempfile
from pathlib import Path

from playwright.async_api import async_playwright


PROJECT_ROOT = Path(__file__).resolve().parents[1]
MAIN_JS = PROJECT_ROOT / 'js' / 'main.js'
STYLE_CSS = PROJECT_ROOT / 'styles.css'
CHROMIUM_PATH = '/usr/bin/chromium'


COOKIE_POLYFILL_SCRIPT = r"""
(() => {
  let cookieStore = %INITIAL_COOKIE%;

  function parseCookieMap(cookieText) {
    const cookieMap = new Map();
    const text = String(cookieText ?? '').trim();
    if (!text) {
      return cookieMap;
    }
    for (const segment of text.split(';')) {
      const trimmedSegment = segment.trim();
      if (!trimmedSegment) {
        continue;
      }
      const separatorIndex = trimmedSegment.indexOf('=');
      if (separatorIndex <= 0) {
        continue;
      }
      const key = trimmedSegment.slice(0, separatorIndex).trim();
      const value = trimmedSegment.slice(separatorIndex + 1).trim();
      if (!key) {
        continue;
      }
      cookieMap.set(key, value);
    }
    return cookieMap;
  }

  function serializeCookieMap(cookieMap) {
    return Array.from(cookieMap.entries())
      .map(([key, value]) => `${key}=${value}`)
      .join('; ');
  }

  Object.defineProperty(Document.prototype, 'cookie', {
    configurable: true,
    get() {
      return cookieStore;
    },
    set(value) {
      const segments = String(value ?? '').split(';').map((segment) => segment.trim()).filter(Boolean);
      if (segments.length === 0) {
        return true;
      }

      const [pair, ...attributes] = segments;
      const separatorIndex = pair.indexOf('=');
      if (separatorIndex <= 0) {
        return true;
      }

      const key = pair.slice(0, separatorIndex);
      const nextValue = pair.slice(separatorIndex + 1);
      const cookieMap = parseCookieMap(cookieStore);
      const maxAgeAttribute = attributes.find((attribute) => attribute.toLowerCase().startsWith('max-age='));
      const maxAgeValue = maxAgeAttribute ? Number(maxAgeAttribute.slice('max-age='.length)) : null;

      if (Number.isFinite(maxAgeValue) && maxAgeValue <= 0) {
        cookieMap.delete(key);
      } else {
        cookieMap.set(key, nextValue);
      }

      cookieStore = serializeCookieMap(cookieMap);
      return true;
    },
  });
})();
"""


def build_bundle() -> str:
    with tempfile.NamedTemporaryFile(suffix='.js', delete=False) as bundle_file:
        bundle_path = Path(bundle_file.name)

    subprocess.run(
        [
            'npx',
            '--yes',
            'esbuild',
            str(MAIN_JS),
            '--bundle',
            '--format=esm',
            '--platform=browser',
            f'--outfile={bundle_path}',
        ],
        check=True,
        cwd=PROJECT_ROOT,
        capture_output=True,
        text=True,
    )
    return bundle_path.read_text(encoding='utf-8')


def build_html(bundle_text: str, initial_cookie: str = '') -> str:
    css_text = STYLE_CSS.read_text(encoding='utf-8')
    cookie_script = COOKIE_POLYFILL_SCRIPT.replace('%INITIAL_COOKIE%', json.dumps(initial_cookie))
    return (
        '<!doctype html>'
        '<html lang="ko">'
        '<head><meta charset="utf-8"><style>'
        f'{css_text}'
        '</style></head>'
        '<body>'
        '<div id="app"></div>'
        f'<script>{cookie_script}</script>'
        f'<script type="module">{bundle_text}</script>'
        '</body>'
        '</html>'
    )


async def load_page(browser, bundle_text: str, initial_cookie: str, errors: list[str]):
    page = await browser.new_page(viewport={'width': 1440, 'height': 1280})
    page.on('pageerror', lambda error: errors.append(f'pageerror: {error}'))
    page.on('console', lambda msg: errors.append(f'console:{msg.type}:{msg.text}') if msg.type == 'error' else None)
    await page.set_content(build_html(bundle_text, initial_cookie), wait_until='domcontentloaded')
    await page.wait_for_timeout(400)
    await page.locator('#settings-toggle-button').click()
    await page.wait_for_timeout(80)
    return page


async def main() -> None:
    bundle_text = build_bundle()
    errors: list[str] = []

    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(
            headless=True,
            executable_path=CHROMIUM_PATH,
            args=['--no-sandbox'],
        )

        page = await load_page(browser, bundle_text, '', errors)
        assert await page.locator('#save-settings-cookie-button').is_visible() is True
        assert await page.locator('#reset-settings-cookie-button').is_visible() is True

        await page.select_option('#style-select', 'custom')
        await page.wait_for_timeout(80)
        await page.locator('#style-detail-button').click()
        await page.wait_for_timeout(80)
        await page.fill('#style-detail-mobilityScale', '1.6')
        await page.fill('#style-detail-riskPenaltyScale', '0.8')
        await page.locator('#style-detail-save-button').click()
        await page.wait_for_timeout(80)

        await page.select_option('#preset-select', 'custom')
        await page.wait_for_timeout(80)
        await page.locator('#difficulty-detail-button').click()
        await page.wait_for_timeout(80)
        await page.fill('#difficulty-detail-maxDepth', '9')
        await page.select_option('#difficulty-detail-wldPreExactEmpties', '2')
        await page.locator('#difficulty-detail-save-button').click()
        await page.wait_for_timeout(80)

        await page.select_option('#search-algorithm-select', 'mcts-guided')
        await page.wait_for_timeout(80)
        await page.locator('input[name="themeMode"][value="dark"]').check()
        await page.wait_for_timeout(80)
        await page.locator('input[name="showLegalHints"]').uncheck()
        await page.wait_for_timeout(80)

        await page.locator('#save-settings-cookie-button').click()
        await page.wait_for_timeout(120)
        live_text = (await page.locator('#live-region').text_content()) or ''
        assert '현재 설정을 쿠키에 저장했습니다.' in live_text
        saved_cookie = await page.evaluate('document.cookie')
        assert 'accessible_othello_ai_settings_v1=' in saved_cookie
        await page.close()

        persisted_page = await load_page(browser, bundle_text, saved_cookie, errors)
        assert await persisted_page.evaluate("document.documentElement.dataset.theme") == 'dark'
        assert await persisted_page.input_value('#preset-select') == 'custom'
        assert await persisted_page.input_value('#style-select') == 'custom'
        assert await persisted_page.input_value('#search-algorithm-select') == 'mcts-guided'
        assert await persisted_page.is_checked('input[name="showLegalHints"]') is False
        assert await persisted_page.is_checked('input[name="enableBoardShortcuts"]') is True
        await persisted_page.locator('#difficulty-detail-button').click()
        await persisted_page.wait_for_timeout(80)
        assert await persisted_page.input_value('#difficulty-detail-maxDepth') == '9'
        assert await persisted_page.input_value('#difficulty-detail-wldPreExactEmpties') == '2'
        await persisted_page.locator('#difficulty-detail-cancel-button').click()
        await persisted_page.wait_for_timeout(80)
        await persisted_page.locator('#style-detail-button').click()
        await persisted_page.wait_for_timeout(80)
        assert await persisted_page.input_value('#style-detail-mobilityScale') == '1.6'
        assert await persisted_page.input_value('#style-detail-riskPenaltyScale') == '0.8'
        await persisted_page.locator('#style-detail-cancel-button').click()
        await persisted_page.wait_for_timeout(80)

        await persisted_page.locator('#reset-settings-cookie-button').click()
        await persisted_page.wait_for_timeout(120)
        live_text = (await persisted_page.locator('#live-region').text_content()) or ''
        assert '설정 쿠키를 초기화했습니다.' in live_text
        cleared_cookie = await persisted_page.evaluate('document.cookie')
        assert 'accessible_othello_ai_settings_v1=' not in cleared_cookie
        await persisted_page.close()

        reset_page = await load_page(browser, bundle_text, cleared_cookie, errors)
        assert await reset_page.evaluate("document.documentElement.hasAttribute('data-theme')") is False
        assert await reset_page.input_value('#preset-select') == 'normal'
        assert await reset_page.input_value('#style-select') == 'balanced'
        assert await reset_page.input_value('#search-algorithm-select') == 'classic'
        assert await reset_page.is_checked('input[name="showLegalHints"]') is True
        assert await reset_page.is_checked('input[name="enableBoardShortcuts"]') is True
        await reset_page.close()

        await browser.close()

    if errors:
        raise AssertionError('\n'.join(errors))


if __name__ == '__main__':
    asyncio.run(main())
