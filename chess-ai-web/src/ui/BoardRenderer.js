export class BoardRenderer {
  constructor({ container, onSquareActivate }) {
    this.container = container;
    this.onSquareActivate = onSquareActivate;
    this.bindEvents();
  }

  bindEvents() {
    this.container.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-square]');
      if (!button) {
        return;
      }
      this.onSquareActivate(button.dataset.square);
    });

    this.container.addEventListener('keydown', (event) => {
      const button = event.target.closest('button[data-square]');
      if (!button) {
        return;
      }

      const row = Number(button.dataset.row);
      const col = Number(button.dataset.col);
      let nextRow = row;
      let nextCol = col;

      switch (event.key) {
        case 'ArrowUp':
          nextRow = Math.max(0, row - 1);
          break;
        case 'ArrowDown':
          nextRow = Math.min(7, row + 1);
          break;
        case 'ArrowLeft':
          nextCol = Math.max(0, col - 1);
          break;
        case 'ArrowRight':
          nextCol = Math.min(7, col + 1);
          break;
        default:
          return;
      }

      event.preventDefault();
      const nextSquare = this.container.querySelector(`button[data-row="${nextRow}"][data-col="${nextCol}"]`);
      if (nextSquare) {
        nextSquare.focus();
      }
    });
  }

  render(viewModel) {
    const activeElement = document.activeElement;
    const activeSquare = activeElement?.dataset?.square ?? null;
    const shouldRestoreFocus = Boolean(activeSquare && this.container.contains(activeElement));

    const table = document.createElement('table');
    table.className = 'board-table';

    const caption = document.createElement('caption');
    caption.textContent = '체스판: 각 칸은 좌표와 기물 정보를 포함한 버튼입니다.';
    table.appendChild(caption);

    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    const cornerHeader = document.createElement('th');
    cornerHeader.scope = 'col';
    cornerHeader.textContent = '랭크';
    headRow.appendChild(cornerHeader);

    for (const file of viewModel.files) {
      const header = document.createElement('th');
      header.scope = 'col';
      header.textContent = file;
      headRow.appendChild(header);
    }

    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');

    for (const row of viewModel.rows) {
      const tableRow = document.createElement('tr');
      const rankHeader = document.createElement('th');
      rankHeader.scope = 'row';
      rankHeader.textContent = row.rank;
      tableRow.appendChild(rankHeader);

      for (const square of row.squares) {
        const cell = document.createElement('td');
        const button = document.createElement('button');
        button.type = 'button';
        button.className = [
          'square',
          square.lightSquare ? 'square--light' : 'square--dark',
          square.selected ? 'square--selected' : '',
          square.legalTarget ? 'square--target' : '',
          square.lastMove ? 'square--last' : '',
        ]
          .filter(Boolean)
          .join(' ');

        button.dataset.square = square.coordinate;
        button.dataset.row = String(square.rowIndex);
        button.dataset.col = String(square.colIndex);
        button.setAttribute('aria-label', square.accessibleName);
        button.setAttribute('aria-describedby', 'board-help');
        button.setAttribute('aria-pressed', String(square.selected));

        const symbol = document.createElement('span');
        symbol.className = 'square__symbol';
        symbol.setAttribute('aria-hidden', 'true');
        symbol.textContent = square.symbol || '·';

        const coordinate = document.createElement('span');
        coordinate.className = 'square__coordinate';
        coordinate.setAttribute('aria-hidden', 'true');
        coordinate.textContent = square.coordinate;

        const hint = document.createElement('span');
        hint.className = 'square__hint';
        hint.setAttribute('aria-hidden', 'true');
        hint.textContent = square.visibleHint;

        button.append(symbol, coordinate, hint);
        cell.appendChild(button);
        tableRow.appendChild(cell);
      }

      tbody.appendChild(tableRow);
    }

    table.appendChild(tbody);

    this.container.replaceChildren(table);

    if (shouldRestoreFocus) {
      const focusTarget = this.container.querySelector(`button[data-square="${activeSquare}"]`);
      if (focusTarget) {
        focusTarget.focus();
      }
    }
  }
}
