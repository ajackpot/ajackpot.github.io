import asyncio
import subprocess
import tempfile
from pathlib import Path

from playwright.async_api import async_playwright


PROJECT_ROOT = Path(__file__).resolve().parents[1]
MAIN_JS = PROJECT_ROOT / 'js' / 'main.js'
STYLE_CSS = PROJECT_ROOT / 'styles.css'
CHROMIUM_PATH = '/usr/bin/chromium'


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


def build_html(bundle_text: str) -> str:
    css_text = STYLE_CSS.read_text(encoding='utf-8')
    return (
        '<!doctype html>'
        '<html lang="ko">'
        '<head><meta charset="utf-8"><style>'
        f'{css_text}'
        '</style></head>'
        '<body>'
        '<div id="app"></div>'
        f'<script type="module">{bundle_text}</script>'
        '</body>'
        '</html>'
    )


async def main() -> None:
    bundle_text = build_bundle()
    html = build_html(bundle_text)
    errors: list[str] = []

    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(
            headless=True,
            executable_path=CHROMIUM_PATH,
            args=['--no-sandbox'],
        )
        page = await browser.new_page(viewport={'width': 1440, 'height': 1280})
        page.on('pageerror', lambda error: errors.append(f'pageerror: {error}'))
        page.on('console', lambda msg: errors.append(f'console:{msg.type}:{msg.text}') if msg.type == 'error' else None)

        await page.set_content(html, wait_until='domcontentloaded')
        await page.wait_for_timeout(300)

        assert await page.locator('table.board-table').count() == 1
        assert await page.locator('button[data-board-index]').count() == 64

        assert await page.evaluate("document.querySelector('#settings-collapsible-panel').hidden") is True
        assert await page.evaluate("document.querySelector('#engine-metrics-collapsible-panel').hidden") is True
        assert await page.locator('#new-game-button').is_visible() is True
        assert await page.locator('#undo-button').is_visible() is True
        assert await page.locator('#read-status-button').is_visible() is True

        await page.locator('#settings-toggle-button').click()
        await page.wait_for_timeout(50)
        assert await page.evaluate("document.querySelector('#settings-collapsible-panel').hidden") is False
        preset_values = await page.eval_on_selector_all('#preset-select option', 'options => options.map((option) => option.value)')
        assert preset_values == ['beginner', 'easy', 'normal', 'hard', 'expert', 'impossible', 'custom']

        assert await page.input_value('#style-select') == 'balanced'
        assert await page.evaluate("document.querySelector('#style-select').disabled") is False
        await page.select_option('#style-select', 'chaotic')
        await page.wait_for_timeout(50)
        summary_text = (await page.locator('#engine-summary-output').text_content()) or ''
        assert '변칙형' in summary_text

        await page.select_option('#preset-select', 'custom')
        await page.wait_for_timeout(50)
        assert await page.evaluate("document.querySelector('#custom-maxDepth').disabled") is False
        assert await page.evaluate("document.querySelector('#style-select').disabled") is True
        style_note = (await page.locator('#style-state-note').text_content()) or ''
        assert '비활성화' in style_note
        summary_text = (await page.locator('#engine-summary-output').text_content()) or ''
        assert '미적용' in summary_text

        await page.fill('#custom-maxDepth', '9')
        await page.select_option('#preset-select', 'easy')
        await page.wait_for_timeout(50)
        assert await page.evaluate("document.querySelector('#custom-maxDepth').disabled") is True
        assert await page.evaluate("document.querySelector('#style-select').disabled") is False
        await page.select_option('#preset-select', 'custom')
        await page.wait_for_timeout(50)
        assert await page.input_value('#custom-maxDepth') == '9'

        await page.locator('#engine-metrics-toggle-button').click()
        await page.wait_for_timeout(50)
        assert await page.evaluate("document.querySelector('#engine-metrics-collapsible-panel').hidden") is False
        engine_metrics_text = (await page.locator('#engine-metrics-collapsible-panel').text_content()) or ''
        assert '최대 탐색 깊이' in engine_metrics_text

        assert await page.locator('button[data-board-index="35"]').get_attribute('aria-label') == '검은 돌 D5'
        assert await page.locator('button[data-board-index="26"]').get_attribute('aria-label') == '둘 수 있는 빈칸 C4'
        assert await page.locator('button[data-board-index="0"]').get_attribute('aria-label') == '빈칸 A1'

        await page.locator('button[data-board-index="26"]').focus()
        await page.keyboard.press('ArrowRight')
        assert await page.evaluate("document.activeElement?.getAttribute('data-board-index')") == '27'

        await page.locator('button[data-board-index="26"]').click()
        await page.wait_for_timeout(30)
        live_text = (await page.locator('#live-region').text_content()) or ''
        assert '흑 C4 착수.' in live_text
        await page.wait_for_function("document.querySelectorAll('.move-log-list li').length >= 2", timeout=10000)
        assert await page.locator('.move-log-list li').count() == 2
        assert await page.evaluate("document.activeElement?.getAttribute('data-board-index')") == '26'
        assert await page.evaluate("document.querySelector('#engine-metrics-collapsible-panel').hidden") is False

        await page.locator('#undo-button').click()
        await page.wait_for_timeout(100)
        assert await page.locator('.move-log-list li').count() == 0
        status_text = await page.locator('#status-container').text_content()
        assert '현재 차례: 흑' in status_text

        await page.locator('input[name="humanColor"][value="white"]').check()
        await page.locator('#new-game-button').click()
        await page.wait_for_function("document.querySelectorAll('.move-log-list li').length >= 1", timeout=10000)
        await page.wait_for_timeout(120)
        assert await page.locator('.move-log-list li').count() == 1
        live_text = (await page.locator('#live-region').text_content()) or ''
        assert '흑' in live_text and '착수' in live_text

        await browser.close()

    if errors:
        raise AssertionError('\n'.join(errors))

    print('ui-smoke: all assertions passed')


if __name__ == '__main__':
    asyncio.run(main())
