/**
 * Keyboard Cost Lab Step 31 - 기존 Google Form 문구·PC 안내·기프티콘 정보 수정
 *
 * 대상 설문:
 * - https://docs.google.com/forms/d/1OfkTLGaOYsRsRcJCyqLrK9JeCkJEMhH2J_8p-ZJyr7U/edit
 *
 * 실행 함수:
 * - updateKeyboardCostLabSurveyContentStep31()
 *
 * 이 스크립트는 기존 응답을 삭제하지 않습니다.
 * 기존 설문의 제목·설명·문항 문구를 최신 테스트 페이지와 맞추고,
 * 기프티콘 지급 정보용 선택 입력란 2개를 추가한 뒤
 * 응답 스프레드시트의 문항_맵 / 연동_JSON 시트를 갱신합니다.
 *
 * 공개 전 아래 값은 실제 운영 기관 정보로 바꾸십시오.
 * - organizationName
 * - privacyContact
 *
 * 개인정보 관련 참고:
 * - 이 버전은 요청에 따라 성명 또는 휴대전화번호를 입력하면 수집·이용에
 *   동의한 것으로 보는 안내를 사용합니다.
 * - 실제 공개 전에는 기관의 개인정보 보호 담당자 또는 법률 전문가에게
 *   동의 방식과 보유·파기 절차를 검토받는 것을 권장합니다.
 */

const KCLAB_STEP31_SURVEY_UPDATE = Object.freeze({
  schemaVersion: 'step-31-survey-v4',
  formId: '1OfkTLGaOYsRsRcJCyqLrK9JeCkJEMhH2J_8p-ZJyr7U',
  spreadsheetId: '1lpRnwlYwCYp2V-j4AgZCMXsFW3Xf_J3R_9TwwC0lTiw',
  pointerProperty: 'KCLAB_STEP31_SURVEY_POINTER',
  formTitle: '과도한 키보드 조작 테스트 설문',
  testUrl: 'https://ajackpot.github.io/keyboard-cost-lab/index.html',
  organizationName: '한국디지털접근성연구소',
  privacyContact: 'accessibility-research@example.com',
  closingSectionTitle: '테스트 마무리',
  incentiveSectionTitle: '기프티콘 지급 정보(선택)',
  autoSectionTitle: '자동 응답 영역',
  incentiveNameKey: 'participant.incentiveName',
  incentivePhoneKey: 'participant.incentivePhone',
});

const KCLAB_STEP31_COMPARISON_CHOICES = Object.freeze([
  '비교안 A가 훨씬 쉬웠다',
  '비교안 A가 조금 더 쉬웠다',
  '비슷했다',
  '비교안 B가 조금 더 쉬웠다',
  '비교안 B가 훨씬 쉬웠다',
]);

const KCLAB_STEP31_SERVICE_SPECS = Object.freeze([
  {
    id: 'calendar',
    label: '예약 캘린더',
    taskCount: 2,
    tasks: [
      '비대면 상담 시간 예약과 상담 옵션 선택',
      '기존 예약 취소 뒤 목요일 오전 대면 예약',
    ],
  },
  {
    id: 'comments',
    label: '댓글 목록',
    taskCount: 2,
    tasks: [
      '최신 후기에서 특정 댓글의 답글 작성자 확인',
      '3월 25일 운영자 안내 댓글 정보 확인 뒤 도움이 돼요 누르기',
    ],
  },
  {
    id: 'search',
    label: '검색 결과 목록',
    taskCount: 2,
    tasks: [
      '최신 안내문 미리보기에서 예약 변경 기준 확인',
      '제목순 질문답변에서 비대면 상담 연결 방법 저장',
    ],
  },
]);

