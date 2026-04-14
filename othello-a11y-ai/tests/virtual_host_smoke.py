import asyncio
import mimetypes
from pathlib import Path
from urllib.parse import urlparse, unquote

from playwright.async_api import async_playwright


PROJECT_ROOT = Path(__file__).resolve().parents[1]
CHROMIUM_PATH = '/usr/bin/chromium'
APP_ORIGIN = 'https://app.local'


def resolve_project_file(url: str) -> tuple[Path, str] | None:
    parsed = urlparse(url)
    if f'{parsed.scheme}://{parsed.netloc}' != APP_ORIGIN:
        return None

    path = unquote(parsed.path or '/')
    if path == '/' or path == '':
        file_path = PROJECT_ROOT / 'index.html'
    else:
        file_path = PROJECT_ROOT / path.lstrip('/')

    if not file_path.is_file():
        return None

    mime_type, _ = mimetypes.guess_type(str(file_path))
    if file_path.suffix == '.js':
        mime_type = 'text/javascript'
    elif file_path.suffix == '.css':
        mime_type = 'text/css'
    elif file_path.suffix == '.html':
        mime_type = 'text/html'

    return file_path, mime_type or 'application/octet-stream'


async def main() -> None:
    errors: list[str] = []

    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(
            headless=True,
            executable_path=CHROMIUM_PATH,
            args=['--no-sandbox'],
        )
        context = await browser.new_context(ignore_https_errors=True, viewport={'width': 1440, 'height': 1280})
        page = await context.new_page()
        page.on('pageerror', lambda error: errors.append(f'pageerror: {error}'))
        page.on('console', lambda msg: errors.append(f'console:{msg.type}:{msg.text}') if msg.type == 'error' else None)

        async def route_handler(route):
            resolved = resolve_project_file(route.request.url)
            if resolved is None:
                await route.abort()
                return
            file_path, mime_type = resolved
            await route.fulfill(
                status=200,
                headers={'content-type': mime_type},
                body=file_path.read_bytes(),
            )

        await context.route('**/*', route_handler)

        html = (
            '<!doctype html>'
            '<html lang="ko">'
            '<head>'
            '<meta charset="utf-8">'
            '<base href="https://app.local/">'
            '<link rel="stylesheet" href="https://app.local/styles.css">'
            '</head>'
            '<body>'
            '<div id="app"></div>'
            '<script type="module" src="https://app.local/js/main.js"></script>'
            '</body>'
            '</html>'
        )
        await page.set_content(html, wait_until='domcontentloaded')
        await page.wait_for_timeout(500)

        assert await page.locator('table.board-table').count() == 1
        assert await page.locator('button[data-board-index]').count() == 64
        assert await page.evaluate("document.querySelector('#settings-collapsible-content').hidden") is True
        assert await page.locator('#new-game-button').is_visible() is True
        assert await page.locator('#xot-game-button').is_visible() is True
        assert await page.evaluate("document.querySelector('#engine-metrics-content').hidden") is True
        assert await page.locator('button[data-board-index="35"]').get_attribute('aria-label') == '검은 돌 D5'
        assert await page.locator('button[data-board-index="26"]').get_attribute('aria-label') == '둘 수 있는 빈칸 C4'
        assert await page.locator('button[data-board-index="0"]').get_attribute('aria-label') == '빈칸 A1'
        assert await page.evaluate('Boolean(window.__accessibleOthelloApp)') is True

        await page.locator('#engine-metrics-toggle-button').click()
        await page.wait_for_timeout(50)
        assert await page.evaluate("document.querySelector('#engine-metrics-content').hidden") is False

        await page.locator('#settings-toggle-button').click()
        await page.wait_for_timeout(50)
        assert await page.evaluate("document.querySelector('#settings-collapsible-content').hidden") is False
        assert await page.locator('section[aria-labelledby="engine-settings-title"]').count() == 1
        assert await page.locator('section[aria-labelledby="accessibility-settings-title"]').count() == 1
        assert await page.locator('#read-settings-button').is_visible() is True
        assert await page.locator('#engine-summary-output').get_attribute('role') is None
        assert await page.locator('#engine-summary-output').get_attribute('aria-live') is None
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

        await page.locator('button[data-board-index="0"]').focus()
        await page.keyboard.press('m')
        assert await page.evaluate("document.activeElement?.getAttribute('data-board-index')") == '19'
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

        live_before_settings_change = (await page.locator('#live-region').text_content()) or ''
        await page.select_option('#preset-select', 'easy')
        await page.wait_for_timeout(50)
        summary_text = (await page.locator('#engine-summary-output').text_content()) or ''
        assert '쉬움' in summary_text and '깊이 3' in summary_text and '6칸 이하' in summary_text
        live_after_settings_change = (await page.locator('#live-region').text_content()) or ''
        assert live_after_settings_change == live_before_settings_change
        await page.locator('#read-settings-button').click()
        await page.wait_for_timeout(50)
        live_text = (await page.locator('#live-region').text_content()) or ''
        assert '현재 설정.' in live_text and '쉬움' in live_text

        await page.select_option('#preset-select', 'impossible')
        await page.wait_for_timeout(50)
        summary_text = (await page.locator('#engine-summary-output').text_content()) or ''
        assert '불가능' in summary_text and '깊이 10' in summary_text and '16칸 이하' in summary_text
        status_text = (await page.locator('#status-container').text_content()) or ''
        assert '10초 이상 생각할 수 있지만' in status_text
        assert '가장 강한 퍼포먼스를 목표로 합니다' in status_text

        assert await page.locator('#custom-options-fieldset').count() == 0
        assert await page.locator('#difficulty-detail-button').is_disabled() is True
        assert await page.locator('#style-detail-button').is_disabled() is True
        style_values = await page.evaluate("Array.from(document.querySelectorAll('#style-select option')).map((option) => option.value)")
        assert style_values == ['balanced', 'aggressive', 'fortress', 'positional', 'chaotic', 'custom']
        assert await page.input_value('#style-select') == 'balanced'

        await page.select_option('#style-select', 'chaotic')
        await page.wait_for_timeout(50)
        summary_text = (await page.locator('#engine-summary-output').text_content()) or ''
        assert '변칙형' in summary_text
        assert await page.locator('#style-detail-button').is_disabled() is True

        await page.select_option('#style-select', 'custom')
        await page.wait_for_timeout(50)
        assert await page.locator('#style-detail-button').is_enabled() is True
        await page.locator('#style-detail-button').click()
        await page.wait_for_timeout(50)
        assert await page.evaluate("Boolean(document.querySelector('#style-detail-dialog')?.open)") is True
        await page.fill('#style-detail-mobilityScale', '1.6')
        await page.fill('#style-detail-riskPenaltyScale', '0.8')
        await page.locator('#style-detail-save-button').click()
        await page.wait_for_timeout(50)
        summary_text = (await page.locator('#engine-summary-output').text_content()) or ''
        assert '사용자 지정' in summary_text

        await page.select_option('#preset-select', 'custom')
        await page.wait_for_timeout(50)
        assert await page.locator('#difficulty-detail-button').is_enabled() is True
        assert await page.locator('#style-detail-button').is_enabled() is True
        await page.locator('#difficulty-detail-button').click()
        await page.wait_for_timeout(50)
        assert await page.evaluate("Boolean(document.querySelector('#difficulty-detail-dialog')?.open)") is True
        assert await page.evaluate("document.querySelector('#difficulty-detail-dialog [data-difficulty-group=\"classic\"]').hidden") is False
        assert await page.evaluate("document.querySelector('#difficulty-detail-dialog [data-difficulty-group=\"mcts\"]').hidden") is True
        await page.fill('#difficulty-detail-maxDepth', '9')
        await page.select_option('#difficulty-detail-wldPreExactEmpties', '2')
        await page.locator('#difficulty-detail-save-button').click()
        await page.wait_for_timeout(50)
        summary_text = (await page.locator('#engine-summary-output').text_content()) or ''
        assert '깊이 9' in summary_text and '사전 WLD +2' in summary_text

        await page.select_option('#search-algorithm-select', 'mcts-guided')
        await page.wait_for_timeout(50)
        await page.locator('#difficulty-detail-button').click()
        await page.wait_for_timeout(50)
        assert await page.evaluate("document.querySelector('#difficulty-detail-dialog [data-difficulty-group=\"classic\"]').hidden") is True
        assert await page.evaluate("document.querySelector('#difficulty-detail-dialog [data-difficulty-group=\"mcts\"]').hidden") is False
        assert await page.evaluate("document.querySelector('#difficulty-detail-dialog [data-difficulty-group=\"guided\"]').hidden") is False
        await page.fill('#difficulty-detail-mctsExploration', '1.7')
        await page.locator('#difficulty-detail-save-button').click()
        await page.wait_for_timeout(50)
        summary_text = (await page.locator('#engine-summary-output').text_content()) or ''
        assert 'MCTS Guided' in summary_text and '탐험 1.7' in summary_text

        await page.select_option('#preset-select', 'beginner')
        await page.wait_for_timeout(50)
        await page.select_option('#search-algorithm-select', 'mcts-lite')
        await page.wait_for_timeout(50)
        summary_text = (await page.locator('#engine-summary-output').text_content()) or ''
        assert 'MCTS Lite' in summary_text and '스타일 적용 안 함' in summary_text
        assert '메인 탐색 스타일 미적용' in summary_text
        assert await page.locator('#difficulty-detail-button').is_disabled() is True
        assert await page.locator('#style-detail-button').is_enabled() is True
        await page.locator('#style-detail-button').click()
        await page.wait_for_timeout(50)
        assert await page.input_value('#style-detail-mobilityScale') == '1.6'
        assert await page.input_value('#style-detail-riskPenaltyScale') == '0.8'
        await page.locator('#style-detail-cancel-button').click()
        await page.wait_for_timeout(50)

        await page.select_option('#search-algorithm-select', 'mcts-guided')
        await page.wait_for_timeout(50)
        summary_text = (await page.locator('#engine-summary-output').text_content()) or ''
        assert '스타일 적용 안 함' not in summary_text and '사용자 지정' in summary_text

        await page.locator('button[data-board-index="26"]').focus()
        await page.keyboard.press('ArrowRight')
        assert await page.evaluate("document.activeElement?.getAttribute('data-board-index')") == '27'

        await page.locator('button[data-board-index="26"]').click()
        await page.wait_for_timeout(120)
        live_text = (await page.locator('#live-region').text_content()) or ''
        assert '흑 C4 착수.' in live_text
        await page.wait_for_function("document.querySelectorAll('.move-log-list li').length >= 2", timeout=10000)
        assert await page.locator('.move-log-list li').count() == 2
        assert await page.evaluate("document.activeElement?.getAttribute('data-board-index')") == '26'

        await page.locator('#undo-button').click()
        await page.wait_for_timeout(120)
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

        await page.evaluate('Math.random = () => 0')
        await page.locator('#xot-game-button').click()
        await page.wait_for_timeout(80)
        assert await page.locator('.move-log-list li').count() == 8
        status_text = (await page.locator('#status-container').text_content()) or ''
        assert '시작 방식:' in status_text and 'XOT 1/3623' in status_text
        assert 'F5 D6 C4 D3 C2 B3 B4 B5' in status_text
        assert await page.input_value('#position-sequence-input') == 'F5 D6 C4 D3 C2 B3 B4 B5'
        live_text = (await page.locator('#live-region').text_content()) or ''
        assert 'XOT 모드로 새 게임을 시작했습니다' in live_text

        await page.select_option('#preset-select', 'normal')
        await page.wait_for_timeout(50)

        await page.locator('input[name="humanColor"][value="white"]').check()
        await page.locator('#new-game-button').click()
        await page.wait_for_function("document.querySelectorAll('.move-log-list li').length >= 1", timeout=10000)
        await page.wait_for_timeout(250)
        assert await page.locator('.move-log-list li').count() == 1
        live_text = (await page.locator('#live-region').text_content()) or ''
        assert '흑' in live_text and '착수' in live_text

        await browser.close()

    if errors:
        raise AssertionError('\n'.join(errors))

    print('virtual-host-smoke: all assertions passed')


if __name__ == '__main__':
    asyncio.run(main())
