export const serviceRegistry = [
  {
    id: 'calendar',
    label: '예약 캘린더',
    summary: '상담 예약 화면에서 조건을 맞추고 원하는 예약 시간을 찾는 과업을 수행합니다.',
    statusLabel: '구현 완료',
    available: true,
    path: null,
    points: ['3개 과업', '비교안 A/B', '사전 계산 기준 포함'],
  },
  {
    id: 'comments',
    label: '댓글 목록',
    summary: '댓글 정렬·답글 보기·댓글 정보 확인 과업으로 탐색 부담을 비교합니다.',
    statusLabel: '구현 완료',
    available: true,
    path: './comments.html',
    points: ['3개 과업', '비교안 A/B', '사전 계산 기준 포함'],
  },
  {
    id: 'product',
    label: '상품 옵션 선택',
    summary: '상품 상세 화면에서 색상, 크기, 추가 구성을 맞추고 장바구니에 담는 과업을 수행합니다.',
    statusLabel: '구현 완료',
    available: true,
    path: './product.html',
    points: ['3개 과업', '비교안 A/B', '사전 계산 기준 포함'],
  },
  {
    id: 'search',
    label: '검색 결과 목록',
    summary: '통합 검색 화면에서 정렬, 자료 범위, 미리보기, 저장, 바로 열기 과업으로 탐색 부담을 비교합니다.',
    statusLabel: '구현 완료',
    available: true,
    path: './search.html',
    points: ['3개 과업', '비교안 A/B', '사전 계산 기준 포함'],
  },
  {
    id: 'settings',
    label: '설정 화면',
    summary: '계정 설정 화면에서 설명 보기, 설정 값 변경, 묶음 저장 과업으로 탐색 부담을 비교합니다.',
    statusLabel: '구현 완료',
    available: true,
    path: './settings.html',
    points: ['3개 과업', '비교안 A/B', '사전 계산 기준 포함'],
  },
  {
    id: 'filters',
    label: '검색 세부 조건',
    summary: '기간, 자료 종류, 담당 부서, 대상, 첨부 조건을 맞추고 원하는 자료를 찾는 과업으로 탐색 부담을 비교합니다.',
    statusLabel: '구현 완료',
    available: true,
    path: './filters.html',
    points: ['3개 과업', '비교안 A/B', '사전 계산 기준 포함'],
  },
  {
    id: 'checkout',
    label: '신청·결제 흐름',
    summary: '신청 화면에서 신청 정보, 안내 수신, 결제 수단을 맞추고 제출하는 과업으로 탐색 부담을 비교합니다.',
    statusLabel: '구현 완료',
    available: true,
    path: './checkout.html',
    points: ['3개 과업', '비교안 A/B', '사전 계산 기준 포함'],
  },
];

export function getAvailableServices() {
  return serviceRegistry.filter((service) => service.available);
}

export function getServiceById(serviceId) {
  return serviceRegistry.find((service) => service.id === serviceId) ?? null;
}