const KCLAB_STEP31_ITEM_SPECS = Object.freeze([
  {
    key: 'service.calendar.findTarget',
    section: '예약 캘린더',
    itemId: 763773995,
    itemType: 'MULTIPLE_CHOICE',
    responseType: 'string',
    required: true,
    title: '상담 예약 시간과 예약 조건에 맞는 일정을 찾기에는 어느 화면이 더 쉬웠습니까?',
    helpText: '',
    choices: KCLAB_STEP31_COMPARISON_CHOICES,
  },
  {
    key: 'service.calendar.returnAfterDetail',
    section: '예약 캘린더',
    itemId: 1748621642,
    itemType: 'MULTIPLE_CHOICE',
    responseType: 'string',
    required: true,
    title: '선택한 일정의 예약을 확정하거나 취소한 뒤 일정 목록으로 돌아가기는 어느 화면이 더 쉬웠습니까?',
    helpText: '',
    choices: KCLAB_STEP31_COMPARISON_CHOICES,
  },
  {
    key: 'service.calendar.overallBurden',
    section: '예약 캘린더',
    itemId: 1693174377,
    itemType: 'MULTIPLE_CHOICE',
    responseType: 'string',
    required: true,
    title: '예약 캘린더의 두 과업을 마치기까지 전체 조작 부담은 어느 화면이 더 적었습니까?',
    helpText: '',
    choices: KCLAB_STEP31_COMPARISON_CHOICES,
  },
  {
    key: 'service.calendar.discomfort',
    section: '예약 캘린더',
    itemId: 1744892392,
    itemType: 'PARAGRAPH_TEXT',
    responseType: 'string',
    required: true,
    title: '예약 캘린더를 이용하면서 어떤 부분이 불편했습니까?',
    helpText: '두 화면 중 어느 쪽이든 불편한 부분이 있었다면 적어 주세요. 특별히 없으면 “없음”이라고 적어 주세요.',
    choices: [],
  },
  {
    key: 'service.comments.findTarget',
    section: '댓글 목록',
    itemId: 1416485468,
    itemType: 'MULTIPLE_CHOICE',
    responseType: 'string',
    required: true,
    title: '정렬 기준과 댓글 종류를 바꾼 뒤 원하는 댓글이나 답글을 찾기에는 어느 화면이 더 쉬웠습니까?',
    helpText: '',
    choices: KCLAB_STEP31_COMPARISON_CHOICES,
  },
  {
    key: 'service.comments.returnAfterDetail',
    section: '댓글 목록',
    itemId: 437121902,
    itemType: 'MULTIPLE_CHOICE',
    responseType: 'string',
    required: true,
    title: '선택한 댓글의 답글 목록이나 댓글 정보를 확인한 뒤 댓글 목록으로 돌아가기는 어느 화면이 더 쉬웠습니까?',
    helpText: '',
    choices: KCLAB_STEP31_COMPARISON_CHOICES,
  },
  {
    key: 'service.comments.overallBurden',
    section: '댓글 목록',
    itemId: 144620300,
    itemType: 'MULTIPLE_CHOICE',
    responseType: 'string',
    required: true,
    title: '댓글 목록의 두 과업을 마치기까지 전체 조작 부담은 어느 화면이 더 적었습니까?',
    helpText: '',
    choices: KCLAB_STEP31_COMPARISON_CHOICES,
  },
  {
    key: 'service.comments.discomfort',
    section: '댓글 목록',
    itemId: 884978904,
    itemType: 'PARAGRAPH_TEXT',
    responseType: 'string',
    required: true,
    title: '댓글 목록을 이용하면서 어떤 부분이 불편했습니까?',
    helpText: '두 화면 중 어느 쪽이든 불편한 부분이 있었다면 적어 주세요. 특별히 없으면 “없음”이라고 적어 주세요.',
    choices: [],
  },
  {
    key: 'service.search.findTarget',
    section: '검색 결과 목록',
    itemId: 769228139,
    itemType: 'MULTIPLE_CHOICE',
    responseType: 'string',
    required: true,
    title: '검색어, 정렬 기준, 자료 범위를 적용해 원하는 자료를 찾기에는 어느 화면이 더 쉬웠습니까?',
    titleAliases: [
      '검색 조건을 바꾼 뒤 원하는 자료를 찾기에는 어느 화면이 더 쉬웠습니까?',
      '정렬 기준과 자료 범위를 바꾼 뒤 원하는 자료를 찾기에는 어느 화면이 더 쉬웠습니까?',
    ],
    helpText: '',
    choices: KCLAB_STEP31_COMPARISON_CHOICES,
  },
  {
    key: 'service.search.returnAfterDetail',
    section: '검색 결과 목록',
    itemId: 377054708,
    itemType: 'MULTIPLE_CHOICE',
    responseType: 'string',
    required: true,
    title: '선택한 자료의 미리보기를 확인하거나 저장 옵션을 선택한 뒤 자료 목록으로 돌아가기는 어느 화면이 더 쉬웠습니까?',
    helpText: '',
    choices: KCLAB_STEP31_COMPARISON_CHOICES,
  },
  {
    key: 'service.search.overallBurden',
    section: '검색 결과 목록',
    itemId: 229802632,
    itemType: 'MULTIPLE_CHOICE',
    responseType: 'string',
    required: true,
    title: '검색 결과 목록의 두 과업을 마치기까지 전체 조작 부담은 어느 화면이 더 적었습니까?',
    helpText: '',
    choices: KCLAB_STEP31_COMPARISON_CHOICES,
  },
  {
    key: 'service.search.discomfort',
    section: '검색 결과 목록',
    itemId: 1568517579,
    itemType: 'PARAGRAPH_TEXT',
    responseType: 'string',
    required: true,
    title: '검색 결과 목록을 이용하면서 어떤 부분이 불편했습니까?',
    helpText: '두 화면 중 어느 쪽이든 불편한 부분이 있었다면 적어 주세요. 특별히 없으면 “없음”이라고 적어 주세요.',
    choices: [],
  },
  {
    key: 'participant.primaryInput',
    section: '테스트 마무리',
    itemId: 738440095,
    itemType: 'MULTIPLE_CHOICE',
    responseType: 'string',
    required: true,
    title: '이번 테스트에서 가장 많이 사용한 입력 방식은 무엇입니까?',
    helpText: '하나만 골라 주세요.',
    choices: [
      '키보드 중심으로 사용',
      '화면낭독기와 키보드 함께 사용',
      '스위치 사용',
      '키보드와 다른 보조기술 함께 사용',
      '기타',
    ],
  },
  {
    key: 'participant.assistiveTech',
    section: '테스트 마무리',
    itemId: 1646941834,
    itemType: 'CHECKBOX',
    responseType: 'string[]',
    required: true,
    title: '이번 테스트에서 함께 사용한 보조기술이나 입력 방식은 무엇입니까?',
    helpText: '해당하는 항목을 모두 골라 주세요. 사용하지 않았다면 “해당 없음”을 골라 주세요.',
    choices: [
      '화면낭독기',
      '화면 확대',
      '큰 글자 또는 높은 대비 설정',
      '음성 입력',
      '스위치',
      '점자정보단말기 또는 점자 디스플레이',
      '마우스 또는 터치 입력',
      '해당 없음',
    ],
  },
  {
    key: 'participant.inputFamiliarity',
    section: '테스트 마무리',
    itemId: 183427811,
    itemType: 'MULTIPLE_CHOICE',
    responseType: 'string',
    required: true,
    title: '이번 테스트에서 사용한 보조기술이나 입력 방식에 얼마나 익숙합니까?',
    helpText: '가장 가까운 답 하나를 골라 주세요.',
    choices: ['낮음', '보통', '높음'],
  },
  {
    key: 'participant.hardestService',
    section: '테스트 마무리',
    itemId: 869551976,
    itemType: 'MULTIPLE_CHOICE',
    responseType: 'string',
    required: true,
    title: '세 가지 서비스 중 조작 부담이 가장 컸던 서비스는 무엇입니까?',
    helpText: '하나만 골라 주세요.',
    choices: ['예약 캘린더', '댓글 목록', '검색 결과 목록'],
  },
  {
    key: 'participant.navigationDifficultyAndImprovement',
    section: '테스트 마무리',
    itemId: 737404199,
    itemType: 'PARAGRAPH_TEXT',
    responseType: 'string',
    required: true,
    title: '세 가지 서비스를 이용하면서 탐색하기 불편했던 부분과 바라는 개선점을 적어 주세요.',
    helpText: '특별히 없으면 “없음”이라고 적어 주세요.',
    choices: [],
  },
  {
    key: 'participant.smoothServiceExample',
    section: '테스트 마무리',
    itemId: 2035667264,
    itemType: 'PARAGRAPH_TEXT',
    responseType: 'string',
    required: true,
    title: '평소 사용한 웹사이트나 앱 중 원하는 메뉴나 자료를 찾기 쉬웠던 사례와 그 이유를 적어 주세요.',
    titleAliases: [
      '평소 사용한 웹사이트나 앱 중 원하는 메뉴나 자료를 찾기 쉬웠던 사례가 있습니까?',
      '사용해 본 실제 서비스 중 탐색이 원활했던 서비스 사례와 이유를 적어 주십시오.',
    ],
    helpText: '서비스 이름과 탐색이 쉬웠던 이유를 적어 주세요. 떠오르는 사례가 없으면 “없음”이라고 적어 주세요.',
    choices: [],
  },
  {
    key: 'participant.incentiveName',
    section: '기프티콘 지급 정보(선택)',
    itemId: null,
    itemType: 'TEXT',
    responseType: 'string',
    required: false,
    title: '성명(선택)',
    titleAliases: ['기프티콘 수령인 성명(선택)', '이름(선택)'],
    helpText: '기프티콘을 받으려는 경우에만 입력해 주세요.',
    choices: [],
  },
  {
    key: 'participant.incentivePhone',
    section: '기프티콘 지급 정보(선택)',
    itemId: null,
    itemType: 'TEXT',
    responseType: 'string',
    required: false,
    title: '휴대전화번호(선택)',
    titleAliases: ['기프티콘 수령 휴대전화번호(선택)', '연락처(선택)'],
    helpText: '기프티콘을 받으려는 경우에만 입력해 주세요. 하이픈은 입력하거나 생략할 수 있습니다.',
    choices: [],
  },
  {
    key: 'service.calendar.actualA',
    section: '자동 응답 영역',
    itemId: 1528888522,
    itemType: 'PARAGRAPH_TEXT',
    responseType: 'string',
    required: false,
    title: '예약 캘린더 비교안 A 수행 기록',
    helpText: '',
    choices: [],
  },
  {
    key: 'service.calendar.actualB',
    section: '자동 응답 영역',
    itemId: 2110125968,
    itemType: 'PARAGRAPH_TEXT',
    responseType: 'string',
    required: false,
    title: '예약 캘린더 비교안 B 수행 기록',
    helpText: '',
    choices: [],
  },
  {
    key: 'service.comments.actualA',
    section: '자동 응답 영역',
    itemId: 810253905,
    itemType: 'PARAGRAPH_TEXT',
    responseType: 'string',
    required: false,
    title: '댓글 목록 비교안 A 수행 기록',
    helpText: '',
    choices: [],
  },
  {
    key: 'service.comments.actualB',
    section: '자동 응답 영역',
    itemId: 1514076891,
    itemType: 'PARAGRAPH_TEXT',
    responseType: 'string',
    required: false,
    title: '댓글 목록 비교안 B 수행 기록',
    helpText: '',
    choices: [],
  },
  {
    key: 'service.search.actualA',
    section: '자동 응답 영역',
    itemId: 211347444,
    itemType: 'PARAGRAPH_TEXT',
    responseType: 'string',
    required: false,
    title: '검색 결과 목록 비교안 A 수행 기록',
    helpText: '',
    choices: [],
  },
  {
    key: 'service.search.actualB',
    section: '자동 응답 영역',
    itemId: 772860407,
    itemType: 'PARAGRAPH_TEXT',
    responseType: 'string',
    required: false,
    title: '검색 결과 목록 비교안 B 수행 기록',
    helpText: '',
    choices: [],
  },
]);

