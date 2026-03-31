export const calendarBenchmarkGraphs = {
  variantA: {
    label: '비교안 A · 조작 부담이 큰 구조',
    description: '상단 링크와 조건 선택을 지난 뒤 결과에 도달하고, 예약 시간마다 여러 번 멈춰야 하며, 대화상자를 닫은 뒤 결과 제목 근처부터 다시 찾아야 하는 구조.',
    tasks: {
      task1_book_remote_tuesday: {
        title: '화요일 오후 비대면 30분 상담 예약',
        assumptions: [
          '상단 링크와 보조 링크를 지나 예약 가능 시간 영역에 도달해야 한다.',
          '예약 시간마다 선택과 자세히 보기 버튼이 분리되어 있다.',
          '대화상자를 닫으면 방금 보던 예약 시간으로 돌아가지 않고 결과 제목 근처부터 다시 찾아야 한다.',
        ],
        steps: [
          { id: 'reach-filters', bucket: 'entry', navMoves: 16, activations: 0, decisions: 2, waits: 0, speechUnits: 6, scanSteps: 18 },
          { id: 'set-filters', bucket: 'entry', navMoves: 10, activations: 4, decisions: 4, waits: 1, speechUnits: 6, scanSteps: 12 },
          { id: 'reach-results', bucket: 'entry', navMoves: 9, activations: 0, decisions: 3, waits: 0, speechUnits: 4, scanSteps: 10 },
          { id: 'scan-slot-list', bucket: 'repeated', navMoves: 14, activations: 0, decisions: 7, waits: 0, speechUnits: 9, scanSteps: 18 },
          { id: 'open-slot-detail', bucket: 'repeated', navMoves: 2, activations: 1, decisions: 1, waits: 0, speechUnits: 2, scanSteps: 3 },
          { id: 'confirm-dialog', bucket: 'recovery', navMoves: 6, activations: 1, decisions: 2, waits: 1, speechUnits: 3, contextResets: 1, scanSteps: 7 },
        ],
      },
      task2_move_earlier_same_day: {
        title: '같은 날 더 이른 시간대로 변경',
        assumptions: [
          '기존 예약 상태를 확인하는 영역까지 다시 차례대로 이동해야 한다.',
          '조건은 유지되지만 결과 목록 위치가 기억되지 않아 다시 찾아야 한다.',
          '변경 확인 대화상자를 닫으면 이전 예약 시간 대신 결과 제목 근처부터 다시 살펴야 한다.',
        ],
        steps: [
          { id: 'reorient', bucket: 'entry', navMoves: 20, activations: 0, decisions: 3, waits: 0, speechUnits: 8, scanSteps: 23 },
          { id: 'scan-earlier-options', bucket: 'repeated', navMoves: 11, activations: 0, decisions: 5, waits: 0, speechUnits: 7, scanSteps: 14 },
          { id: 'open-target-slot', bucket: 'repeated', navMoves: 2, activations: 1, decisions: 1, waits: 0, speechUnits: 2, scanSteps: 3 },
          { id: 'confirm-change', bucket: 'recovery', navMoves: 7, activations: 1, decisions: 2, waits: 1, speechUnits: 4, contextResets: 1, scanSteps: 8 },
        ],
      },
      task3_cancel_and_rebook_thursday: {
        title: '취소 후 목요일 오전 대면 예약',
        assumptions: [
          '취소 버튼이 결과 목록 뒤에 있어 먼저 다시 찾아야 한다.',
          '취소 후 조건을 다시 맞춘 다음 목요일 예약 시간을 차례대로 찾아야 한다.',
          '새 예약을 확정할 때까지 대화상자 진입과 결과 제목으로의 복귀 부담이 겹친다.',
        ],
        steps: [
          { id: 'reach-current-booking', bucket: 'entry', navMoves: 22, activations: 0, decisions: 3, waits: 0, speechUnits: 8, scanSteps: 25 },
          { id: 'cancel-existing', bucket: 'recovery', navMoves: 4, activations: 1, decisions: 2, waits: 1, speechUnits: 3, contextResets: 1, scanSteps: 5 },
          { id: 'retune-filters', bucket: 'entry', navMoves: 12, activations: 3, decisions: 4, waits: 1, speechUnits: 6, scanSteps: 14 },
          { id: 'scan-thursday-options', bucket: 'repeated', navMoves: 12, activations: 0, decisions: 5, waits: 0, speechUnits: 8, scanSteps: 15 },
          { id: 'confirm-new-booking', bucket: 'recovery', navMoves: 6, activations: 1, decisions: 2, waits: 1, speechUnits: 3, contextResets: 1, scanSteps: 7 },
        ],
      },
    },
  },
  variantB: {
    label: '비교안 B · 개선 구조',
    description: '맨 앞의 예약 가능 시간 바로 이동 링크로 처음 진입 부담을 낮추고, 예약 시간표에 한 번만 들어간 뒤 이동하며, 대화상자 초점 이동과 복귀를 보장하는 구조.',
    tasks: {
      task1_book_remote_tuesday: {
        title: '화요일 오후 비대면 30분 상담 예약',
        assumptions: [
          '맨 앞의 예약 가능 시간 바로 이동 링크로 첫 진입 부담이 낮다.',
          '예약 시간표가 하나의 묶음으로 제공되어 한 번만 들어간 뒤 이동한다.',
          '대화상자가 열리면 첫 동작으로 이동하고 닫히면 호출한 예약 시간으로 돌아온다.',
        ],
        steps: [
          { id: 'skip-to-main', bucket: 'entry', navMoves: 2, activations: 1, decisions: 1, waits: 0, speechUnits: 2, scanSteps: 3 },
          { id: 'set-filters', bucket: 'entry', navMoves: 6, activations: 4, decisions: 4, waits: 1, speechUnits: 4, scanSteps: 8 },
          { id: 'enter-grid', bucket: 'entry', navMoves: 1, activations: 0, decisions: 1, waits: 0, speechUnits: 1, scanSteps: 1 },
          { id: 'arrow-to-target', bucket: 'repeated', navMoves: 7, activations: 0, decisions: 4, waits: 0, speechUnits: 5, scanSteps: 8 },
          { id: 'open-and-confirm', bucket: 'recovery', navMoves: 2, activations: 2, decisions: 2, waits: 1, speechUnits: 2, scanSteps: 3 },
        ],
      },
      task2_move_earlier_same_day: {
        title: '같은 날 더 이른 시간대로 변경',
        assumptions: [
          '현재 예약 상태가 같은 영역에 유지되어 다시 파악하는 부담이 적다.',
          '예약 시간 사이 이동은 방향키 중심이라 짧게 끝난다.',
          '변경 후 초점이 새 예약 요약으로 이동한다.',
        ],
        steps: [
          { id: 'reenter-grid', bucket: 'entry', navMoves: 3, activations: 0, decisions: 1, waits: 0, speechUnits: 2, scanSteps: 3 },
          { id: 'move-to-earlier-slot', bucket: 'repeated', navMoves: 4, activations: 0, decisions: 3, waits: 0, speechUnits: 3, scanSteps: 5 },
          { id: 'confirm-change', bucket: 'recovery', navMoves: 2, activations: 2, decisions: 2, waits: 1, speechUnits: 2, scanSteps: 3 },
        ],
      },
      task3_cancel_and_rebook_thursday: {
        title: '취소 후 목요일 오전 대면 예약',
        assumptions: [
          '현재 예약 영역이 빠르게 닿을 수 있는 위치에 놓인다.',
          '조건을 적용한 뒤 결과 제목으로 초점이 이동한다.',
          '맨 앞의 바로 이동 링크로 새 예약 시간을 고를 때까지 반복되는 상단 영역을 건너뛸 수 있다.',
        ],
        steps: [
          { id: 'cancel-existing', bucket: 'recovery', navMoves: 2, activations: 1, decisions: 2, waits: 1, speechUnits: 2, scanSteps: 2 },
          { id: 'set-new-filters', bucket: 'entry', navMoves: 6, activations: 3, decisions: 4, waits: 1, speechUnits: 4, scanSteps: 7 },
          { id: 'enter-grid', bucket: 'entry', navMoves: 1, activations: 0, decisions: 1, waits: 0, speechUnits: 1, scanSteps: 1 },
          { id: 'move-to-thursday-target', bucket: 'repeated', navMoves: 6, activations: 0, decisions: 4, waits: 0, speechUnits: 4, scanSteps: 7 },
          { id: 'confirm-new-booking', bucket: 'recovery', navMoves: 2, activations: 2, decisions: 2, waits: 1, speechUnits: 2, scanSteps: 3 },
        ],
      },
    },
  },
};
