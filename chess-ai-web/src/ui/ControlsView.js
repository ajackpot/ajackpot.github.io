export class ControlsView {
  constructor({
    form,
    difficultySelect,
    playerColorSelect,
    customFieldset,
    newGameButton,
    undoButton,
    forceAiButton,
    promotionSection,
    promotionButtons,
  }) {
    this.form = form;
    this.difficultySelect = difficultySelect;
    this.playerColorSelect = playerColorSelect;
    this.customFieldset = customFieldset;
    this.newGameButton = newGameButton;
    this.undoButton = undoButton;
    this.forceAiButton = forceAiButton;
    this.promotionSection = promotionSection;
    this.promotionButtons = promotionButtons;
    this.customInputs = [...this.customFieldset.querySelectorAll('input')];
  }

  bind({
    onDifficultyChange,
    onPlayerColorChange,
    onNewGame,
    onUndo,
    onForceAi,
    onPromotionSelect,
  }) {
    this.difficultySelect.addEventListener('change', () => onDifficultyChange?.(this.difficultySelect.value));
    this.playerColorSelect.addEventListener('change', () => onPlayerColorChange?.(this.playerColorSelect.value));
    this.newGameButton.addEventListener('click', () => onNewGame?.());
    this.undoButton.addEventListener('click', () => onUndo?.());
    this.forceAiButton.addEventListener('click', () => onForceAi?.());

    for (const button of this.promotionButtons) {
      button.addEventListener('click', () => onPromotionSelect?.(button.dataset.promotion));
    }
  }

  getDifficulty() {
    return this.difficultySelect.value;
  }

  getPlayerColor() {
    return this.playerColorSelect.value;
  }

  getCustomValues() {
    const formData = new FormData(this.form);
    return Object.fromEntries(formData.entries());
  }

  applyConfigToInputs(config) {
    this.form.elements.namedItem('timeBudgetMs').value = String(config.timeBudgetMs);
    this.form.elements.namedItem('maxSimulations').value = String(config.maxSimulations);
    this.form.elements.namedItem('cpuct').value = String(config.cpuct);
    this.form.elements.namedItem('rootTemperature').value = String(config.rootTemperature);
    this.form.elements.namedItem('tacticalDepth').value = String(config.tacticalDepth);
    this.form.elements.namedItem('wideningBase').value = String(config.wideningBase);
    this.form.elements.namedItem('wideningScale').value = String(config.wideningScale);
  }

  setCustomEnabled(enabled) {
    for (const input of this.customInputs) {
      input.disabled = !enabled;
      input.setAttribute('aria-disabled', String(!enabled));
    }
    this.customFieldset.setAttribute('aria-disabled', String(!enabled));
  }

  setPromotionOptions(pendingPromotion) {
    if (!pendingPromotion) {
      this.promotionSection.hidden = true;
      return;
    }

    this.promotionSection.hidden = false;
    for (const button of this.promotionButtons) {
      const enabled = pendingPromotion.options.includes(button.dataset.promotion);
      button.disabled = !enabled;
      button.setAttribute('aria-disabled', String(!enabled));
    }

    const firstEnabledButton = this.promotionButtons.find((button) => !button.disabled);
    if (firstEnabledButton) {
      firstEnabledButton.focus();
    }
  }

  setThinking(isThinking) {
    this.forceAiButton.disabled = isThinking;
    this.forceAiButton.setAttribute('aria-disabled', String(isThinking));
  }
}
