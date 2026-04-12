import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const PACKAGE_TOOL_DIR = __dirname;
export const REPO_ROOT = path.resolve(__dirname, '..', '..');
export const DEFAULT_DIST_DIR = path.join(REPO_ROOT, 'dist');

const COMMON_EXCLUDED_DIR_NAMES = new Set(['.git', 'node_modules', '__pycache__']);
const COMMON_EXCLUDED_PREFIXES = ['dist/', '.git/', 'node_modules/'];
const RUNTIME_ROOT_FILES = new Set(['index.html', 'styles.css', 'README.md', 'stage-info.json']);
const TRAINER_TEST_FILES = new Set([
  'js/test/core-smoke.mjs',
  'js/test/perft.mjs',
  'js/test/benchmark-helpers.mjs',
  'js/test/stage34_training_tool_path_context_smoke.mjs',
  'js/test/stage36_package_profile_smoke.mjs',
  'js/test/stage37_generated_module_builder_smoke.mjs',
  'js/test/stage45_generated_module_builder_mpc_slot_smoke.mjs',
  'js/test/stage60_generated_profile_runtime_compaction_smoke.mjs',
  'js/test/stage60_tuple_layout_library_smoke.mjs',
  'js/test/stage63_multi_candidate_training_suite_smoke.mjs',
  'js/test/stage71_mpc_runtime_smoke.mjs',
  'js/test/stage72_mpc_lowcut_smoke.mjs',
  'js/test/stage72_mpc_runtime_variant_smoke.mjs',
  'js/test/stage73_mpc_candidate_training_suite_smoke.mjs',
  'js/test/stage74_mpc_install_smoke.mjs',
  'js/test/stage76_engine_match_shared_seed_smoke.mjs',
  'js/test/stage76_trineutron_match_suite_smoke.mjs',
  'js/test/stage79_ttfirst_hotpath_cleanup_smoke.mjs',
  'js/test/stage79_ttfirst_hotpath_benchmark.mjs',
  'js/test/stage80_etc_hotpath_cleanup_smoke.mjs',
  'js/test/stage80_etc_hotpath_benchmark.mjs',
  'js/test/stage81_etc_child_tt_reuse_smoke.mjs',
  'js/test/stage81_etc_child_tt_reuse_benchmark.mjs',
  'js/test/stage126_weight_learning_bundle_smoke.mjs'
]);

const TRAINER_EVALUATOR_TOOL_FILES = new Set([
  'README.md',
  'TOOL_INDEX.md',
  'LEGACY_TOOLS.md',
  '_path-context.bat',
  'lib.mjs',
  'exact-root-tie-utils.mjs',
  'download-egaroucid-data.bat',
  'estimate-training-time.mjs',
  'estimate-training-time.bat',
  'sample-corpus.mjs',
  'sample-corpus.bat',
  'train-phase-linear.mjs',
  'train-phase-linear.bat',
  'benchmark-profile.mjs',
  'benchmark-profile.bat',
  'train-tuple-residual-profile.mjs',
  'train-tuple-residual-profile.bat',
  'calibrate-tuple-residual-profile.mjs',
  'calibrate-tuple-residual-profile.bat',
  'inspect-tuple-residual-profile.mjs',
  'inspect-tuple-residual-profile.bat',
  'compare-tuple-residual-profiles.mjs',
  'compare-tuple-residual-profiles.bat',
  'benchmark-tuple-residual-profile.bat',
  'benchmark-depth-search-profile.mjs',
  'benchmark-depth-search-profile.bat',
  'benchmark-exact-search-profile.mjs',
  'benchmark-exact-search-profile.bat',
  'benchmark-depth-tuple-residual-profile.bat',
  'benchmark-exact-tuple-residual-profile.bat',
  'build-generated-profile-module.mjs',
  'build-generated-profile-module.bat',
  'export-profile-module.mjs',
  'calibrate-mpc-profile.mjs',
  'calibrate-mpc-profile.bat',
  'make-mpc-runtime-variant.mjs',
  'make-mpc-runtime-variant.bat',
  'install-tuple-residual-profile.mjs',
  'install-tuple-residual-profile.bat',
  'install-mpc-profile.mjs',
  'install-mpc-profile.bat',
  'estimate-tuple-layout-candidate-sizes.mjs',
  'estimate-tuple-layout-candidate-sizes.bat',
  'run-tuple-layout-family-pilot.mjs',
  'run-tuple-layout-family-pilot.bat',
  'run-multi-candidate-training-suite.mjs',
  'run-multi-candidate-training-suite.bat',
  'run-mpc-candidate-training-suite.mjs',
  'run-mpc-candidate-training-suite.bat',
  'run-stage126-weight-learning-bundle.mjs',
  'run-stage126-weight-learning-bundle.bat',
  'train-opening-prior.mjs',
  'train-opening-prior.bat',
  'build-opening-prior-module.mjs',
  'build-opening-prior-module.bat',
  'benchmark-opening-hybrid-tuning.mjs',
  'replay-opening-hybrid-reference-suite.mjs'
]);

