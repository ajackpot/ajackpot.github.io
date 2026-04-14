import assert from 'node:assert/strict';

import {
  SETTINGS_COOKIE_NAME,
  clearPersistedSettingsCookie,
  deriveSettingsCookiePath,
  readPersistedSettingsCookie,
  serializePersistedSettingsPayload,
  writePersistedSettingsCookie,
} from '../ui/settings-cookie-store.js';

class FakeDocument {
  constructor(pathname = '/repo/index.html') {
    this.cookieJar = new Map();
    this.location = { pathname };
  }

  get cookie() {
    return Array.from(this.cookieJar.entries())
      .map(([key, value]) => `${key}=${value}`)
      .join('; ');
  }

  set cookie(cookieText) {
    const segments = String(cookieText ?? '').split(';').map((segment) => segment.trim()).filter(Boolean);
    if (segments.length === 0) {
      return;
    }

    const [pair, ...attributes] = segments;
    const separatorIndex = pair.indexOf('=');
    if (separatorIndex <= 0) {
      return;
    }

    const key = pair.slice(0, separatorIndex);
    const value = pair.slice(separatorIndex + 1);
    const maxAgeAttribute = attributes.find((attribute) => attribute.toLowerCase().startsWith('max-age='));
    const maxAgeValue = maxAgeAttribute ? Number(maxAgeAttribute.slice('max-age='.length)) : null;

    if (Number.isFinite(maxAgeValue) && maxAgeValue <= 0) {
      this.cookieJar.delete(key);
      return;
    }

    this.cookieJar.set(key, value);
  }
}

assert.equal(deriveSettingsCookiePath({ pathname: '/' }), '/', 'root pages should keep the root cookie path');
assert.equal(deriveSettingsCookiePath({ pathname: '/othello/' }), '/othello/', 'directory pages should keep the repo path');
assert.equal(deriveSettingsCookiePath({ pathname: '/othello/index.html' }), '/othello/', 'index files should derive the parent repo path');

const encodedPayload = serializePersistedSettingsPayload({ presetKey: 'custom', themeMode: 'dark' });
assert.equal(
  readPersistedSettingsCookie(`${SETTINGS_COOKIE_NAME}=${encodedPayload}`)?.presetKey,
  'custom',
  'serialized cookie payloads should round-trip through the reader',
);

const fakeDocument = new FakeDocument();
const saved = writePersistedSettingsCookie({
  humanColor: 'white',
  presetKey: 'custom',
  styleKey: 'custom',
  searchAlgorithm: 'mcts-guided',
  showLegalHints: false,
  enableBoardShortcuts: true,
  themeMode: 'dark',
  customDifficultyInputs: { maxDepth: 9 },
  customStyleInputs: { mobilityScale: 1.6 },
}, {
  documentLike: fakeDocument,
});
assert.equal(saved, true, 'writing the settings cookie should succeed for a writable document');

const parsedSettings = readPersistedSettingsCookie(fakeDocument);
assert.deepEqual(parsedSettings, {
  humanColor: 'white',
  presetKey: 'custom',
  styleKey: 'custom',
  searchAlgorithm: 'mcts-guided',
  showLegalHints: false,
  enableBoardShortcuts: true,
  themeMode: 'dark',
  customDifficultyInputs: { maxDepth: 9 },
  customStyleInputs: { mobilityScale: 1.6 },
}, 'reading after write should restore the original settings payload');

const cleared = clearPersistedSettingsCookie({ documentLike: fakeDocument });
assert.equal(cleared, true, 'clearing the settings cookie should succeed for a writable document');
assert.equal(readPersistedSettingsCookie(fakeDocument), null, 'clearing should remove the persisted settings payload');

assert.equal(readPersistedSettingsCookie(`${SETTINGS_COOKIE_NAME}=not-json`), null, 'invalid JSON payloads should be ignored safely');

console.log('stage127 settings cookie smoke passed');
