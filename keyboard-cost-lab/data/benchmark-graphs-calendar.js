export const calendarBenchmarkGraphs = {
  variantA: {
    label: '조건 A · 고비용 구조',
    description: '헤더/필터 이후 결과 진입, 슬롯별 복수 탭 스톱, 약한 모달 포커스 관리.',
    tasks: {
      task1_book_remote_tuesday: {
        title: '화요일 오후 비대면 30분 상담 예약',
        assumptions: [
          '헤더와 보조 링크를 지나 결과 영역에 도달해야 한다.',
          '슬롯 행마다 선택과 상세 보기 버튼이 분리되어 있다.',
          '모달이 열려도 초점이 자동 이동하지 않고 결과 영역으로 복귀도 보장되지 않는다.',
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
          '기존 예약 상태를 확인하는 패널까지 다시 순차 탐색해야 한다.',
          '필터는 유지되지만 결과 목록 위치가 기억되지 않아 재탐색이 발생한다.',
          '변경 확인 모달에서도 배경 이탈 가능성이 있다.',
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
          '취소 버튼이 결과 목록 뒤에 있어 우선 재탐색이 필요하다.',
          '취소 후 필터를 다시 맞춘 다음 목요일 슬롯을 순차 탐색해야 한다.',
          '새 예약 확정까지 모달 진입과 복귀 비용이 중첩된다.',
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
    label: '조건 B · 개선 구조',
    description: '스킵 링크, 결과 이동, 슬롯 그리드 단일 진입, 모달 초기 포커스·복귀 보장.',
    tasks: {
      task1_book_remote_tuesday: {
        title: '화요일 오후 비대면 30분 상담 예약',
        assumptions: [
          '스킵 링크와 결과 이동으로 첫 진입 비용이 낮다.',
          '슬롯 목록이 layout grid로 묶여 단일 탭 스톱으로 진입한다.',
          '모달이 열리면 첫 액션으로 이동하고 닫히면 호출 슬롯으로 돌아온다.',
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
          '현재 예약 상태가 같은 영역에서 유지되어 문맥 재구축 비용이 적다.',
          '슬롯 간 이동은 화살표 기반으로 짧게 끝난다.',
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
          '현재 예약 패널이 빠른 진입점으로 노출된다.',
          '필터 적용 후 결과 제목으로 초점이 이동한다.',
          '새 슬롯 선택 전까지 반복 영역 우회가 유지된다.',
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
