export function isDialogOpen(dialog) {
  return Boolean(dialog?.open);
}

export function openDialog(dialog) {
  if (!dialog || isDialogOpen(dialog)) {
    return;
  }

  if (typeof dialog.showModal === 'function') {
    dialog.showModal();
    return;
  }

  dialog.setAttribute('open', 'open');
}

export function closeDialog(dialog) {
  if (!dialog || !isDialogOpen(dialog)) {
    return;
  }

  if (typeof dialog.close === 'function') {
    dialog.close();
    return;
  }

  dialog.removeAttribute('open');
}

export function focusFirstEnabledDialogControl(dialog) {
  if (!dialog) {
    return false;
  }

  const firstFocusableControl = dialog.querySelector(
    'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])',
  );
  if (!(firstFocusableControl instanceof HTMLElement)) {
    return false;
  }

  firstFocusableControl.focus();
  return true;
}
