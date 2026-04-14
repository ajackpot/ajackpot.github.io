import assert from 'node:assert/strict';

import {
  createDefaultCustomDifficultyInputs,
  createDefaultCustomStyleInputs,
  CUSTOM_STYLE_KEY,
  doesSearchAlgorithmUseStyleEvaluator,
  getCustomDifficultyDefaultsForSearchAlgorithm,
  listCustomDifficultyFieldsForSearchAlgorithm,
  mergeCustomInputGroups,
  resolveEngineOptions,
  resolveEngineOptionsWithCustomizations,
  splitCustomInputGroups,
} from '../ai/presets.js';

const defaultDifficultyInputs = createDefaultCustomDifficultyInputs();
assert.equal(defaultDifficultyInputs.maxDepth, 6, 'default custom difficulty should keep the classic max depth fallback');
assert.equal(defaultDifficultyInputs.timeLimitMs, 1500, 'default custom difficulty should keep the legacy time budget');
assert.ok(!Object.hasOwn(defaultDifficultyInputs, 'mobilityScale'), 'style weights should not be bundled into default custom difficulty inputs anymore');
assert.ok(!Object.hasOwn(defaultDifficultyInputs, 'mctsExploration'), 'future MCTS detail knobs should remain opt-in until a dedicated dialog writes them');

const defaultStyleInputs = createDefaultCustomStyleInputs();
assert.equal(defaultStyleInputs.mobilityScale, 1, 'default custom style should start from neutral mobility weighting');
assert.equal(defaultStyleInputs.riskPenaltyScale, 1, 'default custom style should start from neutral risk weighting');
assert.ok(!Object.hasOwn(defaultStyleInputs, 'maxDepth'), 'difficulty values should not bleed into style defaults');

const splitInputs = splitCustomInputGroups({
  maxDepth: '7',
  mobilityScale: '1.25',
  mctsExploration: '1.7',
});
assert.deepEqual(splitInputs.customDifficultyInputs, {
  maxDepth: '7',
  mctsExploration: '1.7',
});
assert.deepEqual(splitInputs.customStyleInputs, {
  mobilityScale: '1.25',
});
assert.deepEqual(
  mergeCustomInputGroups(splitInputs.customDifficultyInputs, splitInputs.customStyleInputs),
  {
    maxDepth: '7',
    mctsExploration: '1.7',
    mobilityScale: '1.25',
  },
  'merging split groups should round-trip the original flat payload',
);

const classicFieldKeys = listCustomDifficultyFieldsForSearchAlgorithm('classic').map((field) => field.key);
assert.ok(classicFieldKeys.includes('maxDepth'), 'classic custom difficulty should still expose maxDepth');
assert.ok(classicFieldKeys.includes('aspirationWindow'), 'classic custom difficulty should still expose aspiration window');
assert.ok(!classicFieldKeys.includes('mctsExploration'), 'classic custom difficulty should not expose MCTS exploration');

const guidedFieldKeys = listCustomDifficultyFieldsForSearchAlgorithm('mcts-guided').map((field) => field.key);
assert.ok(guidedFieldKeys.includes('mctsExploration'), 'guided custom difficulty should expose MCTS exploration');
assert.ok(guidedFieldKeys.includes('mctsProofPriorityScale'), 'guided custom difficulty should expose proof-priority scale');
assert.ok(!guidedFieldKeys.includes('maxDepth'), 'guided custom difficulty should hide classic-only maxDepth');

const hybridFieldKeys = listCustomDifficultyFieldsForSearchAlgorithm('mcts-hybrid').map((field) => field.key);
assert.ok(hybridFieldKeys.includes('mctsHybridMinimaxDepth'), 'hybrid custom difficulty should expose hybrid minimax depth');
assert.ok(hybridFieldKeys.includes('mctsHybridMinimaxTopK'), 'hybrid custom difficulty should expose hybrid minimax top-k');

assert.equal(doesSearchAlgorithmUseStyleEvaluator('mcts-lite'), false, 'MCTS Lite should be treated as not using the shared style evaluator on its main lane');
assert.equal(doesSearchAlgorithmUseStyleEvaluator('mcts-guided'), true, 'MCTS Guided should keep the shared style evaluator path');

const hybridDefaults = getCustomDifficultyDefaultsForSearchAlgorithm('mcts-hybrid', {
  exactEndgameEmpties: 12,
  maxTableEntries: 220000,
});
assert.equal(hybridDefaults.mctsProofPriorityEnabled, true, 'hybrid defaults should turn proof-priority on');
assert.equal(hybridDefaults.mctsProofPriorityScale, 0.15, 'hybrid defaults should keep the current proof-priority scale');
assert.equal(hybridDefaults.mctsProofPriorityMaxEmpties, 16, 'hybrid defaults should track exact empties + 4');
assert.equal(hybridDefaults.mctsMaxNodes, 160000, 'hybrid defaults should cap derived max nodes at the runtime ceiling');

const futureHybridCustom = resolveEngineOptionsWithCustomizations({
  presetKey: 'custom',
  customDifficultyInputs: {
    timeLimitMs: 900,
    mctsExploration: 1.7,
    mctsProofPriorityEnabled: true,
    mctsProofPriorityScale: 0.3,
    mctsHybridMinimaxDepth: 3,
    mctsHybridMinimaxTopK: 5,
  },
  styleKey: 'balanced',
  searchAlgorithm: 'mcts-hybrid',
  allowStyleWithCustomDifficulty: false,
});
assert.equal(futureHybridCustom.styleApplied, false, 'compatibility mode should still disable style overlays for the current flat custom preset flow');
assert.equal(futureHybridCustom.timeLimitMs, 900, 'future resolver should preserve custom difficulty time budgets');
assert.equal(futureHybridCustom.mctsExploration, 1.7, 'future resolver should sanitize custom MCTS exploration');
assert.equal(futureHybridCustom.mctsProofPriorityScale, 0.3, 'future resolver should sanitize custom proof-priority scale');
assert.equal(futureHybridCustom.mctsHybridMinimaxDepth, 3, 'future resolver should sanitize custom hybrid minimax depth');
assert.equal(futureHybridCustom.mctsHybridMinimaxTopK, 5, 'future resolver should sanitize custom hybrid minimax top-k');

const customStyledPreset = resolveEngineOptionsWithCustomizations({
  presetKey: 'hard',
  styleKey: CUSTOM_STYLE_KEY,
  customStyleInputs: {
    mobilityScale: 1.6,
    riskPenaltyScale: 0.8,
  },
  searchAlgorithm: 'classic',
});
assert.equal(customStyledPreset.styleKey, CUSTOM_STYLE_KEY, 'future resolver should accept a dedicated custom style key');
assert.equal(customStyledPreset.styleLabel, '사용자 지정', 'future resolver should label the custom style explicitly');
assert.equal(customStyledPreset.mobilityScale, 1.6, 'future resolver should apply custom style mobility weights directly');
assert.equal(customStyledPreset.riskPenaltyScale, 0.8, 'future resolver should apply custom style risk weights directly');

const legacyCustomResolved = resolveEngineOptions('custom', {
  maxDepth: 7,
  mobilityScale: 1.4,
}, 'aggressive');
assert.equal(legacyCustomResolved.styleApplied, false, 'legacy resolver should keep the old custom-preset no-style behavior until the new dialog lands');
assert.equal(legacyCustomResolved.maxDepth, 7, 'legacy resolver should still accept custom maxDepth');
assert.equal(legacyCustomResolved.mobilityScale, 1.4, 'legacy resolver should still accept custom style-like scale overrides from the flat payload');

console.log('stage126 custom setting groups smoke passed');
