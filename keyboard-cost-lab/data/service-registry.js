export const serviceRegistry = [
  {
    id: 'calendar',
    label: '예약 캘린더',
    summary: '상담 예약 화면에서 날짜, 상담사, 상담 방식을 고르고 원하는 시간을 예약합니다.',
    available: true,
    path: null,
    taskCount: 2,
    conditionCount: 2,
  },
  {
    id: 'comments',
    label: '댓글 목록',
    summary: '댓글 목록에서 원하는 글을 찾고, 답글과 댓글 정보를 확인한 뒤 반응을 남깁니다.',
    available: true,
    path: './comments.html',
    taskCount: 2,
    conditionCount: 2,
  },
  {
    id: 'search',
    label: '검색 결과 목록',
    summary: '검색 조건을 바꿔 원하는 자료를 찾고, 미리보거나 저장합니다.',
    available: true,
    path: './search.html',
    taskCount: 2,
    conditionCount: 2,
  },
];

export function getAvailableServices() {
  return serviceRegistry.filter((service) => service.available);
}

export function getServiceById(serviceId) {
  return serviceRegistry.find((service) => service.id === serviceId) ?? null;
}
