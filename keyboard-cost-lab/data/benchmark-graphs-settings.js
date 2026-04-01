export const settingsBenchmarkGraphs = {
  variantA: {
    label: '비교안 A · 조작 부담이 큰 구조',
    description: '상단 보조 링크와 길게 이어진 모든 설정 묶음을 차례로 지나야 원하는 설정에 도달하고, 각 설정마다 현재 상태, 변경 시각, 설명 보기, 값 선택 버튼이 흩어져 있으며, 설명 대화상자를 닫으면 설정 화면 제목 근처로 돌아와 다시 위치를 찾아야 하는 구조.',
    tasks: {
      task1_notifications_sms_off_day_before_on: {
        title: '알림 설정에서 문자 알림 끄고 상담 하루 전 알림 켜기',
        assumptions: [
          '상단 보조 링크와 안내 링크를 먼저 지나야 알림 설정 첫 묶음에 도달한다.',
          '각 설정마다 설명 보기와 값 선택 버튼이 따로 나뉘어 있어 순차 이동이 길어진다.',
          '저장 버튼은 묶음 맨 아래에 있어 필요한 설정을 바꾼 뒤 다시 한 번 이동해야 한다.',
        ],
        steps: [
          { id: 'reach-notifications', bucket: 'entry', navMoves: 10, activations: 0, decisions: 2, waits: 0, speechUnits: 4, scanSteps: 12 },
          { id: 'set-sms-off', bucket: 'repeated', navMoves: 5, activations: 1, decisions: 2, waits: 0, speechUnits: 3, scanSteps: 6 },
          { id: 'set-day-before-on', bucket: 'repeated', navMoves: 4, activations: 1, decisions: 2, waits: 0, speechUnits: 3, scanSteps: 5 },
          { id: 'save-notifications', bucket: 'repeated', navMoves: 5, activations: 1, decisions: 1, waits: 1, speechUnits: 2, scanSteps: 6 },
        ],
      },
      task2_security_help_then_login_alert_on: {
        title: '보안 설정에서 로그인 확인 단계 설명을 열었다가 닫고 새 기기 로그인 알림 켜기',
        assumptions: [
          '보안 설정은 예약 편의 묶음 뒤에 있어 앞부분 설정을 지난 뒤에야 도달할 수 있다.',
          '로그인 확인 단계 설명을 닫으면 방금 쓰던 설명 보기 버튼으로 돌아가지 않고 설정 화면 제목 근처로 돌아온다.',
          '설명 확인 뒤 새 기기 로그인 알림과 저장 버튼을 다시 찾아야 해 복구 비용이 커진다.',
        ],
        steps: [
          { id: 'reach-security', bucket: 'entry', navMoves: 17, activations: 0, decisions: 3, waits: 0, speechUnits: 6, scanSteps: 20 },
          { id: 'open-verification-help', bucket: 'repeated', navMoves: 5, activations: 1, decisions: 2, waits: 0, speechUnits: 3, scanSteps: 6 },
          { id: 'close-help-reset', bucket: 'recovery', navMoves: 4, activations: 1, decisions: 2, waits: 0, speechUnits: 2, contextResets: 1, scanSteps: 5 },
          { id: 'find-login-alert-and-enable', bucket: 'recovery', navMoves: 7, activations: 1, decisions: 2, waits: 0, speechUnits: 4, contextResets: 1, scanSteps: 8 },
          { id: 'save-security', bucket: 'recovery', navMoves: 5, activations: 1, decisions: 1, waits: 1, speechUnits: 2, scanSteps: 6 },
        ],
      },
      task3_display_text_110_contrast_on: {
        title: '화면 설정에서 글자 크기 110%와 높은 대비 켜기',
        assumptions: [
          '화면 설정은 가장 아래쪽에 있어 앞선 모든 설정 묶음을 지나야 한다.',
          '글자 크기 선택은 각 값 버튼이 따로 나뉘어 있고, 높은 대비와 저장 버튼도 이어서 다시 찾아야 한다.',
          '같은 화면 안에 관련 없는 움직임 줄이기 설정과 도움말 링크가 섞여 있어 목표 설정을 가려 낸 뒤 이동해야 한다.',
        ],
        steps: [
          { id: 'reach-display', bucket: 'entry', navMoves: 22, activations: 0, decisions: 4, waits: 0, speechUnits: 7, scanSteps: 25 },
          { id: 'set-text-size-110', bucket: 'repeated', navMoves: 6, activations: 1, decisions: 2, waits: 0, speechUnits: 3, scanSteps: 7 },
          { id: 'set-high-contrast-on', bucket: 'repeated', navMoves: 5, activations: 1, decisions: 2, waits: 0, speechUnits: 3, scanSteps: 6 },
          { id: 'save-display', bucket: 'repeated', navMoves: 5, activations: 1, decisions: 1, waits: 1, speechUnits: 2, scanSteps: 6 },
        ],
      },
    },
  },
  variantB: {
    label: '비교안 B · 개선 구조',
    description: '설정 항목으로 바로 이동한 뒤, 설정 묶음을 한 번만 선택하고, 묶음 안의 핵심 설정을 가까운 자리에서 바꾸며, 설명 대화상자를 닫으면 방금 누른 설명 보기 버튼으로 돌아오는 구조.',
    tasks: {
      task1_notifications_sms_off_day_before_on: {
        title: '알림 설정에서 문자 알림 끄고 상담 하루 전 알림 켜기',
        assumptions: [
          '맨 앞의 설정 항목으로 바로 이동 링크로 첫 진입 부담을 줄인다.',
          '알림 설정은 처음 열리는 묶음이라 별도 긴 진입 없이 바로 핵심 설정을 바꿀 수 있다.',
          '묶음 안에서 저장 버튼이 가까이 있어 설정을 바꾼 뒤 바로 저장할 수 있다.',
        ],
        steps: [
          { id: 'jump-to-settings', bucket: 'entry', navMoves: 2, activations: 1, decisions: 1, waits: 0, speechUnits: 2, scanSteps: 3 },
          { id: 'set-sms-off', bucket: 'repeated', navMoves: 2, activations: 1, decisions: 1, waits: 0, speechUnits: 1, scanSteps: 2 },
          { id: 'set-day-before-on', bucket: 'repeated', navMoves: 1, activations: 1, decisions: 1, waits: 0, speechUnits: 1, scanSteps: 1 },
          { id: 'save-notifications', bucket: 'repeated', navMoves: 1, activations: 1, decisions: 1, waits: 1, speechUnits: 1, scanSteps: 1 },
        ],
      },
      task2_security_help_then_login_alert_on: {
        title: '보안 설정에서 로그인 확인 단계 설명을 열었다가 닫고 새 기기 로그인 알림 켜기',
        assumptions: [
          '설정 묶음 선택은 한 번만 들어간 뒤 방향키로 이동해 보안 설정으로 갈 수 있다.',
          '설명 대화상자를 닫으면 같은 설명 보기 버튼으로 초점이 돌아와 다음 설정으로 이어서 이동하기 쉽다.',
          '새 기기 로그인 알림과 저장 버튼이 같은 묶음 안에 가까이 있어 복구 비용이 작다.',
        ],
        steps: [
          { id: 'move-to-security-section', bucket: 'entry', navMoves: 3, activations: 0, decisions: 2, waits: 0, speechUnits: 2, scanSteps: 4 },
          { id: 'open-verification-help', bucket: 'repeated', navMoves: 2, activations: 1, decisions: 1, waits: 0, speechUnits: 1, scanSteps: 2 },
          { id: 'close-help-return', bucket: 'recovery', navMoves: 2, activations: 1, decisions: 1, waits: 0, speechUnits: 1, scanSteps: 2 },
          { id: 'enable-login-alert', bucket: 'recovery', navMoves: 2, activations: 1, decisions: 1, waits: 0, speechUnits: 1, scanSteps: 2 },
          { id: 'save-security', bucket: 'recovery', navMoves: 1, activations: 1, decisions: 1, waits: 1, speechUnits: 1, scanSteps: 1 },
        ],
      },
      task3_display_text_110_contrast_on: {
        title: '화면 설정에서 글자 크기 110%와 높은 대비 켜기',
        assumptions: [
          '설정 묶음 선택에서 화면 설정으로 빠르게 이동할 수 있다.',
          '글자 크기 선택은 한 묶음 안에서 바로 이동해 110%를 고를 수 있다.',
          '높은 대비와 저장 버튼이 같은 묶음 안에 가까이 있어 순차 이동 비용을 줄인다.',
        ],
        steps: [
          { id: 'move-to-display-section', bucket: 'entry', navMoves: 4, activations: 0, decisions: 2, waits: 0, speechUnits: 2, scanSteps: 5 },
          { id: 'set-text-size-110', bucket: 'repeated', navMoves: 2, activations: 0, decisions: 1, waits: 0, speechUnits: 1, scanSteps: 2 },
          { id: 'set-high-contrast-on', bucket: 'repeated', navMoves: 2, activations: 1, decisions: 1, waits: 0, speechUnits: 1, scanSteps: 2 },
          { id: 'save-display', bucket: 'repeated', navMoves: 1, activations: 1, decisions: 1, waits: 1, speechUnits: 1, scanSteps: 1 },
        ],
      },
    },
  },
};
