import { calendarBenchmarkGraphs } from './benchmark-graphs-calendar.js';
import { commentsBenchmarkGraphs } from './benchmark-graphs-comments.js';
import { searchBenchmarkGraphs } from './benchmark-graphs-search.js';

import { commonMeasurementRules } from './measurement-rules.js';

export { commonMeasurementRules };

export const benchmarkManifest = [
  {
    serviceId: 'calendar',
    graphs: calendarBenchmarkGraphs,
    jsonFilename: 'benchmark-results-calendar.json',
    moduleFilename: 'benchmark-results-calendar.js',
    exportName: 'benchmarkResultsCalendar',
    actualMeasurementScope: '과업 설명은 메인 창에서 확인하고, 새 탭의 실제 예약 화면 조작만 기록합니다.',
  },
  {
    serviceId: 'comments',
    graphs: commentsBenchmarkGraphs,
    jsonFilename: 'benchmark-results-comments.json',
    moduleFilename: 'benchmark-results-comments.js',
    exportName: 'benchmarkResultsComments',
    actualMeasurementScope: '과업 설명은 메인 창에서 확인하고, 새 탭의 실제 댓글 목록 조작만 기록합니다.',
  },
  {
    serviceId: 'search',
    graphs: searchBenchmarkGraphs,
    jsonFilename: 'benchmark-results-search.json',
    moduleFilename: 'benchmark-results-search.js',
    exportName: 'benchmarkResultsSearch',
    actualMeasurementScope: '과업 설명은 메인 창에서 확인하고, 새 탭의 실제 검색 결과 목록 조작만 기록합니다.',
  },
];
