import {
  fileLabelForOrientation,
  getPieceSymbol,
  getPieceText,
  orientationToRows,
  rankLabelForOrientation,
} from '../shared/pieces.js';
import { boardSquareColor } from '../shared/chess-utils.js';

export class BoardView {
  constructor({ container, onSquareActivate }) {
    this.container = container;
    this.onSquareActivate = onSquareActivate;
    this.orientation = 'white';
    this.squareButtons = new Map();
    this.squareCells = new Map();
    this.lastFocusedSquare = 'e2';
    this.build();
  }

  build() {
    this.container.innerHTML = '';
    this.wrapper = document.createElement('section');
    this.wrapper.className = 'board-region';
    this.wrapper.setAttribute('aria-labelledby', 'board-heading');

    const heading = document.createElement('h2');
    heading.id = 'board-heading';
    heading.textContent = '체스판';

    const help = document.createElement('p');
    help.id = 'board-help';
    help.className = 'hint-text';
    help.textContent = '탭으로 칸을 순차 탐색하고, 방향키로 인접 칸으로 이동할 수 있습니다. Enter 또는 Space로 기물을 선택하거나 이동합니다.';

    this.selectionSummary = document.createElement('p');
    this.selectionSummary.id = 'selection-summary';
    this.selectionSummary.className = 'selection-summary';
    this.selectionSummary.textContent = '선택된 기물이 없습니다.';

    this.table = document.createElement('table');
    this.table.className = 'chess-board';
    this.table.setAttribute('aria-describedby', 'board-help selection-summary');
    this.table.setAttribute('aria-label', '체스판 표');

    const caption = document.createElement('caption');
    caption.textContent = '체스판';
    this.table.append(caption);

    this.wrapper.append(heading, help, this.table, this.selectionSummary);
    this.container.append(this.wrapper);
    this.#renderBoardSkeleton();
  }

  setOrientation(orientation) {
    if (orientation === this.orientation) {
      return;
    }
    this.orientation = orientation;
    this.#renderBoardSkeleton();
  }

  update({ game, selectedSquare, legalDestinations, orientation, engineThinking, focusSquare }) {
    const boardHadFocus = this.wrapper.contains(document.activeElement);

    if (orientation) {
      this.setOrientation(orientation);
    }

    const destinations = new Set(legalDestinations ?? []);
    for (const [square, button] of this.squareButtons.entries()) {
      const piece = game.getPiece(square);
      const selected = square === selectedSquare;
      const legalTarget = destinations.has(square);
      const pieceText = piece ? getPieceText(piece) : '빈 칸';
      const symbol = piece ? getPieceSymbol(piece) : '';
      const coordinateText = square;

      button.dataset.square = square;
      button.className = 'square-button';
      button.classList.add(`square-${boardSquareColor(square)}`);
      if (piece) {
        button.classList.add('square-has-piece');
      }
      if (selected) {
        button.classList.add('square-selected');
      }
      if (legalTarget) {
        button.classList.add('square-legal');
      }

      const accessiblePiece = button.querySelector('.square-accessible-piece');
      const visibleCoordinate = button.querySelector('.square-coordinate');
      const symbolElement = button.querySelector('.square-symbol');
      const statusElement = button.querySelector('.square-accessible-status');
      const pieceTextElement = button.querySelector('.square-piece-text');

      const statusText = `${selected ? ' 선택됨' : ''}${legalTarget ? ' 이동 가능' : ''}`;
      const accessibleName = `${piece ? pieceText : '빈 칸'} ${coordinateText}${selected ? ' 선택됨' : ''}${legalTarget ? ' 이동 가능' : ''}`;

      accessiblePiece.textContent = piece ? `${pieceText} ` : '빈 칸 ';
      visibleCoordinate.textContent = coordinateText;
      symbolElement.textContent = symbol;
      pieceTextElement.textContent = piece ? pieceText : '';
      statusElement.textContent = statusText;
      button.setAttribute('aria-label', accessibleName);

      if (selected) {
        button.setAttribute('aria-pressed', 'true');
      } else {
        button.setAttribute('aria-pressed', 'false');
      }
    }

    this.table.setAttribute('aria-busy', engineThinking ? 'true' : 'false');
    if (boardHadFocus && focusSquare && this.squareButtons.get(focusSquare)) {
      this.squareButtons.get(focusSquare).focus();
      this.lastFocusedSquare = focusSquare;
    }
  }

