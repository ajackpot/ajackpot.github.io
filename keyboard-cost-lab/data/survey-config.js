// This file is generated from the Google Form integration manifest.
// It contains only public form metadata and entry IDs needed to open a prefilled response URL.

export const surveyManifest = {
  "schemaVersion": "step-25-survey-v2",
  "generatedAt": "2026-06-23T15:44:44.717Z",
  "formResponseUrl": "https://docs.google.com/forms/d/e/1FAIpQLSemi3uTIInVoUpvcLQFC5gfSyzBEdoaZk33L9BTJmSCc5uLSg/viewform",
  "formShortUrl": "https://forms.gle/eZqs5KC7P71ZMaRR8",
  "services": [
    {
      "id": "calendar",
      "label": "예약 캘린더",
      "taskCount": 2,
      "tasks": [
        "비대면 상담 시간 예약과 상담 옵션 선택",
        "기존 예약 취소 뒤 목요일 오전 대면 예약"
      ]
    },
    {
      "id": "comments",
      "label": "댓글 목록",
      "taskCount": 2,
      "tasks": [
        "최신 후기에서 특정 댓글의 답글 작성자 확인",
        "운영자 안내 댓글 정보 확인 뒤 도움이 돼요 누르기"
      ]
    },
    {
      "id": "search",
      "label": "검색 결과 목록",
      "taskCount": 2,
      "tasks": [
        "최신 안내문 미리보기에서 예약 변경 기준 확인",
        "제목순 질문답변에서 비대면 상담 연결 방법 저장"
      ]
    }
  ],
  "requiredKeys": [
    "service.calendar.findTarget",
    "service.calendar.returnAfterDetail",
    "service.calendar.overallBurden",
    "service.calendar.discomfort",
    "service.comments.findTarget",
    "service.comments.returnAfterDetail",
    "service.comments.overallBurden",
    "service.comments.discomfort",
    "service.search.findTarget",
    "service.search.returnAfterDetail",
    "service.search.overallBurden",
    "service.search.discomfort",
    "participant.primaryInput",
    "participant.assistiveTech",
    "participant.hardestService",
    "participant.navigationDifficultyAndImprovement"
  ],
  "optionalKeys": [
    "service.calendar.actualA",
    "service.calendar.actualB",
    "service.comments.actualA",
    "service.comments.actualB",
    "service.search.actualA",
    "service.search.actualB"
  ],
  "items": [
    {
      "key": "service.calendar.findTarget",
      "section": "예약 캘린더",
      "title": "상담 예약 시간과 예약 조건을 찾고 맞추기에는 어느 화면이 더 쉬웠습니까?",
      "itemType": "MULTIPLE_CHOICE",
      "responseType": "string",
      "required": true,
      "prefillParam": "entry.1047037929",
      "choices": [
        "비교안 A가 훨씬 쉬웠다",
        "비교안 A가 조금 더 쉬웠다",
        "비슷했다",
        "비교안 B가 조금 더 쉬웠다",
        "비교안 B가 훨씬 쉬웠다"
      ]
    },
    {
      "key": "service.calendar.returnAfterDetail",
      "section": "예약 캘린더",
      "title": "예약 시간 안내, 예약 확인, 취소 뒤 새 예약처럼 중간에 화면이 바뀐 뒤 다시 이어 가기에는 어느 화면이 더 쉬웠습니까?",
      "itemType": "MULTIPLE_CHOICE",
      "responseType": "string",
      "required": true,
      "prefillParam": "entry.559720980",
      "choices": [
        "비교안 A가 훨씬 쉬웠다",
        "비교안 A가 조금 더 쉬웠다",
        "비슷했다",
        "비교안 B가 조금 더 쉬웠다",
        "비교안 B가 훨씬 쉬웠다"
      ]
    },
    {
      "key": "service.calendar.overallBurden",
      "section": "예약 캘린더",
      "title": "예약 캘린더 과업을 끝내기까지 전체 조작 부담은 어느 화면이 더 적었습니까?",
      "itemType": "MULTIPLE_CHOICE",
      "responseType": "string",
      "required": true,
      "prefillParam": "entry.490789904",
      "choices": [
        "비교안 A가 훨씬 쉬웠다",
        "비교안 A가 조금 더 쉬웠다",
        "비슷했다",
        "비교안 B가 조금 더 쉬웠다",
        "비교안 B가 훨씬 쉬웠다"
      ]
    },
    {
      "key": "service.calendar.discomfort",
      "section": "예약 캘린더",
      "title": "예약 캘린더에서 어떤 부분이 불편했습니까?",
      "itemType": "PARAGRAPH_TEXT",
      "responseType": "string",
      "required": true,
      "prefillParam": "entry.1045263891",
      "choices": []
    },
    {
      "key": "service.comments.findTarget",
      "section": "댓글 목록",
      "title": "정렬 기준과 댓글 종류를 바꾼 뒤 원하는 댓글이나 답글을 찾기에는 어느 화면이 더 쉬웠습니까?",
      "itemType": "MULTIPLE_CHOICE",
      "responseType": "string",
      "required": true,
      "prefillParam": "entry.1225661081",
      "choices": [
        "비교안 A가 훨씬 쉬웠다",
        "비교안 A가 조금 더 쉬웠다",
        "비슷했다",
        "비교안 B가 조금 더 쉬웠다",
        "비교안 B가 훨씬 쉬웠다"
      ]
    },
    {
      "key": "service.comments.returnAfterDetail",
      "section": "댓글 목록",
      "title": "답글 목록이나 댓글 정보 보기를 확인한 뒤 방금 하던 작업으로 돌아가기는 어느 화면이 더 쉬웠습니까?",
      "itemType": "MULTIPLE_CHOICE",
      "responseType": "string",
      "required": true,
      "prefillParam": "entry.32362475",
      "choices": [
        "비교안 A가 훨씬 쉬웠다",
        "비교안 A가 조금 더 쉬웠다",
        "비슷했다",
        "비교안 B가 조금 더 쉬웠다",
        "비교안 B가 훨씬 쉬웠다"
      ]
    },
    {
      "key": "service.comments.overallBurden",
      "section": "댓글 목록",
      "title": "댓글 목록 과업을 끝내기까지 전체 조작 부담은 어느 화면이 더 적었습니까?",
      "itemType": "MULTIPLE_CHOICE",
      "responseType": "string",
      "required": true,
      "prefillParam": "entry.43138025",
      "choices": [
        "비교안 A가 훨씬 쉬웠다",
        "비교안 A가 조금 더 쉬웠다",
        "비슷했다",
        "비교안 B가 조금 더 쉬웠다",
        "비교안 B가 훨씬 쉬웠다"
      ]
    },
    {
      "key": "service.comments.discomfort",
      "section": "댓글 목록",
      "title": "댓글 목록에서 어떤 부분이 불편했습니까?",
      "itemType": "PARAGRAPH_TEXT",
      "responseType": "string",
      "required": true,
      "prefillParam": "entry.465150015",
      "choices": []
    },
    {
      "key": "service.search.findTarget",
      "section": "검색 결과 목록",
      "title": "정렬 기준과 자료 범위를 바꾼 뒤 원하는 자료를 찾기에는 어느 화면이 더 쉬웠습니까?",
      "itemType": "MULTIPLE_CHOICE",
      "responseType": "string",
      "required": true,
      "prefillParam": "entry.1105499647",
      "choices": [
        "비교안 A가 훨씬 쉬웠다",
        "비교안 A가 조금 더 쉬웠다",
        "비슷했다",
        "비교안 B가 조금 더 쉬웠다",
        "비교안 B가 훨씬 쉬웠다"
      ]
    },
    {
      "key": "service.search.returnAfterDetail",
      "section": "검색 결과 목록",
      "title": "미리보기를 확인하거나 저장 옵션을 선택한 뒤 방금 보던 자료 작업으로 돌아가기는 어느 화면이 더 쉬웠습니까?",
      "itemType": "MULTIPLE_CHOICE",
      "responseType": "string",
      "required": true,
      "prefillParam": "entry.1095330287",
      "choices": [
        "비교안 A가 훨씬 쉬웠다",
        "비교안 A가 조금 더 쉬웠다",
        "비슷했다",
        "비교안 B가 조금 더 쉬웠다",
        "비교안 B가 훨씬 쉬웠다"
      ]
    },
    {
      "key": "service.search.overallBurden",
      "section": "검색 결과 목록",
      "title": "검색 결과 목록 과업을 끝내기까지 전체 조작 부담은 어느 화면이 더 적었습니까?",
      "itemType": "MULTIPLE_CHOICE",
      "responseType": "string",
      "required": true,
      "prefillParam": "entry.1064680004",
      "choices": [
        "비교안 A가 훨씬 쉬웠다",
        "비교안 A가 조금 더 쉬웠다",
        "비슷했다",
        "비교안 B가 조금 더 쉬웠다",
        "비교안 B가 훨씬 쉬웠다"
      ]
    },
    {
      "key": "service.search.discomfort",
      "section": "검색 결과 목록",
      "title": "검색 결과 목록에서 어떤 부분이 불편했습니까?",
      "itemType": "PARAGRAPH_TEXT",
      "responseType": "string",
      "required": true,
      "prefillParam": "entry.1832413737",
      "choices": []
    },
    {
      "key": "participant.primaryInput",
      "section": "전체 응답",
      "title": "이번 테스트에서 주로 사용한 입력 방식은 무엇입니까?",
      "itemType": "MULTIPLE_CHOICE",
      "responseType": "string",
      "required": true,
      "prefillParam": "entry.834809743",
      "choices": [
        "키보드 중심으로 사용",
        "화면낭독기와 키보드 함께 사용",
        "스위치 사용",
        "키보드와 다른 보조기술 함께 사용",
        "마우스 또는 터치도 함께 사용",
        "기타"
      ]
    },
    {
      "key": "participant.assistiveTech",
      "section": "전체 응답",
      "title": "함께 쓴 보조기술 또는 사용 방식은 무엇입니까?",
      "itemType": "CHECKBOX",
      "responseType": "string[]",
      "required": true,
      "prefillParam": "entry.1052153915",
      "choices": [
        "화면낭독기",
        "화면 확대",
        "큰 글자 또는 높은 대비 설정",
        "음성 입력",
        "스위치",
        "점자정보단말기 또는 점자 디스플레이",
        "해당 없음"
      ]
    },
    {
      "key": "participant.hardestService",
      "section": "전체 응답",
      "title": "전체적으로 가장 부담이 컸던 서비스는 무엇입니까?",
      "itemType": "MULTIPLE_CHOICE",
      "responseType": "string",
      "required": true,
      "prefillParam": "entry.184247267",
      "choices": [
        "예약 캘린더",
        "댓글 목록",
        "검색 결과 목록"
      ]
    },
    {
      "key": "participant.navigationDifficultyAndImprovement",
      "section": "전체 응답",
      "title": "테스트 전체에서 탐색하면서 가장 불편했던 부분과 개선되었으면 하는 점을 적어 주십시오.",
      "itemType": "PARAGRAPH_TEXT",
      "responseType": "string",
      "required": true,
      "prefillParam": "entry.763940614",
      "choices": []
    },
    {
      "key": "service.calendar.actualA",
      "section": "자동 응답 영역",
      "title": "예약 캘린더 비교안 A 수행 기록",
      "itemType": "PARAGRAPH_TEXT",
      "responseType": "string",
      "required": false,
      "prefillParam": "entry.384462370",
      "choices": []
    },
    {
      "key": "service.calendar.actualB",
      "section": "자동 응답 영역",
      "title": "예약 캘린더 비교안 B 수행 기록",
      "itemType": "PARAGRAPH_TEXT",
      "responseType": "string",
      "required": false,
      "prefillParam": "entry.1394688977",
      "choices": []
    },
    {
      "key": "service.comments.actualA",
      "section": "자동 응답 영역",
      "title": "댓글 목록 비교안 A 수행 기록",
      "itemType": "PARAGRAPH_TEXT",
      "responseType": "string",
      "required": false,
      "prefillParam": "entry.953355017",
      "choices": []
    },
    {
      "key": "service.comments.actualB",
      "section": "자동 응답 영역",
      "title": "댓글 목록 비교안 B 수행 기록",
      "itemType": "PARAGRAPH_TEXT",
      "responseType": "string",
      "required": false,
      "prefillParam": "entry.1400713818",
      "choices": []
    },
    {
      "key": "service.search.actualA",
      "section": "자동 응답 영역",
      "title": "검색 결과 목록 비교안 A 수행 기록",
      "itemType": "PARAGRAPH_TEXT",
      "responseType": "string",
      "required": false,
      "prefillParam": "entry.1883026371",
      "choices": []
    },
    {
      "key": "service.search.actualB",
      "section": "자동 응답 영역",
      "title": "검색 결과 목록 비교안 B 수행 기록",
      "itemType": "PARAGRAPH_TEXT",
      "responseType": "string",
      "required": false,
      "prefillParam": "entry.1713865756",
      "choices": []
    }
  ]
};

export const surveyPrefillParams = Object.fromEntries(
  surveyManifest.items.map((item) => [item.key, item.prefillParam])
);

export function getSurveyItemByKey(key) {
  return surveyManifest.items.find((item) => item.key === key) ?? null;
}
