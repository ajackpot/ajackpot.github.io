import fs from 'node:fs';

const appFiles = ['app.js', 'comments-app.js', 'search-app.js'];
const utilityText = fs.readFileSync('lib/utils.js', 'utf8');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

for (const file of appFiles) {
  const text = fs.readFileSync(file, 'utf8');
  assert(!text.includes('실험 번호'), `${file}: 사용자 화면에 실험 번호 문구가 남아 있습니다.`);
  assert(text.includes('renderTaskRequestVisibilitySwitchHtml'), `${file}: 과업 요청 표시 스위치가 연결되지 않았습니다.`);
  assert(text.includes('renderRunnerTaskRequestHtml'), `${file}: 수행 탭 과업 요청 표시 영역이 연결되지 않았습니다.`);
  assert(text.includes('runnerTaskRequestVisible'), `${file}: 과업 요청 표시 옵션 상태가 보존되지 않습니다.`);
  assert(!text.includes('${escapeHtml(task.title)} ·'), `${file}: 수행 탭 숨김 제목에 과업명이 남아 있습니다.`);
  assert(text.includes("element.name === 'runner-task-request-visible'"), `${file}: 과업 요청 표시 스위치 변경 처리가 없습니다.`);
}

const appText = fs.readFileSync('app.js', 'utf8');
assert(appText.includes('data-grid-slot="true"') && appText.includes('data-action="slot-open"'), '예약 캘린더 B안 시간표 버튼에 실행 동작이 없습니다.');

for (const file of appFiles) {
  const text = fs.readFileSync(file, 'utf8');
  const fullText = `${text}\n${utilityText}`;
  const actions = new Set([...fullText.matchAll(/data-action="([^"]+)"/g)].map((match) => match[1]));
  const handled = new Set([...text.matchAll(/action === '([^']+)'/g)].map((match) => match[1]));
  const missing = [...actions].filter((action) => !handled.has(action));
  assert(missing.length === 0, `${file}: 처리되지 않는 data-action이 있습니다: ${missing.join(', ')}`);
}

for (const file of [...appFiles, 'lib/utils.js']) {
  const text = fs.readFileSync(file, 'utf8');
  const buttons = text.match(/<button[\s\S]*?>/g) ?? [];
  const missingAction = buttons.filter((button) => !button.includes('data-action='));
  assert(missingAction.length === 0, `${file}: data-action 없는 버튼이 있습니다. ${missingAction.slice(0, 3).join(' | ')}`);
}

console.log('smoke-contract: ok');
