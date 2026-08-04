// Google Form으로 수행 기록을 미리 입력할 때 필요한 공개 정보만 보관합니다.
// 설문 문항 전체 목록은 Apps Script 실행 뒤 응답 시트의 연동_JSON에서 관리합니다.

export const surveyManifest = {
  schemaVersion: 'step-31-web-prefill',
  generatedAt: '2026-08-04',
  formResponseUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSemi3uTIInVoUpvcLQFC5gfSyzBEdoaZk33L9BTJmSCc5uLSg/viewform',
  formShortUrl: 'https://forms.gle/eZqs5KC7P71ZMaRR8',
  services: [
    {
      id: 'calendar',
      label: '예약 캘린더',
      taskCount: 2,
      tasks: [
        '비대면 상담 시간 예약과 상담 옵션 선택',
        '기존 예약 취소 뒤 목요일 오전 대면 예약',
      ],
    },
    {
      id: 'comments',
      label: '댓글 목록',
      taskCount: 2,
      tasks: [
        '최신 후기에서 특정 댓글의 답글 작성자 확인',
        '운영자 안내 댓글 정보 확인 뒤 도움이 돼요 누르기',
      ],
    },
    {
      id: 'search',
      label: '검색 결과 목록',
      taskCount: 2,
      tasks: [
        '최신 안내문 미리보기에서 예약 변경 기준 확인',
        '제목순 질문답변에서 비대면 상담 연결 방법 저장',
      ],
    },
  ],
  items: [
    {
      key: 'service.calendar.actualA',
      section: '자동 응답 영역',
      title: '예약 캘린더 비교안 A 수행 기록',
      prefillParam: 'entry.384462370',
    },
    {
      key: 'service.calendar.actualB',
      section: '자동 응답 영역',
      title: '예약 캘린더 비교안 B 수행 기록',
      prefillParam: 'entry.1394688977',
    },
    {
      key: 'service.comments.actualA',
      section: '자동 응답 영역',
      title: '댓글 목록 비교안 A 수행 기록',
      prefillParam: 'entry.953355017',
    },
    {
      key: 'service.comments.actualB',
      section: '자동 응답 영역',
      title: '댓글 목록 비교안 B 수행 기록',
      prefillParam: 'entry.1400713818',
    },
    {
      key: 'service.search.actualA',
      section: '자동 응답 영역',
      title: '검색 결과 목록 비교안 A 수행 기록',
      prefillParam: 'entry.1883026371',
    },
    {
      key: 'service.search.actualB',
      section: '자동 응답 영역',
      title: '검색 결과 목록 비교안 B 수행 기록',
      prefillParam: 'entry.1713865756',
    },
  ],
};

export const surveyPrefillParams = Object.fromEntries(
  surveyManifest.items.map((item) => [item.key, item.prefillParam])
);

export function getSurveyItemByKey(key) {
  return surveyManifest.items.find((item) => item.key === key) ?? null;
}
