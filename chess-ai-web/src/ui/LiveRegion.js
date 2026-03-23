export class LiveRegion {
  constructor(element) {
    this.element = element;
    this.lastMessage = '';
    this.pendingTimerId = null;
  }

  announce(message) {
    const normalizedMessage = String(message ?? '').trim();
    if (!normalizedMessage) {
      return;
    }

    if (this.pendingTimerId !== null) {
      window.clearTimeout(this.pendingTimerId);
      this.pendingTimerId = null;
    }

    const commit = () => {
      this.lastMessage = normalizedMessage;
      this.element.textContent = normalizedMessage;
    };

    if (this.element.textContent !== normalizedMessage) {
      commit();
      return;
    }

    this.element.textContent = '';
    this.pendingTimerId = window.setTimeout(() => {
      this.pendingTimerId = null;
      commit();
    }, 20);
  }
}
