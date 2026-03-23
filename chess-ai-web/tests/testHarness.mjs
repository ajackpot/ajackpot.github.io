import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright-core';

const rootDir = path.resolve(new URL('..', import.meta.url).pathname);

async function rewriteImportsToDataUrls(filePath, options, cache) {
  const key = `${filePath}::${options.workerUrl ?? ''}`;
  if (cache.has(key)) {
    return cache.get(key);
  }

  let source = await fsp.readFile(filePath, 'utf8');

  if (filePath.endsWith('/src/engine/EngineFacade.js')) {
    source = source.replace(
      /new Worker\(new URL\('\.\/engine\.worker\.js', import\.meta\.url\), \{ type: 'module' \}\)/,
      `new Worker(${JSON.stringify(options.workerUrl)}, { type: 'module' })`,
    );
  }

  const importRe = /import\s+([^'";]+?)\s+from\s+['"](.+?)['"];?/g;
  const bareImportRe = /import\s+['"](.+?)['"];?/g;
  const matches = [...source.matchAll(importRe), ...source.matchAll(bareImportRe)].sort((left, right) => left.index - right.index);

  let transformed = '';
  let lastIndex = 0;

  for (const match of matches) {
    transformed += source.slice(lastIndex, match.index);
    const fullMatch = match[0];

    if (match.length === 3) {
      const [, bindings, specifier] = match;
      const dependencyPath = path.resolve(path.dirname(filePath), specifier);
      const dependencyUrl = await rewriteImportsToDataUrls(dependencyPath, options, cache);
      transformed += `import ${bindings} from ${JSON.stringify(dependencyUrl)};`;
    } else {
      const [, specifier] = match;
      const dependencyPath = path.resolve(path.dirname(filePath), specifier);
      const dependencyUrl = await rewriteImportsToDataUrls(dependencyPath, options, cache);
      transformed += `import ${JSON.stringify(dependencyUrl)};`;
    }

    lastIndex = match.index + fullMatch.length;
  }

  transformed += source.slice(lastIndex);

  const dataUrl = `data:text/javascript;base64,${Buffer.from(transformed).toString('base64')}`;
  cache.set(key, dataUrl);
  return dataUrl;
}

function resolveChromiumExecutablePath() {
  const candidates = [
    process.env.CHROMIUM_PATH,
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/snap/bin/chromium',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    path.join(process.env.LOCALAPPDATA ?? '', 'Google/Chrome/Application/chrome.exe'),
    path.join(process.env.PROGRAMFILES ?? '', 'Google/Chrome/Application/chrome.exe'),
    path.join(process.env['PROGRAMFILES(X86)'] ?? '', 'Google/Chrome/Application/chrome.exe'),
  ].filter(Boolean);

  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
}

export async function buildInMemoryAppAssets() {
  const cache = new Map();
  const workerUrl = await rewriteImportsToDataUrls(path.join(rootDir, 'src/engine/engine.worker.js'), {}, cache);
  cache.clear();
  const appUrl = await rewriteImportsToDataUrls(path.join(rootDir, 'src/app.js'), { workerUrl }, cache);

  let html = await fsp.readFile(path.join(rootDir, 'index.html'), 'utf8');
  html = html.replace(/<link rel="stylesheet" href="\.\/styles\/app\.css" \/>\s*/, '');
  html = html.replace(/<script type="module" src="\.\/src\/app\.js"><\/script>/, '');

  return {
    html,
    appUrl,
  };
}

export async function launchBrowser() {
  const executablePath = resolveChromiumExecutablePath();
  if (!executablePath) {
    throw new Error('Chromium 실행 파일을 찾지 못했습니다. CHROMIUM_PATH 환경 변수를 지정하십시오.');
  }
  return chromium.launch({ executablePath, headless: true });
}

export async function openAppPage(browser, assets) {
  const page = await browser.newPage();
  const consoleErrors = [];
  const pageErrors = [];

  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text());
    }
  });

  page.on('pageerror', (error) => {
    pageErrors.push(error.message);
  });

  await page.setContent(assets.html, { waitUntil: 'load' });
  await page.addScriptTag({ type: 'module', url: assets.appUrl });
  await page.waitForSelector('table.board-table');

  return {
    page,
    consoleErrors,
    pageErrors,
  };
}

export async function closePageResources(page) {
  await page.close();
}
