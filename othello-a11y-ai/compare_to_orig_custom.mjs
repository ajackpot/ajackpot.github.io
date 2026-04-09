import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

const currentRoot = process.cwd();
const originalRoot = path.resolve('../othello-a11y-ai.orig');
const currentLib = await import(pathToFileURL(path.join(currentRoot, 'tools/evaluator-training/lib.mjs')).href);
const originalLib = await import(pathToFileURL(path.join(originalRoot, 'tools/evaluator-training/lib.mjs')).href);
const currentEngineModule = await import(pathToFileURL(path.join(currentRoot, 'js/ai/search-engine.js')).href);
const originalEngineModule = await import(pathToFileURL(path.join(originalRoot, 'js/ai/search-engine.js')).href);

const lines = fs.readFileSync(path.join(currentRoot, 'tools/evaluator-training/out/sample-smoke.jsonl'), 'utf8')
  .trim()
  .split(/\n+/)
  .slice(0, 10)
  .map((line) => JSON.parse(line));

const searchOptions = {
  presetKey: 'custom',
  styleKey: 'balanced',
  maxDepth: 6,
  timeLimitMs: 60000,
  exactEndgameEmpties: 10,
  aspirationWindow: 50,
  randomness: 0,
  maxTableEntries: 200000,
};

let mismatches = 0;
for (let index = 0; index < lines.length; index += 1) {
  const currentState = currentLib.createStateFromPerspectiveBoardString(lines[index].board);
  const originalState = originalLib.createStateFromPerspectiveBoardString(lines[index].board);
  const currentEngine = new currentEngineModule.SearchEngine(searchOptions);
  const originalEngine = new originalEngineModule.SearchEngine(searchOptions);
  const currentResult = currentEngine.findBestMove(currentState);
  const originalResult = originalEngine.findBestMove(originalState);
  if (currentResult.bestMoveCoord !== originalResult.bestMoveCoord || currentResult.score !== originalResult.score) {
    mismatches += 1;
    console.log('Mismatch', index, {
      current: { move: currentResult.bestMoveCoord, score: currentResult.score },
      original: { move: originalResult.bestMoveCoord, score: originalResult.score },
    });
  }
}

console.log(JSON.stringify({ mismatches }));
