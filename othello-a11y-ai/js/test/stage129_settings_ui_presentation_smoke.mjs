import assert from 'node:assert/strict';

import {
  buildDifficultyStateNote,
  buildSearchAlgorithmStyleUsageNote,
  buildStyleStateNote,
  getDifficultyDialogModeNote,
  getDifficultyDialogVisibilityMap,
  getStyleDialogModeNote,
} from '../ui/settings-search-algorithm-presentations.js';

assert.deepEqual(
  getDifficultyDialogVisibilityMap('classic'),
  {
    common: true,
    classic: true,
    mcts: false,
    guided: false,
    hybrid: false,
  },
  'classic difficulty dialog should only expose common + classic groups.',
);

assert.deepEqual(
  getDifficultyDialogVisibilityMap('mcts-guided'),
  {
    common: true,
    classic: false,
    mcts: true,
    guided: true,
    hybrid: false,
  },
  'guided difficulty dialog should expose common + mcts + guided groups.',
);

assert.deepEqual(
  getDifficultyDialogVisibilityMap('mcts-hybrid'),
  {
    common: true,
    classic: false,
    mcts: true,
    guided: true,
    hybrid: true,
  },
  'hybrid difficulty dialog should expose the hybrid-only group as well.',
);

assert.match(
  getDifficultyDialogModeNote('mcts-lite'),
  /MCTS Lite.*공통 항목과 MCTS 기본 항목이 표시됩니다/,
  'lite mode note should describe only common + mcts groups.',
);

assert.match(
  buildDifficultyStateNote({ isCustomDifficulty: true, searchAlgorithm: 'mcts-guided' }),
  /MCTS Guided.*guided 보강 항목.*조절할 수 있습니다/,
  'guided custom difficulty note should stay aligned with the visible dialog groups.',
);

assert.equal(
  buildDifficultyStateNote({ isCustomDifficulty: false, searchAlgorithm: 'mcts-hybrid' }),
  '난이도 상세 설정은 난이도 프리셋에서 “사용자 지정”을 고르면 활성화됩니다.',
  'non-custom difficulty note should stay generic regardless of the algorithm.',
);

assert.equal(
  buildSearchAlgorithmStyleUsageNote('classic'),
  '',
  'classic mode should not append an extra style-suppression note.',
);
assert.match(
  buildSearchAlgorithmStyleUsageNote('mcts-lite'),
  /메인 탐색에 적용되지 않습니다/,
  'mcts-lite should append the style-suppression note used by the settings UI.',
);

assert.match(
  getStyleDialogModeNote('classic'),
  /공유 evaluator.*그대로 적용됩니다/,
  'classic mode should advertise live style application.',
);
assert.match(
  getStyleDialogModeNote('mcts-lite'),
  /MCTS Lite.*보관되지만 메인 탐색에는 적용되지 않습니다/,
  'mcts-lite should explain that custom style values are stored but not applied.',
);

assert.match(
  buildStyleStateNote({ isCustomStyle: true, searchAlgorithm: 'classic' }),
  /사용자 지정 스타일이 켜져 있습니다/,
  'classic custom style note should keep the editable-style guidance.',
);
assert.match(
  buildStyleStateNote({ isCustomStyle: false, searchAlgorithm: 'mcts-lite' }),
  /스타일 프리셋과 사용자 지정 스타일이 메인 탐색에 적용되지 않습니다/,
  'lite non-custom style note should match the settings panel warning.',
);

console.log('stage129 settings ui presentation smoke passed');
