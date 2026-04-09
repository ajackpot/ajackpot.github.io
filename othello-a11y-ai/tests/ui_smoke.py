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
        await page.evaluate(
            """
            Object.defineProperty(globalThis, '__copiedText', { value: '', writable: true, configurable: true });
            Object.defineProperty(navigator, 'clipboard', {
              configurable: true,
              value: {
                writeText(text) {
                  globalThis.__copiedText = String(text);
                  return Promise.resolve();
                },
              },
            });
            """
        )
        await page.wait_for_timeout(300)

        assert await page.locator('table.board-table').count() == 1
        assert await page.locator('button[data-board-index]').count() == 64
        assert await page.evaluate("document.querySelector('#settings-collapsible-content').hidden") is True
        assert await page.locator('#new-game-button').is_visible() is True
        assert await page.locator('#xot-game-button').is_visible() is True
        assert await page.evaluate("document.querySelector('#engine-metrics-content').hidden") is True

        await page.locator('#engine-metrics-toggle-button').click()
        await page.wait_for_timeout(50)
        assert await page.evaluate("document.querySelector('#engine-metrics-content').hidden") is False

        await page.locator('#settings-toggle-button').click()
        await page.wait_for_timeout(50)
        assert await page.evaluate("document.querySelector('#settings-collapsible-content').hidden") is False
        assert await page.locator('section[aria-labelledby="engine-settings-title"]').count() == 1
        assert await page.locator('section[aria-labelledby="accessibility-settings-title"]').count() == 1
        assert await page.locator('section[aria-labelledby="accessibility-settings-title"] input[name="enableBoardShortcuts"]').count() == 1
        assert await page.locator('section[aria-labelledby="engine-settings-title"] input[name="enableBoardShortcuts"]').count() == 0
        assert await page.is_checked('input[name="enableBoardShortcuts"]') is True
        assert await page.is_checked('input[name="themeMode"][value="system"]') is True
        await page.locator('input[name="themeMode"][value="dark"]').check()
        await page.wait_for_timeout(50)
        assert await page.evaluate("document.documentElement.dataset.theme") == 'dark'
        await page.locator('input[name="themeMode"][value="high-contrast"]').check()
        await page.wait_for_timeout(50)
        assert await page.evaluate("document.documentElement.dataset.theme") == 'high-contrast'
        assert await page.is_checked('input[name="themeMode"][value="dark"]') is False
        await page.locator('input[name="themeMode"][value="system"]').check()
        await page.wait_for_timeout(50)
        assert await page.evaluate("document.documentElement.hasAttribute('data-theme')") is False
        assert await page.locator('#copy-move-sequence-button').is_disabled() is True

        await page.locator('button[data-board-index="0"]').focus()
        await page.keyboard.press('m')
        assert await page.evaluate("document.activeElement?.getAttribute('data-board-index')") == '19'
        await page.keyboard.press('Shift+M')
        assert await page.evaluate("document.activeElement?.getAttribute('data-board-index')") == '44'
        await page.keyboard.press('s')
        live_text = (await page.locator('#live-region').text_content()) or ''
        assert '현재 돌 개수 흑 2, 백 2.' in live_text
        await page.keyboard.press('l')
        live_text = (await page.locator('#live-region').text_content()) or ''
        assert '아직 착수가 없습니다.' in live_text

        await page.locator('input[name="enableBoardShortcuts"]').uncheck()
        await page.wait_for_timeout(50)
        await page.locator('button[data-board-index="0"]').focus()
        await page.keyboard.press('m')
        assert await page.evaluate("document.activeElement?.getAttribute('data-board-index')") == '0'
        await page.keyboard.press('i')
        await page.wait_for_timeout(50)
        assert await page.evaluate("Boolean(document.querySelector('#manual-move-dialog')?.open)") is False
        await page.locator('input[name="enableBoardShortcuts"]').check()
        await page.wait_for_timeout(50)

        preset_values = await page.evaluate("Array.from(document.querySelectorAll('#preset-select option')).map((option) => option.value)")
        assert preset_values == ['beginner', 'easy', 'normal', 'hard', 'expert', 'impossible', 'custom']

        await page.select_option('#preset-select', 'easy')
        await page.wait_for_timeout(50)
        summary_text = (await page.locator('#engine-summary-output').text_content()) or ''
        assert '쉬움' in summary_text and '깊이 3' in summary_text and '6칸 이하' in summary_text

        await page.select_option('#preset-select', 'impossible')
        await page.wait_for_timeout(50)
        summary_text = (await page.locator('#engine-summary-output').text_content()) or ''
        assert '불가능' in summary_text and '깊이 10' in summary_text and '16칸 이하' in summary_text
        status_text = (await page.locator('#status-container').text_content()) or ''
        assert '10초 이상 생각할 수 있지만' in status_text
        assert '가장 강한 퍼포먼스를 목표로 합니다' in status_text

        assert await page.evaluate("document.querySelector('#custom-maxDepth').disabled") is True
        assert await page.input_value('#style-select') == 'balanced'
        await page.select_option('#style-select', 'chaotic')
        await page.wait_for_timeout(50)
        summary_text = (await page.locator('#engine-summary-output').text_content()) or ''
        assert '변칙형' in summary_text
        await page.select_option('#preset-select', 'custom')
        await page.wait_for_timeout(50)
        assert await page.evaluate("document.querySelector('#custom-maxDepth').disabled") is False
        assert await page.evaluate("document.querySelector('#custom-wldPreExactEmpties').disabled") is False
        assert await page.input_value('#custom-wldPreExactEmpties') == '0'
        assert await page.evaluate("document.querySelector('#style-select').disabled") is True
        assert await page.input_value('#style-select') == 'chaotic'
        summary_text = (await page.locator('#engine-summary-output').text_content()) or ''
        assert '스타일 적용 안 함' in summary_text and '사전 WLD 끔' in summary_text
        await page.select_option('#custom-wldPreExactEmpties', '2')
        await page.wait_for_timeout(50)
        summary_text = (await page.locator('#engine-summary-output').text_content()) or ''
        assert '사전 WLD +2' in summary_text
        metrics_text = (await page.locator('#status-container').text_content()) or ''
        assert '사전 승무패 탐색 범위' in metrics_text and '+2 사용' in metrics_text
        await page.select_option('#preset-select', 'beginner')
        await page.wait_for_timeout(50)
        assert await page.evaluate("document.querySelector('#style-select').disabled") is False
        assert await page.input_value('#style-select') == 'chaotic'

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

        await page.locator('#undo-button').click()
        await page.wait_for_timeout(100)
        assert await page.locator('.move-log-list li').count() == 0
        status_text = await page.locator('#status-container').text_content()
        assert '현재 차례: 흑' in status_text

        await page.locator('button[data-board-index="0"]').focus()
        await page.keyboard.press('i')
        await page.wait_for_timeout(50)
        assert await page.evaluate("Boolean(document.querySelector('#manual-move-dialog')?.open)") is True
        await page.fill('#manual-move-input', 'z9')
        await page.locator('#manual-move-confirm-button').click()
        await page.wait_for_timeout(50)
        live_text = (await page.locator('#live-region').text_content()) or ''
        assert '좌표 형식이 올바르지 않습니다' in live_text
        assert await page.locator('#manual-move-input').get_attribute('aria-invalid') == 'true'
        await page.fill('#manual-move-input', 'c4')
        await page.locator('#manual-move-confirm-button').click()
        await page.wait_for_timeout(30)
        await page.wait_for_function("document.querySelectorAll('.move-log-list li').length >= 2", timeout=10000)
        assert await page.locator('.move-log-list li').count() == 2
        assert await page.evaluate("document.activeElement?.getAttribute('data-board-index')") == '26'

        await page.locator('#undo-button').click()
        await page.wait_for_timeout(100)
        assert await page.locator('.move-log-list li').count() == 0

        await page.fill('#position-sequence-input', 'c4c3')
        await page.locator('#start-from-sequence-button').click()
        await page.wait_for_timeout(80)
        assert await page.locator('.move-log-list li').count() == 2
        status_text = await page.locator('#status-container').text_content()
        assert '현재 차례: 흑' in status_text
        assert await page.locator('button[data-board-index="18"]').get_attribute('aria-label') == '흰 돌 C3'
        live_text = (await page.locator('#live-region').text_content()) or ''
        assert '2수 위치' in live_text
        assert await page.locator('#copy-move-sequence-button').is_disabled() is False

        await page.locator('#copy-move-sequence-button').click()
        await page.wait_for_timeout(50)
        assert await page.evaluate('globalThis.__copiedText') == 'c4c3'
        live_text = (await page.locator('#live-region').text_content()) or ''
        assert '좌표 기보를 클립보드에 복사했습니다' in live_text

        await page.evaluate('Math.random = () => 0')
        await page.locator('#xot-game-button').click()
        await page.wait_for_timeout(80)
        assert await page.locator('.move-log-list li').count() == 8
        status_text = (await page.locator('#status-container').text_content()) or ''
        assert '시작 방식:' in status_text and 'XOT 1/3623' in status_text
        assert 'F5 D6 C4 D3 C2 B3 B4 B5' in status_text
        live_text = (await page.locator('#live-region').text_content()) or ''
        assert 'XOT 모드로 새 게임을 시작했습니다' in live_text
        assert '총 8수' in live_text
        assert await page.input_value('#position-sequence-input') == 'F5 D6 C4 D3 C2 B3 B4 B5'
        await page.locator('#copy-move-sequence-button').click()
        await page.wait_for_timeout(50)
        assert await page.evaluate('globalThis.__copiedText') == 'f5d6c4d3c2b3b4b5'

        await page.fill('#position-sequence-input', 'pass')
        await page.locator('#start-from-sequence-button').click()
        await page.wait_for_timeout(50)
        live_text = (await page.locator('#live-region').text_content()) or ''
        assert '포지션을 시작하지 못했습니다' in live_text
        status_text = await page.locator('#status-container').text_content()
        assert '오류:' in status_text

        await page.locator('#new-game-button').click()
        await page.wait_for_timeout(80)
        assert await page.locator('.move-log-list li').count() == 0

        await page.locator('input[name="humanColor"][value="white"]').check()
        await page.locator('#new-game-button').click()
        await page.wait_for_function("document.querySelectorAll('.move-log-list li').length >= 1", timeout=10000)
        await page.wait_for_timeout(120)
        assert await page.locator('.move-log-list li').count() == 1
        live_text = (await page.locator('#live-region').text_content()) or ''
        assert '흑' in live_text and '착수' in live_text

        await page.locator('#undo-button').click()
        await page.wait_for_function("document.querySelectorAll('.move-log-list li').length === 0", timeout=5000)
        await page.wait_for_function("document.querySelectorAll('.move-log-list li').length >= 1", timeout=10000)
        await page.wait_for_timeout(120)
        assert await page.locator('.move-log-list li').count() == 1
        status_text = (await page.locator('#status-container').text_content()) or ''
        assert '현재 차례: 백' in status_text

        await browser.close()

    if errors:
        raise AssertionError('\n'.join(errors))

    print('ui-smoke: all assertions passed')


if __name__ == '__main__':
    asyncio.run(main())
