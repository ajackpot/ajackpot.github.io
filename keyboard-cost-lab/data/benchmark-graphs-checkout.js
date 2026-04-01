export const checkoutBenchmarkGraphs = {
  variantA: {
    label: '비교안 A · 조작 부담이 큰 구조',
    description: '상단 보조 링크와 길게 이어진 신청 단계들을 차례로 지나야 원하는 항목에 도달하고, 각 항목마다 현재 상태, 최근 확인, 설명 보기, 값 선택 버튼이 흩어져 있으며, 설명 대화상자를 닫으면 신청 단계 제목 근처로 돌아와 다시 위치를 찾아야 하는 구조.',
    tasks: {
      task1_remote_contact_card_submit: {
        title: '비대면 초진 상담을 고르고 연락처 확인 안내를 켠 뒤 카드 결제로 신청 완료',
        assumptions: [
          '상단 보조 링크와 앞선 신청 단계 안내 링크를 지나야 신청 정보에 도달한다.',
          '상담 종류, 연락처 확인 안내, 결제 수단, 제출 버튼이 서로 멀리 떨어져 있어 긴 순차 이동이 필요하다.',
          '제출 확인은 맨 아래에 있어 원하는 값을 모두 바꾼 뒤 다시 내려가야 한다.',
        ],
        steps: [
          { id: 'reach-apply-section', bucket: 'entry', navMoves: 10, activations: 0, decisions: 2, waits: 0, speechUnits: 4, scanSteps: 12 },
          { id: 'set-service-kind-remote', bucket: 'repeated', navMoves: 6, activations: 1, decisions: 2, waits: 0, speechUnits: 3, scanSteps: 7 },
          { id: 'reach-notice-section', bucket: 'entry', navMoves: 7, activations: 0, decisions: 2, waits: 0, speechUnits: 3, scanSteps: 8 },
          { id: 'turn-contact-check-on', bucket: 'repeated', navMoves: 5, activations: 1, decisions: 2, waits: 0, speechUnits: 3, scanSteps: 6 },
          { id: 'reach-payment-section', bucket: 'entry', navMoves: 7, activations: 0, decisions: 2, waits: 0, speechUnits: 3, scanSteps: 8 },
          { id: 'set-payment-card', bucket: 'repeated', navMoves: 6, activations: 1, decisions: 2, waits: 0, speechUnits: 3, scanSteps: 7 },
          { id: 'reach-submit-and-finish', bucket: 'repeated', navMoves: 8, activations: 1, decisions: 2, waits: 1, speechUnits: 3, scanSteps: 9 },
        ],
      },
      task2_guardian_help_bank_submit: {
        title: '보호자 대리 신청과 준비 안내 설명 확인 뒤 계좌 이체로 신청 완료',
        assumptions: [
          '신청 대상, 준비 안내 설명, 준비 안내 값, 결제 수단, 제출 버튼이 서로 다른 단계에 흩어져 있다.',
          '준비 안내 설명을 닫으면 방금 사용한 버튼이 아니라 신청 단계 제목 근처로 돌아온다.',
          '설명 확인 뒤 안내 수신 항목과 제출 확인 단계까지 다시 찾아야 해 복구 비용이 커진다.',
        ],
        steps: [
          { id: 'reach-apply-section', bucket: 'entry', navMoves: 10, activations: 0, decisions: 2, waits: 0, speechUnits: 4, scanSteps: 12 },
          { id: 'set-applicant-guardian', bucket: 'repeated', navMoves: 7, activations: 1, decisions: 2, waits: 0, speechUnits: 3, scanSteps: 8 },
          { id: 'reach-notice-section', bucket: 'entry', navMoves: 7, activations: 0, decisions: 2, waits: 0, speechUnits: 3, scanSteps: 8 },
          { id: 'open-prep-help', bucket: 'repeated', navMoves: 4, activations: 1, decisions: 1, waits: 0, speechUnits: 2, scanSteps: 5 },
          { id: 'close-help-reset', bucket: 'recovery', navMoves: 4, activations: 1, decisions: 2, waits: 0, speechUnits: 2, contextResets: 1, scanSteps: 5 },
          { id: 'find-prep-guide-and-set-sms', bucket: 'recovery', navMoves: 6, activations: 1, decisions: 2, waits: 0, speechUnits: 3, contextResets: 1, scanSteps: 7 },
          { id: 'reach-payment-section', bucket: 'repeated', navMoves: 7, activations: 0, decisions: 2, waits: 0, speechUnits: 3, scanSteps: 8 },
          { id: 'set-payment-bank', bucket: 'repeated', navMoves: 5, activations: 1, decisions: 2, waits: 0, speechUnits: 3, scanSteps: 6 },
          { id: 'reach-submit-and-finish', bucket: 'repeated', navMoves: 6, activations: 1, decisions: 2, waits: 1, speechUnits: 3, scanSteps: 7 },
        ],
      },
      task3_return_receipt_easy_submit: {
        title: '재방문 빠른 상담과 문자 영수증, 간편 결제로 신청 완료',
        assumptions: [
          '상담 종류를 바꾼 뒤 결제 단계로 길게 이동해야 한다.',
          '영수증 받는 방법과 결제 수단 선택 버튼이 각각 따로 흩어져 있어 반복 이동이 크다.',
          '제출 확인 단계가 마지막에 있어 필요한 값을 맞춘 뒤 다시 한 번 길게 내려가야 한다.',
        ],
        steps: [
          { id: 'reach-apply-section', bucket: 'entry', navMoves: 10, activations: 0, decisions: 2, waits: 0, speechUnits: 4, scanSteps: 12 },
          { id: 'set-service-kind-return', bucket: 'repeated', navMoves: 7, activations: 1, decisions: 2, waits: 0, speechUnits: 3, scanSteps: 8 },
          { id: 'reach-payment-section', bucket: 'entry', navMoves: 14, activations: 0, decisions: 3, waits: 0, speechUnits: 5, scanSteps: 16 },
          { id: 'set-receipt-sms', bucket: 'repeated', navMoves: 5, activations: 1, decisions: 2, waits: 0, speechUnits: 3, scanSteps: 6 },
          { id: 'set-payment-easy', bucket: 'repeated', navMoves: 6, activations: 1, decisions: 2, waits: 0, speechUnits: 3, scanSteps: 7 },
          { id: 'reach-submit-and-finish', bucket: 'repeated', navMoves: 6, activations: 1, decisions: 2, waits: 1, speechUnits: 3, scanSteps: 7 },
        ],
      },
    },
  },
  variantB: {
    label: '비교안 B · 개선 구조',
    description: '신청 단계로 바로 이동해 첫 진입 부담을 낮추고, 신청 단계 묶음을 한 번 선택한 뒤 같은 묶음 안에서 필요한 값을 바꾸며, 설명 대화상자를 닫으면 방금 누른 설명 보기 버튼으로 돌아오고, 제출 단계로 빠르게 이동해 신청을 끝낼 수 있는 구조.',
    tasks: {
      task1_remote_contact_card_submit: {
        title: '비대면 초진 상담을 고르고 연락처 확인 안내를 켠 뒤 카드 결제로 신청 완료',
        assumptions: [
          '맨 앞의 신청 단계로 바로 이동 링크로 첫 진입 부담을 줄인다.',
          '신청 정보, 안내 수신, 결제 수단, 제출 확인을 묶음 선택으로 빠르게 오갈 수 있다.',
          '같은 묶음 안에서 값 변경과 제출을 가까운 거리에서 이어서 수행한다.',
        ],
        steps: [
          { id: 'jump-to-stages', bucket: 'entry', navMoves: 2, activations: 1, decisions: 1, waits: 0, speechUnits: 2, scanSteps: 3 },
          { id: 'set-service-kind-remote', bucket: 'repeated', navMoves: 2, activations: 0, decisions: 1, waits: 0, speechUnits: 1, scanSteps: 2 },
          { id: 'move-to-notice-stage', bucket: 'entry', navMoves: 2, activations: 0, decisions: 1, waits: 0, speechUnits: 1, scanSteps: 2 },
          { id: 'turn-contact-check-on', bucket: 'repeated', navMoves: 2, activations: 1, decisions: 1, waits: 0, speechUnits: 1, scanSteps: 2 },
          { id: 'move-to-payment-stage', bucket: 'entry', navMoves: 2, activations: 0, decisions: 1, waits: 0, speechUnits: 1, scanSteps: 2 },
          { id: 'set-payment-card', bucket: 'repeated', navMoves: 2, activations: 0, decisions: 1, waits: 0, speechUnits: 1, scanSteps: 2 },
          { id: 'move-to-submit-and-finish', bucket: 'repeated', navMoves: 2, activations: 1, decisions: 1, waits: 1, speechUnits: 1, scanSteps: 2 },
        ],
      },
      task2_guardian_help_bank_submit: {
        title: '보호자 대리 신청과 준비 안내 설명 확인 뒤 계좌 이체로 신청 완료',
        assumptions: [
          '신청 대상과 준비 안내 받는 방법은 각 단계 묶음 안에서 짧게 접근할 수 있다.',
          '준비 안내 설명을 닫으면 같은 설명 보기 버튼으로 초점이 돌아와 바로 다음 선택을 이어서 할 수 있다.',
          '결제 수단 단계에서 계좌 이체로 다시 바꾼 뒤 제출 단계로 빠르게 이동할 수 있다.',
        ],
        steps: [
          { id: 'set-applicant-guardian', bucket: 'entry', navMoves: 3, activations: 0, decisions: 2, waits: 0, speechUnits: 2, scanSteps: 4 },
          { id: 'move-to-notice-stage', bucket: 'entry', navMoves: 2, activations: 0, decisions: 1, waits: 0, speechUnits: 1, scanSteps: 2 },
          { id: 'open-prep-help', bucket: 'repeated', navMoves: 2, activations: 1, decisions: 1, waits: 0, speechUnits: 1, scanSteps: 2 },
          { id: 'close-help-return', bucket: 'recovery', navMoves: 2, activations: 1, decisions: 1, waits: 0, speechUnits: 1, scanSteps: 2 },
          { id: 'set-prep-guide-sms', bucket: 'recovery', navMoves: 2, activations: 0, decisions: 1, waits: 0, speechUnits: 1, scanSteps: 2 },
          { id: 'move-to-payment-stage', bucket: 'repeated', navMoves: 2, activations: 0, decisions: 1, waits: 0, speechUnits: 1, scanSteps: 2 },
          { id: 'set-payment-bank', bucket: 'repeated', navMoves: 2, activations: 0, decisions: 1, waits: 0, speechUnits: 1, scanSteps: 2 },
          { id: 'move-to-submit-and-finish', bucket: 'repeated', navMoves: 2, activations: 1, decisions: 1, waits: 1, speechUnits: 1, scanSteps: 2 },
        ],
      },
      task3_return_receipt_easy_submit: {
        title: '재방문 빠른 상담과 문자 영수증, 간편 결제로 신청 완료',
        assumptions: [
          '신청 정보에서 재방문 빠른 상담으로 빠르게 바꾼다.',
          '결제 수단 단계 안에서 영수증 받는 방법과 결제 수단을 짧게 이동하며 바꾼다.',
          '제출 확인 단계로 한 번만 이동하면 바로 신청을 끝낼 수 있다.',
        ],
        steps: [
          { id: 'set-service-kind-return', bucket: 'entry', navMoves: 2, activations: 0, decisions: 1, waits: 0, speechUnits: 1, scanSteps: 2 },
          { id: 'move-to-payment-stage', bucket: 'entry', navMoves: 3, activations: 0, decisions: 1, waits: 0, speechUnits: 1, scanSteps: 3 },
          { id: 'set-receipt-sms', bucket: 'repeated', navMoves: 2, activations: 0, decisions: 1, waits: 0, speechUnits: 1, scanSteps: 2 },
          { id: 'set-payment-easy', bucket: 'repeated', navMoves: 2, activations: 0, decisions: 1, waits: 0, speechUnits: 1, scanSteps: 2 },
          { id: 'move-to-submit-and-finish', bucket: 'repeated', navMoves: 3, activations: 1, decisions: 1, waits: 1, speechUnits: 1, scanSteps: 3 },
        ],
      },
    },
  },
};