function updateKeyboardCostLabSurveyContentStep31() {
  const updatedAt = new Date();
  const form = FormApp.openById(KCLAB_STEP31_SURVEY_UPDATE.formId);
  const spreadsheet = SpreadsheetApp.openById(KCLAB_STEP31_SURVEY_UPDATE.spreadsheetId);

  updateStep31FormSettings_(form);
  updateStep31SectionHeaders_(form);
  updateStep31ExistingItems_(form);

  const incentiveHeader = ensureStep31IncentiveSection_(form);
  const incentiveName = ensureStep31TextItem_(form, getStep31SpecByKey_(KCLAB_STEP31_SURVEY_UPDATE.incentiveNameKey));
  const incentivePhone = ensureStep31TextItem_(form, getStep31SpecByKey_(KCLAB_STEP31_SURVEY_UPDATE.incentivePhoneKey));
  arrangeStep31IncentiveItems_(form, incentiveHeader, incentiveName, incentivePhone);

  const manifest = buildStep31SurveyManifest_(form, spreadsheet, updatedAt);
  saveStep31SurveyPointer_(manifest);
  writeStep31IntegrationSheets_(spreadsheet, manifest);

  Logger.log('설문 문구와 기프티콘 지급 정보 수정이 완료되었습니다.');
  Logger.log(`응답 URL: ${manifest.formResponseUrl}`);
  Logger.log(`수정 URL: ${manifest.formEditUrl}`);
  Logger.log(`응답 시트 URL: ${manifest.spreadsheetUrl}`);
  Logger.log(JSON.stringify(manifest, null, 2));

  return manifest;
}

