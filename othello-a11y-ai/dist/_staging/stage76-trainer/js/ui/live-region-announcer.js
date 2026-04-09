function now() {
  if (typeof globalThis.performance?.now === 'function') {
    return globalThis.performance.now();
  }
  return Date.now();
}

export class LiveRegionAnnouncer {
  constructor(region) {
    this.region = region;
    this.variantIndex = 0;
    this.suffixes = ['\u2060', '\u2063'];
    this.recentMessages = [];
    this.lastAnnouncementAt = 0;
    this.mergeWindowMs = 1200;
    this.maxRecentMessages = 2;
  }

  announce(message) {
    if (!this.region) {
      return;
    }

    const text = String(message ?? '').trim();
    if (!text) {
      return;
    }

    const currentTime = now();
    if ((currentTime - this.lastAnnouncementAt) <= this.mergeWindowMs) {
      this.recentMessages = [...this.recentMessages, text].slice(-this.maxRecentMessages);
    } else {
      this.recentMessages = [text];
    }
    this.lastAnnouncementAt = currentTime;

    const suffix = this.suffixes[this.variantIndex % this.suffixes.length];
    this.variantIndex += 1;
    this.region.textContent = `${this.recentMessages.join(' ')}${suffix}`;
  }
}
