export const serviceRegistry = [
  {
    id: 'calendar',
    label: '예약 캘린더',
    summary: '상담 예약 화면에서 날짜·상담사·방식 조건을 맞추고 원하는 시간을 찾는 과업을 수행합니다.',
    statusLabel: '구현 완료',
    available: true,
    path: null,
    taskCount: 3,
    conditionCount: 2,
  },
  {
    id: 'comments',
    label: '댓글 목록',
    summary: '반복되는 댓글 카드에서 답글 보기, 댓글 정보 확인, 반응 남기기 과업을 수행합니다.',
    statusLabel: '구현 완료',
    available: true,
    path: './comments.html',
    taskCount: 3,
    conditionCount: 2,
  },
  {
    id: 'search',
    label: '검색 결과 목록',
    summary: '검색 결과와 반복 자료 카드에서 미리보기, 저장, 바로 열기 과업을 수행합니다.',
    statusLabel: '구현 완료',
    available: true,
    path: './search.html',
    taskCount: 3,
    conditionCount: 2,
  },
];

export function getAvailableServices() {
  return serviceRegistry.filter((service) => service.available);
}

export function getServiceById(serviceId) {
  return serviceRegistry.find((service) => service.id === serviceId) ?? null;
}
