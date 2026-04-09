import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../..');
const reportsRoot = path.join(repoRoot, 'docs', 'reports');
const stageInfoPath = path.join(repoRoot, 'stage-info.json');
const inventoryMarkdownPath = path.join(reportsRoot, 'report-inventory.generated.md');
const inventoryJsonPath = path.join(reportsRoot, 'report-inventory.generated.json');
const checkMode = process.argv.includes('--check');

const CATEGORY_CONFIG = Object.freeze([
  {
    key: 'checklists',
    label: '체크리스트',
    description: '현재 구현 상태를 빠르게 확인하는 운영 문서',
  },
  {
    key: 'implementation',
    label: '구현',
    description: '실제 코드 변경이 반영된 구현 보고서',
  },
  {
    key: 'review',
    label: '검토',
    description: '실험, 검토, 채택/비채택 판단 문서',
  },
  {
    key: 'features',
    label: '기능',
    description: '특정 기능 단위의 보충 설계/통합 문서',
  },
]);

function normalizeSlashes(targetPath) {
  return targetPath.split(path.sep).join('/');
}

function formatStageNumber(value) {
  if (!Number.isFinite(value)) {
    return '—';
  }
  return `Stage ${String(value).padStart(2, '0')}`;
}

function extractStageNumber(fileName) {
  const match = fileName.match(/stage[-_]?0*(\d+)/i);
  return match ? Number.parseInt(match[1], 10) : null;
}

function compareEntries(left, right) {
  const leftStage = Number.isFinite(left.stageNumber) ? left.stageNumber : -1;
  const rightStage = Number.isFinite(right.stageNumber) ? right.stageNumber : -1;
  if (leftStage != rightStage) {
    return rightStage - leftStage;
  }

  const leftTitle = `${left.title} ${left.relativePath}`.toLowerCase();
  const rightTitle = `${right.title} ${right.relativePath}`.toLowerCase();
  return leftTitle.localeCompare(rightTitle, 'ko');
}

