export const commentsTasks = [
  {
    id: 'task-1-newest-review-open-replies',
    benchmarkTaskId: 'task1_newest_review_open_replies',
    title: '과업 1. 최신 후기에서 민지 댓글 답글 확인하기',
    goalSummary: '정렬 기준을 ‘최신순’으로 바꾸고 후기 댓글만 표시하세요. 민지 댓글의 답글 목록에서 두 번째 답글 작성자를 확인하세요.',
    targetCommentId: 'comment-minji',
    completion: 'replyQuestion',
    requiredSort: 'newest',
    requiredCategory: 'review',
    replyQuestion: {
      replyIndex: 2,
      field: 'author',
      prompt: '두 번째 답글 작성자는 누구입니까?',
      options: ['보라', '승민', '민석', '태경', '지원팀'],
    },
  },
  {
    id: 'task-2-popular-admin-detail-helpful',
    benchmarkTaskId: 'task2_popular_admin_detail_helpful',
    title: '과업 2. 3월 25일 운영자 안내 댓글 정보 보기 후 도움이 돼요',
    goalSummary: '정렬 기준을 ‘도움이 많은 순’으로 바꾸세요. 3월 25일에 작성된 운영자 안내 댓글의 ‘댓글 정보 보기’를 열었다가 닫은 뒤 ‘도움이 돼요’를 누르세요.',
    targetCommentId: 'comment-admin',
    completion: 'helpful',
    requiredSort: 'popular',
    requiresDetailVisit: true,
  },
];
