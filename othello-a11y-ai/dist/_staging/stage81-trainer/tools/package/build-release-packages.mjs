#!/usr/bin/env node
import path from 'node:path';
import { DEFAULT_DIST_DIR, REPO_ROOT, PACKAGE_PROFILES, buildPackages, formatBytes, readZipSize } from './lib.mjs';

function parseArgs(argv) {
  const args = {
    outputDir: DEFAULT_DIST_DIR,
    repoRoot: REPO_ROOT,
    packageName: path.basename(REPO_ROOT),
    profileNames: Object.keys(PACKAGE_PROFILES),
    stagingOnly: false
  };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    switch (token) {
      case '--output-dir':
        args.outputDir = path.resolve(argv[++index]);
        break;
      case '--repo-root':
        args.repoRoot = path.resolve(argv[++index]);
        break;
      case '--package-name':
        args.packageName = argv[++index];
        break;
      case '--profiles':
        args.profileNames = argv[++index].split(',').map((value) => value.trim()).filter(Boolean);
        break;
      case '--staging-only':
        args.stagingOnly = true;
        break;
      default:
        throw new Error(`Unknown argument: ${token}`);
    }
  }
  return args;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const results = await buildPackages(options);

  for (const result of results) {
    const zipSize = result.zipped ? await readZipSize(result.zipPath) : null;
    const zipLabel = zipSize == null ? 'staging only' : formatBytes(zipSize);
    console.log(
      `[package] ${result.profileName}: ${result.fileCount} files, ${formatBytes(result.totalBytes)} source -> ${zipLabel}`
    );
    console.log(`          stage: ${result.stageRoot}`);
    if (result.zipped) {
      console.log(`          zip:   ${result.zipPath}`);
    }
  }
}

main().catch((error) => {
  console.error(`[package] ${error.message}`);
  process.exitCode = 1;
});