async function readTitleFromMarkdown(filePath) {
  const contents = await fs.readFile(filePath, 'utf8');
  const lines = contents.split(/\r?\n/);
  const titleLine = lines.find((line) => line.trim().startsWith('# '));
  return titleLine ? titleLine.replace(/^#\s+/, '').trim() : path.basename(filePath);
}

async function listMarkdownFiles(directoryPath) {
  try {
    const directoryEntries = await fs.readdir(directoryPath, { withFileTypes: true });
    return directoryEntries
      .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.md'))
      .map((entry) => entry.name)
      .sort((left, right) => left.localeCompare(right, 'ko'));
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

async function buildInventory() {
  const stageInfo = JSON.parse(await fs.readFile(stageInfoPath, 'utf8'));
  const categories = [];
  const quickLinks = [];
  let totalDocumentCount = 0;

  for (const category of CATEGORY_CONFIG) {
    const categoryPath = path.join(reportsRoot, category.key);
    const fileNames = await listMarkdownFiles(categoryPath);
    const entries = [];

    for (const fileName of fileNames) {
      const absolutePath = path.join(categoryPath, fileName);
      const relativePath = normalizeSlashes(path.relative(reportsRoot, absolutePath));
      const title = await readTitleFromMarkdown(absolutePath);
      const stageNumber = extractStageNumber(fileName);
      entries.push({ fileName, title, relativePath, stageNumber });
    }

    entries.sort(compareEntries);
    const latestStage = entries.reduce((maximum, entry) => {
      if (!Number.isFinite(entry.stageNumber)) {
        return maximum;
      }
      return Math.max(maximum, entry.stageNumber);
    }, -1);

    categories.push({
      ...category,
      count: entries.length,
      latestStage: latestStage >= 0 ? latestStage : null,
      entries,
    });
    totalDocumentCount += entries.length;

    if (category.key === 'checklists' && entries.length > 0) {
      quickLinks.push({ label: 'AI 구현 체크리스트', relativePath: entries[0].relativePath });
    }
    if (category.key === 'implementation') {
      const latestImplementation = entries.find((entry) => Number.isFinite(entry.stageNumber));
      if (latestImplementation) {
        quickLinks.push({
          label: `최신 구현 보고서 (${formatStageNumber(latestImplementation.stageNumber)})`,
          relativePath: latestImplementation.relativePath,
        });
      }
    }
  }

  quickLinks.push({
    label: '생성된 리포트 인벤토리 JSON',
    relativePath: normalizeSlashes(path.relative(reportsRoot, inventoryJsonPath)),
  });

  return {
    generatedAt: stageInfo.updatedAt ?? null,
    stageInfo,
    totalDocumentCount,
    quickLinks,
    categories,
  };
}

function renderMarkdown(inventory) {
  const lines = [];
  lines.push('# 생성된 리포트 인벤토리');
  lines.push('');
  lines.push('이 문서는 `node tools/docs/generate-report-inventory.mjs`로 생성됩니다.');
  lines.push('수동으로 문서 목록을 유지하지 않고, 현재 저장소 상태를 기준으로 구현/검토/기능/체크리스트 문서를 한 번에 정리합니다.');
  lines.push('');
  lines.push(`- 생성 시각: \`${inventory.generatedAt}\``);
  lines.push(`- 현재 저장소 Stage: **${inventory.stageInfo.label}** (tag: \`${inventory.stageInfo.tag}\`)`);
  lines.push(`- 총 분류 문서 수: **${inventory.totalDocumentCount}**`);
  lines.push('');
  lines.push('## 빠른 진입점');
  for (const link of inventory.quickLinks) {
    lines.push(`- [${link.label}](${link.relativePath})`);
  }
  lines.push('');
  lines.push('## 요약');
  lines.push('| 구분 | 설명 | 문서 수 | 최신 Stage |');
  lines.push('| --- | --- | ---: | --- |');
  for (const category of inventory.categories) {
    lines.push(`| ${category.label} | ${category.description} | ${category.count} | ${formatStageNumber(category.latestStage)} |`);
  }
  lines.push('');

  for (const category of inventory.categories) {
    lines.push(`## ${category.label}`);
    if (category.entries.length === 0) {
      lines.push('등록된 문서가 없습니다.');
      lines.push('');
      continue;
    }

    lines.push('| Stage | 파일 | 제목 |');
    lines.push('| --- | --- | --- |');
    for (const entry of category.entries) {
      lines.push(`| ${formatStageNumber(entry.stageNumber)} | [${entry.fileName}](${entry.relativePath}) | ${entry.title} |`);
    }
    lines.push('');
  }

  return `${lines.join('\n').trim()}\n`;
}

async function readIfExists(filePath) {
  try {
    return await fs.readFile(filePath, 'utf8');
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

async function main() {
  const inventory = await buildInventory();
  const markdownOutput = renderMarkdown(inventory);
  const jsonOutput = `${JSON.stringify(inventory, null, 2)}\n`;

  if (checkMode) {
    const [currentMarkdown, currentJson] = await Promise.all([
      readIfExists(inventoryMarkdownPath),
      readIfExists(inventoryJsonPath),
    ]);
    const mismatchedPaths = [];
    if (currentMarkdown !== markdownOutput) {
      mismatchedPaths.push(normalizeSlashes(path.relative(repoRoot, inventoryMarkdownPath)));
    }
    if (currentJson !== jsonOutput) {
      mismatchedPaths.push(normalizeSlashes(path.relative(repoRoot, inventoryJsonPath)));
    }

    if (mismatchedPaths.length > 0) {
      console.error('Generated report inventory is out of date:');
      for (const mismatchedPath of mismatchedPaths) {
        console.error(`- ${mismatchedPath}`);
      }
      process.exitCode = 1;
      return;
    }

    console.log('Generated report inventory is up to date.');
    return;
  }

  await Promise.all([
    fs.writeFile(inventoryMarkdownPath, markdownOutput, 'utf8'),
    fs.writeFile(inventoryJsonPath, jsonOutput, 'utf8'),
  ]);

  console.log(`Wrote ${normalizeSlashes(path.relative(repoRoot, inventoryMarkdownPath))}`);
  console.log(`Wrote ${normalizeSlashes(path.relative(repoRoot, inventoryJsonPath))}`);
}

await main();
