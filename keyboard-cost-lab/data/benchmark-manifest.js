import { calendarBenchmarkGraphs } from './benchmark-graphs-calendar.js';
import { commentsBenchmarkGraphs } from './benchmark-graphs-comments.js';
import { productBenchmarkGraphs } from './benchmark-graphs-product.js';
import { searchBenchmarkGraphs } from './benchmark-graphs-search.js';
import { settingsBenchmarkGraphs } from './benchmark-graphs-settings.js';
import { filtersBenchmarkGraphs } from './benchmark-graphs-filters.js';
import { checkoutBenchmarkGraphs } from './benchmark-graphs-checkout.js';

import { commonMeasurementRules } from './measurement-rules.js';

export { commonMeasurementRules };

export const benchmarkManifest = [
  {
    serviceId: 'calendar',
    graphs: calendarBenchmarkGraphs,
    jsonFilename: 'benchmark-results-calendar.json',
    moduleFilename: 'benchmark-results-calendar.js',
    exportName: 'benchmarkResultsCalendar',
    actualMeasurementScope: '과업 내용 확인은 메인 창에서 진행하고, 새 탭의 실제 서비스 조작만 기록합니다.',
  },
  {
    serviceId: 'comments',
    graphs: commentsBenchmarkGraphs,
    jsonFilename: 'benchmark-results-comments.json',
    moduleFilename: 'benchmark-results-comments.js',
    exportName: 'benchmarkResultsComments',
    actualMeasurementScope: '과업 내용 확인은 메인 창에서 진행하고, 새 탭의 실제 댓글 목록 조작만 기록합니다.',
  },
  {
    serviceId: 'product',
    graphs: productBenchmarkGraphs,
    jsonFilename: 'benchmark-results-product.json',
    moduleFilename: 'benchmark-results-product.js',
    exportName: 'benchmarkResultsProduct',
    actualMeasurementScope: '과업 내용 확인은 메인 창에서 진행하고, 새 탭의 실제 상품 옵션 선택과 장바구니 조작만 기록합니다.',
  },
  {
    serviceId: 'search',
    graphs: searchBenchmarkGraphs,
    jsonFilename: 'benchmark-results-search.json',
    moduleFilename: 'benchmark-results-search.js',
    exportName: 'benchmarkResultsSearch',
    actualMeasurementScope: '과업 내용 확인은 메인 창에서 진행하고, 새 탭의 실제 검색 결과 목록 조작만 기록합니다.',
  },
  {
    serviceId: 'settings',
    graphs: settingsBenchmarkGraphs,
    jsonFilename: 'benchmark-results-settings.json',
    moduleFilename: 'benchmark-results-settings.js',
    exportName: 'benchmarkResultsSettings',
    actualMeasurementScope: '과업 내용 확인은 메인 창에서 진행하고, 새 탭의 실제 설정 변경과 저장 조작만 기록합니다.',
  },
  {
    serviceId: 'filters',
    graphs: filtersBenchmarkGraphs,
    jsonFilename: 'benchmark-results-filters.json',
    moduleFilename: 'benchmark-results-filters.js',
    exportName: 'benchmarkResultsFilters',
    actualMeasurementScope: '과업 내용 확인은 메인 창에서 진행하고, 새 탭의 실제 검색 세부 조건 선택과 자료 조작만 기록합니다.',
  },
  {
    serviceId: 'checkout',
    graphs: checkoutBenchmarkGraphs,
    jsonFilename: 'benchmark-results-checkout.json',
    moduleFilename: 'benchmark-results-checkout.js',
    exportName: 'benchmarkResultsCheckout',
    actualMeasurementScope: '과업 내용 확인은 메인 창에서 진행하고, 새 탭의 실제 신청·결제 항목 선택과 제출 조작만 기록합니다.',
  },
];