function logKeyboardCostLabSurveyManifestStep31() {
  const spreadsheet = SpreadsheetApp.openById(KCLAB_STEP31_SURVEY_UPDATE.spreadsheetId);
  const jsonSheet = spreadsheet.getSheetByName('연동_JSON');
  if (!jsonSheet) {
    throw new Error('연동_JSON 시트를 찾지 못했습니다. updateKeyboardCostLabSurveyContentStep31()를 먼저 실행해 주세요.');
  }

  const manifestText = String(jsonSheet.getRange('A1').getValue() || '').trim();
  if (!manifestText) {
    throw new Error('연동_JSON 시트 A1이 비어 있습니다. updateKeyboardCostLabSurveyContentStep31()를 먼저 실행해 주세요.');
  }

  const manifest = JSON.parse(manifestText);
  Logger.log(JSON.stringify(manifest, null, 2));
  return manifest;
}

function updateStep31FormSettings_(form) {
  form
    .setTitle(KCLAB_STEP31_SURVEY_UPDATE.formTitle)
    .setDescription(buildStep31FormDescription_())
    .setConfirmationMessage(buildStep31ConfirmationMessage_())
    .setCollectEmail(false);
}

function buildStep31FormDescription_() {
  const config = KCLAB_STEP31_SURVEY_UPDATE;
  return [
    `${config.organizationName}는 키보드와 스위치를 사용할 때 화면의 이동 방식이 조작 부담에 어떤 차이를 만드는지 알아보기 위해 이 설문을 진행합니다.`,
    '',
    '설문을 작성하기 전에 아래 테스트 페이지에서 예약 캘린더, 댓글 목록, 검색 결과 목록 과업을 모두 진행해 주세요.',
    `테스트 페이지: ${config.testUrl}`,
    '',
    '이 테스트는 Windows, macOS 등을 사용하는 데스크톱이나 노트북 PC 환경을 기준으로 만들었습니다. 휴대전화나 태블릿이 아닌 PC에서 참여해 주세요.',
    '',
    '정답은 없습니다. 테스트 중 느낀 점을 그대로 답해 주세요. 참여는 자발적이며 언제든 그만둘 수 있습니다.',
    '답변을 제출하면 이 안내를 확인하고 설문 참여에 동의한 것으로 봅니다.',
    '',
    '응답은 키보드·스위치 탐색 구조의 점검 방법과 개선 기준을 마련하는 데 사용합니다. 기프티콘 지급을 원할 때만 설문 마지막의 성명과 휴대전화번호를 입력해 주세요.',
    `문의: ${config.privacyContact}`,
  ].join('\n');
}

function buildStep31ConfirmationMessage_() {
  return [
    '응답을 보내 주셔서 감사합니다.',
    '보내 주신 의견은 화면 탐색 구조와 조작 부담을 개선하는 데 활용하겠습니다.',
    '기프티콘 지급 정보를 입력한 경우에는 지급이 끝난 뒤 성명과 휴대전화번호를 지체 없이 파기합니다.',
  ].join('\n');
}