function normalizeRelative(relPath) {
  return relPath.split(path.sep).join('/');
}

function isCommonExcluded(relPath) {
  return COMMON_EXCLUDED_PREFIXES.some((prefix) => relPath === prefix.slice(0, -1) || relPath.startsWith(prefix));
}

function isRuntimeSourceFile(relPath) {
  if (RUNTIME_ROOT_FILES.has(relPath)) {
    return true;
  }
  if (!relPath.startsWith('js/')) {
    return false;
  }
  if (relPath.startsWith('js/test/')) {
    return false;
  }
  if (relPath === 'js/ai/stage34_generated_profile_smoke.js') {
    return false;
  }
  return true;
}

function isCuratedEvaluatorTrainingFile(relPath) {
  if (!relPath.startsWith('tools/evaluator-training/')) {
    return false;
  }
  if (relPath.startsWith('tools/evaluator-training/out/')) {
    return false;
  }
  if (relPath.startsWith('tools/evaluator-training/examples/')) {
    return true;
  }
  const basename = path.posix.basename(relPath);
  return TRAINER_EVALUATOR_TOOL_FILES.has(basename);
}

function isTrainerSourceFile(relPath) {
  if (isRuntimeSourceFile(relPath)) {
    return true;
  }
  if (TRAINER_TEST_FILES.has(relPath)) {
    return true;
  }
  if (isCuratedEvaluatorTrainingFile(relPath)) {
    return true;
  }
  if (relPath.startsWith('tools/engine-match/')) {
    return true;
  }
  if (relPath.startsWith('tools/package/')) {
    return true;
  }
  if (relPath.startsWith('third_party/trineutron-othello/')) {
    return true;
  }
  return false;
}

export const PACKAGE_PROFILES = {
  runtime: {
    name: 'runtime',
    description: '정적 웹 앱 실행에 필요한 최소 런타임만 포함합니다.',
    includeFile: isRuntimeSourceFile,
    ensureDirs: [],
    extraFiles: []
  },
  trainer: {
    name: 'trainer',
    description: '웹 앱 + 현재 권장 evaluator/opening-prior 학습 도구만 포함하는 정리된 trainer 패키지입니다. generated output/과거 벤치마크/legacy 실험 도구는 제외합니다.',
    includeFile: isTrainerSourceFile,
    ensureDirs: ['benchmarks', 'tools/evaluator-training/out', 'dist'],
    extraFiles: [
      {
        relativePath: 'benchmarks/README.md',
        content: '# Benchmarks output\n\n학습/검증 스크립트가 생성한 벤치마크 JSON을 이 폴더에 저장합니다.\n'
      },
      {
        relativePath: 'tools/evaluator-training/out/README.md',
        content: '# Generated training outputs\n\n학습된 evaluation profile, move-ordering profile, MPC calibration 결과를 이 폴더에 저장합니다.\n'
      },
      {
        relativePath: 'dist/README.md',
        content: '# Build outputs\n\n패키징 도구가 생성한 zip 파일이 이 폴더에 저장됩니다.\n'
      }
    ]
  }
};

