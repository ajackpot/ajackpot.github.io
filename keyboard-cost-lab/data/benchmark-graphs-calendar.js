export const calendarBenchmarkGraphs = {
  variantA: {
    label: '비교안 A · 조작 부담이 큰 구조',
    description: '전체 메뉴가 접힌 것처럼 보이지만 메뉴 항목이 계속 순차 탐색되고, 예약 시간과 옵션 선택이 여러 멈춤 지점으로 흩어진 구조.',
    tasks: {
      task1_book_remote_tuesday_options: {
        title: '비대면 상담 예약과 상담 옵션 선택',
        assumptions: [
          '접힌 전체 메뉴 항목이 계속 초점을 받아 예약 조건 영역에 도달하기 전 탐색 비용이 늘어난다.',
          '예약 시간을 선택한 뒤 상담 옵션 선택지가 화면상으로는 접힌 것처럼 보이지만 각 선택지가 따로 초점을 받는다.',
          '상담 옵션을 확인하고 예약 확정까지 여러 번 이동해야 한다.',
        ],
        steps: [
          { id: 'pass-collapsed-nav', bucket: 'entry', navMoves: 18, activations: 0, decisions: 2, waits: 0, speechUnits: 8, scanSteps: 22 },
          { id: 'set-filters', bucket: 'entry', navMoves: 10, activations: 4, decisions: 4, waits: 1, speechUnits: 6, scanSteps: 12 },
          { id: 'scan-slot-list', bucket: 'repeated', navMoves: 14, activations: 1, decisions: 7, waits: 0, speechUnits: 9, scanSteps: 18 },
          { id: 'option-pseudo-combos', bucket: 'repeated', navMoves: 16, activations: 3, decisions: 6, waits: 0, speechUnits: 10, scanSteps: 20 },
          { id: 'confirm-booking', bucket: 'recovery', navMoves: 5, activations: 1, decisions: 2, waits: 1, speechUnits: 3, contextResets: 1, scanSteps: 7 },
        ],
      },
      task2_cancel_and_rebook_thursday: {
        title: '기존 예약 취소 뒤 목요일 오전 대면 예약',
        assumptions: [
          '시작 시 예약 2개가 있어 새 예약을 바로 시도하면 최대 2개 제한 안내를 만나게 된다.',
          '현재 예약 영역이 결과 뒤에 있어 기존 예약 취소까지 다시 순차 이동해야 한다.',
          '취소 뒤 조건을 다시 맞추고 목요일 대면 예약 시간을 찾아야 한다.',
        ],
        steps: [
          { id: 'encounter-limit', bucket: 'entry', navMoves: 20, activations: 2, decisions: 4, waits: 1, speechUnits: 8, scanSteps: 24 },
          { id: 'reach-current-bookings', bucket: 'recovery', navMoves: 18, activations: 0, decisions: 3, waits: 0, speechUnits: 7, contextResets: 1, scanSteps: 21 },
          { id: 'cancel-one-booking', bucket: 'recovery', navMoves: 4, activations: 2, decisions: 2, waits: 1, speechUnits: 3, contextResets: 1, scanSteps: 6 },
          { id: 'retune-filters', bucket: 'entry', navMoves: 12, activations: 3, decisions: 4, waits: 1, speechUnits: 6, scanSteps: 14 },
          { id: 'scan-thursday-options', bucket: 'repeated', navMoves: 12, activations: 1, decisions: 5, waits: 0, speechUnits: 8, scanSteps: 15 },
          { id: 'confirm-new-booking', bucket: 'recovery', navMoves: 5, activations: 1, decisions: 2, waits: 1, speechUnits: 3, contextResets: 1, scanSteps: 7 },
        ],
      },
    },
  },
  variantB: {
    label: '비교안 B · 개선 구조',
    description: '접힌 메뉴 항목은 초점 대상에서 제외하고, 예약 가능 시간으로 바로 이동한 뒤 시간표와 옵션을 짧게 조작하는 구조.',
    tasks: {
      task1_book_remote_tuesday_options: {
        title: '비대면 상담 예약과 상담 옵션 선택',
        assumptions: [
          '접힌 전체 메뉴 항목은 초점 대상에서 제외되어 첫 진입 비용이 줄어든다.',
          '예약 가능 시간 바로 이동과 시간표 묶음 이동으로 목표 시간을 찾는 비용을 줄인다.',
          '상담 옵션은 기본 폼 요소로 묶여 있어 필요한 값만 고르고 예약 확정으로 이어진다.',
        ],
        steps: [
          { id: 'skip-to-results', bucket: 'entry', navMoves: 2, activations: 1, decisions: 1, waits: 0, speechUnits: 2, scanSteps: 3 },
          { id: 'set-filters', bucket: 'entry', navMoves: 6, activations: 4, decisions: 4, waits: 1, speechUnits: 4, scanSteps: 8 },
          { id: 'move-grid-target', bucket: 'repeated', navMoves: 7, activations: 1, decisions: 4, waits: 0, speechUnits: 5, scanSteps: 8 },
          { id: 'set-options', bucket: 'repeated', navMoves: 6, activations: 3, decisions: 4, waits: 0, speechUnits: 4, scanSteps: 7 },
          { id: 'confirm-booking', bucket: 'recovery', navMoves: 2, activations: 1, decisions: 2, waits: 1, speechUnits: 2, scanSteps: 3 },
        ],
      },
      task2_cancel_and_rebook_thursday: {
        title: '기존 예약 취소 뒤 목요일 오전 대면 예약',
        assumptions: [
          '현재 예약 내용이 앞쪽에 있어 예약 개수 제한을 이해한 뒤 취소로 이어지기 쉽다.',
          '조건 적용 후 결과 제목으로 초점이 이동하고 시간표 안에서 목표 시간까지 이동한다.',
          '취소와 새 예약 확인 후 초점 복귀가 예측 가능하다.',
        ],
        steps: [
          { id: 'cancel-one-booking', bucket: 'recovery', navMoves: 3, activations: 2, decisions: 2, waits: 1, speechUnits: 2, scanSteps: 4 },
          { id: 'set-new-filters', bucket: 'entry', navMoves: 6, activations: 3, decisions: 4, waits: 1, speechUnits: 4, scanSteps: 7 },
          { id: 'move-to-thursday-target', bucket: 'repeated', navMoves: 6, activations: 1, decisions: 4, waits: 0, speechUnits: 4, scanSteps: 7 },
          { id: 'confirm-new-booking', bucket: 'recovery', navMoves: 2, activations: 1, decisions: 2, waits: 1, speechUnits: 2, scanSteps: 3 },
        ],
      },
    },
  },
};
