import { BOARD_SIZE, indexToCoord, rowColToIndex } from '../core/bitboard.js';
import { escapeHtml, formatCellName } from './formatters.js';

export class BoardView {
  constructor({ container, onCellActivate }) {
    this.container = container;
    this.onCellActivate = onCellActivate;
    this.lastFocusedIndex = 0;

    this.container.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-board-index]');
      if (!button) {
        return;
      }
      const index = Number(button.dataset.boardIndex);
      this.lastFocusedIndex = index;
      this.onCellActivate(index);
    });

    this.container.addEventListener('keydown', (event) => {
      const button = event.target.closest('button[data-board-index]');
      if (!button) {
        return;
      }

      const index = Number(button.dataset.boardIndex);
      const row = Math.floor(index / BOARD_SIZE);
      const col = index % BOARD_SIZE;

      let nextIndex = null;
      switch (event.key) {
        case 'ArrowUp':
          nextIndex = row > 0 ? rowColToIndex(row - 1, col) : index;
          break;
        case 'ArrowDown':
          nextIndex = row < (BOARD_SIZE - 1) ? rowColToIndex(row + 1, col) : index;
          break;
        case 'ArrowLeft':
          nextIndex = col > 0 ? rowColToIndex(row, col - 1) : index;
          break;
        case 'ArrowRight':
          nextIndex = col < (BOARD_SIZE - 1) ? rowColToIndex(row, col + 1) : index;
          break;
        case 'Home':
          nextIndex = rowColToIndex(row, 0);
          break;
        case 'End':
          nextIndex = rowColToIndex(row, BOARD_SIZE - 1);
          break;
        default:
          break;
      }

      if (nextIndex !== null) {
        event.preventDefault();
        this.focusCell(nextIndex);
      }
    });

    this.container.addEventListener('focusin', (event) => {
      const button = event.target.closest('button[data-board-index]');
      if (!button) {
        return;
      }
      this.lastFocusedIndex = Number(button.dataset.boardIndex);
    });
  }

  focusCell(index) {
    this.lastFocusedIndex = index;
    const button = this.container.querySelector(`button[data-board-index="${index}"]`);
    button?.focus();
  }

  render({ state, legalMoves, humanColor, aiBusy, showLegalHints }, { restoreFocus = false } = {}) {
    const legalMoveSet = new Set(legalMoves.map((move) => move.index));
    const humanTurn = !aiBusy && !state.isTerminal() && state.currentPlayer === humanColor;
    const playableSet = humanTurn ? legalMoveSet : new Set();
    const lastAction = state.lastAction;
    const lastMoveIndex = lastAction?.type === 'move' ? lastAction.index : null;
    const lastFlippedSet = new Set(lastAction?.type === 'move' ? lastAction.flippedIndices : []);

    const headerCells = ['<th scope="col" class="board-axis-corner"><span class="visually-hidden">행과 열</span></th>'];
    for (const fileLabel of ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']) {
      headerCells.push(`<th scope="col" class="board-axis" aria-label="열 ${fileLabel}">${fileLabel}</th>`);
    }

    const bodyRows = [];
    for (let row = 0; row < BOARD_SIZE; row += 1) {
      const cells = [`<th scope="row" class="board-axis" aria-label="행 ${row + 1}">${row + 1}</th>`];

      for (let col = 0; col < BOARD_SIZE; col += 1) {
        const index = rowColToIndex(row, col);
        const coord = indexToCoord(index);
        const occupant = state.getCellOccupant(index);
        const playable = playableSet.has(index);
        const legal = legalMoveSet.has(index);
        const accessibleName = formatCellName(state, index, playableSet);
        const discSymbol = occupant === 'black' ? '●' : occupant === 'white' ? '○' : '·';
        const cellClasses = [
          'board-cell-button',
          occupant ? `is-${occupant}` : 'is-empty',
          playable ? 'is-playable' : '',
          lastMoveIndex === index ? 'is-last-move' : '',
          lastFlippedSet.has(index) ? 'is-last-flipped' : '',
        ].filter(Boolean).join(' ');
        const hintMarkup = showLegalHints && !occupant && legal
          ? '<span class="legal-hint" aria-hidden="true">가능</span>'
          : '';

        cells.push(`
          <td class="board-square ${playable ? 'square-playable' : ''}">
            <button
              type="button"
              class="${cellClasses}"
              data-board-index="${index}"
              data-playable="${playable ? 'true' : 'false'}"
              data-legal="${legal ? 'true' : 'false'}"
              aria-label="${escapeHtml(accessibleName)}"
            >
              <span class="disc-symbol" aria-hidden="true">${discSymbol}</span>
              <span class="coord-label" aria-hidden="true">${coord}</span>
              ${hintMarkup}
            </button>
          </td>
        `);
      }

      bodyRows.push(`<tr>${cells.join('')}</tr>`);
    }

    this.container.innerHTML = `
      <table class="board-table">
        <caption>오델로 판</caption>
        <thead>
          <tr>${headerCells.join('')}</tr>
        </thead>
        <tbody>
          ${bodyRows.join('')}
        </tbody>
      </table>
    `;

    if (restoreFocus) {
      this.focusCell(this.lastFocusedIndex);
    }
  }
}
