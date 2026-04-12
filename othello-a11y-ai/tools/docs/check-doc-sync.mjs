import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../..');

const STAGE_INFO_PATH = path.join(repoRoot, 'stage-info.json');
const INVENTORY_JSON_PATH = path.join(repoRoot, 'docs', 'reports', 'report-inventory.generated.json');

const TEXT_EXPECTATIONS = Object.freeze([
  {
    relativePath: 'README.md',
    requiredSnippets: (stageInfo) => [
      `현재 저장소 Stage: **${stageInfo.label}**`,
      '`stage-info.json` 기준',
    ],
  },
  {
    relativePath: path.join('docs', 'runtime-ai-reference.md'),
    requiredSnippets: (stageInfo) => [
      `| 저장소 현재 Stage | **${stageInfo.label}** |`,
    ],
  },
  {
    relativePath: path.join('docs', 'reports', 'checklists', 'ai-implementation-checklist.md'),
    requiredSnippets: (stageInfo) => [
      `| 저장소 현재 Stage | **${stageInfo.label}** |`,
    ],
  },
  {
    relativePath: path.join('docs', 'reports', 'report-inventory.generated.md'),
    requiredSnippets: (stageInfo) => [
      `- 현재 저장소 Stage: **${stageInfo.label}** (tag: \`${stageInfo.tag}\`)`,
    ],
  },
]);

function normalizeSlashes(targetPath) {
  return targetPath.split(path.sep).join('/');
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function readText(filePath) {
  return fs.readFile(filePath, 'utf8');
}

async function main() {
  const stageInfo = await readJson(STAGE_INFO_PATH);
  const failures = [];

  for (const entry of TEXT_EXPECTATIONS) {
    const absolutePath = path.join(repoRoot, entry.relativePath);
    const contents = await readText(absolutePath);
    for (const snippet of entry.requiredSnippets(stageInfo)) {
      if (!contents.includes(snippet)) {
        failures.push(`${normalizeSlashes(entry.relativePath)}: missing snippet -> ${snippet}`);
      }
    }
  }

  const inventoryJson = await readJson(INVENTORY_JSON_PATH);
  if (inventoryJson?.stageInfo?.stage !== stageInfo.stage) {
    failures.push(
      `${normalizeSlashes(path.relative(repoRoot, INVENTORY_JSON_PATH))}: stage mismatch (${inventoryJson?.stageInfo?.stage} !== ${stageInfo.stage})`,
    );
  }
  if (inventoryJson?.stageInfo?.tag !== stageInfo.tag) {
    failures.push(
      `${normalizeSlashes(path.relative(repoRoot, INVENTORY_JSON_PATH))}: tag mismatch (${inventoryJson?.stageInfo?.tag} !== ${stageInfo.tag})`,
    );
  }
  if (inventoryJson?.stageInfo?.label !== stageInfo.label) {
    failures.push(
      `${normalizeSlashes(path.relative(repoRoot, INVENTORY_JSON_PATH))}: label mismatch (${inventoryJson?.stageInfo?.label} !== ${stageInfo.label})`,
    );
  }

  if (failures.length > 0) {
    console.error('Documentation sync check failed:');
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(`Documentation sync is up to date for ${stageInfo.label} (${stageInfo.tag}).`);
}

await main();
