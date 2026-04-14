import assert from 'node:assert/strict';

import { SearchEngine } from '../ai/search-engine.js';
import { CUSTOM_STYLE_KEY } from '../ai/presets.js';

const classicCustomEngine = new SearchEngine({
  presetKey: 'custom',
  searchAlgorithm: 'classic',
  styleKey: CUSTOM_STYLE_KEY,
  customDifficultyInputs: {
    maxDepth: 7,
    timeLimitMs: 900,
    exactEndgameEmpties: 12,
  },
  customStyleInputs: {
    mobilityScale: 1.45,
    riskPenaltyScale: 0.7,
  },
});
assert.equal(classicCustomEngine.options.presetKey, 'custom', 'explicit custom preset should be preserved');
assert.equal(classicCustomEngine.options.styleKey, CUSTOM_STYLE_KEY, 'explicit custom style should be preserved');
assert.equal(classicCustomEngine.options.styleApplied, true, 'custom difficulty should now be able to keep a custom style overlay in the runtime engine');
assert.equal(classicCustomEngine.options.maxDepth, 7, 'runtime engine should pick up custom classic difficulty inputs');
assert.equal(classicCustomEngine.options.timeLimitMs, 900, 'runtime engine should pick up custom time budgets');
assert.equal(classicCustomEngine.options.mobilityScale, 1.45, 'runtime engine should pick up custom style mobility weights');
assert.equal(classicCustomEngine.options.riskPenaltyScale, 0.7, 'runtime engine should pick up custom style risk weights');

const guidedCustomEngine = new SearchEngine({
  presetKey: 'custom',
  searchAlgorithm: 'mcts-guided',
  styleKey: 'fortress',
  customDifficultyInputs: {
    timeLimitMs: 1100,
    exactEndgameEmpties: 10,
    mctsExploration: 1.8,
    mctsProofPriorityEnabled: true,
    mctsProofPriorityScale: 0.35,
  },
});
assert.equal(guidedCustomEngine.options.searchAlgorithm, 'mcts-guided', 'runtime engine should keep the guided search algorithm');
assert.equal(guidedCustomEngine.options.styleApplied, true, 'preset styles should also remain enabled for custom difficulty at runtime');
assert.equal(guidedCustomEngine.options.mctsExploration, 1.8, 'runtime engine should pick up custom MCTS exploration');
assert.equal(guidedCustomEngine.options.mctsProofPriorityScale, 0.35, 'runtime engine should pick up custom proof-priority scale');
assert.equal(guidedCustomEngine.options.styleKey, 'fortress', 'runtime engine should preserve the configured preset style');

console.log('stage126 search engine custom style support smoke passed');