function updateStep31SectionHeaders_(form) {
  const closingHeader = findStep31SectionHeaderByTitles_(form, [KCLAB_STEP31_SURVEY_UPDATE.closingSectionTitle]);
  if (closingHeader) {
    closingHeader.asSectionHeaderItem()
      .setTitle(KCLAB_STEP31_SURVEY_UPDATE.closingSectionTitle)
      .setHelpText('세 가지 서비스를 모두 마친 경험을 떠올리며 답해 주세요.');
  }

  const autoHeader = findStep31SectionHeaderByTitles_(form, [KCLAB_STEP31_SURVEY_UPDATE.autoSectionTitle]);
  if (!autoHeader) {
    throw new Error(`섹션을 찾지 못했습니다: ${KCLAB_STEP31_SURVEY_UPDATE.autoSectionTitle}`);
  }
  autoHeader.asSectionHeaderItem()
    .setTitle(KCLAB_STEP31_SURVEY_UPDATE.autoSectionTitle)
    .setHelpText('아래 수행 기록은 테스트 페이지에서 세 가지 서비스를 모두 마치면 자동으로 입력됩니다. 직접 작성할 필요는 없습니다.');
}

function updateStep31ExistingItems_(form) {
  KCLAB_STEP31_ITEM_SPECS.forEach((spec) => {
    if (!spec.itemId) return;
    const item = resolveStep31ItemForSpec_(form, spec);
    updateStep31ItemByType_(item, spec);
  });
}

function ensureStep31IncentiveSection_(form) {
  const title = KCLAB_STEP31_SURVEY_UPDATE.incentiveSectionTitle;
  const aliases = [title, '기프티콘 지급 정보', '기프티콘 수령 정보(선택)'];
  let item = findStep31SectionHeaderByTitles_(form, aliases);
  if (!item) {
    item = form.addSectionHeaderItem();
  }

  item.asSectionHeaderItem()
    .setTitle(title)
    .setHelpText(buildStep31IncentivePrivacyNotice_());
  return item;
}

function buildStep31IncentivePrivacyNotice_() {
  const config = KCLAB_STEP31_SURVEY_UPDATE;
  return [
    '기프티콘 지급을 원하는 경우에만 아래 두 항목을 입력해 주세요.',
    '성명이나 휴대전화번호를 입력하면 해당 정보가 이 설문 응답과 함께 저장됩니다.',
    '',
    `수집·이용 주체: ${config.organizationName}`,
    '수집 항목: 성명, 휴대전화번호',
    '이용 목적: 설문 참여 기프티콘 발송 및 발송 확인',
    '보유·이용 기간: 기프티콘 지급 완료 시까지 보관하며, 지급이 끝난 뒤 지체 없이 파기합니다.',
    `개인정보 관련 문의: ${config.privacyContact}`,
    '',
    '개인정보 수집·이용에 동의하지 않아도 테스트와 설문에 참여할 수 있습니다. 다만 기프티콘은 받을 수 없습니다.',
    '성명 또는 휴대전화번호를 입력하면 위 개인정보 수집·이용 안내를 확인하고 동의한 것으로 봅니다. 동의하지 않으면 두 입력란을 모두 비워 두세요.',
    '기프티콘을 받으려면 성명과 휴대전화번호를 모두 입력해 주세요.',
  ].join('\n');
}

function ensureStep31TextItem_(form, spec) {
  let item = resolveStep31OptionalItemForSpec_(form, spec);
  if (!item) {
    item = form.addTextItem();
  }
  updateStep31ItemByType_(item, spec);
  return item;
}

function arrangeStep31IncentiveItems_(form, headerItem, nameItem, phoneItem) {
  const autoHeader = findStep31SectionHeaderByTitles_(form, [KCLAB_STEP31_SURVEY_UPDATE.autoSectionTitle]);
  if (!autoHeader) {
    throw new Error(`섹션을 찾지 못했습니다: ${KCLAB_STEP31_SURVEY_UPDATE.autoSectionTitle}`);
  }

  // 목표 순서: 기프티콘 섹션 제목 → 성명 → 휴대전화번호 → 자동 응답 영역.
  // ParagraphTextItem 전달 시 발생했던 moveItem 시그니처 문제를 피하기 위해
  // 모든 이동은 정수 인덱스 오버로드를 사용합니다.
  moveStep31ItemImmediatelyBefore_(form, phoneItem, autoHeader);
  moveStep31ItemImmediatelyBefore_(form, nameItem, phoneItem);
  moveStep31ItemImmediatelyBefore_(form, headerItem, nameItem);
}

function moveStep31ItemImmediatelyBefore_(form, item, anchorItem) {
  let fromIndex = item.getIndex();
  let targetIndex = anchorItem.getIndex();
  if (fromIndex < targetIndex) {
    targetIndex -= 1;
  }
  if (fromIndex !== targetIndex) {
    form.moveItem(fromIndex, targetIndex);
  }
}

function updateStep31ItemByType_(item, spec) {
  assertStep31ItemType_(item, spec);
  switch (spec.itemType) {
    case 'MULTIPLE_CHOICE':
      item.asMultipleChoiceItem()
        .setTitle(spec.title)
        .setHelpText(spec.helpText || '')
        .setRequired(Boolean(spec.required))
        .setChoiceValues(spec.choices || []);
      break;
    case 'CHECKBOX':
      item.asCheckboxItem()
        .setTitle(spec.title)
        .setHelpText(spec.helpText || '')
        .setRequired(Boolean(spec.required))
        .setChoiceValues(spec.choices || []);
      break;
    case 'PARAGRAPH_TEXT':
      item.asParagraphTextItem()
        .setTitle(spec.title)
        .setHelpText(spec.helpText || '')
        .setRequired(Boolean(spec.required));
      break;
    case 'TEXT':
      item.asTextItem()
        .setTitle(spec.title)
        .setHelpText(spec.helpText || '')
        .setRequired(Boolean(spec.required));
      break;
    default:
      throw new Error(`지원하지 않는 문항 형식입니다: ${spec.itemType}`);
  }
}

