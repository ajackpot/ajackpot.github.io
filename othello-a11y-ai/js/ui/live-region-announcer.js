export class LiveRegionAnnouncer {
  constructor(region) {
    this.region = region;
    this.token = 0;
    this.timer = null;
  }

  announce(message) {
    if (!this.region) {
      return;
    }

    const text = String(message ?? '').trim();
    if (!text) {
      return;
    }

    this.token += 1;
    const token = this.token;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    this.region.textContent = '';
    this.timer = setTimeout(() => {
      if (token !== this.token) {
        return;
      }
      this.region.textContent = text;
      this.timer = null;
    }, 40);
  }
}
