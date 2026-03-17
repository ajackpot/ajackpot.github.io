export class LiveAnnouncer {
  constructor(element) {
    this.element = element;
    this.timer = null;
  }

  announce(message) {
    if (!this.element) {
      return;
    }

    window.clearTimeout(this.timer);
    this.element.textContent = '';
    this.timer = window.setTimeout(() => {
      this.element.textContent = message;
    }, 40);
  }
}
