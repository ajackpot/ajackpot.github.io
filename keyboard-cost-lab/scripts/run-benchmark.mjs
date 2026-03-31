import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { calendarBenchmarkGraphs } from '../data/benchmark-graphs-calendar.js';
import { commentsBenchmarkGraphs } from '../data/benchmark-graphs-comments.js';
import { productBenchmarkGraphs } from '../data/benchmark-graphs-product.js';
import { benchmarkProfiles } from '../data/benchmark-profiles.js';
import { buildBenchmarkResults } from '../lib/benchmark-engine.js';

const currentDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(currentDir, '..');

const commonMeasurementRules = [
  '실제 계측은 수행 탭에서 첫 조작이 들어갈 때 시작합니다.',
  '수행 탭이 숨겨져 있는 동안의 시간은 실제 완료 시간에서 제외합니다.',
  '수행 탭 맨 아래의 보조 버튼 조작은 실제 지표에서 제외합니다.',
];

async function writeBenchmarkFiles({ graphs, jsonFilename, moduleFilename, exportName, actualMeasurementScope }) {
  const jsonPath = resolve(projectRoot, 'data', jsonFilename);
  const modulePath = resolve(projectRoot, 'data', moduleFilename);

  const results = buildBenchmarkResults({
    graphs,
    profiles: benchmarkProfiles,
  });

  results.measurementRules = commonMeasurementRules;
  results.actualMeasurementScope = actualMeasurementScope;

  await writeFile(jsonPath, JSON.stringify(results, null, 2), 'utf8');
  await writeFile(modulePath, `export const ${exportName} = ${JSON.stringify(results, null, 2)};\n`, 'utf8');

  return { jsonPath, modulePath };
}

const calendarFiles = await writeBenchmarkFiles({
  graphs: calendarBenchmarkGraphs,
  jsonFilename: 'benchmark-results-calendar.json',
  moduleFilename: 'benchmark-results-calendar.js',
  exportName: 'benchmarkResultsCalendar',
  actualMeasurementScope: '과업 내용 확인은 메인 창에서 진행하고, 새 탭의 실제 서비스 조작만 기록합니다.',
});

const commentsFiles = await writeBenchmarkFiles({
  graphs: commentsBenchmarkGraphs,
  jsonFilename: 'benchmark-results-comments.json',
  moduleFilename: 'benchmark-results-comments.js',
  exportName: 'benchmarkResultsComments',
  actualMeasurementScope: '과업 내용 확인은 메인 창에서 진행하고, 새 탭의 실제 댓글 목록 조작만 기록합니다.',
});

const productFiles = await writeBenchmarkFiles({
  graphs: productBenchmarkGraphs,
  jsonFilename: 'benchmark-results-product.json',
  moduleFilename: 'benchmark-results-product.js',
  exportName: 'benchmarkResultsProduct',
  actualMeasurementScope: '과업 내용 확인은 메인 창에서 진행하고, 새 탭의 실제 상품 옵션 선택과 장바구니 조작만 기록합니다.',
});

console.log(`Wrote:
- ${calendarFiles.jsonPath}
- ${calendarFiles.modulePath}
- ${commentsFiles.jsonPath}
- ${commentsFiles.modulePath}
- ${productFiles.jsonPath}
- ${productFiles.modulePath}`);
