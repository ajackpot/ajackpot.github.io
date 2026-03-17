export class EngineInfoView {
  constructor(root) {
    this.root = root;
    this.depthOutput = root.querySelector('#engine-depth');
    this.scoreOutput = root.querySelector('#engine-score');
    this.nodesOutput = root.querySelector('#engine-nodes');
    this.npsOutput = root.querySelector('#engine-nps');
    this.pvOutput = root.querySelector('#engine-pv');
    this.statusOutput = root.querySelector('#engine-status-text');
  }

  setIdle() {
    this.statusOutput.textContent = '대기 중';
  }

  setThinking() {
    this.statusOutput.textContent = '생각 중';
  }

  update(info) {
    this.depthOutput.textContent = String(info.depth ?? '-');
    this.scoreOutput.textContent = info.scoreText ?? '-';
    this.nodesOutput.textContent = typeof info.nodes === 'number' ? info.nodes.toLocaleString('ko-KR') : '-';
    this.npsOutput.textContent = typeof info.nps === 'number' ? info.nps.toLocaleString('ko-KR') : '-';
    this.pvOutput.textContent = info.pvSan || info.pvLan?.join(' ') || '-';
    this.statusOutput.textContent = info.statusText ?? '분석 완료';
  }
}
