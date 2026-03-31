export const productBenchmarkGraphs = {
  variantA: {
    label: '비교안 A · 조작 부담이 큰 구조',
    description: '상단 링크와 부가 안내를 지난 뒤 옵션 묶음에 도달하고, 각 옵션마다 선택 버튼과 설명 보기 버튼이 따로 있으며, 설명 대화상자를 닫으면 옵션 선택 제목 근처부터 다시 찾아야 하는 구조.',
    tasks: {
      task1_cream_15_charger_add: {
        title: '크림색 15형과 충전기 주머니 포함 구성 담기',
        assumptions: [
          '상단 내비게이션과 상품 안내 링크를 지난 뒤 옵션 선택 묶음에 도달해야 한다.',
          '각 옵션마다 선택 버튼과 설명 보기 버튼이 따로 있어 원하는 조합으로 갈 때 반복 탐색이 길어진다.',
          '장바구니 버튼이 옵션 묶음 뒤쪽에 있어 다시 이동해야 한다.',
        ],
        steps: [
          { id: 'reach-option-groups', bucket: 'entry', navMoves: 14, activations: 0, decisions: 2, waits: 0, speechUnits: 5, scanSteps: 16 },
          { id: 'choose-color', bucket: 'repeated', navMoves: 6, activations: 1, decisions: 2, waits: 0, speechUnits: 3, scanSteps: 7 },
          { id: 'choose-size', bucket: 'repeated', navMoves: 6, activations: 1, decisions: 2, waits: 0, speechUnits: 3, scanSteps: 7 },
          { id: 'choose-bundle', bucket: 'repeated', navMoves: 8, activations: 1, decisions: 3, waits: 0, speechUnits: 4, scanSteps: 10 },
          { id: 'move-to-cart', bucket: 'recovery', navMoves: 7, activations: 1, decisions: 2, waits: 0, speechUnits: 3, scanSteps: 8 },
        ],
      },
      task2_size13_detail_charcoal_basic_add: {
        title: '13형 설명을 확인한 뒤 먹색 기본형 담기',
        assumptions: [
          '13형 설명 보기는 옵션 안에 따로 있어 먼저 해당 줄을 다시 찾아야 한다.',
          '설명 대화상자를 닫으면 방금 보던 버튼으로 돌아가지 않고 옵션 선택 제목 근처부터 다시 찾아야 한다.',
          '원하는 조합으로 되돌린 뒤 장바구니 위치까지 한 번 더 내려가야 한다.',
        ],
        steps: [
          { id: 'reorient-to-size-group', bucket: 'entry', navMoves: 12, activations: 0, decisions: 2, waits: 0, speechUnits: 4, scanSteps: 14 },
          { id: 'open-size13-detail', bucket: 'repeated', navMoves: 7, activations: 1, decisions: 2, waits: 0, speechUnits: 3, scanSteps: 8 },
          { id: 'close-detail-and-return', bucket: 'recovery', navMoves: 6, activations: 1, decisions: 2, waits: 1, speechUnits: 3, contextResets: 1, scanSteps: 7 },
          { id: 'restore-target-options', bucket: 'repeated', navMoves: 10, activations: 2, decisions: 3, waits: 0, speechUnits: 5, scanSteps: 12 },
          { id: 'move-to-cart', bucket: 'recovery', navMoves: 7, activations: 1, decisions: 2, waits: 0, speechUnits: 3, scanSteps: 8 },
        ],
      },
      task3_olive_15_document_two_add: {
        title: '올리브 15형 문서 주머니 포함 구성 2개 담기',
        assumptions: [
          '색상, 크기, 추가 구성, 수량이 각각 떨어져 있어 연속 과업에서 상단과 중간 영역을 반복해 지난다.',
          '옵션마다 여러 버튼이 나뉘어 있어 원하는 조합으로 맞추는 동안 멈춤 지점이 쉽게 늘어난다.',
          '수량 조정 뒤에도 장바구니 버튼까지 다시 이동해야 한다.',
        ],
        steps: [
          { id: 'reorient-to-options', bucket: 'entry', navMoves: 12, activations: 0, decisions: 2, waits: 0, speechUnits: 4, scanSteps: 14 },
          { id: 'choose-olive', bucket: 'repeated', navMoves: 8, activations: 1, decisions: 3, waits: 0, speechUnits: 4, scanSteps: 10 },
          { id: 'choose-size15', bucket: 'repeated', navMoves: 6, activations: 1, decisions: 2, waits: 0, speechUnits: 3, scanSteps: 7 },
          { id: 'choose-document-bundle', bucket: 'repeated', navMoves: 8, activations: 1, decisions: 3, waits: 0, speechUnits: 4, scanSteps: 10 },
          { id: 'set-quantity', bucket: 'repeated', navMoves: 5, activations: 1, decisions: 2, waits: 0, speechUnits: 2, scanSteps: 6 },
          { id: 'move-to-cart', bucket: 'recovery', navMoves: 7, activations: 1, decisions: 2, waits: 0, speechUnits: 3, scanSteps: 8 },
        ],
      },
    },
  },
  variantB: {
    label: '비교안 B · 개선 구조',
    description: '맨 앞의 옵션 선택 바로 이동 링크로 처음 진입 부담을 낮추고, 각 옵션 묶음에 한 번 들어간 뒤 방향키로 고르며, 선택한 옵션 설명 보기 버튼과 장바구니 버튼을 가까이 모아 둔 구조.',
    tasks: {
      task1_cream_15_charger_add: {
        title: '크림색 15형과 충전기 주머니 포함 구성 담기',
        assumptions: [
          '맨 앞의 옵션 선택 바로 이동 링크로 첫 진입 부담을 줄인다.',
          '색상, 크기, 추가 구성은 각 묶음에 한 번만 들어간 뒤 방향키로 고른다.',
          '현재 선택 요약과 장바구니 버튼이 가까이 있어 마지막 이동이 짧다.',
        ],
        steps: [
          { id: 'skip-to-options', bucket: 'entry', navMoves: 2, activations: 1, decisions: 1, waits: 0, speechUnits: 2, scanSteps: 3 },
          { id: 'set-color', bucket: 'repeated', navMoves: 1, activations: 0, decisions: 1, waits: 0, speechUnits: 1, scanSteps: 1 },
          { id: 'set-size', bucket: 'repeated', navMoves: 2, activations: 0, decisions: 2, waits: 0, speechUnits: 2, scanSteps: 2 },
          { id: 'set-bundle', bucket: 'repeated', navMoves: 2, activations: 0, decisions: 2, waits: 0, speechUnits: 2, scanSteps: 2 },
          { id: 'add-cart', bucket: 'recovery', navMoves: 3, activations: 1, decisions: 2, waits: 0, speechUnits: 2, scanSteps: 3 },
        ],
      },
      task2_size13_detail_charcoal_basic_add: {
        title: '13형 설명을 확인한 뒤 먹색 기본형 담기',
        assumptions: [
          '선택한 크기의 설명 보기 버튼이 바로 아래에 있어 13형 설명 열기까지의 이동이 짧다.',
          '설명 대화상자를 닫으면 방금 사용한 설명 보기 버튼으로 초점이 돌아온다.',
          '현재 선택 요약을 보며 먹색 13형 기본형으로 되돌린 뒤 바로 장바구니에 담을 수 있다.',
        ],
        steps: [
          { id: 'move-to-size-group', bucket: 'entry', navMoves: 3, activations: 0, decisions: 1, waits: 0, speechUnits: 2, scanSteps: 3 },
          { id: 'choose-size13-and-open-detail', bucket: 'repeated', navMoves: 2, activations: 1, decisions: 2, waits: 0, speechUnits: 2, scanSteps: 2 },
          { id: 'close-detail-return', bucket: 'recovery', navMoves: 1, activations: 1, decisions: 1, waits: 0, speechUnits: 1, scanSteps: 1 },
          { id: 'restore-target-options', bucket: 'repeated', navMoves: 3, activations: 0, decisions: 3, waits: 0, speechUnits: 3, scanSteps: 3 },
          { id: 'add-cart', bucket: 'recovery', navMoves: 2, activations: 1, decisions: 2, waits: 0, speechUnits: 2, scanSteps: 2 },
        ],
      },
      task3_olive_15_document_two_add: {
        title: '올리브 15형 문서 주머니 포함 구성 2개 담기',
        assumptions: [
          '각 옵션 묶음은 한 번만 들어간 뒤 필요한 만큼만 방향키로 이동한다.',
          '수량과 장바구니 버튼이 현재 선택 요약 안에 모여 있어 연속 작업이 짧다.',
          '상단 부가 링크를 반복해 지나지 않아 연속 과업에서도 부담이 누적되기 어렵다.',
        ],
        steps: [
          { id: 'move-to-option-groups', bucket: 'entry', navMoves: 2, activations: 0, decisions: 1, waits: 0, speechUnits: 1, scanSteps: 2 },
          { id: 'set-olive', bucket: 'repeated', navMoves: 2, activations: 0, decisions: 1, waits: 0, speechUnits: 1, scanSteps: 2 },
          { id: 'set-size15', bucket: 'repeated', navMoves: 2, activations: 0, decisions: 1, waits: 0, speechUnits: 1, scanSteps: 2 },
          { id: 'set-document-bundle', bucket: 'repeated', navMoves: 2, activations: 0, decisions: 1, waits: 0, speechUnits: 1, scanSteps: 2 },
          { id: 'set-quantity', bucket: 'repeated', navMoves: 2, activations: 1, decisions: 1, waits: 0, speechUnits: 1, scanSteps: 2 },
          { id: 'add-cart', bucket: 'recovery', navMoves: 2, activations: 1, decisions: 2, waits: 0, speechUnits: 2, scanSteps: 2 },
        ],
      },
    },
  },
};
