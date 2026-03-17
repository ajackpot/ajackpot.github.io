export class MoveHistoryView {
  constructor(container) {
    this.container = container;
  }

  render(turns) {
    if (!turns.length) {
      this.container.innerHTML = '<p class="empty-state">아직 진행된 수가 없습니다.</p>';
      return;
    }

    const table = document.createElement('table');
    table.className = 'move-history-table';
    table.setAttribute('aria-label', '기보 목록');

    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th scope="col">수순</th><th scope="col">백</th><th scope="col">흑</th></tr>';
    table.append(thead);

    const tbody = document.createElement('tbody');
    for (const turn of turns) {
      const row = document.createElement('tr');
      row.innerHTML = `
        <th scope="row">${turn.moveNumber}</th>
        <td>${turn.white || ''}</td>
        <td>${turn.black || ''}</td>
      `;
      tbody.append(row);
    }
    table.append(tbody);

    this.container.innerHTML = '';
    this.container.append(table);
  }
}
