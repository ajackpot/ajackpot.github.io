export const searchTasks = [
  {
    id: 'task-1-newest-guide-preview-answer',
    benchmarkTaskId: 'task1_newest_guide_preview_answer',
    title: '과업 1. 최신 안내문 미리보기에서 예약 변경 기준 확인',
    goalSummary: '정렬 기준을 ‘최신 자료 순’으로 바꾸고 안내문만 표시하세요. ‘예약 변경 안내’의 미리보기를 확인한 뒤, 페이지 아래쪽의 ‘답변 선택’에서 예약 일시를 몇 시간 전까지 변경할 수 있는지 답하세요.',
    targetResultId: 'result-change-guide',
    completion: 'previewQuestion',
    requiredSort: 'newest',
    requiredType: 'guide',
    requiresPreviewVisit: true,
    previewQuestion: {
      prompt: '예약 일시를 몇 시간 전까지 변경할 수 있습니까?',
      correctValue: '6시간 전까지',
      optionCount: 4,
      options: ['4시간 전까지', '6시간 전까지', '8시간 전까지', '12시간 전까지'],
    },
  },
  {
    id: 'task-2-title-faq-save-with-options',
    benchmarkTaskId: 'task2_title_faq_save_options',
    title: '과업 2. 제목순 질문답변에서 비대면 상담 연결 방법 저장',
    goalSummary: '정렬 기준을 ‘제목순’으로 바꾸고 질문답변만 표시하세요. ‘비대면 상담 연결 방법’을 개인 보관함에 저장하고, 저장할 내용에는 ‘상담 전 점검 항목’을 포함하세요.',
    targetResultId: 'result-remote-faq',
    completion: 'saveWithOptions',
    requiredSort: 'title',
    requiredType: 'faq',
    expectedSaveOptions: {
      folder: 'personal',
      include: 'checklist',
    },
  },
];
