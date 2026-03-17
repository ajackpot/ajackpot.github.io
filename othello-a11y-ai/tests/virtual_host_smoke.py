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
        assert await page.locator('button[data-board-index="35"]').get_attribute('aria-label') == '검은 돌 D5'
        assert await page.locator('button[data-board-index="26"]').get_attribute('aria-label') == '둘 수 있는 빈칸 C4'
        assert await page.locator('button[data-board-index="0"]').get_attribute('aria-label') == '빈칸 A1'
        assert await page.evaluate('Boolean(window.__accessibleOthelloApp)') is True

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

        await page.select_option('#preset-select', 'custom')
        await page.wait_for_timeout(50)
        assert await page.evaluate("document.querySelector('#custom-maxDepth').disabled") is False
        await page.fill('#custom-maxDepth', '9')
        await page.select_option('#preset-select', 'beginner')
        await page.wait_for_timeout(50)
        assert await page.evaluate("document.querySelector('#custom-maxDepth').disabled") is True
        await page.select_option('#preset-select', 'custom')
        await page.wait_for_timeout(50)
        assert await page.input_value('#custom-maxDepth') == '9'

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
