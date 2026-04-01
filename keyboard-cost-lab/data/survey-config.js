export const surveyConfig = {
  "formId": "1-C5maBndEIAkBaWLcLWUx-bBBi45twDYnwq-BBS2VVc",
  "responseUrl": "https://docs.google.com/forms/d/e/1FAIpQLSct_-0GyMI1dsW0MOFGQBD1o8Hq5G-uph4uFHUaVFBV2gH60Q/viewform",
  "shortUrl": "https://forms.gle/Fqdsc9yiEj1hLNF19",
  "studyVersion": "step-13",
  "serviceIds": [
    "calendar",
    "comments",
    "product",
    "search",
    "settings",
    "filters",
    "checkout"
  ],
  "serviceQuestionKeys": {
    "calendar": [
      "service.calendar.findTarget",
      "service.calendar.returnAfterDetail",
      "service.calendar.overallBurden"
    ],
    "comments": [
      "service.comments.findTarget",
      "service.comments.returnAfterDetail",
      "service.comments.overallBurden"
    ],
    "product": [
      "service.product.findTarget",
      "service.product.returnAfterDetail",
      "service.product.overallBurden"
    ],
    "search": [
      "service.search.findTarget",
      "service.search.returnAfterDetail",
      "service.search.overallBurden"
    ],
    "settings": [
      "service.settings.findTarget",
      "service.settings.returnAfterDetail",
      "service.settings.overallBurden"
    ],
    "filters": [
      "service.filters.findTarget",
      "service.filters.returnAfterDetail",
      "service.filters.overallBurden"
    ],
    "checkout": [
      "service.checkout.findTarget",
      "service.checkout.returnAfterDetail",
      "service.checkout.overallBurden"
    ]
  },
  "serviceAutoKeys": {
    "calendar": [
      "service.calendar.order",
      "service.calendar.actualA",
      "service.calendar.actualB"
    ],
    "comments": [
      "service.comments.order",
      "service.comments.actualA",
      "service.comments.actualB"
    ],
    "product": [
      "service.product.order",
      "service.product.actualA",
      "service.product.actualB"
    ],
    "search": [
      "service.search.order",
      "service.search.actualA",
      "service.search.actualB"
    ],
    "settings": [
      "service.settings.order",
      "service.settings.actualA",
      "service.settings.actualB"
    ],
    "filters": [
      "service.filters.order",
      "service.filters.actualA",
      "service.filters.actualB"
    ],
    "checkout": [
      "service.checkout.order",
      "service.checkout.actualA",
      "service.checkout.actualB"
    ]
  },
  "participantKeys": [
    "participant.primaryInput",
    "participant.assistiveTech",
    "participant.hardestService",
    "participant.overallStructure",
    "participant.overallComment"
  ],
  "metaKeys": [
    "meta.sessionId",
    "meta.completedServicesOrder",
    "meta.studyVersion"
  ],
  "itemByKey": {
    "service.calendar.findTarget": {
      "key": "service.calendar.findTarget",
      "section": "예약 캘린더",
      "title": "원하는 예약 시간을 찾기에는 어느 화면이 더 쉬웠습니까?",
      "helpText": "비교안 A와 비교안 B를 모두 수행한 뒤 가장 가까운 답을 고르십시오.",
      "required": true,
      "itemId": 245231047,
      "itemType": "MULTIPLE_CHOICE",
      "responseType": "string",
      "choices": [
        "비교안 A가 훨씬 쉬웠다",
        "비교안 A가 조금 더 쉬웠다",
        "비슷했다",
        "비교안 B가 조금 더 쉬웠다",
        "비교안 B가 훨씬 쉬웠다"
      ],
      "prefillParam": "entry.1581969450"
    },
    "service.calendar.returnAfterDetail": {
      "key": "service.calendar.returnAfterDetail",
      "section": "예약 캘린더",
      "title": "시간 안내나 예약 확인 창을 본 뒤 방금 보던 예약 시간으로 다시 돌아가기는 어느 화면이 더 쉬웠습니까?",
      "helpText": "설명, 미리보기, 확인 창처럼 잠깐 다른 내용을 본 뒤 다시 돌아가는 상황을 떠올리며 답하십시오.",
      "required": true,
      "itemId": 584441138,
      "itemType": "MULTIPLE_CHOICE",
      "responseType": "string",
      "choices": [
        "비교안 A가 훨씬 쉬웠다",
        "비교안 A가 조금 더 쉬웠다",
        "비슷했다",
        "비교안 B가 조금 더 쉬웠다",
        "비교안 B가 훨씬 쉬웠다"
      ],
      "prefillParam": "entry.1873106342"
    },
    "service.calendar.overallBurden": {
      "key": "service.calendar.overallBurden",
      "section": "예약 캘린더",
      "title": "원하는 예약 시간에 도달하기까지 전체 조작 부담은 어느 화면이 더 적었습니까?",
      "helpText": "키 입력, 초점 이동, 다시 찾기, 실수 후 복구까지 포함한 전체 부담을 기준으로 답하십시오.",
      "required": true,
      "itemId": 532407149,
      "itemType": "MULTIPLE_CHOICE",
      "responseType": "string",
      "choices": [
        "비교안 A가 훨씬 쉬웠다",
        "비교안 A가 조금 더 쉬웠다",
        "비슷했다",
        "비교안 B가 조금 더 쉬웠다",
        "비교안 B가 훨씬 쉬웠다"
      ],
      "prefillParam": "entry.1292873094"
    },
    "service.comments.findTarget": {
      "key": "service.comments.findTarget",
      "section": "댓글 목록",
      "title": "원하는 댓글을 찾기에는 어느 화면이 더 쉬웠습니까?",
      "helpText": "비교안 A와 비교안 B를 모두 수행한 뒤 가장 가까운 답을 고르십시오.",
      "required": true,
      "itemId": 1580416034,
      "itemType": "MULTIPLE_CHOICE",
      "responseType": "string",
      "choices": [
        "비교안 A가 훨씬 쉬웠다",
        "비교안 A가 조금 더 쉬웠다",
        "비슷했다",
        "비교안 B가 조금 더 쉬웠다",
        "비교안 B가 훨씬 쉬웠다"
      ],
      "prefillParam": "entry.2142934158"
    },
    "service.comments.returnAfterDetail": {
      "key": "service.comments.returnAfterDetail",
      "section": "댓글 목록",
      "title": "댓글 정보나 답글을 본 뒤 방금 보던 댓글 작업으로 다시 돌아가기는 어느 화면이 더 쉬웠습니까?",
      "helpText": "설명, 미리보기, 확인 창처럼 잠깐 다른 내용을 본 뒤 다시 돌아가는 상황을 떠올리며 답하십시오.",
      "required": true,
      "itemId": 998006613,
      "itemType": "MULTIPLE_CHOICE",
      "responseType": "string",
      "choices": [
        "비교안 A가 훨씬 쉬웠다",
        "비교안 A가 조금 더 쉬웠다",
        "비슷했다",
        "비교안 B가 조금 더 쉬웠다",
        "비교안 B가 훨씬 쉬웠다"
      ],
      "prefillParam": "entry.40966401"
    },
    "service.comments.overallBurden": {
      "key": "service.comments.overallBurden",
      "section": "댓글 목록",
      "title": "원하는 댓글 작업에 도달하기까지 전체 조작 부담은 어느 화면이 더 적었습니까?",
      "helpText": "키 입력, 초점 이동, 다시 찾기, 실수 후 복구까지 포함한 전체 부담을 기준으로 답하십시오.",
      "required": true,
      "itemId": 1557899666,
      "itemType": "MULTIPLE_CHOICE",
      "responseType": "string",
      "choices": [
        "비교안 A가 훨씬 쉬웠다",
        "비교안 A가 조금 더 쉬웠다",
        "비슷했다",
        "비교안 B가 조금 더 쉬웠다",
        "비교안 B가 훨씬 쉬웠다"
      ],
      "prefillParam": "entry.1020225058"
    },
    "service.product.findTarget": {
      "key": "service.product.findTarget",
      "section": "상품 옵션 선택",
      "title": "원하는 옵션 조합을 맞추기에는 어느 화면이 더 쉬웠습니까?",
      "helpText": "비교안 A와 비교안 B를 모두 수행한 뒤 가장 가까운 답을 고르십시오.",
      "required": true,
      "itemId": 1722114087,
      "itemType": "MULTIPLE_CHOICE",
      "responseType": "string",
      "choices": [
        "비교안 A가 훨씬 쉬웠다",
        "비교안 A가 조금 더 쉬웠다",
        "비슷했다",
        "비교안 B가 조금 더 쉬웠다",
        "비교안 B가 훨씬 쉬웠다"
      ],
      "prefillParam": "entry.1786411872"
    },
    "service.product.returnAfterDetail": {
      "key": "service.product.returnAfterDetail",
      "section": "상품 옵션 선택",
      "title": "옵션 설명을 본 뒤 방금 고르던 옵션으로 다시 돌아가기는 어느 화면이 더 쉬웠습니까?",
      "helpText": "설명, 미리보기, 확인 창처럼 잠깐 다른 내용을 본 뒤 다시 돌아가는 상황을 떠올리며 답하십시오.",
      "required": true,
      "itemId": 1519180207,
      "itemType": "MULTIPLE_CHOICE",
      "responseType": "string",
      "choices": [
        "비교안 A가 훨씬 쉬웠다",
        "비교안 A가 조금 더 쉬웠다",
        "비슷했다",
        "비교안 B가 조금 더 쉬웠다",
        "비교안 B가 훨씬 쉬웠다"
      ],
      "prefillParam": "entry.890333814"
    },
    "service.product.overallBurden": {
      "key": "service.product.overallBurden",
      "section": "상품 옵션 선택",
      "title": "장바구니에 담기까지 전체 조작 부담은 어느 화면이 더 적었습니까?",
      "helpText": "키 입력, 초점 이동, 다시 찾기, 실수 후 복구까지 포함한 전체 부담을 기준으로 답하십시오.",
      "required": true,
      "itemId": 1325496321,
      "itemType": "MULTIPLE_CHOICE",
      "responseType": "string",
      "choices": [
        "비교안 A가 훨씬 쉬웠다",
        "비교안 A가 조금 더 쉬웠다",
        "비슷했다",
        "비교안 B가 조금 더 쉬웠다",
        "비교안 B가 훨씬 쉬웠다"
      ],
      "prefillParam": "entry.514490834"
    },
    "service.search.findTarget": {
      "key": "service.search.findTarget",
      "section": "검색 결과 목록",
      "title": "원하는 자료를 찾기에는 어느 화면이 더 쉬웠습니까?",
      "helpText": "비교안 A와 비교안 B를 모두 수행한 뒤 가장 가까운 답을 고르십시오.",
      "required": true,
      "itemId": 1677158141,
      "itemType": "MULTIPLE_CHOICE",
      "responseType": "string",
      "choices": [
        "비교안 A가 훨씬 쉬웠다",
        "비교안 A가 조금 더 쉬웠다",
        "비슷했다",
        "비교안 B가 조금 더 쉬웠다",
        "비교안 B가 훨씬 쉬웠다"
      ],
      "prefillParam": "entry.74061500"
    },
    "service.search.returnAfterDetail": {
      "key": "service.search.returnAfterDetail",
      "section": "검색 결과 목록",
      "title": "미리보기를 본 뒤 방금 보던 자료 작업으로 다시 돌아가기는 어느 화면이 더 쉬웠습니까?",
      "helpText": "설명, 미리보기, 확인 창처럼 잠깐 다른 내용을 본 뒤 다시 돌아가는 상황을 떠올리며 답하십시오.",
      "required": true,
      "itemId": 894200904,
      "itemType": "MULTIPLE_CHOICE",
      "responseType": "string",
      "choices": [
        "비교안 A가 훨씬 쉬웠다",
        "비교안 A가 조금 더 쉬웠다",
        "비슷했다",
        "비교안 B가 조금 더 쉬웠다",
        "비교안 B가 훨씬 쉬웠다"
      ],
      "prefillParam": "entry.2000845834"
    },
    "service.search.overallBurden": {
      "key": "service.search.overallBurden",
      "section": "검색 결과 목록",
      "title": "자료를 찾고 열거나 저장하기까지 전체 조작 부담은 어느 화면이 더 적었습니까?",
      "helpText": "키 입력, 초점 이동, 다시 찾기, 실수 후 복구까지 포함한 전체 부담을 기준으로 답하십시오.",
      "required": true,
      "itemId": 74474836,
      "itemType": "MULTIPLE_CHOICE",
      "responseType": "string",
      "choices": [
        "비교안 A가 훨씬 쉬웠다",
        "비교안 A가 조금 더 쉬웠다",
        "비슷했다",
        "비교안 B가 조금 더 쉬웠다",
        "비교안 B가 훨씬 쉬웠다"
      ],
      "prefillParam": "entry.470090937"
    },
    "service.settings.findTarget": {
      "key": "service.settings.findTarget",
      "section": "설정 화면",
      "title": "원하는 설정 묶음과 설정 항목을 찾기에는 어느 화면이 더 쉬웠습니까?",
      "helpText": "비교안 A와 비교안 B를 모두 수행한 뒤 가장 가까운 답을 고르십시오.",
      "required": true,
      "itemId": 1600104539,
      "itemType": "MULTIPLE_CHOICE",
      "responseType": "string",
      "choices": [
        "비교안 A가 훨씬 쉬웠다",
        "비교안 A가 조금 더 쉬웠다",
        "비슷했다",
        "비교안 B가 조금 더 쉬웠다",
        "비교안 B가 훨씬 쉬웠다"
      ],
      "prefillParam": "entry.2020003318"
    },
    "service.settings.returnAfterDetail": {
      "key": "service.settings.returnAfterDetail",
      "section": "설정 화면",
      "title": "설정 설명을 본 뒤 방금 바꾸던 설정으로 다시 돌아가기는 어느 화면이 더 쉬웠습니까?",
      "helpText": "설명, 미리보기, 확인 창처럼 잠깐 다른 내용을 본 뒤 다시 돌아가는 상황을 떠올리며 답하십시오.",
      "required": true,
      "itemId": 484513713,
      "itemType": "MULTIPLE_CHOICE",
      "responseType": "string",
      "choices": [
        "비교안 A가 훨씬 쉬웠다",
        "비교안 A가 조금 더 쉬웠다",
        "비슷했다",
        "비교안 B가 조금 더 쉬웠다",
        "비교안 B가 훨씬 쉬웠다"
      ],
      "prefillParam": "entry.507022569"
    },
    "service.settings.overallBurden": {
      "key": "service.settings.overallBurden",
      "section": "설정 화면",
      "title": "설정을 바꾸고 저장하기까지 전체 조작 부담은 어느 화면이 더 적었습니까?",
      "helpText": "키 입력, 초점 이동, 다시 찾기, 실수 후 복구까지 포함한 전체 부담을 기준으로 답하십시오.",
      "required": true,
      "itemId": 1570803825,
      "itemType": "MULTIPLE_CHOICE",
      "responseType": "string",
      "choices": [
        "비교안 A가 훨씬 쉬웠다",
        "비교안 A가 조금 더 쉬웠다",
        "비슷했다",
        "비교안 B가 조금 더 쉬웠다",
        "비교안 B가 훨씬 쉬웠다"
      ],
      "prefillParam": "entry.884910016"
    },
    "service.filters.findTarget": {
      "key": "service.filters.findTarget",
      "section": "검색 세부 조건",
      "title": "원하는 조건과 자료를 찾기에는 어느 화면이 더 쉬웠습니까?",
      "helpText": "비교안 A와 비교안 B를 모두 수행한 뒤 가장 가까운 답을 고르십시오.",
      "required": true,
      "itemId": 1919047070,
      "itemType": "MULTIPLE_CHOICE",
      "responseType": "string",
      "choices": [
        "비교안 A가 훨씬 쉬웠다",
        "비교안 A가 조금 더 쉬웠다",
        "비슷했다",
        "비교안 B가 조금 더 쉬웠다",
        "비교안 B가 훨씬 쉬웠다"
      ],
      "prefillParam": "entry.1353137096"
    },
    "service.filters.returnAfterDetail": {
      "key": "service.filters.returnAfterDetail",
      "section": "검색 세부 조건",
      "title": "미리보기를 본 뒤 방금 보던 자료 작업으로 다시 돌아가기는 어느 화면이 더 쉬웠습니까?",
      "helpText": "설명, 미리보기, 확인 창처럼 잠깐 다른 내용을 본 뒤 다시 돌아가는 상황을 떠올리며 답하십시오.",
      "required": true,
      "itemId": 2026918137,
      "itemType": "MULTIPLE_CHOICE",
      "responseType": "string",
      "choices": [
        "비교안 A가 훨씬 쉬웠다",
        "비교안 A가 조금 더 쉬웠다",
        "비슷했다",
        "비교안 B가 조금 더 쉬웠다",
        "비교안 B가 훨씬 쉬웠다"
      ],
      "prefillParam": "entry.975755445"
    },
    "service.filters.overallBurden": {
      "key": "service.filters.overallBurden",
      "section": "검색 세부 조건",
      "title": "조건을 맞추고 자료를 찾기까지 전체 조작 부담은 어느 화면이 더 적었습니까?",
      "helpText": "키 입력, 초점 이동, 다시 찾기, 실수 후 복구까지 포함한 전체 부담을 기준으로 답하십시오.",
      "required": true,
      "itemId": 1855387115,
      "itemType": "MULTIPLE_CHOICE",
      "responseType": "string",
      "choices": [
        "비교안 A가 훨씬 쉬웠다",
        "비교안 A가 조금 더 쉬웠다",
        "비슷했다",
        "비교안 B가 조금 더 쉬웠다",
        "비교안 B가 훨씬 쉬웠다"
      ],
      "prefillParam": "entry.1258191971"
    },
    "service.checkout.findTarget": {
      "key": "service.checkout.findTarget",
      "section": "신청·결제 흐름",
      "title": "원하는 신청 단계와 선택 항목을 찾기에는 어느 화면이 더 쉬웠습니까?",
      "helpText": "비교안 A와 비교안 B를 모두 수행한 뒤 가장 가까운 답을 고르십시오.",
      "required": true,
      "itemId": 127967715,
      "itemType": "MULTIPLE_CHOICE",
      "responseType": "string",
      "choices": [
        "비교안 A가 훨씬 쉬웠다",
        "비교안 A가 조금 더 쉬웠다",
        "비슷했다",
        "비교안 B가 조금 더 쉬웠다",
        "비교안 B가 훨씬 쉬웠다"
      ],
      "prefillParam": "entry.454912566"
    },
    "service.checkout.returnAfterDetail": {
      "key": "service.checkout.returnAfterDetail",
      "section": "신청·결제 흐름",
      "title": "설명을 본 뒤 방금 바꾸던 신청 항목으로 다시 돌아가기는 어느 화면이 더 쉬웠습니까?",
      "helpText": "설명, 미리보기, 확인 창처럼 잠깐 다른 내용을 본 뒤 다시 돌아가는 상황을 떠올리며 답하십시오.",
      "required": true,
      "itemId": 1878025171,
      "itemType": "MULTIPLE_CHOICE",
      "responseType": "string",
      "choices": [
        "비교안 A가 훨씬 쉬웠다",
        "비교안 A가 조금 더 쉬웠다",
        "비슷했다",
        "비교안 B가 조금 더 쉬웠다",
        "비교안 B가 훨씬 쉬웠다"
      ],
      "prefillParam": "entry.1264529531"
    },
    "service.checkout.overallBurden": {
      "key": "service.checkout.overallBurden",
      "section": "신청·결제 흐름",
      "title": "신청서 제출까지 전체 조작 부담은 어느 화면이 더 적었습니까?",
      "helpText": "키 입력, 초점 이동, 다시 찾기, 실수 후 복구까지 포함한 전체 부담을 기준으로 답하십시오.",
      "required": true,
      "itemId": 1273927045,
      "itemType": "MULTIPLE_CHOICE",
      "responseType": "string",
      "choices": [
        "비교안 A가 훨씬 쉬웠다",
        "비교안 A가 조금 더 쉬웠다",
        "비슷했다",
        "비교안 B가 조금 더 쉬웠다",
        "비교안 B가 훨씬 쉬웠다"
      ],
      "prefillParam": "entry.1314168832"
    },
    "participant.primaryInput": {
      "key": "participant.primaryInput",
      "section": "전체 응답",
      "title": "이번 실험에서 주로 사용한 입력 방식은 무엇입니까?",
      "helpText": "가장 중심이 된 방식을 하나만 고르십시오.",
      "required": true,
      "itemId": 1244993844,
      "itemType": "MULTIPLE_CHOICE",
      "responseType": "string",
      "choices": [
        "키보드 중심",
        "화면낭독과 키보드 함께 사용",
        "스위치 사용",
        "기타 보조기술과 함께 사용"
      ],
      "prefillParam": "entry.128666765"
    },
    "participant.assistiveTech": {
      "key": "participant.assistiveTech",
      "section": "전체 응답",
      "title": "함께 쓴 보조기술 또는 사용 방식은 무엇입니까?",
      "helpText": "해당하는 항목을 모두 고르십시오. 없으면 `해당 없음`을 고르십시오.",
      "required": true,
      "itemId": 1665230675,
      "itemType": "CHECKBOX",
      "responseType": "string[]",
      "choices": [
        "화면낭독",
        "화면 확대",
        "음성 입력",
        "스위치",
        "큰 글자 또는 높은 대비 설정",
        "해당 없음"
      ],
      "prefillParam": "entry.119157653"
    },
    "participant.hardestService": {
      "key": "participant.hardestService",
      "section": "전체 응답",
      "title": "전체적으로 가장 부담이 컸던 서비스는 무엇입니까?",
      "helpText": "한 가지만 고르십시오.",
      "required": true,
      "itemId": 546493741,
      "itemType": "MULTIPLE_CHOICE",
      "responseType": "string",
      "choices": [
        "예약 캘린더",
        "댓글 목록",
        "상품 옵션 선택",
        "검색 결과 목록",
        "설정 화면",
        "검색 세부 조건",
        "신청·결제 흐름"
      ],
      "prefillParam": "entry.714696607"
    },
    "participant.overallStructure": {
      "key": "participant.overallStructure",
      "section": "전체 응답",
      "title": "전체적으로는 어느 화면 구조가 더 쉬운 경우가 많았습니까?",
      "helpText": "서비스 전체를 떠올리며 고르십시오.",
      "required": true,
      "itemId": 499153255,
      "itemType": "MULTIPLE_CHOICE",
      "responseType": "string",
      "choices": [
        "비교안 A가 더 쉬운 경우가 많았다",
        "비교안 B가 더 쉬운 경우가 많았다",
        "서비스마다 달랐다",
        "큰 차이를 느끼지 못했다"
      ],
      "prefillParam": "entry.1474171235"
    },
    "participant.overallComment": {
      "key": "participant.overallComment",
      "section": "전체 응답",
      "title": "어느 서비스에서 무엇이 특히 힘들었는지, 또는 어느 개선이 도움이 되었는지 적어 주십시오.",
      "helpText": "없으면 비워 두셔도 됩니다.",
      "required": false,
      "itemId": 1610364585,
      "itemType": "PARAGRAPH_TEXT",
      "responseType": "string",
      "choices": [],
      "prefillParam": "entry.661800192"
    },
    "meta.sessionId": {
      "key": "meta.sessionId",
      "section": "자동 기록",
      "title": "[자동 입력] 응답 식별 코드",
      "helpText": "웹 앱이 자동으로 넣는 값입니다.",
      "required": false,
      "itemId": 1538615950,
      "itemType": "TEXT",
      "responseType": "string",
      "choices": [],
      "prefillParam": "entry.1922648252"
    },
    "meta.completedServicesOrder": {
      "key": "meta.completedServicesOrder",
      "section": "자동 기록",
      "title": "[자동 입력] 완료한 서비스 순서",
      "helpText": "웹 앱이 서비스 완료 순서를 자동으로 넣는 값입니다.",
      "required": false,
      "itemId": 2140857260,
      "itemType": "TEXT",
      "responseType": "string",
      "choices": [],
      "prefillParam": "entry.1130053464"
    },
    "meta.studyVersion": {
      "key": "meta.studyVersion",
      "section": "자동 기록",
      "title": "[자동 입력] 실험 버전",
      "helpText": "웹 앱 또는 스크립트 버전 식별용 값입니다.",
      "required": false,
      "itemId": 1476487160,
      "itemType": "TEXT",
      "responseType": "string",
      "choices": [],
      "prefillParam": "entry.145269519"
    },
    "service.calendar.order": {
      "key": "service.calendar.order",
      "section": "자동 기록",
      "title": "[자동 입력] 예약 캘린더에서 수행한 순서",
      "helpText": "예: A→B 또는 B→A",
      "required": false,
      "itemId": 260220294,
      "itemType": "TEXT",
      "responseType": "string",
      "choices": [],
      "prefillParam": "entry.1355453168"
    },
    "service.calendar.actualA": {
      "key": "service.calendar.actualA",
      "section": "자동 기록",
      "title": "[자동 입력] 예약 캘린더 비교안 A 실제 기록",
      "helpText": "웹 앱이 짧은 JSON 요약을 자동으로 넣는 값입니다.",
      "required": false,
      "itemId": 1771487914,
      "itemType": "PARAGRAPH_TEXT",
      "responseType": "string",
      "choices": [],
      "prefillParam": "entry.809030130"
    },
    "service.calendar.actualB": {
      "key": "service.calendar.actualB",
      "section": "자동 기록",
      "title": "[자동 입력] 예약 캘린더 비교안 B 실제 기록",
      "helpText": "웹 앱이 짧은 JSON 요약을 자동으로 넣는 값입니다.",
      "required": false,
      "itemId": 676356063,
      "itemType": "PARAGRAPH_TEXT",
      "responseType": "string",
      "choices": [],
      "prefillParam": "entry.629701247"
    },
    "service.comments.order": {
      "key": "service.comments.order",
      "section": "자동 기록",
      "title": "[자동 입력] 댓글 목록에서 수행한 순서",
      "helpText": "예: A→B 또는 B→A",
      "required": false,
      "itemId": 1556866865,
      "itemType": "TEXT",
      "responseType": "string",
      "choices": [],
      "prefillParam": "entry.393611306"
    },
    "service.comments.actualA": {
      "key": "service.comments.actualA",
      "section": "자동 기록",
      "title": "[자동 입력] 댓글 목록 비교안 A 실제 기록",
      "helpText": "웹 앱이 짧은 JSON 요약을 자동으로 넣는 값입니다.",
      "required": false,
      "itemId": 1964005928,
      "itemType": "PARAGRAPH_TEXT",
      "responseType": "string",
      "choices": [],
      "prefillParam": "entry.1994778495"
    },
    "service.comments.actualB": {
      "key": "service.comments.actualB",
      "section": "자동 기록",
      "title": "[자동 입력] 댓글 목록 비교안 B 실제 기록",
      "helpText": "웹 앱이 짧은 JSON 요약을 자동으로 넣는 값입니다.",
      "required": false,
      "itemId": 2739109,
      "itemType": "PARAGRAPH_TEXT",
      "responseType": "string",
      "choices": [],
      "prefillParam": "entry.632787100"
    },
    "service.product.order": {
      "key": "service.product.order",
      "section": "자동 기록",
      "title": "[자동 입력] 상품 옵션 선택에서 수행한 순서",
      "helpText": "예: A→B 또는 B→A",
      "required": false,
      "itemId": 1750792569,
      "itemType": "TEXT",
      "responseType": "string",
      "choices": [],
      "prefillParam": "entry.550916713"
    },
    "service.product.actualA": {
      "key": "service.product.actualA",
      "section": "자동 기록",
      "title": "[자동 입력] 상품 옵션 선택 비교안 A 실제 기록",
      "helpText": "웹 앱이 짧은 JSON 요약을 자동으로 넣는 값입니다.",
      "required": false,
      "itemId": 496425990,
      "itemType": "PARAGRAPH_TEXT",
      "responseType": "string",
      "choices": [],
      "prefillParam": "entry.689711141"
    },
    "service.product.actualB": {
      "key": "service.product.actualB",
      "section": "자동 기록",
      "title": "[자동 입력] 상품 옵션 선택 비교안 B 실제 기록",
      "helpText": "웹 앱이 짧은 JSON 요약을 자동으로 넣는 값입니다.",
      "required": false,
      "itemId": 162978951,
      "itemType": "PARAGRAPH_TEXT",
      "responseType": "string",
      "choices": [],
      "prefillParam": "entry.295233458"
    },
    "service.search.order": {
      "key": "service.search.order",
      "section": "자동 기록",
      "title": "[자동 입력] 검색 결과 목록에서 수행한 순서",
      "helpText": "예: A→B 또는 B→A",
      "required": false,
      "itemId": 449051515,
      "itemType": "TEXT",
      "responseType": "string",
      "choices": [],
      "prefillParam": "entry.149505801"
    },
    "service.search.actualA": {
      "key": "service.search.actualA",
      "section": "자동 기록",
      "title": "[자동 입력] 검색 결과 목록 비교안 A 실제 기록",
      "helpText": "웹 앱이 짧은 JSON 요약을 자동으로 넣는 값입니다.",
      "required": false,
      "itemId": 756387768,
      "itemType": "PARAGRAPH_TEXT",
      "responseType": "string",
      "choices": [],
      "prefillParam": "entry.1768191951"
    },
    "service.search.actualB": {
      "key": "service.search.actualB",
      "section": "자동 기록",
      "title": "[자동 입력] 검색 결과 목록 비교안 B 실제 기록",
      "helpText": "웹 앱이 짧은 JSON 요약을 자동으로 넣는 값입니다.",
      "required": false,
      "itemId": 2016578280,
      "itemType": "PARAGRAPH_TEXT",
      "responseType": "string",
      "choices": [],
      "prefillParam": "entry.429578678"
    },
    "service.settings.order": {
      "key": "service.settings.order",
      "section": "자동 기록",
      "title": "[자동 입력] 설정 화면에서 수행한 순서",
      "helpText": "예: A→B 또는 B→A",
      "required": false,
      "itemId": 1717657914,
      "itemType": "TEXT",
      "responseType": "string",
      "choices": [],
      "prefillParam": "entry.921366249"
    },
    "service.settings.actualA": {
      "key": "service.settings.actualA",
      "section": "자동 기록",
      "title": "[자동 입력] 설정 화면 비교안 A 실제 기록",
      "helpText": "웹 앱이 짧은 JSON 요약을 자동으로 넣는 값입니다.",
      "required": false,
      "itemId": 1869158471,
      "itemType": "PARAGRAPH_TEXT",
      "responseType": "string",
      "choices": [],
      "prefillParam": "entry.2033973621"
    },
    "service.settings.actualB": {
      "key": "service.settings.actualB",
      "section": "자동 기록",
      "title": "[자동 입력] 설정 화면 비교안 B 실제 기록",
      "helpText": "웹 앱이 짧은 JSON 요약을 자동으로 넣는 값입니다.",
      "required": false,
      "itemId": 682828847,
      "itemType": "PARAGRAPH_TEXT",
      "responseType": "string",
      "choices": [],
      "prefillParam": "entry.1555324189"
    },
    "service.filters.order": {
      "key": "service.filters.order",
      "section": "자동 기록",
      "title": "[자동 입력] 검색 세부 조건에서 수행한 순서",
      "helpText": "예: A→B 또는 B→A",
      "required": false,
      "itemId": 878731825,
      "itemType": "TEXT",
      "responseType": "string",
      "choices": [],
      "prefillParam": "entry.1406154444"
    },
    "service.filters.actualA": {
      "key": "service.filters.actualA",
      "section": "자동 기록",
      "title": "[자동 입력] 검색 세부 조건 비교안 A 실제 기록",
      "helpText": "웹 앱이 짧은 JSON 요약을 자동으로 넣는 값입니다.",
      "required": false,
      "itemId": 384546054,
      "itemType": "PARAGRAPH_TEXT",
      "responseType": "string",
      "choices": [],
      "prefillParam": "entry.1727396204"
    },
    "service.filters.actualB": {
      "key": "service.filters.actualB",
      "section": "자동 기록",
      "title": "[자동 입력] 검색 세부 조건 비교안 B 실제 기록",
      "helpText": "웹 앱이 짧은 JSON 요약을 자동으로 넣는 값입니다.",
      "required": false,
      "itemId": 1248186749,
      "itemType": "PARAGRAPH_TEXT",
      "responseType": "string",
      "choices": [],
      "prefillParam": "entry.509669236"
    },
    "service.checkout.order": {
      "key": "service.checkout.order",
      "section": "자동 기록",
      "title": "[자동 입력] 신청·결제 흐름에서 수행한 순서",
      "helpText": "예: A→B 또는 B→A",
      "required": false,
      "itemId": 840446181,
      "itemType": "TEXT",
      "responseType": "string",
      "choices": [],
      "prefillParam": "entry.1327900998"
    },
    "service.checkout.actualA": {
      "key": "service.checkout.actualA",
      "section": "자동 기록",
      "title": "[자동 입력] 신청·결제 흐름 비교안 A 실제 기록",
      "helpText": "웹 앱이 짧은 JSON 요약을 자동으로 넣는 값입니다.",
      "required": false,
      "itemId": 1746971391,
      "itemType": "PARAGRAPH_TEXT",
      "responseType": "string",
      "choices": [],
      "prefillParam": "entry.1925171698"
    },
    "service.checkout.actualB": {
      "key": "service.checkout.actualB",
      "section": "자동 기록",
      "title": "[자동 입력] 신청·결제 흐름 비교안 B 실제 기록",
      "helpText": "웹 앱이 짧은 JSON 요약을 자동으로 넣는 값입니다.",
      "required": false,
      "itemId": 608498242,
      "itemType": "PARAGRAPH_TEXT",
      "responseType": "string",
      "choices": [],
      "prefillParam": "entry.1498756782"
    }
  }
};


export function getSurveyItem(key) {
  return surveyConfig.itemByKey[key] ?? null;
}

export function getServiceSurveyItems(serviceId) {
  const keys = surveyConfig.serviceQuestionKeys[serviceId] ?? [];
  return keys.map((key) => surveyConfig.itemByKey[key]).filter(Boolean);
}

export function getServiceAutoItems(serviceId) {
  const keys = surveyConfig.serviceAutoKeys[serviceId] ?? [];
  return keys.map((key) => surveyConfig.itemByKey[key]).filter(Boolean);
}