export function getProfile(name) {
  const profile = PACKAGE_PROFILES[name];
  if (!profile) {
    throw new Error(`Unknown package profile: ${name}`);
  }
  return profile;
}

export async function listRepoFiles(repoRoot = REPO_ROOT) {
  const files = [];

  async function walk(currentDir) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const absolutePath = path.join(currentDir, entry.name);
      const relativePath = normalizeRelative(path.relative(repoRoot, absolutePath));
      if (!relativePath) {
        continue;
      }
      if (isCommonExcluded(relativePath)) {
        continue;
      }
      if (entry.isDirectory()) {
        if (COMMON_EXCLUDED_DIR_NAMES.has(entry.name)) {
          continue;
        }
        await walk(absolutePath);
        continue;
      }
      if (!entry.isFile()) {
        continue;
      }
      const stats = await fs.stat(absolutePath);
      files.push({ absolutePath, relativePath, size: stats.size });
    }
  }

  await walk(repoRoot);
  files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  return files;
}

export function selectProfileFiles(files, profileName) {
  const profile = getProfile(profileName);
  return files.filter((file) => profile.includeFile(file.relativePath));
}

export function summarizeByTopLevel(files) {
  const buckets = new Map();
  for (const file of files) {
    const topLevel = file.relativePath.includes('/') ? file.relativePath.split('/')[0] : '(root)';
    const next = buckets.get(topLevel) ?? 0;
    buckets.set(topLevel, next + file.size);
  }
  return Array.from(buckets.entries())
    .map(([name, size]) => ({ name, size }))
    .sort((a, b) => b.size - a.size);
}

export function summarizeHeavyAreas(files) {
  const areaPredicates = [
    ['benchmarks', (rel) => rel.startsWith('benchmarks/')],
    ['docs/reports', (rel) => rel.startsWith('docs/reports/')],
    ['js/test', (rel) => rel.startsWith('js/test/')],
    ['tests', (rel) => rel.startsWith('tests/')],
    ['tools/evaluator-training/out', (rel) => rel.startsWith('tools/evaluator-training/out/')],
    ['runtime-core', (rel) => isRuntimeSourceFile(rel)],
    ['other', () => true]
  ];
  const sizes = new Map(areaPredicates.map(([name]) => [name, 0]));
  for (const file of files) {
    for (const [name, predicate] of areaPredicates) {
      if (predicate(file.relativePath)) {
        sizes.set(name, (sizes.get(name) ?? 0) + file.size);
        break;
      }
    }
  }
  return Array.from(sizes.entries()).map(([name, size]) => ({ name, size })).sort((a, b) => b.size - a.size);
}

export function topFiles(files, limit = 20) {
  return [...files].sort((a, b) => b.size - a.size).slice(0, limit).map((file) => ({
    relativePath: file.relativePath,
    size: file.size
  }));
}

export async function ensureCleanDir(directoryPath) {
  await fs.rm(directoryPath, { recursive: true, force: true });
  await fs.mkdir(directoryPath, { recursive: true });
}

async function copyFileIntoStage(stageRoot, sourceFile) {
  const destinationPath = path.join(stageRoot, sourceFile.relativePath);
  await fs.mkdir(path.dirname(destinationPath), { recursive: true });
  await fs.copyFile(sourceFile.absolutePath, destinationPath);
}

