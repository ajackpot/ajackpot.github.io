import fs from 'node:fs';

const files = [
  'app.js',
  'comments-app.js',
  'search-app.js',
  'lib/utils.js',
  'lib/service-shell.js',
  'lib/survey-link.js',
  'data/service-registry.js',
  'data/tasks-calendar.js',
  'data/tasks-comments.js',
  'data/tasks-search.js',
  'data/measurement-rules.js',
];

const sources = Object.fromEntries(files.map((file) => [file, fs.readFileSync(file, 'utf8')]));
const combined = Object.values(sources).join('\n');

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exitCode = 1;
    return;
  }
  console.log(`PASS: ${message}`);
}

const removedPhrases = [
  '과업 수행에 성공했습니다.',
  '수행 불가능 기록',
  '과업 요청 사항을 수행 페이지에서도 보기',
  '과업 준비로 이동',
  '실제 계측',
  '사전 계산 기준',
  '과업 수행 페이지 열기(새 탭 열림)',
  '원래 테스트 창',
  '수행 창을 준비할 수 없습니다',
  '고르십시오',
  '누르십시오',
  '여십시오',
  '확인하십시오',
  '주십시오',
];

for (const phrase of removedPhrases) {
  assert(!combined.includes(phrase), `이전 문구 제거: ${phrase}`);
}

const requiredPhrases = [
  '첫 과업 준비하기',
  '다른 서비스 고르기',
  '과업 요청을 수행 페이지에도 표시',
  '과업 수행 기록',
  '완료하지 못한 과업',
  '사전 예상 기준',
  '현재 상태로 과업을 마칠까요?',
  '새 탭이 열리지 않았습니다. 브라우저에서 이 사이트의 팝업을 허용한 뒤 다시 열어 주세요.',
];

for (const phrase of requiredPhrases) {
  assert(combined.includes(phrase), `현재 문구 유지: ${phrase}`);
}

assert(!/앗|이런|잘하셨습니다|걱정하지 마세요/.test(combined), '불필요한 감탄·과한 격려 문구 없음');
assert(!/사용자[^\n]{0,20}(실패|잘못)/.test(combined), '사용자를 탓하는 문구 없음');

if (process.exitCode) process.exit(process.exitCode);
