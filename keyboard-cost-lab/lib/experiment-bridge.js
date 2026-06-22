import { uniqueId } from './utils.js';

export function getAppMode(url = window.location.href) {
  return new URL(url).searchParams.get('mode') === 'runner' ? 'runner' : 'main';
}

export function getOrCreateSessionId({ storageKey, idPrefix = 'session' }) {
  const stored = window.localStorage.getItem(storageKey);
  if (stored) return stored;
  const generated = uniqueId(idPrefix);
  window.localStorage.setItem(storageKey, generated);
  return generated;
}

export function createMessageBridge({ sessionId, channelPrefix, fallbackStoragePrefix, onMessage }) {
  const channelName = `${channelPrefix}-${sessionId}`;
  const fallbackKey = `${fallbackStoragePrefix}-${sessionId}`;
  const bridgeState = {
    sessionId,
    channel: null,
    fallbackKey,
  };

  if ('BroadcastChannel' in window) {
    bridgeState.channel = new BroadcastChannel(channelName);
    bridgeState.channel.addEventListener('message', (event) => {
      onMessage?.(event.data);
    });
  } else {
    window.addEventListener('storage', (event) => {
      if (event.key !== fallbackKey || !event.newValue) return;
      try {
        onMessage?.(JSON.parse(event.newValue));
      } catch {
        // noop
      }
    });
  }

  return bridgeState;
}

export function postBridgeMessage(bridge, message) {
  if (!bridge || !message) return;
  const payload = {
    ...message,
    emittedAt: Date.now(),
    nonce: uniqueId('msg'),
  };

  if (bridge.channel) {
    bridge.channel.postMessage(payload);
    return;
  }

  window.localStorage.setItem(bridge.fallbackKey, JSON.stringify(payload));
}

export function buildLaunchStorageKey(prefix, launchId) {
  return `${prefix}:${launchId}`;
}

export function saveLaunchSnapshot(prefix, launchId, payload) {
  window.localStorage.setItem(buildLaunchStorageKey(prefix, launchId), JSON.stringify(payload));
}

export function readLaunchSnapshot(prefix, launchId) {
  const raw = window.localStorage.getItem(buildLaunchStorageKey(prefix, launchId));
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearLaunchSnapshot(prefix, launchId) {
  window.localStorage.removeItem(buildLaunchStorageKey(prefix, launchId));
}

export function buildRunnerUrl({
  currentHref = window.location.href,
  sessionId,
  serviceId,
  conditionId,
  taskIndex,
  launchId,
}) {
  const url = new URL(currentHref);
  url.search = '';
  url.searchParams.set('mode', 'runner');
  url.searchParams.set('sessionId', sessionId);
  if (serviceId) {
    url.searchParams.set('service', serviceId);
  }
  url.searchParams.set('condition', conditionId);
  url.searchParams.set('taskIndex', String(taskIndex));
  url.searchParams.set('launchId', launchId);
  return url.toString();
}

export function closeRunnerWindow({ bridge, sessionId, launchId, completed, fallbackHref = window.location.href }) {
  postBridgeMessage(bridge, {
    type: 'runner-closed',
    sessionId,
    launchId,
    completed,
  });
  const fallbackUrl = new URL(fallbackHref);
  fallbackUrl.search = '';
  window.close();
  window.setTimeout(() => {
    if (!window.closed) {
      window.location.href = fallbackUrl.toString();
    }
  }, 80);
}

export function trapFocusInDialog(dialog, event) {
  const focusables = Array.from(dialog.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'))
    .filter((element) => !element.hasAttribute('disabled'));
  if (focusables.length === 0) return;
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  const active = document.activeElement;

  if (!focusables.includes(active)) {
    event.preventDefault();
    (event.shiftKey ? last : first).focus();
    return;
  }

  if (event.shiftKey && active === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
  }
}
