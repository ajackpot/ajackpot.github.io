function now() {
  return performance.now();
}

function getFocusableToken(target) {
  if (!(target instanceof HTMLElement)) return 'unknown';
  return target.dataset.focusId || target.id || target.name || target.textContent?.trim()?.slice(0, 40) || target.tagName.toLowerCase();
}

function categorizeKey(event) {
  if (event.key === 'Tab' && event.shiftKey) return 'shiftTab';
  if (event.key === 'Tab') return 'tab';
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return 'arrow';
  if (event.key === 'Enter') return 'enter';
  if (event.key === ' ') return 'space';
  if (event.key === 'Escape') return 'escape';
  if (event.key === 'Home') return 'home';
  if (event.key === 'End') return 'end';
  return 'other';
}

function targetMatchesIgnoreSelector(target, ignoreSelector) {
  if (!ignoreSelector || !(target instanceof Element)) return false;
  return Boolean(target.closest(ignoreSelector));
}

export function createTaskLogger({
  sessionId,
  conditionId,
  taskId,
  taskTitle,
  startMode = 'immediate',
  ignoreSelector = '',
  onStart = null,
}) {
  const createdAt = now();
  const events = [];
  const metrics = {
    sessionId,
    conditionId,
    taskId,
    taskTitle,
    createdAt,
    startedAt: startMode === 'immediate' ? createdAt : null,
    firstInteractionOffsetMs: null,
    completedAt: null,
    durationMs: null,
    hiddenDurationMs: 0,
    keyCounts: {
      tab: 0,
      shiftTab: 0,
      arrow: 0,
      enter: 0,
      space: 0,
      escape: 0,
      home: 0,
      end: 0,
      other: 0,
    },
    focusChanges: 0,
    revisitCount: 0,
    pointerActivations: 0,
    wrongSelections: 0,
    modalEscapes: 0,
    modalReturns: 0,
    focusLossCount: 0,
    contextResets: 0,
    bookingCancels: 0,
  };

  const visitedFocusIds = new Set();
  let disposed = false;
  let hiddenStartedAt = null;
  let modalState = {
    open: false,
    containerSelector: null,
    triggerFocusId: null,
    closedAt: null,
  };

  function pushEvent(type, payload = {}) {
    const baseAt = metrics.startedAt ?? createdAt;
    events.push({
      type,
      at: Number((now() - baseAt).toFixed(1)),
      ...payload,
    });
  }

  function getActiveDurationMs(referenceNow = now()) {
    if (metrics.startedAt == null) return 0;
    const pausedMs = hiddenStartedAt == null ? 0 : referenceNow - hiddenStartedAt;
    return Math.max(0, Math.round(referenceNow - metrics.startedAt - metrics.hiddenDurationMs - pausedMs));
  }

  function ensureStarted(triggerType, eventTarget) {
    if (disposed || metrics.startedAt != null) return false;
    const startedAt = now();
    metrics.startedAt = startedAt;
    metrics.firstInteractionOffsetMs = Math.round(startedAt - createdAt);
    pushEvent('measurement-start', {
      triggerType,
      focusId: getFocusableToken(eventTarget instanceof HTMLElement ? eventTarget : document.activeElement),
    });
    if (typeof onStart === 'function') {
      onStart({
        triggerType,
        startedAt,
      });
    }
    return true;
  }

  function handleKeydown(event) {
    if (disposed || targetMatchesIgnoreSelector(event.target, ignoreSelector)) return;
    ensureStarted('keydown', event.target);
    const category = categorizeKey(event);
    metrics.keyCounts[category] += 1;
    pushEvent('keydown', {
      key: event.key,
      category,
      focusId: getFocusableToken(document.activeElement),
    });
  }

  function handleClick(event) {
    if (disposed || targetMatchesIgnoreSelector(event.target, ignoreSelector)) return;
    ensureStarted('click', event.target);
    if (event.target instanceof HTMLElement) {
      metrics.pointerActivations += 1;
      pushEvent('click', { focusId: getFocusableToken(event.target) });
    }
  }

  function handleFocusIn(event) {
    if (disposed || metrics.startedAt == null || targetMatchesIgnoreSelector(event.target, ignoreSelector)) return;
    const token = getFocusableToken(event.target);
    metrics.focusChanges += 1;
    if (visitedFocusIds.has(token)) {
      metrics.revisitCount += 1;
    }
    visitedFocusIds.add(token);

    if (modalState.open && modalState.containerSelector) {
      const dialog = document.querySelector(modalState.containerSelector);
      if (dialog instanceof HTMLElement && event.target instanceof HTMLElement && !dialog.contains(event.target)) {
        metrics.modalEscapes += 1;
        metrics.focusLossCount += 1;
        pushEvent('modal-escape', { focusId: token });
      }
    }

    if (!modalState.open && modalState.closedAt && modalState.triggerFocusId && token === modalState.triggerFocusId) {
      const delta = now() - modalState.closedAt;
      if (delta <= 500) {
        metrics.modalReturns += 1;
        pushEvent('modal-return', { focusId: token, withinMs: Number(delta.toFixed(1)) });
      }
      modalState.closedAt = null;
    }

    pushEvent('focusin', { focusId: token });
  }

  function handleVisibilityChange() {
    if (disposed || metrics.startedAt == null) return;
    if (document.visibilityState === 'hidden' && hiddenStartedAt == null) {
      hiddenStartedAt = now();
      pushEvent('pause-hidden');
      return;
    }

    if (document.visibilityState === 'visible' && hiddenStartedAt != null) {
      const delta = now() - hiddenStartedAt;
      metrics.hiddenDurationMs += Math.round(delta);
      hiddenStartedAt = null;
      pushEvent('resume-visible', { hiddenMs: Math.round(delta) });
    }
  }

  document.addEventListener('keydown', handleKeydown, true);
  document.addEventListener('click', handleClick, true);
  document.addEventListener('focusin', handleFocusIn, true);
  document.addEventListener('visibilitychange', handleVisibilityChange, true);

  return {
    note(type, payload = {}) {
      if (type === 'wrong-selection') metrics.wrongSelections += 1;
      if (type === 'cancel-booking') metrics.bookingCancels += 1;
      if (type === 'focus-loss') metrics.focusLossCount += 1;
      if (type === 'context-reset') metrics.contextResets += 1;
      if (metrics.startedAt == null && payload.startMeasurementOnNote) {
        ensureStarted(type, document.activeElement);
      }
      pushEvent(type, payload);
    },
    setModalState(nextState) {
      modalState = {
        ...modalState,
        ...nextState,
      };
      pushEvent('modal-state', { open: modalState.open, triggerFocusId: modalState.triggerFocusId });
    },
    getSnapshot() {
      return {
        ...metrics,
        durationMs: getActiveDurationMs(),
        durationSeconds: Number((getActiveDurationMs() / 1000).toFixed(1)),
        hiddenDurationSeconds: Number((metrics.hiddenDurationMs / 1000).toFixed(1)),
        backtrackInputs: metrics.keyCounts.shiftTab + metrics.keyCounts.home + metrics.keyCounts.end,
        totalKeyInputs: Object.values(metrics.keyCounts).reduce((sum, value) => sum + value, 0),
      };
    },
    finish(extra = {}) {
      if (disposed) return null;
      disposed = true;
      if (hiddenStartedAt != null) {
        metrics.hiddenDurationMs += Math.round(now() - hiddenStartedAt);
        hiddenStartedAt = null;
      }
      document.removeEventListener('keydown', handleKeydown, true);
      document.removeEventListener('click', handleClick, true);
      document.removeEventListener('focusin', handleFocusIn, true);
      document.removeEventListener('visibilitychange', handleVisibilityChange, true);
      metrics.completedAt = now();
      metrics.durationMs = getActiveDurationMs(metrics.completedAt);
      const summary = {
        ...metrics,
        durationSeconds: Number((metrics.durationMs / 1000).toFixed(1)),
        hiddenDurationSeconds: Number((metrics.hiddenDurationMs / 1000).toFixed(1)),
        backtrackInputs: metrics.keyCounts.shiftTab + metrics.keyCounts.home + metrics.keyCounts.end,
        totalKeyInputs: Object.values(metrics.keyCounts).reduce((sum, value) => sum + value, 0),
        success: extra.success ?? false,
        completionReason: extra.reason ?? '',
        notes: extra.notes ?? [],
        events,
      };
      return summary;
    },
  };
}
