export const filtersBenchmarkGraphs = {
  variantA: {
    label: '비교안 A · 조작 부담이 큰 구조',
    description: '상단 보조 링크와 세부 조건 묶음을 길게 지나야 검색 결과에 도달하고, 조건 선택지가 여러 개의 개별 버튼으로 흩어져 있으며, 자료마다 저장·바로 열기·미리보기가 각각 따로 있어 순차 이동이 길고, 미리보기 대화상자를 닫으면 검색 결과 제목 근처부터 다시 찾게 되는 구조.',
    tasks: {
      task1_recent_guide_preview_close: {
        title: '최근 7일 안내문에서 예약 변경 안내 미리보기 열었다가 닫기',
        assumptions: [
          '상단 보조 링크와 세부 조건 설명 링크를 먼저 지나야 기간, 자료 종류, 담당 부서 조건을 모두 맞출 수 있다.',
          '기간, 자료 종류, 담당 부서 선택지가 각각 여러 개의 개별 버튼으로 흩어져 있어 탭 이동이 길어진다.',
          '미리보기 대화상자를 닫으면 방금 보던 자료 카드 대신 검색 결과 제목 근처로 돌아와 다시 위치를 잡아야 한다.',
        ],
        steps: [
          { id: 'reach-filter-groups', bucket: 'entry', navMoves: 14, activations: 0, decisions: 3, waits: 0, speechUnits: 5, scanSteps: 16 },
          { id: 'set-period-type-department', bucket: 'entry', navMoves: 14, activations: 3, decisions: 4, waits: 1, speechUnits: 6, scanSteps: 16 },
          { id: 'reach-results', bucket: 'entry', navMoves: 6, activations: 0, decisions: 2, waits: 0, speechUnits: 3, scanSteps: 7 },
          { id: 'scan-guide-results', bucket: 'repeated', navMoves: 8, activations: 0, decisions: 3, waits: 0, speechUnits: 4, scanSteps: 9 },
          { id: 'open-preview', bucket: 'repeated', navMoves: 3, activations: 1, decisions: 1, waits: 0, speechUnits: 2, scanSteps: 4 },
          { id: 'close-preview-reset', bucket: 'recovery', navMoves: 4, activations: 1, decisions: 2, waits: 0, speechUnits: 2, contextResets: 1, scanSteps: 5 },
        ],
      },
      task2_attachment_faq_save_remote: {
        title: '첨부 있는 질문답변에서 비대면 상담 연결 방법 저장',
        assumptions: [
          '자료 종류, 담당 부서, 첨부 있는 자료만 보기 조건을 다시 맞춘 뒤 검색 결과 앞부분부터 원하는 자료를 찾아야 한다.',
          '첨부 여부 토글과 결과 카드 작업 버튼이 모두 개별 이동 지점으로 노출되어 반복 이동 비용이 커진다.',
          '질문답변 수가 줄어도 카드마다 여러 작업 버튼을 따로 지나야 한다.',
        ],
        steps: [
          { id: 'reach-filter-groups-again', bucket: 'entry', navMoves: 13, activations: 0, decisions: 3, waits: 0, speechUnits: 5, scanSteps: 15 },
          { id: 'set-type-department-attachment', bucket: 'entry', navMoves: 13, activations: 3, decisions: 4, waits: 1, speechUnits: 6, scanSteps: 15 },
          { id: 'scan-faq-results', bucket: 'repeated', navMoves: 9, activations: 0, decisions: 4, waits: 0, speechUnits: 5, scanSteps: 10 },
          { id: 'save-target', bucket: 'repeated', navMoves: 2, activations: 1, decisions: 1, waits: 0, speechUnits: 2, scanSteps: 3 },
        ],
      },
      task3_remote_form_preview_open: {
        title: '비대면 상담 신청 서식에서 상담 준비 체크 목록 미리보기 후 바로 열기',
        assumptions: [
          '자료 종류, 대상, 기간을 다시 맞춘 뒤에도 검색 결과 앞부분부터 원하는 자료를 다시 찾아야 한다.',
          '미리보기 대화상자를 닫으면 원래 자료 카드의 작업 버튼으로 돌아가지 않아 바로 열기 버튼을 다시 찾아야 한다.',
          '서식 수가 적어도 카드마다 저장·바로 열기·미리보기가 분산되어 있어 반복 이동이 남는다.',
        ],
        steps: [
          { id: 'reach-filter-groups-third', bucket: 'entry', navMoves: 13, activations: 0, decisions: 3, waits: 0, speechUnits: 5, scanSteps: 15 },
          { id: 'set-type-audience-period', bucket: 'entry', navMoves: 14, activations: 3, decisions: 4, waits: 1, speechUnits: 6, scanSteps: 16 },
          { id: 'scan-form-results', bucket: 'repeated', navMoves: 8, activations: 0, decisions: 3, waits: 0, speechUnits: 4, scanSteps: 9 },
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
    description: '세부 조건으로 바로 이동해 처음 진입 부담을 낮추고, 기간·자료 종류·담당 부서·대상·첨부 여부를 적은 탭 수로 설정하며, 결과는 하나의 선택 항목으로 이동하고, 선택한 자료 작업을 한곳에 모아 두며, 미리보기 대화상자를 닫으면 바로 원래 작업 버튼으로 돌아오는 구조.',
    tasks: {
      task1_recent_guide_preview_close: {
        title: '최근 7일 안내문에서 예약 변경 안내 미리보기 열었다가 닫기',
        assumptions: [
          '맨 앞의 세부 조건으로 바로 이동 링크로 첫 진입 부담을 줄인다.',
          '기간, 자료 종류, 담당 부서 조건을 각각 한 번의 탭 진입으로 설정한다.',
          '미리보기를 닫으면 같은 작업 버튼으로 초점이 돌아와 위치를 다시 찾는 비용을 줄인다.',
        ],
        steps: [
          { id: 'skip-to-filters', bucket: 'entry', navMoves: 2, activations: 1, decisions: 1, waits: 0, speechUnits: 2, scanSteps: 3 },
          { id: 'set-period-type-department', bucket: 'entry', navMoves: 8, activations: 3, decisions: 4, waits: 1, speechUnits: 4, scanSteps: 10 },
          { id: 'jump-results', bucket: 'entry', navMoves: 2, activations: 0, decisions: 1, waits: 0, speechUnits: 1, scanSteps: 2 },
          { id: 'move-to-target', bucket: 'repeated', navMoves: 1, activations: 0, decisions: 1, waits: 0, speechUnits: 1, scanSteps: 1 },
          { id: 'open-preview', bucket: 'repeated', navMoves: 2, activations: 1, decisions: 1, waits: 0, speechUnits: 1, scanSteps: 2 },
          { id: 'close-preview-return', bucket: 'recovery', navMoves: 2, activations: 1, decisions: 1, waits: 0, speechUnits: 1, scanSteps: 2 },
        ],
      },
      task2_attachment_faq_save_remote: {
        title: '첨부 있는 질문답변에서 비대면 상담 연결 방법 저장',
        assumptions: [
          '자료 종류, 담당 부서, 첨부 있는 자료만 보기 조건을 적은 탭 수로 맞추고 결과 제목으로 바로 이어진다.',
          '질문답변 사이 이동은 방향키 중심이라 짧게 끝난다.',
          '저장, 미리보기, 바로 열기를 선택한 자료 작업 영역에 모아 둔다.',
        ],
        steps: [
          { id: 'set-type-department-attachment', bucket: 'entry', navMoves: 7, activations: 3, decisions: 4, waits: 1, speechUnits: 4, scanSteps: 8 },
          { id: 'enter-result-list', bucket: 'entry', navMoves: 1, activations: 0, decisions: 1, waits: 0, speechUnits: 1, scanSteps: 1 },
          { id: 'move-to-target', bucket: 'repeated', navMoves: 1, activations: 0, decisions: 1, waits: 0, speechUnits: 1, scanSteps: 1 },
          { id: 'save-target', bucket: 'repeated', navMoves: 2, activations: 1, decisions: 1, waits: 0, speechUnits: 1, scanSteps: 2 },
        ],
      },
      task3_remote_form_preview_open: {
        title: '비대면 상담 신청 서식에서 상담 준비 체크 목록 미리보기 후 바로 열기',
        assumptions: [
          '자료 종류, 대상, 기간을 적은 탭 수로 맞추고 결과 제목으로 초점이 이동해 현재 조건을 다시 확인하기 쉽다.',
          '서식 사이 이동은 방향키 중심이라 짧게 끝난다.',
          '미리보기를 닫으면 같은 작업 버튼으로 돌아와 바로 열기까지 이어서 수행할 수 있다.',
        ],
        steps: [
          { id: 'set-type-audience-period', bucket: 'entry', navMoves: 7, activations: 3, decisions: 4, waits: 1, speechUnits: 4, scanSteps: 8 },
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
