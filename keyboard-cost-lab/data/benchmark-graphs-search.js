export const searchBenchmarkGraphs = {
  variantA: {
    label: '비교안 A · 조작 부담이 큰 구조',
    description: '상단 보조 링크와 정렬·자료 범위 선택을 지난 뒤 검색 결과에 도달하고, 결과마다 제목 링크·갱신 시각·공유·저장·바로 열기·미리보기 등을 각각 지나야 하며, 미리보기 대화상자를 닫으면 검색 결과 제목 근처부터 다시 찾게 되는 구조.',
    tasks: {
      task1_newest_guide_preview_close: {
        title: '최신 안내문에서 예약 변경 안내 미리보기 열었다가 닫기',
        assumptions: [
          '상단 보조 링크와 도움 링크를 지나 정렬·자료 범위를 먼저 맞춰야 한다.',
          '결과마다 제목 링크, 갱신 시각 링크, 공유 링크, 저장, 바로 열기, 미리보기가 따로 있어 순차 이동이 길어진다.',
          '미리보기 대화상자를 닫으면 원래 자료 카드 대신 검색 결과 제목 근처로 돌아와 다시 위치를 잡아야 한다.',
        ],
        steps: [
          { id: 'reach-controls', bucket: 'entry', navMoves: 13, activations: 0, decisions: 2, waits: 0, speechUnits: 5, scanSteps: 15 },
          { id: 'set-newest-and-guide', bucket: 'entry', navMoves: 8, activations: 2, decisions: 3, waits: 1, speechUnits: 5, scanSteps: 10 },
          { id: 'reach-results', bucket: 'entry', navMoves: 7, activations: 0, decisions: 2, waits: 0, speechUnits: 3, scanSteps: 8 },
          { id: 'scan-guide-results', bucket: 'repeated', navMoves: 10, activations: 0, decisions: 4, waits: 0, speechUnits: 6, scanSteps: 12 },
          { id: 'open-preview', bucket: 'repeated', navMoves: 3, activations: 1, decisions: 1, waits: 0, speechUnits: 2, scanSteps: 4 },
          { id: 'close-preview-reset', bucket: 'recovery', navMoves: 4, activations: 1, decisions: 2, waits: 0, speechUnits: 2, contextResets: 1, scanSteps: 5 },
        ],
      },
      task2_title_faq_save_remote: {
        title: '제목순 질문답변에서 비대면 상담 연결 방법 저장',
        assumptions: [
          '정렬 기준과 자료 범위를 다시 맞춘 뒤 검색 결과 앞부분부터 목표 자료를 찾아야 한다.',
          '자료마다 여러 링크와 버튼이 분산되어 있어 저장 버튼까지 가기 전 반복 이동이 길다.',
          '정확도순에서 제목순으로 바꾸면 사용자는 현재 위치를 다시 확인해야 한다.',
        ],
        steps: [
          { id: 'reach-controls-again', bucket: 'entry', navMoves: 12, activations: 0, decisions: 2, waits: 0, speechUnits: 4, scanSteps: 14 },
          { id: 'set-title-and-faq', bucket: 'entry', navMoves: 8, activations: 2, decisions: 3, waits: 1, speechUnits: 5, scanSteps: 10 },
          { id: 'scan-faq-results', bucket: 'repeated', navMoves: 12, activations: 0, decisions: 5, waits: 0, speechUnits: 7, scanSteps: 14 },
          { id: 'save-target', bucket: 'repeated', navMoves: 2, activations: 1, decisions: 1, waits: 0, speechUnits: 2, scanSteps: 3 },
        ],
      },
      task3_form_preview_then_open: {
        title: '신청 서식에서 상담 준비 체크 목록 미리보기 후 바로 열기',
        assumptions: [
          '자료 범위를 신청 서식으로 바꾼 뒤에도 검색 결과 앞부분부터 원하는 자료를 다시 찾아야 한다.',
          '미리보기 대화상자를 닫으면 원래 자료 카드의 버튼으로 돌아가지 않아 바로 열기 버튼을 다시 찾아야 한다.',
          '순차 탐색 구조에서는 자료 수가 줄어도 각 자료 안의 버튼 수 때문에 비용이 크게 남는다.',
        ],
        steps: [
          { id: 'reach-controls-third', bucket: 'entry', navMoves: 11, activations: 0, decisions: 2, waits: 0, speechUnits: 4, scanSteps: 13 },
          { id: 'set-form-filter', bucket: 'entry', navMoves: 6, activations: 1, decisions: 2, waits: 1, speechUnits: 4, scanSteps: 8 },
          { id: 'scan-form-results', bucket: 'repeated', navMoves: 7, activations: 0, decisions: 3, waits: 0, speechUnits: 4, scanSteps: 8 },
          { id: 'open-preview', bucket: 'repeated', navMoves: 3, activations: 1, decisions: 1, waits: 0, speechUnits: 2, scanSteps: 4 },
          { id: 'close-preview-reset', bucket: 'recovery', navMoves: 4, activations: 1, decisions: 2, waits: 0, speechUnits: 2, contextResets: 1, scanSteps: 5 },
          { id: 'find-open-again', bucket: 'recovery', navMoves: 5, activations: 0, decisions: 2, waits: 0, speechUnits: 3, contextResets: 1, scanSteps: 6 },
          { id: 'open-target', bucket: 'recovery', navMoves: 2, activations: 1, decisions: 1, waits: 0, speechUnits: 1, scanSteps: 2 },
        ],
      },
    },
  },
  variantB: {
    label: '비교안 B · 개선 구조',
    description: '검색 결과로 바로 이동해 처음 진입 부담을 낮추고, 결과를 하나의 선택 항목으로 이동하며, 선택한 자료 작업을 한곳에 모으고, 미리보기 대화상자를 닫으면 바로 원래 작업 버튼으로 돌아오는 구조.',
    tasks: {
      task1_newest_guide_preview_close: {
        title: '최신 안내문에서 예약 변경 안내 미리보기 열었다가 닫기',
        assumptions: [
          '맨 앞의 검색 결과로 바로 이동 링크로 첫 진입 부담을 줄인다.',
          '결과는 하나의 선택 항목으로 제공되어 결과 안의 여러 링크와 버튼을 반복해 지나지 않는다.',
          '미리보기를 닫으면 같은 작업 버튼으로 초점이 돌아와 위치를 다시 찾는 비용을 줄인다.',
        ],
        steps: [
          { id: 'skip-to-results', bucket: 'entry', navMoves: 2, activations: 1, decisions: 1, waits: 0, speechUnits: 2, scanSteps: 3 },
          { id: 'set-newest-and-guide', bucket: 'entry', navMoves: 5, activations: 2, decisions: 3, waits: 1, speechUnits: 4, scanSteps: 7 },
          { id: 'enter-result-list', bucket: 'entry', navMoves: 1, activations: 0, decisions: 1, waits: 0, speechUnits: 1, scanSteps: 1 },
          { id: 'move-to-target', bucket: 'repeated', navMoves: 1, activations: 0, decisions: 1, waits: 0, speechUnits: 1, scanSteps: 1 },
          { id: 'open-preview', bucket: 'repeated', navMoves: 2, activations: 1, decisions: 1, waits: 0, speechUnits: 1, scanSteps: 2 },
          { id: 'close-preview-return', bucket: 'recovery', navMoves: 2, activations: 1, decisions: 1, waits: 0, speechUnits: 1, scanSteps: 2 },
        ],
      },
      task2_title_faq_save_remote: {
        title: '제목순 질문답변에서 비대면 상담 연결 방법 저장',
        assumptions: [
          '제목순과 질문답변 필터를 적용하면 검색 결과 제목으로 초점이 이동해 다시 읽을 위치가 분명하다.',
          '질문답변 사이 이동은 방향키 중심이라 짧게 끝난다.',
          '저장, 미리보기, 바로 열기를 선택한 자료 작업 영역에 모아 둔다.',
        ],
        steps: [
          { id: 'set-title-and-faq', bucket: 'entry', navMoves: 4, activations: 2, decisions: 3, waits: 1, speechUnits: 3, scanSteps: 6 },
          { id: 'enter-result-list', bucket: 'entry', navMoves: 1, activations: 0, decisions: 1, waits: 0, speechUnits: 1, scanSteps: 1 },
          { id: 'move-to-target', bucket: 'repeated', navMoves: 2, activations: 0, decisions: 2, waits: 0, speechUnits: 2, scanSteps: 3 },
          { id: 'save-target', bucket: 'repeated', navMoves: 2, activations: 1, decisions: 1, waits: 0, speechUnits: 1, scanSteps: 2 },
        ],
      },
      task3_form_preview_then_open: {
        title: '신청 서식에서 상담 준비 체크 목록 미리보기 후 바로 열기',
        assumptions: [
          '자료 범위를 신청 서식으로 바꾸면 검색 결과 제목으로 초점이 이동해 현재 범위를 다시 확인하기 쉽다.',
          '서식 사이 이동은 방향키 중심이라 짧게 끝난다.',
          '미리보기를 닫으면 같은 작업 버튼으로 돌아와 바로 열기까지 이어서 수행할 수 있다.',
        ],
        steps: [
          { id: 'set-form-filter', bucket: 'entry', navMoves: 3, activations: 1, decisions: 2, waits: 1, speechUnits: 2, scanSteps: 4 },
          { id: 'enter-result-list', bucket: 'entry', navMoves: 1, activations: 0, decisions: 1, waits: 0, speechUnits: 1, scanSteps: 1 },
          { id: 'move-to-target', bucket: 'repeated', navMoves: 1, activations: 0, decisions: 1, waits: 0, speechUnits: 1, scanSteps: 1 },
          { id: 'open-preview', bucket: 'repeated', navMoves: 2, activations: 1, decisions: 1, waits: 0, speechUnits: 1, scanSteps: 2 },
          { id: 'close-preview-return', bucket: 'recovery', navMoves: 2, activations: 1, decisions: 1, waits: 0, speechUnits: 1, scanSteps: 2 },
          { id: 'open-target', bucket: 'recovery', navMoves: 1, activations: 1, decisions: 1, waits: 0, speechUnits: 1, scanSteps: 1 },
        ],
      },
    },
  },
};
