import assert from 'node:assert/strict';
import { buildInMemoryAppAssets, closePageResources, launchBrowser, openAppPage } from './testHarness.mjs';

function logPass(name) {
  console.log(`✓ ${name}`);
}

function assertNoBrowserErrors(consoleErrors, pageErrors) {
  assert.deepEqual(consoleErrors, [], `브라우저 콘솔 오류 발생: ${consoleErrors.join(' | ')}`);
  assert.deepEqual(pageErrors, [], `페이지 런타임 오류 발생: ${pageErrors.join(' | ')}`);
}

async function expectLiveRegion(page, pattern, timeout = 1500) {
  await page.waitForFunction(
    (source) => new RegExp(source, 'u').test(document.querySelector('#live-region')?.textContent ?? ''),
    pattern.source,
    { timeout },
  );

  const text = (await page.locator('#live-region').textContent()) ?? '';
  assert.match(text, pattern);
}

async function testInitialAccessibility(browser, assets) {
  const { page, consoleErrors, pageErrors } = await openAppPage(browser, assets);
  try {
    assert.equal(await page.locator('table.board-table').count(), 1, '체스판 표가 렌더링되어야 합니다.');
    assert.equal(await page.locator('button[data-square="e2"]').getAttribute('aria-label'), '백 폰, e2');
    assert.equal(await page.locator('button[data-square="e2"]').getAttribute('aria-pressed'), 'false');
    assert.equal(await page.locator('#time-budget-ms').isDisabled(), true, '기본 상태에서 사용자 지정 입력은 비활성화되어야 합니다.');
    await expectLiveRegion(page, /새 게임이 시작되었습니다/);
    assertNoBrowserErrors(consoleErrors, pageErrors);
    logPass('초기 렌더링과 접근성 이름');
  } finally {
    await closePageResources(page);
  }
}

async function testKeyboardBoardInteraction(browser, assets) {
  const { page, consoleErrors, pageErrors } = await openAppPage(browser, assets);
  try {
    await page.locator('button[data-square="a8"]').focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.evaluate(() => document.activeElement?.dataset?.square ?? null), 'b8');

    await page.locator('button[data-square="e2"]').focus();
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.querySelector('button[data-square="e2"]')?.getAttribute('aria-pressed') === 'true');
    await expectLiveRegion(page, /e2 선택됨/);

    await page.locator('button[data-square="e4"]').focus();
    await page.keyboard.press(' ');
    await page.waitForFunction(() => document.querySelector('#move-log')?.textContent.includes('e4'), {}, { timeout: 4000 });
    assert.match(await page.locator('#move-log').textContent(), /1\. e4/);
    assert.equal(await page.locator('button[data-square="e2"]').getAttribute('aria-pressed'), 'false');
    assertNoBrowserErrors(consoleErrors, pageErrors);
    logPass('키보드 탐색과 선택/이동');
  } finally {
    await closePageResources(page);
  }
}

async function testCustomOptionGate(browser, assets) {
  const { page, consoleErrors, pageErrors } = await openAppPage(browser, assets);
  try {
    await page.locator('#difficulty').selectOption('custom');
    assert.equal(await page.locator('#time-budget-ms').isDisabled(), false, '사용자 지정 선택 시 입력이 활성화되어야 합니다.');
    await page.locator('#difficulty').selectOption('normal');
    assert.equal(await page.locator('#time-budget-ms').isDisabled(), true, '프리셋으로 돌아가면 입력이 다시 비활성화되어야 합니다.');
    assertNoBrowserErrors(consoleErrors, pageErrors);
    logPass('사용자 지정 옵션 잠금/해제');
  } finally {
    await closePageResources(page);
  }
}

async function testFocusPreservationDuringThinking(browser, assets) {
  const { page, consoleErrors, pageErrors } = await openAppPage(browser, assets);
  try {
    await page.locator('#difficulty').selectOption('custom');
    await page.locator('#time-budget-ms').fill('3000');
    await page.locator('#max-simulations').fill('1000');
    await page.locator('#new-game-button').click();

    await page.locator('button[data-square="h2"]').click();
    await page.locator('button[data-square="h4"]').click();
    await page.waitForFunction(() => document.querySelector('#engine-status')?.textContent.includes('탐색 중'), {}, { timeout: 3000 });

    await page.locator('#undo-button').focus();
    await page.waitForTimeout(800);

    const active = await page.evaluate(() => ({
      id: document.activeElement?.id ?? '',
      square: document.activeElement?.dataset?.square ?? null,
    }));

    assert.equal(active.id, 'undo-button', 'AI 탐색 중 상태 갱신이 사이드바 포커스를 빼앗으면 안 됩니다.');
    assert.equal(active.square, null);
    assertNoBrowserErrors(consoleErrors, pageErrors);
    logPass('AI 탐색 중 포커스 보존');
  } finally {
    await closePageResources(page);
  }
}

async function testWorkerCancellationRestart(browser, assets) {
  const { page, consoleErrors, pageErrors } = await openAppPage(browser, assets);
  try {
    await page.locator('#difficulty').selectOption('custom');
    await page.locator('#time-budget-ms').fill('5000');
    await page.locator('#max-simulations').fill('5000');
    await page.locator('#new-game-button').click();

    await page.locator('button[data-square="h2"]').click();
    await page.locator('button[data-square="h4"]').click();
    await page.waitForFunction(() => document.querySelector('#engine-status')?.textContent.includes('탐색 중'), {}, { timeout: 3000 });

    await page.locator('#player-color').selectOption('b');
    await page.locator('#new-game-button').click();

    await page.waitForFunction(() => {
      const text = document.querySelector('#move-log')?.textContent ?? '';
      return text.trim() !== '' && !text.includes('아직 착수가 없습니다.');
    }, {}, { timeout: 1500 });

    assert.match(await page.locator('#move-log').textContent(), /^1\./, '새 게임 시작 후 AI 첫 수가 빠르게 실행되어야 합니다.');
    assertNoBrowserErrors(consoleErrors, pageErrors);
    logPass('워커 탐색 취소 후 즉시 재시작');
  } finally {
    await closePageResources(page);
  }
}

const browser = await launchBrowser();
const assets = await buildInMemoryAppAssets();

try {
  await testInitialAccessibility(browser, assets);
  await testKeyboardBoardInteraction(browser, assets);
  await testCustomOptionGate(browser, assets);
  await testFocusPreservationDuringThinking(browser, assets);
  await testWorkerCancellationRestart(browser, assets);
  console.log('모든 에이전트 기반 테스트를 통과했습니다.');
} finally {
  await browser.close();
}