function assertStep31ItemType_(item, spec) {
  const expected = FormApp.ItemType[spec.itemType];
  if (!expected) {
    throw new Error(`알 수 없는 문항 형식입니다: ${spec.itemType}`);
  }
  if (item.getType() !== expected) {
    throw new Error(`문항 형식이 다릅니다. key=${spec.key}, expected=${spec.itemType}, actual=${item.getType()}`);
  }
}

function resolveStep31ItemForSpec_(form, spec) {
  if (spec.itemId) {
    const byId = form.getItemById(spec.itemId);
    if (byId) return byId;
  }

  const byTitle = findStep31QuestionItemByTitles_(form, spec.itemType, getStep31SpecTitles_(spec));
  if (byTitle) return byTitle;

  throw new Error(`문항을 찾지 못했습니다. key=${spec.key}, itemId=${spec.itemId || ''}, title=${spec.title}`);
}

function resolveStep31OptionalItemForSpec_(form, spec) {
  if (spec.itemId) {
    const byId = form.getItemById(spec.itemId);
    if (byId) return byId;
  }
  return findStep31QuestionItemByTitles_(form, spec.itemType, getStep31SpecTitles_(spec));
}

function getStep31SpecTitles_(spec) {
  return [spec.title].concat(spec.titleAliases || []);
}

function findStep31QuestionItemByTitles_(form, itemType, titles) {
  const type = FormApp.ItemType[itemType];
  if (!type) return null;
  const titleSet = {};
  titles.forEach((title) => { titleSet[String(title)] = true; });

  const items = form.getItems(type);
  for (let i = 0; i < items.length; i += 1) {
    const title = getStep31ItemTitle_(items[i]);
    if (titleSet[title]) return items[i];
  }
  return null;
}

function findStep31SectionHeaderByTitles_(form, titles) {
  const titleSet = {};
  titles.forEach((title) => { titleSet[String(title)] = true; });
  const items = form.getItems(FormApp.ItemType.SECTION_HEADER);
  for (let i = 0; i < items.length; i += 1) {
    const item = items[i].asSectionHeaderItem();
    if (titleSet[item.getTitle()]) return items[i];
  }
  return null;
}

function buildStep31SurveyManifest_(form, spreadsheet, updatedAt) {
  const enrichedItems = KCLAB_STEP31_ITEM_SPECS.map((spec) => {
    const item = resolveStep31ItemForSpec_(form, spec);
    return {
      key: spec.key,
      section: spec.section || '',
      title: getStep31ItemTitle_(item),
      helpText: getStep31ItemHelpText_(item),
      required: getStep31ItemRequired_(item),
      itemId: item.getId(),
      itemType: String(item.getType()),
      responseType: spec.responseType || 'string',
      choices: getStep31Choices_(item),
      prefillParam: getStep31PrefillParamName_(form, item.getId()),
    };
  });

  const formResponseUrl = form.getPublishedUrl();
  let shortFormUrl = '';
  try {
    shortFormUrl = form.shortenFormUrl(formResponseUrl);
  } catch (error) {
    shortFormUrl = '';
  }

  return {
    schemaVersion: KCLAB_STEP31_SURVEY_UPDATE.schemaVersion,
    generatedAt: updatedAt.toISOString(),
    formId: form.getId(),
    formTitle: form.getTitle(),
    formDescription: form.getDescription(),
    confirmationMessage: form.getConfirmationMessage(),
    formEditUrl: form.getEditUrl(),
    formResponseUrl,
    formShortUrl: shortFormUrl,
    spreadsheetId: spreadsheet.getId(),
    spreadsheetUrl: spreadsheet.getUrl(),
    testUrl: KCLAB_STEP31_SURVEY_UPDATE.testUrl,
    services: KCLAB_STEP31_SERVICE_SPECS.map((service) => ({
      id: service.id,
      label: service.label,
      taskCount: service.taskCount,
      tasks: service.tasks.slice(),
    })),
    incentivePrivacy: {
      organizationName: KCLAB_STEP31_SURVEY_UPDATE.organizationName,
      collectedItems: ['성명', '휴대전화번호'],
      purpose: '설문 참여 기프티콘 발송 및 발송 확인',
      retention: '기프티콘 지급 완료 시까지 보관하며, 지급이 끝난 뒤 지체 없이 파기',
      consentMethod: '성명 또는 휴대전화번호 입력 시 동의한 것으로 안내',
      privacyContact: KCLAB_STEP31_SURVEY_UPDATE.privacyContact,
    },
    requiredKeys: enrichedItems.filter((item) => item.required).map((item) => item.key),
    optionalKeys: enrichedItems.filter((item) => !item.required).map((item) => item.key),
    items: enrichedItems,
    exampleAnswers: getStep31ExampleAnswers_(),
  };
}