export async function createStageDirectory({
  repoRoot = REPO_ROOT,
  profileName,
  outputDir = DEFAULT_DIST_DIR,
  packageName = path.basename(repoRoot),
  files = null
}) {
  const repoFiles = files ?? await listRepoFiles(repoRoot);
  const profile = getProfile(profileName);
  const selectedFiles = selectProfileFiles(repoFiles, profileName);
  const stageRoot = path.join(outputDir, '_staging', `${packageName}-${profileName}`);
  await ensureCleanDir(stageRoot);

  for (const relativeDir of profile.ensureDirs ?? []) {
    await fs.mkdir(path.join(stageRoot, relativeDir), { recursive: true });
  }

  for (const sourceFile of selectedFiles) {
    await copyFileIntoStage(stageRoot, sourceFile);
  }

  for (const extraFile of profile.extraFiles ?? []) {
    const targetPath = path.join(stageRoot, extraFile.relativePath);
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.writeFile(targetPath, extraFile.content, 'utf8');
  }

  return {
    stageRoot,
    selectedFiles,
    totalBytes: selectedFiles.reduce((sum, file) => sum + file.size, 0)
  };
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: options.stdio ?? 'inherit',
      cwd: options.cwd,
      shell: options.shell ?? false
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} exited with code ${code}`));
    });
  });
}

async function commandExists(command, args) {
  try {
    await runCommand(command, args, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

export async function zipStageDirectory(stageRoot, zipPath) {
  await fs.mkdir(path.dirname(zipPath), { recursive: true });
  await fs.rm(zipPath, { force: true });

  if (process.platform === 'win32') {
    const archiveCommand = [
      '-NoProfile',
      '-Command',
      `Compress-Archive -Path '*' -DestinationPath '${zipPath.replace(/'/g, "''")}' -Force`
    ];
    await runCommand('powershell.exe', archiveCommand, { cwd: stageRoot, shell: false });
    return;
  }

  const hasZip = await commandExists('zip', ['-v']);
  if (!hasZip) {
    throw new Error('zip command not available on this platform. Run with --staging-only or install zip.');
  }
  await runCommand('zip', ['-qr', zipPath, '.'], { cwd: stageRoot });
}

export async function buildPackages({
  repoRoot = REPO_ROOT,
  profileNames,
  outputDir = DEFAULT_DIST_DIR,
  packageName = path.basename(repoRoot),
  stagingOnly = false
}) {
  const repoFiles = await listRepoFiles(repoRoot);
  const results = [];
  for (const profileName of profileNames) {
    const stage = await createStageDirectory({ repoRoot, profileName, outputDir, packageName, files: repoFiles });
    const zipPath = path.join(outputDir, `${packageName}-${profileName}.zip`);
    if (!stagingOnly) {
      await zipStageDirectory(stage.stageRoot, zipPath);
    }
    results.push({
      profileName,
      stageRoot: stage.stageRoot,
      zipPath,
      totalBytes: stage.totalBytes,
      fileCount: stage.selectedFiles.length,
      zipped: !stagingOnly
    });
  }
  return results;
}

export function formatBytes(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value >= 100 ? 0 : value >= 10 ? 1 : 2)} ${units[unitIndex]}`;
}

export async function readZipSize(zipPath) {
  try {
    const stats = await fs.stat(zipPath);
    return stats.size;
  } catch {
    return null;
  }
}

export function defaultAnalysisOutput(outputDir = DEFAULT_DIST_DIR) {
  return path.join(outputDir, 'package-size-analysis.json');
}

export async function analyzeRepository({ repoRoot = REPO_ROOT } = {}) {
  const files = await listRepoFiles(repoRoot);
  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
  const profileSummaries = Object.keys(PACKAGE_PROFILES).map((profileName) => {
    const selected = selectProfileFiles(files, profileName);
    const bytes = selected.reduce((sum, file) => sum + file.size, 0);
    return {
      profileName,
      description: getProfile(profileName).description,
      fileCount: selected.length,
      totalBytes: bytes,
      reductionVsFullBytes: totalBytes - bytes,
      reductionVsFullRatio: totalBytes > 0 ? (totalBytes - bytes) / totalBytes : 0
    };
  });
  return {
    generatedAt: new Date().toISOString(),
    repoRoot,
    totalFileCount: files.length,
    totalBytes,
    topLevelBreakdown: summarizeByTopLevel(files),
    heavyAreaBreakdown: summarizeHeavyAreas(files),
    largestFiles: topFiles(files, 25),
    profileSummaries
  };
}

export async function writeJsonFile(filePath, data) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

export async function createTempOutputDir(prefix = 'othello-package') {
  return await fs.mkdtemp(path.join(os.tmpdir(), `${prefix}-`));
}
