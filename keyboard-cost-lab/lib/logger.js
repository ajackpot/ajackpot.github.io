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

export function createTaskLogger({ sessionId, conditionId, taskId, taskTitle }) {
  const startedAt = now();
  const events = [];
  const metrics = {
    sessionId,
    conditionId,
    taskId,
    taskTitle,
    startedAt,
    completedAt: null,
    durationMs: null,
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
    bookingCancels: 0,
  };

  const visitedFocusIds = new Set();
  let disposed = false;
  let modalState = {
    open: false,
    containerSelector: null,
    triggerFocusId: null,
    closedAt: null,
  };

  function pushEvent(type, payload = {}) {
    events.push({
      type,
      at: Number((now() - startedAt).toFixed(1)),
      ...payload,
    });
  }

  function handleKeydown(event) {
    if (disposed) return;
    const category = categorizeKey(event);
    metrics.keyCounts[category] += 1;
    pushEvent('keydown', {
      key: event.key,
      category,
      focusId: getFocusableToken(document.activeElement),
    });
  }

  function handleClick(event) {
    if (disposed) return;
    if (event.target instanceof HTMLElement) {
      metrics.pointerActivations += 1;
      pushEvent('click', { focusId: getFocusableToken(event.target) });
    }
  }

  function handleFocusIn(event) {
    if (disposed) return;
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

  document.addEventListener('keydown', handleKeydown, true);
  document.addEventListener('click', handleClick, true);
  document.addEventListener('focusin', handleFocusIn, true);

  return {
    note(type, payload = {}) {
      if (type === 'wrong-selection') metrics.wrongSelections += 1;
      if (type === 'cancel-booking') metrics.bookingCancels += 1;
      if (type === 'focus-loss') metrics.focusLossCount += 1;
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
        backtrackInputs: metrics.keyCounts.shiftTab + metrics.keyCounts.home + metrics.keyCounts.end,
        totalKeyInputs: Object.values(metrics.keyCounts).reduce((sum, value) => sum + value, 0),
      };
    },
    finish(extra = {}) {
      if (disposed) return null;
      disposed = true;
      document.removeEventListener('keydown', handleKeydown, true);
      document.removeEventListener('click', handleClick, true);
      document.removeEventListener('focusin', handleFocusIn, true);
      metrics.completedAt = now();
      metrics.durationMs = Math.round(metrics.completedAt - startedAt);
      const summary = {
        ...metrics,
        durationSeconds: Number((metrics.durationMs / 1000).toFixed(1)),
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
