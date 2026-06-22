export const calendarTasks = [
  {
    id: 'task-1-book-remote-with-options',
    benchmarkTaskId: 'task1_book_remote_tuesday_options',
    title: '과업 1. 비대면 상담 예약과 상담 옵션 선택',
    goalSummary: '김민아 상담사의 화요일 14:30 비대면 30분 시간으로 예약하고, 상담 주제는 직장 스트레스, 사전 작성은 간단히, 문자 알림은 받는 것으로 선택하십시오.',
    targetSlotId: 'kim-tue-1430-remote-30',
    requiresCounselingOptions: true,
    expectedOptions: {
      topic: 'work-stress',
      intake: 'short',
      reminder: 'sms',
    },
    expectedFilters: {
      serviceType: 'counseling',
      mode: 'remote',
      provider: 'kim',
      duration: 30,
    },
  },
  {
    id: 'task-2-cancel-and-rebook',
    benchmarkTaskId: 'task2_cancel_and_rebook_thursday',
    title: '과업 2. 기존 예약 취소 뒤 목요일 오전 대면 예약',
    goalSummary: '기존 예약을 하나 취소한 뒤 박하늘 상담사의 목요일 10:00 대면 30분 시간으로 새로 예약하십시오.',
    targetSlotId: 'park-thu-1000-clinic-30',
    requiresCancellation: true,
    maxBookingsPerWeek: 2,
    initialBookings: [
      'kim-tue-1430-remote-30',
      'lee-mon-1400-remote-30',
    ],
    expectedFilters: {
      serviceType: 'counseling',
      mode: 'clinic',
      provider: 'park',
      duration: 30,
    },
  },
];