  updateSelectionSummary(text) {
    this.selectionSummary.textContent = text;
  }

  focusSquare(square) {
    const button = this.squareButtons.get(square);
    if (button) {
      button.focus();
      this.lastFocusedSquare = square;
    }
  }

  #renderBoardSkeleton() {
    this.squareButtons.clear();
    this.squareCells.clear();
    this.table.innerHTML = '';

    const caption = document.createElement('caption');
    caption.textContent = '체스판';
    this.table.append(caption);

    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    const corner = document.createElement('th');
    corner.scope = 'col';
    corner.className = 'board-axis';
    corner.textContent = '#';
    headerRow.append(corner);

    for (const file of fileLabelForOrientation(this.orientation)) {
      const th = document.createElement('th');
      th.scope = 'col';
      th.className = 'board-axis';
      th.textContent = file;
      headerRow.append(th);
    }
    thead.append(headerRow);
    this.table.append(thead);

    const tbody = document.createElement('tbody');
    const rows = orientationToRows(this.orientation);
    const rankLabels = rankLabelForOrientation(this.orientation);

    rows.forEach((rowSquares, rowIndex) => {
      const tr = document.createElement('tr');
      const rowHeader = document.createElement('th');
      rowHeader.scope = 'row';
      rowHeader.className = 'board-axis';
      rowHeader.textContent = rankLabels[rowIndex];
      tr.append(rowHeader);

      rowSquares.forEach((square) => {
        const td = document.createElement('td');
        td.className = 'board-cell';

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'square-button';
        button.dataset.square = square;
        button.setAttribute('aria-pressed', 'false');

        const accessiblePiece = document.createElement('span');
        accessiblePiece.className = 'square-accessible-piece visually-hidden';

        const pieceText = document.createElement('span');
        pieceText.className = 'square-piece-text';
        pieceText.setAttribute('aria-hidden', 'true');

        const coordinate = document.createElement('span');
        coordinate.className = 'square-coordinate';

        const symbol = document.createElement('span');
        symbol.className = 'square-symbol';
        symbol.setAttribute('aria-hidden', 'true');

        const accessibleStatus = document.createElement('span');
        accessibleStatus.className = 'square-accessible-status visually-hidden';

        button.append(accessiblePiece, pieceText, coordinate, symbol, accessibleStatus);
        button.addEventListener('click', () => this.onSquareActivate(square));
        button.addEventListener('keydown', (event) => this.#handleDirectionalNavigation(event));
        button.addEventListener('focus', () => {
          this.lastFocusedSquare = square;
        });

        td.append(button);
        tr.append(td);
        this.squareButtons.set(square, button);
        this.squareCells.set(square, td);
      });

      tbody.append(tr);
    });

    this.table.append(tbody);
  }

  #handleDirectionalNavigation(event) {
    const square = event.currentTarget.dataset.square;
    const layout = orientationToRows(this.orientation);
    const flat = layout.flat();
    const index = flat.indexOf(square);
    if (index < 0) {
      return;
    }

    const row = Math.floor(index / 8);
    const col = index % 8;
    let nextSquare = null;

    switch (event.key) {
      case 'ArrowUp':
        if (row > 0) {
          nextSquare = layout[row - 1][col];
        }
        break;
      case 'ArrowDown':
        if (row < 7) {
          nextSquare = layout[row + 1][col];
        }
        break;
      case 'ArrowLeft':
        if (col > 0) {
          nextSquare = layout[row][col - 1];
        }
        break;
      case 'ArrowRight':
        if (col < 7) {
          nextSquare = layout[row][col + 1];
        }
        break;
      case 'Home':
        nextSquare = layout[row][0];
        break;
      case 'End':
        nextSquare = layout[row][7];
        break;
      default:
        return;
    }

    if (nextSquare) {
      event.preventDefault();
      this.focusSquare(nextSquare);
    }
  }
}
