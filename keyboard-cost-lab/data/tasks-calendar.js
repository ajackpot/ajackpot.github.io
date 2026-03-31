export const calendarTasks = [
  {
    id: 'task-1-book-remote',
    benchmarkTaskId: 'task1_book_remote_tuesday',
    title: '과업 1. 화요일 오후 비대면 30분 상담 예약',
    goalSummary: '김민아 상담사의 화요일 14:30 비대면 30분 시간으로 예약하십시오.',
    instructions: [
      '서비스 유형은 상담 예약을 유지하십시오.',
      '형식을 비대면으로, 상담사를 김민아 상담사로, 시간을 30분으로 맞추십시오.',
      '화요일 오후 14:30 예약 시간을 열고 예약을 확정하면 과업이 끝납니다.',
    ],
    targetSlotId: 'kim-tue-1430-remote-30',
    expectedFilters: {
      serviceType: 'counseling',
      mode: 'remote',
      provider: 'kim',
      duration: 30,
    },
  },
  {
    id: 'task-2-move-earlier',
    benchmarkTaskId: 'task2_move_earlier_same_day',
    title: '과업 2. 같은 날 더 이른 시간대로 변경',
    goalSummary: '현재 예약을 같은 날 더 이른 13:30 시간으로 변경하십시오.',
    instructions: [
      '현재 예약은 유지된 상태입니다.',
      '같은 상담사, 같은 형식, 같은 길이를 유지한 채 화요일 13:30으로 변경하십시오.',
      '새 예약 시간을 열고 변경을 확정하면 과업이 끝납니다.',
    ],
    targetSlotId: 'kim-tue-1330-remote-30',
    expectedFilters: {
      serviceType: 'counseling',
      mode: 'remote',
      provider: 'kim',
      duration: 30,
    },
  },
  {
    id: 'task-3-cancel-and-rebook',
    benchmarkTaskId: 'task3_cancel_and_rebook_thursday',
    title: '과업 3. 기존 예약을 취소하고 목요일 오전 대면 예약',
    goalSummary: '기존 예약을 취소한 뒤 박하늘 상담사의 목요일 10:00 대면 30분 시간으로 새로 예약하십시오.',
    instructions: [
      '먼저 현재 예약을 취소하십시오.',
      '형식을 대면으로, 상담사를 박하늘 상담사로, 시간을 30분으로 맞추십시오.',
      '목요일 오전 10:00 예약 시간을 열고 새 예약을 확정하면 과업이 끝납니다.',
    ],
    targetSlotId: 'park-thu-1000-clinic-30',
    requiresCancellation: true,
    expectedFilters: {
      serviceType: 'counseling',
      mode: 'clinic',
      provider: 'park',
      duration: 30,
    },
  },
];
