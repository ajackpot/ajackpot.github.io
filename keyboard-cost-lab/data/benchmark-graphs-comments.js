export const commentsBenchmarkGraphs = {
  variantA: {
    label: '비교안 A · 조작 부담이 큰 구조',
    description: '상단 링크와 변형된 조건 선택을 지난 뒤 댓글 목록에 도달하고, 댓글마다 여러 작업 버튼을 지나야 하는 구조.',
    tasks: {
      task1_newest_review_open_replies: {
        title: '최신 후기에서 민지 댓글 답글 확인하기',
        assumptions: [
          '정렬 기준과 댓글 범위가 접힌 것처럼 보이지만 선택지가 각각 초점을 받아 조건 선택 비용이 늘어난다.',
          '댓글마다 작성자, 작성 시각, 공유, 도움이 돼요, 답글 보기, 댓글 정보 보기 등 여러 멈춤 지점이 있다.',
          '답글 목록에서 확인한 답은 과업 종료 영역에서 함께 제출하므로 서비스 화면 반복 비용에는 넣지 않는다.',
        ],
        steps: [
          { id: 'reach-controls', bucket: 'entry', navMoves: 14, activations: 0, decisions: 2, waits: 0, speechUnits: 5, scanSteps: 16 },
          { id: 'pseudo-sort-category', bucket: 'entry', navMoves: 14, activations: 2, decisions: 4, waits: 1, speechUnits: 8, scanSteps: 17 },
          { id: 'reach-comments', bucket: 'entry', navMoves: 7, activations: 0, decisions: 2, waits: 0, speechUnits: 3, scanSteps: 8 },
          { id: 'scan-review-comments', bucket: 'repeated', navMoves: 31, activations: 0, decisions: 8, waits: 0, speechUnits: 16, scanSteps: 36 },
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
          { id: 'reorient-and-set-popular', bucket: 'entry', navMoves: 18, activations: 1, decisions: 3, waits: 1, speechUnits: 7, scanSteps: 20 },
          { id: 'find-admin-detail', bucket: 'repeated', navMoves: 21, activations: 1, decisions: 5, waits: 0, speechUnits: 11, scanSteps: 24 },
          { id: 'close-detail-and-reset', bucket: 'recovery', navMoves: 5, activations: 1, decisions: 2, waits: 0, speechUnits: 3, contextResets: 1, scanSteps: 6 },
          { id: 'find-helpful-again', bucket: 'recovery', navMoves: 22, activations: 1, decisions: 5, waits: 0, speechUnits: 11, contextResets: 1, scanSteps: 25 },
        ],
      },
    },
  },
  variantB: {
    label: '비교안 B · 개선 구조',
    description: '댓글 목록 바로 이동 링크와 하나의 선택 항목 구조, 한곳에 모은 댓글 작업으로 반복 버튼을 줄인 구조.',
    tasks: {
      task1_newest_review_open_replies: {
        title: '최신 후기에서 민지 댓글 답글 확인하기',
        assumptions: [
          '맨 앞의 댓글 목록 바로 이동 링크로 첫 진입 부담을 줄인다.',
          '정렬과 범위 선택은 일반 폼 요소로 제공되어 조건 선택 비용이 짧다.',
          '선택한 댓글 작업이 한곳에 모여 있어 답글 보기까지의 이동이 짧다.',
        ],
        steps: [
          { id: 'skip-to-comments', bucket: 'entry', navMoves: 2, activations: 1, decisions: 1, waits: 0, speechUnits: 2, scanSteps: 3 },
          { id: 'set-sort-and-category', bucket: 'entry', navMoves: 5, activations: 2, decisions: 3, waits: 1, speechUnits: 4, scanSteps: 7 },
          { id: 'move-to-target-comment', bucket: 'repeated', navMoves: 4, activations: 0, decisions: 3, waits: 0, speechUnits: 3, scanSteps: 5 },
          { id: 'open-target-replies', bucket: 'repeated', navMoves: 2, activations: 1, decisions: 1, waits: 0, speechUnits: 1, scanSteps: 2 },
        ],
      },
      task2_popular_admin_detail_helpful: {
        title: '운영자 안내 댓글 정보 보기 후 도움이 돼요',
        assumptions: [
          '선택한 댓글 작업이 같은 카드에 있어 댓글 정보 보기와 도움이 돼요가 가까이 있다.',
          '댓글 정보 대화상자를 닫으면 원래 작업 버튼으로 돌아온다.',
          '도움이 돼요는 토스트로 처리되어 별도 확인 대화상자를 추가하지 않는다.',
        ],
        steps: [
          { id: 'set-popular', bucket: 'entry', navMoves: 4, activations: 1, decisions: 2, waits: 1, speechUnits: 3, scanSteps: 5 },
          { id: 'select-admin-comment', bucket: 'repeated', navMoves: 3, activations: 0, decisions: 2, waits: 0, speechUnits: 2, scanSteps: 4 },
          { id: 'open-and-close-detail', bucket: 'recovery', navMoves: 2, activations: 2, decisions: 2, waits: 0, speechUnits: 2, scanSteps: 3 },
          { id: 'mark-helpful', bucket: 'repeated', navMoves: 1, activations: 1, decisions: 1, waits: 0, speechUnits: 1, scanSteps: 2 },
        ],
      },
    },
  },
};
