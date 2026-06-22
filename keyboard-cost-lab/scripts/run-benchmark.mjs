import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { benchmarkProfiles } from '../data/benchmark-profiles.js';
import { benchmarkManifest, commonMeasurementRules } from '../data/benchmark-manifest.js';
import { buildBenchmarkResults } from '../lib/benchmark-engine.js';

const currentDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(currentDir, '..');

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

const writtenFiles = [];
for (const serviceBenchmark of benchmarkManifest) {
  const files = await writeBenchmarkFiles(serviceBenchmark);
  writtenFiles.push(files.jsonPath, files.modulePath);
}

console.log(`Wrote:\n- ${writtenFiles.join('\n- ')}`);
