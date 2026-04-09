#!/usr/bin/env node
import path from 'node:path';
import { DEFAULT_DIST_DIR, REPO_ROOT, analyzeRepository, defaultAnalysisOutput, formatBytes, writeJsonFile } from './lib.mjs';

function parseArgs(argv) {
  const options = {
    repoRoot: REPO_ROOT,
    outputJson: defaultAnalysisOutput(DEFAULT_DIST_DIR)
  };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    switch (token) {
      case '--repo-root':
        options.repoRoot = path.resolve(argv[++index]);
        break;
      case '--output-json':
        options.outputJson = path.resolve(argv[++index]);
        break;
      default:
        throw new Error(`Unknown argument: ${token}`);
    }
  }
  return options;
}

function printBreakdown(title, rows) {
  console.log(title);
  for (const row of rows) {
    console.log(`  - ${row.name}: ${formatBytes(row.size)}`);
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const analysis = await analyzeRepository({ repoRoot: options.repoRoot });
  await writeJsonFile(options.outputJson, analysis);

  console.log(`[analyze] total: ${analysis.totalFileCount} files, ${formatBytes(analysis.totalBytes)}`);
  printBreakdown('[analyze] top-level', analysis.topLevelBreakdown);
  printBreakdown('[analyze] heavy areas', analysis.heavyAreaBreakdown);
  console.log('[analyze] package profiles');
  for (const profile of analysis.profileSummaries) {
    console.log(
      `  - ${profile.profileName}: ${profile.fileCount} files, ${formatBytes(profile.totalBytes)} ` +
      `(saved ${formatBytes(profile.reductionVsFullBytes)}, ${(profile.reductionVsFullRatio * 100).toFixed(1)}%)`
    );
  }
  console.log(`[analyze] json: ${options.outputJson}`);
}

main().catch((error) => {
  console.error(`[analyze] ${error.message}`);
  process.exitCode = 1;
});
