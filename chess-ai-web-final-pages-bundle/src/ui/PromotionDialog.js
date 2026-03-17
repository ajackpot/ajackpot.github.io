export class PromotionDialog {
  constructor(dialog) {
    this.dialog = dialog;
    this.form = dialog.querySelector('form');
    this.title = dialog.querySelector('#promotion-title');
    this.description = dialog.querySelector('#promotion-description');
    this.confirmButton = dialog.querySelector('#promotion-confirm-button');
    this.cancelButton = dialog.querySelector('#promotion-cancel-button');
    this.optionInputs = [...dialog.querySelectorAll('input[name="promotion-piece"]')];
    this.pendingResolver = null;
    this.#bindEvents();
  }

  #bindEvents() {
    this.form.addEventListener('submit', (event) => {
      event.preventDefault();
      this.pendingResolver?.(this.getSelectedValue());
      this.pendingResolver = null;
      this.dialog.close();
    });

    this.cancelButton.addEventListener('click', () => {
      this.pendingResolver?.(null);
      this.pendingResolver = null;
      this.dialog.close();
    });

    this.dialog.addEventListener('cancel', (event) => {
      event.preventDefault();
      this.pendingResolver?.(null);
      this.pendingResolver = null;
      this.dialog.close();
    });
  }

  getSelectedValue() {
    return this.optionInputs.find((input) => input.checked)?.value ?? 'q';
  }

  open({ from, to, colorName }) {
    this.title.textContent = '승격 기물 선택';
    this.description.textContent = `${colorName} 폰이 ${from}에서 ${to}(으)로 이동합니다. 승격할 기물을 선택하십시오.`;
    this.optionInputs[0].checked = true;

    this.dialog.showModal();
    this.optionInputs[0].focus();

    return new Promise((resolve) => {
      this.pendingResolver = resolve;
    });
  }
}
