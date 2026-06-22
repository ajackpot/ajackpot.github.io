export const searchBenchmarkGraphs = {
  variantA: {
    label: '비교안 A · 조작 부담이 큰 구조',
    description: '상단 검색 기능과 조건 선택을 지나 결과에 도달하고, 결과마다 저장·열기·미리보기·정보 링크가 반복되는 구조.',
    tasks: {
      task1_newest_guide_preview_answer: {
        title: '최신 안내문 미리보기에서 예약 변경 기준 확인',
        assumptions: [
          '상단 보조 메뉴와 검색 입력을 지나 조건 선택 영역에 도달해야 한다.',
          '결과마다 제목, 갱신 시각, 공유, 저장, 바로 열기, 미리보기를 차례로 지나야 한다.',
          '미리보기를 닫으면 결과 제목 근처부터 다시 위치를 확인해야 한다.',
        ],
        steps: [
          { id: 'reach-controls', bucket: 'entry', navMoves: 13, activations: 0, decisions: 2, waits: 0, speechUnits: 5, scanSteps: 15 },
          { id: 'set-newest-guide', bucket: 'entry', navMoves: 8, activations: 2, decisions: 3, waits: 1, speechUnits: 5, scanSteps: 10 },
          { id: 'scan-guide-results', bucket: 'repeated', navMoves: 8, activations: 0, decisions: 3, waits: 0, speechUnits: 5, scanSteps: 10 },
          { id: 'open-preview', bucket: 'repeated', navMoves: 3, activations: 1, decisions: 1, waits: 0, speechUnits: 2, scanSteps: 4 },
          { id: 'close-preview-reset', bucket: 'recovery', navMoves: 4, activations: 1, decisions: 2, waits: 0, speechUnits: 2, contextResets: 1, scanSteps: 5 },
        ],
      },
      task2_title_faq_save_options: {
        title: '제목순 질문답변에서 비대면 상담 연결 방법 저장',
        assumptions: [
          '저장 버튼을 누른 뒤 저장 위치, 포함 내용, 형식 선택지가 각각 초점을 받아 추가 탐색이 발생한다.',
          '결과 카드 안의 여러 링크와 버튼 때문에 목표 자료의 저장 버튼까지 순차 이동이 길다.',
          '저장 옵션 확인 뒤 다시 결과 영역으로 돌아오며 위치 확인 비용이 생긴다.',
        ],
        steps: [
          { id: 'reach-controls-again', bucket: 'entry', navMoves: 12, activations: 0, decisions: 2, waits: 0, speechUnits: 4, scanSteps: 14 },
          { id: 'set-title-faq', bucket: 'entry', navMoves: 8, activations: 2, decisions: 3, waits: 1, speechUnits: 5, scanSteps: 10 },
          { id: 'scan-faq-results', bucket: 'repeated', navMoves: 11, activations: 0, decisions: 4, waits: 0, speechUnits: 7, scanSteps: 13 },
          { id: 'open-save-options', bucket: 'repeated', navMoves: 2, activations: 1, decisions: 1, waits: 0, speechUnits: 2, scanSteps: 3 },
          { id: 'pseudo-save-options', bucket: 'repeated', navMoves: 14, activations: 2, decisions: 5, waits: 0, speechUnits: 8, scanSteps: 17 },
          { id: 'confirm-save-reset', bucket: 'recovery', navMoves: 4, activations: 1, decisions: 2, waits: 0, speechUnits: 2, contextResets: 1, scanSteps: 5 },
        ],
      },
    },
  },
  variantB: {
    label: '비교안 B · 개선 구조',
    description: '검색 결과와 검색 조건으로 바로 이동하는 링크를 제공하고, 결과를 하나의 선택 항목으로 이동하며, 선택한 자료 작업을 한곳에 모은 구조.',
    tasks: {
      task1_newest_guide_preview_answer: {
        title: '최신 안내문 미리보기에서 예약 변경 기준 확인',
        assumptions: [
          '검색 결과 영역과 검색 조건 설정으로 바로 이동하는 링크가 있어 단일 페이지 안에서도 진입 비용을 줄인다.',
          '결과는 하나의 선택 항목으로 제공되어 자료 안의 여러 링크와 버튼을 반복해 지나지 않는다.',
          '미리보기를 닫으면 같은 작업 버튼으로 초점이 돌아온다.',
        ],
        steps: [
          { id: 'skip-to-filters', bucket: 'entry', navMoves: 2, activations: 1, decisions: 1, waits: 0, speechUnits: 2, scanSteps: 3 },
          { id: 'set-newest-guide', bucket: 'entry', navMoves: 5, activations: 2, decisions: 3, waits: 1, speechUnits: 4, scanSteps: 7 },
          { id: 'enter-result-list', bucket: 'entry', navMoves: 1, activations: 0, decisions: 1, waits: 0, speechUnits: 1, scanSteps: 1 },
          { id: 'move-to-target', bucket: 'repeated', navMoves: 1, activations: 0, decisions: 1, waits: 0, speechUnits: 1, scanSteps: 1 },
          { id: 'open-and-close-preview', bucket: 'recovery', navMoves: 2, activations: 2, decisions: 2, waits: 0, speechUnits: 2, scanSteps: 3 },
        ],
      },
      task2_title_faq_save_options: {
        title: '제목순 질문답변에서 비대면 상담 연결 방법 저장',
        assumptions: [
          '조건 설정으로 바로 이동한 뒤 결과 제목으로 초점이 이동해 위치가 분명하다.',
          '선택한 자료 작업 영역에 저장이 있어 반복 카드 버튼을 지나지 않는다.',
          '저장 옵션은 일반 폼 요소로 묶여 있어 필요한 값만 짧게 선택한다.',
        ],
        steps: [
          { id: 'skip-to-filters', bucket: 'entry', navMoves: 2, activations: 1, decisions: 1, waits: 0, speechUnits: 2, scanSteps: 3 },
          { id: 'set-title-faq', bucket: 'entry', navMoves: 5, activations: 2, decisions: 3, waits: 1, speechUnits: 4, scanSteps: 7 },
          { id: 'move-to-target', bucket: 'repeated', navMoves: 2, activations: 0, decisions: 2, waits: 0, speechUnits: 2, scanSteps: 3 },
          { id: 'open-save-options', bucket: 'repeated', navMoves: 1, activations: 1, decisions: 1, waits: 0, speechUnits: 1, scanSteps: 2 },
          { id: 'set-save-options', bucket: 'repeated', navMoves: 6, activations: 2, decisions: 4, waits: 0, speechUnits: 4, scanSteps: 7 },
          { id: 'confirm-save', bucket: 'recovery', navMoves: 1, activations: 1, decisions: 1, waits: 0, speechUnits: 1, scanSteps: 1 },
        ],
      },
    },
  },
};
