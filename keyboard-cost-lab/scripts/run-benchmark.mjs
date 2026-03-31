import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { calendarBenchmarkGraphs } from '../data/benchmark-graphs-calendar.js';
import { benchmarkProfiles } from '../data/benchmark-profiles.js';
import { buildBenchmarkResults } from '../lib/benchmark-engine.js';

const currentDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(currentDir, '..');
const jsonPath = resolve(projectRoot, 'data', 'benchmark-results-calendar.json');
const modulePath = resolve(projectRoot, 'data', 'benchmark-results-calendar.js');

const results = buildBenchmarkResults({
  graphs: calendarBenchmarkGraphs,
  profiles: benchmarkProfiles,
});

await writeFile(jsonPath, JSON.stringify(results, null, 2), 'utf8');
await writeFile(
  modulePath,
  `export const benchmarkResultsCalendar = ${JSON.stringify(results, null, 2)};\n`,
  'utf8'
);

console.log(`Wrote:\n- ${jsonPath}\n- ${modulePath}`);