function saveStep31SurveyPointer_(manifest) {
  PropertiesService.getScriptProperties().setProperty(
    KCLAB_STEP31_SURVEY_UPDATE.pointerProperty,
    JSON.stringify({
      formId: manifest.formId,
      spreadsheetId: manifest.spreadsheetId,
      schemaVersion: manifest.schemaVersion,
    })
  );
}

function writeStep31IntegrationSheets_(spreadsheet, manifest) {
  const guideSheet = getOrCreateStep31Sheet_(spreadsheet, '연동_안내');
  const mapSheet = getOrCreateStep31Sheet_(spreadsheet, '문항_맵');
  const jsonSheet = getOrCreateStep31Sheet_(spreadsheet, '연동_JSON');

  guideSheet.clear();
  mapSheet.clear();
  jsonSheet.clear();

  const guideRows = [
    ['항목', '값'],
    ['스키마 버전', manifest.schemaVersion],
    ['갱신 시각', manifest.generatedAt],
    ['설문 제목', manifest.formTitle],
    ['테스트 페이지 URL', manifest.testUrl],
    ['응답 URL', manifest.formResponseUrl],
    ['짧은 응답 URL', manifest.formShortUrl || ''],
    ['수정 URL', manifest.formEditUrl],
    ['응답 시트 URL', manifest.spreadsheetUrl],
    ['Form ID', manifest.formId],
    ['Spreadsheet ID', manifest.spreadsheetId],
    ['', ''],
    ['다음 웹앱 연동에 필요한 값', '응답 URL, 응답 시트 URL, 연동_JSON 시트 A1 내용'],
    ['개인정보 안내 확인', '공개 전 운영 기관명, 문의처, 지급·파기 절차와 동의 방식을 확인'],
  ];
  guideSheet.getRange(1, 1, guideRows.length, guideRows[0].length).setValues(guideRows);
  guideSheet.autoResizeColumns(1, 2);

  const mapRows = [
    ['key', 'section', 'title', 'helpText', 'itemType', 'responseType', 'required', 'itemId', 'prefillParam', 'choices'],
  ];
  manifest.items.forEach((item) => {
    mapRows.push([
      item.key,
      item.section,
      item.title,
      item.helpText || '',
      item.itemType,
      item.responseType,
      item.required ? 'Y' : 'N',
      item.itemId,
      item.prefillParam || '',
      item.choices.join(' | '),
    ]);
  });
  mapSheet.getRange(1, 1, mapRows.length, mapRows[0].length).setValues(mapRows);
  mapSheet.autoResizeColumns(1, mapRows[0].length);

  jsonSheet.getRange('A1').setValue(JSON.stringify(manifest, null, 2));
  jsonSheet.getRange('A1').setWrap(true);
  jsonSheet.setColumnWidth(1, 900);
  jsonSheet.setRowHeight(1, 900);

  SpreadsheetApp.flush();
}

function getOrCreateStep31Sheet_(spreadsheet, name) {
  return spreadsheet.getSheetByName(name) || spreadsheet.insertSheet(name);
}

function getStep31SpecByKey_(key) {
  for (let i = 0; i < KCLAB_STEP31_ITEM_SPECS.length; i += 1) {
    if (KCLAB_STEP31_ITEM_SPECS[i].key === key) return KCLAB_STEP31_ITEM_SPECS[i];
  }
  throw new Error(`문항 사양을 찾지 못했습니다: ${key}`);
}

function getStep31ItemTitle_(item) {
  switch (item.getType()) {
    case FormApp.ItemType.MULTIPLE_CHOICE:
      return item.asMultipleChoiceItem().getTitle();
    case FormApp.ItemType.CHECKBOX:
      return item.asCheckboxItem().getTitle();
    case FormApp.ItemType.PARAGRAPH_TEXT:
      return item.asParagraphTextItem().getTitle();
    case FormApp.ItemType.TEXT:
      return item.asTextItem().getTitle();
    default:
      return item.getTitle ? item.getTitle() : '';
  }
}

function getStep31ItemHelpText_(item) {
  switch (item.getType()) {
    case FormApp.ItemType.MULTIPLE_CHOICE:
      return item.asMultipleChoiceItem().getHelpText();
    case FormApp.ItemType.CHECKBOX:
      return item.asCheckboxItem().getHelpText();
    case FormApp.ItemType.PARAGRAPH_TEXT:
      return item.asParagraphTextItem().getHelpText();
    case FormApp.ItemType.TEXT:
      return item.asTextItem().getHelpText();
    default:
      return '';
  }
}

function getStep31ItemRequired_(item) {
  switch (item.getType()) {
    case FormApp.ItemType.MULTIPLE_CHOICE:
      return item.asMultipleChoiceItem().isRequired();
    case FormApp.ItemType.CHECKBOX:
      return item.asCheckboxItem().isRequired();
    case FormApp.ItemType.PARAGRAPH_TEXT:
      return item.asParagraphTextItem().isRequired();
    case FormApp.ItemType.TEXT:
      return item.asTextItem().isRequired();
    default:
      return false;
  }
}

