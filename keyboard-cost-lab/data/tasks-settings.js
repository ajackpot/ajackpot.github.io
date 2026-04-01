export const settingsTasks = [
  {
    id: 'task-1-notifications-save',
    benchmarkTaskId: 'task1_notifications_sms_off_day_before_on',
    title: '과업 1. 알림 설정에서 문자 알림 끄고 상담 하루 전 알림 켜기',
    goalSummary: '알림 설정에서 문자 알림을 끄고, 상담 하루 전 알림을 켠 뒤 알림 설정 저장을 누르십시오.',
    instructions: [
      '알림 설정에서 문자 알림을 끄십시오.',
      '같은 묶음에서 상담 하루 전 알림을 켜십시오.',
      '알림 설정 저장을 누르면 과업이 끝납니다.',
    ],
    targetSectionId: 'notifications',
    saveSectionId: 'notifications',
    targetSummary: '문자 알림 꺼짐 / 상담 하루 전 알림 켜짐',
    requiredValues: {
      'notify-sms': 'off',
      'notify-day-before': 'on',
    },
  },
  {
    id: 'task-2-security-help-and-save',
    benchmarkTaskId: 'task2_security_help_then_login_alert_on',
    title: '과업 2. 보안 설정에서 로그인 확인 단계 설명을 열었다가 닫고 새 기기 로그인 알림 켜기',
    goalSummary: '보안 설정에서 로그인 확인 단계 설명을 한 번 확인한 뒤 닫고, 새 기기 로그인 알림을 켠 뒤 보안 설정 저장을 누르십시오.',
    instructions: [
      '보안 설정으로 이동하십시오.',
      '로그인 확인 단계 설명을 열었다가 닫으십시오.',
      '새 기기 로그인 알림을 켜십시오.',
      '보안 설정 저장을 누르면 과업이 끝납니다.',
    ],
    targetSectionId: 'security',
    saveSectionId: 'security',
    targetSummary: '로그인 확인 단계 설명 확인 / 새 기기 로그인 알림 켜짐',
    requiredValues: {
      'security-login-alert': 'on',
    },
    requiresHelpVisitSettingId: 'security-verification',
  },
  {
    id: 'task-3-display-save',
    benchmarkTaskId: 'task3_display_text_110_contrast_on',
    title: '과업 3. 화면 설정에서 글자 크기 110%와 높은 대비 켜기',
    goalSummary: '화면 설정에서 글자 크기를 110%로 바꾸고, 높은 대비를 켠 뒤 화면 설정 저장을 누르십시오.',
    instructions: [
      '화면 설정으로 이동하십시오.',
      '글자 크기를 110%로 바꾸십시오.',
      '높은 대비를 켜십시오.',
      '화면 설정 저장을 누르면 과업이 끝납니다.',
    ],
    targetSectionId: 'display',
    saveSectionId: 'display',
    targetSummary: '글자 크기 110% / 높은 대비 켜짐',
    requiredValues: {
      'display-text-size': '110',
      'display-high-contrast': 'on',
    },
  },
];
