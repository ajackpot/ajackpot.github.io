export const commentsBenchmarkGraphs = {
  variantA: {
    label: '비교안 A · 조작 부담이 큰 구조',
    description: '상단 링크와 정렬·범위 선택을 지난 뒤 댓글 목록에 도달하고, 댓글마다 여러 개의 링크와 버튼을 지나야 하며, 댓글 정보 대화상자를 닫으면 댓글 목록 제목 근처부터 다시 찾게 되는 구조.',
    tasks: {
      task1_newest_review_open_replies: {
        title: '최신 후기에서 민지 댓글 답글 열기',
        assumptions: [
          '상단 보조 링크와 범위 선택 도움 링크를 지나 댓글 목록에 도달해야 한다.',
          '댓글마다 작성자, 작성 시각, 공유, 도움이 돼요, 답글 보기, 댓글 정보 보기 등 여러 멈춤 지점이 있다.',
          '원하는 댓글 앞의 다른 댓글 행동 버튼들을 지나며 순차 탐색 부담이 누적된다.',
        ],
        steps: [
          { id: 'reach-controls', bucket: 'entry', navMoves: 14, activations: 0, decisions: 2, waits: 0, speechUnits: 5, scanSteps: 16 },
          { id: 'set-sort-and-category', bucket: 'entry', navMoves: 8, activations: 2, decisions: 3, waits: 1, speechUnits: 5, scanSteps: 10 },
          { id: 'reach-comments', bucket: 'entry', navMoves: 7, activations: 0, decisions: 2, waits: 0, speechUnits: 3, scanSteps: 8 },
          { id: 'scan-review-comments', bucket: 'repeated', navMoves: 13, activations: 0, decisions: 5, waits: 0, speechUnits: 8, scanSteps: 16 },
          { id: 'open-target-replies', bucket: 'repeated', navMoves: 2, activations: 1, decisions: 1, waits: 0, speechUnits: 2, scanSteps: 3 },
        ],
      },
      task2_popular_admin_detail_helpful: {
        title: '운영자 안내 댓글 정보 보기 후 도움이 돼요',
        assumptions: [
          '정렬 기준을 다시 맞춘 뒤 댓글 목록 맨 앞에서부터 원하는 댓글의 작업 버튼을 찾아야 한다.',
          '댓글 정보 대화상자를 닫으면 원래 댓글의 버튼으로 돌아가지 않고 댓글 목록 제목 근처부터 다시 찾아야 한다.',
          '도움이 돼요 버튼과 댓글 정보 버튼이 떨어져 있어 같은 댓글 안에서도 이동 횟수가 커진다.',
        ],
        steps: [
          { id: 'reorient-and-set-popular', bucket: 'entry', navMoves: 16, activations: 1, decisions: 3, waits: 1, speechUnits: 6, scanSteps: 18 },
          { id: 'find-admin-detail', bucket: 'repeated', navMoves: 8, activations: 1, decisions: 3, waits: 0, speechUnits: 5, scanSteps: 10 },
          { id: 'close-detail-and-reset', bucket: 'recovery', navMoves: 5, activations: 1, decisions: 2, waits: 0, speechUnits: 3, contextResets: 1, scanSteps: 6 },
          { id: 'find-helpful-again', bucket: 'recovery', navMoves: 9, activations: 1, decisions: 3, waits: 0, speechUnits: 5, contextResets: 1, scanSteps: 11 },
        ],
      },
      task3_question_open_juno_replies: {
        title: '질문 댓글에서 준호 댓글 답글 열기',
        assumptions: [
          '댓글 범위를 질문으로 바꾼 뒤에도 적용 버튼과 보조 링크를 지나 다시 댓글 목록을 만나야 한다.',
          '답글이 열려 있던 다른 댓글이 있어도 원하는 질문 댓글의 버튼을 다시 찾아야 한다.',
          '순차 탐색 구조에서는 댓글 수가 줄어도 각 댓글 안의 버튼 수 때문에 비용이 쉽게 남는다.',
        ],
        steps: [
          { id: 'reach-controls-again', bucket: 'entry', navMoves: 12, activations: 0, decisions: 2, waits: 0, speechUnits: 4, scanSteps: 14 },
          { id: 'set-question-category', bucket: 'entry', navMoves: 6, activations: 1, decisions: 2, waits: 1, speechUnits: 4, scanSteps: 8 },
          { id: 'scan-question-comments', bucket: 'repeated', navMoves: 10, activations: 0, decisions: 4, waits: 0, speechUnits: 6, scanSteps: 12 },
          { id: 'open-juno-replies', bucket: 'repeated', navMoves: 2, activations: 1, decisions: 1, waits: 0, speechUnits: 2, scanSteps: 3 },
        ],
      },
    },
  },
  variantB: {
    label: '비교안 B · 개선 구조',
    description: '댓글 목록으로 바로 이동하고, 댓글 하나를 하나의 선택 항목으로 이동하며, 댓글 작업을 한곳에 모으고, 댓글 정보 대화상자를 닫으면 바로 원래 작업 버튼으로 돌아오는 구조.',
    tasks: {
      task1_newest_review_open_replies: {
        title: '최신 후기에서 민지 댓글 답글 열기',
        assumptions: [
          '댓글 목록으로 바로 이동하는 링크와 버튼으로 첫 진입 부담을 줄인다.',
          '댓글은 하나의 선택 항목으로 제공되어 한 댓글 안의 여러 작업 버튼을 반복해 지나지 않는다.',
          '선택한 댓글 작업이 한곳에 모여 있어 답글 보기까지의 이동이 짧다.',
        ],
        steps: [
          { id: 'skip-to-comments', bucket: 'entry', navMoves: 2, activations: 1, decisions: 1, waits: 0, speechUnits: 2, scanSteps: 3 },
          { id: 'set-sort-and-category', bucket: 'entry', navMoves: 5, activations: 2, decisions: 3, waits: 1, speechUnits: 4, scanSteps: 7 },
          { id: 'enter-comment-list', bucket: 'entry', navMoves: 1, activations: 0, decisions: 1, waits: 0, speechUnits: 1, scanSteps: 1 },
          { id: 'move-to-minji', bucket: 'repeated', navMoves: 2, activations: 0, decisions: 2, waits: 0, speechUnits: 2, scanSteps: 3 },
          { id: 'open-replies', bucket: 'repeated', navMoves: 2, activations: 1, decisions: 1, waits: 0, speechUnits: 1, scanSteps: 2 },
        ],
      },
      task2_popular_admin_detail_helpful: {
        title: '운영자 안내 댓글 정보 보기 후 도움이 돼요',
        assumptions: [
          '도움이 많은 순에서는 운영자 댓글이 바로 선택 영역에서 보인다.',
          '댓글 정보 대화상자를 닫으면 같은 작업 버튼으로 초점이 돌아와 연속 동작이 가능하다.',
          '도움이 돼요, 답글 보기, 댓글 정보 보기가 한곳에 모여 있어 댓글마다 반복되는 탭 이동을 줄인다.',
        ],
        steps: [
          { id: 'set-popular', bucket: 'entry', navMoves: 3, activations: 1, decisions: 2, waits: 1, speechUnits: 2, scanSteps: 4 },
          { id: 'open-detail', bucket: 'repeated', navMoves: 2, activations: 1, decisions: 1, waits: 0, speechUnits: 2, scanSteps: 2 },
          { id: 'close-detail-return', bucket: 'recovery', navMoves: 2, activations: 1, decisions: 1, waits: 0, speechUnits: 1, scanSteps: 2 },
          { id: 'mark-helpful', bucket: 'recovery', navMoves: 1, activations: 1, decisions: 1, waits: 0, speechUnits: 1, scanSteps: 1 },
        ],
      },
      task3_question_open_juno_replies: {
        title: '질문 댓글에서 준호 댓글 답글 열기',
        assumptions: [
          '댓글 범위를 바꾸면 댓글 목록 제목으로 초점이 이동해 다시 읽을 위치가 분명하다.',
          '질문 댓글 사이 이동은 방향키 중심이라 짧게 끝난다.',
          '답글 보기 작업은 선택한 댓글 작업 영역에서 바로 수행한다.',
        ],
        steps: [
          { id: 'set-question-category', bucket: 'entry', navMoves: 3, activations: 1, decisions: 2, waits: 1, speechUnits: 2, scanSteps: 4 },
          { id: 'enter-comment-list', bucket: 'entry', navMoves: 1, activations: 0, decisions: 1, waits: 0, speechUnits: 1, scanSteps: 1 },
          { id: 'move-to-juno', bucket: 'repeated', navMoves: 1, activations: 0, decisions: 1, waits: 0, speechUnits: 1, scanSteps: 1 },
          { id: 'open-replies', bucket: 'repeated', navMoves: 2, activations: 1, decisions: 1, waits: 0, speechUnits: 1, scanSteps: 2 },
        ],
      },
    },
  },
};
