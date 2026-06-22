import fs from 'node:fs';

const source = fs.readFileSync('comments-app.js', 'utf8');
const checks = [
  ['작성자 후보 이름 목록', /REPLY_AUTHOR_NAME_POOL/.test(source)],
  ['수행 상태에 작성자 배정값 저장', /replyAuthorAssignments/.test(source)],
  ['과업별 작성자 배정 생성', /function buildReplyAuthorAssignment/.test(source)],
  ['다른 비교안의 정답값 회피', /function getOtherConditionReplyCorrectValue/.test(source) && /avoidCorrectValue/.test(source)],
  ['답글 목록은 배정된 작성자 이름 출력', /function renderReplyList[\s\S]*getRenderedReplyAuthor/.test(source)],
  ['하단 답변 선택지는 배정된 이름 기준', /function renderEndAreaReplyQuestion[\s\S]*getCurrentReplyQuestionOptions/.test(source)],
  ['성공 판정은 배정된 현재 정답 기준', /function isTaskSatisfied[\s\S]*getCurrentReplyQuestionCorrectValue/.test(source)],
  ['최종 결과 사유도 현재 정답 기준', /function getEndTaskOutcome[\s\S]*getCurrentReplyQuestionCorrectValue/.test(source)],
];

let failed = false;
for (const [label, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${label}`);
  if (!ok) failed = true;
}

if (failed) {
  process.exitCode = 1;
}
