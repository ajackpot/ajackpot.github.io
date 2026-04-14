export const SETTINGS_COOKIE_NAME = 'accessible_othello_ai_settings_v1';
export const SETTINGS_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

function getDocumentLike(documentLike = null) {
  if (documentLike && typeof documentLike === 'object') {
    return documentLike;
  }
  if (typeof document !== 'undefined') {
    return document;
  }
  return null;
}

function getLocationLike(locationLike = null, documentLike = null) {
  if (locationLike && typeof locationLike === 'object') {
    return locationLike;
  }

  const resolvedDocument = getDocumentLike(documentLike);
  if (resolvedDocument?.location && typeof resolvedDocument.location === 'object') {
    return resolvedDocument.location;
  }
  if (resolvedDocument?.defaultView?.location && typeof resolvedDocument.defaultView.location === 'object') {
    return resolvedDocument.defaultView.location;
  }
  if (typeof location !== 'undefined') {
    return location;
  }
  return null;
}

function readCookieText(documentLike = null) {
  const resolvedDocument = getDocumentLike(documentLike);
  if (!resolvedDocument) {
    return '';
  }

  try {
    return typeof resolvedDocument.cookie === 'string'
      ? resolvedDocument.cookie
      : '';
  } catch (error) {
    return '';
  }
}

function writeCookieText(documentLike = null, cookieText = '') {
  const resolvedDocument = getDocumentLike(documentLike);
  if (!resolvedDocument) {
    return false;
  }

  try {
    resolvedDocument.cookie = cookieText;
    return true;
  } catch (error) {
    return false;
  }
}

function parseCookieMap(cookieSource = '') {
  const cookieMap = new Map();
  const text = typeof cookieSource === 'string' ? cookieSource : '';
  if (!text.trim()) {
    return cookieMap;
  }

  for (const segment of text.split(';')) {
    const trimmedSegment = segment.trim();
    if (!trimmedSegment) {
      continue;
    }
    const separatorIndex = trimmedSegment.indexOf('=');
    if (separatorIndex <= 0) {
      continue;
    }
    const key = trimmedSegment.slice(0, separatorIndex).trim();
    const value = trimmedSegment.slice(separatorIndex + 1).trim();
    if (!key) {
      continue;
    }
    cookieMap.set(key, value);
  }

  return cookieMap;
}

export function deriveSettingsCookiePath(locationLike = null, documentLike = null) {
  const resolvedLocation = getLocationLike(locationLike, documentLike);
  const pathname = typeof resolvedLocation?.pathname === 'string'
    ? resolvedLocation.pathname.trim()
    : '/';

  if (!pathname || pathname === '/') {
    return '/';
  }
  if (pathname.endsWith('/')) {
    return pathname;
  }

  const lastSlashIndex = pathname.lastIndexOf('/');
  if (lastSlashIndex < 0) {
    return '/';
  }

  const nextPath = pathname.slice(0, lastSlashIndex + 1);
  return nextPath || '/';
}

export function serializePersistedSettingsPayload(settings = {}) {
  return encodeURIComponent(JSON.stringify({
    version: 1,
    settings,
  }));
}

export function readPersistedSettingsCookie(cookieSource = null) {
  const rawCookieText = typeof cookieSource === 'string'
    ? cookieSource
    : readCookieText(cookieSource);
  const cookieMap = parseCookieMap(rawCookieText);
  const encodedValue = cookieMap.get(SETTINGS_COOKIE_NAME);
  if (!encodedValue) {
    return null;
  }

  try {
    const decodedValue = decodeURIComponent(encodedValue);
    const parsed = JSON.parse(decodedValue);
    if (parsed && typeof parsed === 'object' && parsed.settings && typeof parsed.settings === 'object') {
      return parsed.settings;
    }
    if (parsed && typeof parsed === 'object') {
      return parsed;
    }
  } catch (error) {
    return null;
  }

  return null;
}

export function writePersistedSettingsCookie(settings = {}, { documentLike = null, locationLike = null } = {}) {
  const resolvedDocument = getDocumentLike(documentLike);
  if (!resolvedDocument) {
    return false;
  }

  const path = deriveSettingsCookiePath(locationLike, resolvedDocument);
  const encodedValue = serializePersistedSettingsPayload(settings);
  const writeSucceeded = writeCookieText(
    resolvedDocument,
    `${SETTINGS_COOKIE_NAME}=${encodedValue}; Path=${path}; Max-Age=${SETTINGS_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`,
  );
  if (!writeSucceeded) {
    return false;
  }
  return readPersistedSettingsCookie(resolvedDocument) !== null;
}

export function clearPersistedSettingsCookie({ documentLike = null, locationLike = null } = {}) {
  const resolvedDocument = getDocumentLike(documentLike);
  if (!resolvedDocument) {
    return false;
  }

  const path = deriveSettingsCookiePath(locationLike, resolvedDocument);
  const writeSucceeded = writeCookieText(
    resolvedDocument,
    `${SETTINGS_COOKIE_NAME}=; Path=${path}; Max-Age=0; SameSite=Lax`,
  );
  if (!writeSucceeded) {
    return false;
  }
  return readPersistedSettingsCookie(resolvedDocument) === null;
}