function getStep31Choices_(item) {
  switch (item.getType()) {
    case FormApp.ItemType.MULTIPLE_CHOICE:
      return item.asMultipleChoiceItem().getChoices().map((choice) => choice.getValue());
    case FormApp.ItemType.CHECKBOX:
      return item.asCheckboxItem().getChoices().map((choice) => choice.getValue());
    default:
      return [];
  }
}

function getStep31PrefillParamName_(form, itemId) {
  const item = form.getItemById(itemId);
  if (!item) return '';

  const response = form.createResponse();
  let itemResponse = null;

  switch (item.getType()) {
    case FormApp.ItemType.TEXT:
      itemResponse = item.asTextItem().createResponse(`probe-${itemId}`);
      break;
    case FormApp.ItemType.PARAGRAPH_TEXT:
      itemResponse = item.asParagraphTextItem().createResponse(`probe-${itemId}`);
      break;
    case FormApp.ItemType.MULTIPLE_CHOICE: {
      const target = item.asMultipleChoiceItem();
      const choices = target.getChoices();
      if (!choices.length) return '';
      itemResponse = target.createResponse(choices[0].getValue());
      break;
    }
    case FormApp.ItemType.CHECKBOX: {
      const target = item.asCheckboxItem();
      const choices = target.getChoices();
      if (!choices.length) return '';
      itemResponse = target.createResponse([choices[0].getValue()]);
      break;
    }
    default:
      return '';
  }

  response.withItemResponse(itemResponse);
  const prefilledUrl = response.toPrefilledUrl();
  const query = prefilledUrl.split('?')[1] || '';
  const keys = query
    .split('&')
    .map((part) => part.split('=')[0])
    .filter((key) => key && key.indexOf('entry.') === 0);

  return keys.length ? keys[0] : '';
}

function getStep31ExampleAnswers_() {
  return {
    'participant.primaryInput': '화면낭독기와 키보드 함께 사용',
    'participant.assistiveTech': ['화면낭독기'],
    'participant.inputFamiliarity': '높음',
    'participant.hardestService': '예약 캘린더',
    'participant.navigationDifficultyAndImprovement': '자료 목록으로 돌아온 뒤 방금 보던 위치를 다시 찾는 과정이 불편했습니다. 목록으로 돌아왔을 때 이전 위치가 유지되면 좋겠습니다.',
    'participant.smoothServiceExample': '자료 목록에서 검색 조건이 잘 구분되고 상세 화면에서 돌아왔을 때 이전 위치가 유지되는 서비스가 탐색하기 쉬웠습니다.',
    'service.calendar.findTarget': '비교안 B가 조금 더 쉬웠다',
    'service.calendar.returnAfterDetail': '비교안 B가 조금 더 쉬웠다',
    'service.calendar.overallBurden': '비교안 B가 훨씬 쉬웠다',
    'service.calendar.discomfort': '일정 목록으로 돌아온 뒤 방금 보던 위치를 다시 찾는 과정이 부담스러웠습니다.',
    'service.calendar.actualA': '수행 시간 82.4초, 키 입력 136회, 초점 이동 129회, 목표와 다른 선택 2회, 위치 다시 찾기 3회, 수행 완료 2개, 완료하지 못한 과업 0개',
    'service.calendar.actualB': '수행 시간 49.6초, 키 입력 71회, 초점 이동 66회, 목표와 다른 선택 0회, 위치 다시 찾기 1회, 수행 완료 2개, 완료하지 못한 과업 0개',
    'service.comments.findTarget': '비교안 B가 훨씬 쉬웠다',
    'service.comments.returnAfterDetail': '비교안 B가 조금 더 쉬웠다',
    'service.comments.overallBurden': '비교안 B가 훨씬 쉬웠다',
    'service.comments.discomfort': '댓글 정보 보기를 닫은 뒤 댓글 목록의 위치를 다시 파악하는 과정이 부담스러웠습니다.',
    'service.comments.actualA': '수행 시간 82.4초, 키 입력 136회, 초점 이동 129회, 목표와 다른 선택 2회, 위치 다시 찾기 3회, 수행 완료 2개, 완료하지 못한 과업 0개',
    'service.comments.actualB': '수행 시간 49.6초, 키 입력 71회, 초점 이동 66회, 목표와 다른 선택 0회, 위치 다시 찾기 1회, 수행 완료 2개, 완료하지 못한 과업 0개',
    'service.search.findTarget': '비교안 B가 훨씬 쉬웠다',
    'service.search.returnAfterDetail': '비교안 B가 조금 더 쉬웠다',
    'service.search.overallBurden': '비교안 B가 훨씬 쉬웠다',
    'service.search.discomfort': '저장 옵션을 확인한 뒤 자료 목록에서 방금 보던 자료를 다시 찾는 과정이 부담스러웠습니다.',
    'service.search.actualA': '수행 시간 82.4초, 키 입력 136회, 초점 이동 129회, 목표와 다른 선택 2회, 위치 다시 찾기 3회, 수행 완료 2개, 완료하지 못한 과업 0개',
    'service.search.actualB': '수행 시간 49.6초, 키 입력 71회, 초점 이동 66회, 목표와 다른 선택 0회, 위치 다시 찾기 1회, 수행 완료 2개, 완료하지 못한 과업 0개',
  };
}
