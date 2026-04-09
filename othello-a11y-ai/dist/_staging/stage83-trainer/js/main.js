import { AppController } from './ui/app-controller.js';

function bootstrap() {
  const root = document.querySelector('#app');
  if (!root) {
    throw new Error('#app container was not found.');
  }

  const controller = new AppController(root);
  window.__accessibleOthelloApp = controller;
  controller.maybeStartAiTurn();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap, { once: true });
} else {
  bootstrap();
}
