export class GameStatusView {
  constructor(root) {
    this.root = root;
    this.turnOutput = root.querySelector('#turn-status');
    this.gameOutput = root.querySelector('#game-status-text');
  }

  update({ turnText, statusText }) {
    this.turnOutput.textContent = turnText;
    this.gameOutput.textContent = statusText;
  }
}
