import { RULE_GUIDES } from './puzzles.js';

export const REGULAR_REGIONS = Array.from(
  { length: 36 },
  (_, i) => Math.floor(i / 12) * 2 + Math.floor((i % 6) / 3),
);
export const IRREGULAR_REGIONS = [...REGULAR_REGIONS];
for (const [a, b] of [
  [6, 14],
  [9, 17],
  [18, 26],
  [21, 29],
])
  [IRREGULAR_REGIONS[a], IRREGULAR_REGIONS[b]] = [IRREGULAR_REGIONS[b], IRREGULAR_REGIONS[a]];

export const SUDOKUS = [
  {
    id: 'jigsaw-8',
    variant: 0,
    regions: IRREGULAR_REGIONS,
    thermos: [],
    givens: [
      0, 0, 0, 6, 0, 0, 0, 3, 0, 5, 0, 2, 0, 0, 0, 0, 4, 0, 3, 0, 5, 0, 0, 0, 0, 0, 3, 0, 5, 0, 4,
      0, 0, 0, 0, 3,
    ],
    
  },
  {
    id: 'jigsaw-11',
    variant: 0,
    regions: IRREGULAR_REGIONS,
    thermos: [],
    givens: [
      4, 0, 3, 6, 0, 0, 0, 0, 0, 4, 2, 0, 0, 0, 0, 5, 0, 0, 0, 1, 0, 2, 0, 0, 0, 0, 0, 1, 0, 2, 0,
      4, 0, 0, 0, 0,
    ],
    
  },
  {
    id: 'jigsaw-15',
    variant: 0,
    regions: IRREGULAR_REGIONS,
    thermos: [],
    givens: [
      0, 0, 6, 0, 2, 5, 0, 0, 0, 0, 0, 6, 0, 6, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 3, 1, 0,
      3, 0, 6, 0, 0,
    ],
    
  },
  {
    id: 'thermo-26',
    variant: 1,
    regions: REGULAR_REGIONS,
    thermos: [
      [28, 27, 21, 15],
      [20, 14, 13, 12],
      [34, 33, 32, 26],
    ],
    givens: [
      1, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 5, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 1, 0, 0,
      1, 0, 0, 0, 6,
    ],
    
  },
  {
    id: 'thermo-41',
    variant: 1,
    regions: REGULAR_REGIONS,
    thermos: [
      [26, 20, 14, 8],
      [23, 22, 16, 10],
      [4, 3, 2, 1],
    ],
    givens: [
      2, 0, 0, 0, 0, 0, 0, 1, 5, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 6, 0, 0, 0, 0, 0, 5, 2, 0, 0,
      0, 0, 0, 3, 0,
    ],
    
  },
  {
    id: 'thermo-47',
    variant: 1,
    regions: REGULAR_REGIONS,
    thermos: [
      [32, 31, 30, 24],
      [10, 9, 8, 2],
      [21, 20, 19, 13],
    ],
    givens: [
      0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 6, 0, 0, 0, 0, 3, 2, 0, 3, 2, 0, 0, 4, 0, 0, 0, 3, 0, 0, 0,
      0, 0, 6, 0, 0,
    ],
    
  },
];

export function sudokuConflicts(board, index, value, puzzle) {
  if (!value) return [];
  const row = Math.floor(index / 6),
    col = index % 6,
    conflicts = [];
  board.forEach((n, other) => {
    if (
      other !== index &&
      n === value &&
      (Math.floor(other / 6) === row ||
        other % 6 === col ||
        puzzle.regions[other] === puzzle.regions[index])
    )
      conflicts.push(other);
  });
  for (const path of puzzle.thermos || []) {
    const position = path.indexOf(index);
    if (position < 0) continue;
    if (value < position + 1 || value > 6 - (path.length - position - 1)) conflicts.push(index);
    path.forEach((other, step) => {
      if (!board[other] || other === index) return;
      if (
        (step < position && value < board[other] + position - step) ||
        (step > position && value > board[other] - (step - position))
      )
        conflicts.push(other);
    });
  }
  return [...new Set(conflicts)];
}



export function sudokuSolved(board, puzzle) {
  return (
    board.length === 36 &&
    board.every(
      (n, i) =>
        Number.isInteger(n) &&
        n >= 1 &&
        n <= 6 &&
        (!puzzle.givens[i] || n === puzzle.givens[i]) &&
        !sudokuConflicts(board, i, n, puzzle).length,
    )
  );
}





export function sudoku(ctx) {
  const { root, stage } = ctx;
  const guide = RULE_GUIDES.sudoku[stage.variant];
  if (ctx.announce(`sudoku-${stage.variant}`, guide, () => sudoku(ctx))) return;
  const pool = SUDOKUS.filter((p) => p.variant === stage.variant);
  const puzzle = pool[stage.seed % pool.length];
  let board =
    Array.isArray(ctx.state.board) && ctx.state.board.length === 36
      ? [...ctx.state.board]
      : [...puzzle.givens];
  let notes = ctx.state.notes || {},
    pencil = false,
    selected = puzzle.givens.findIndex((n) => !n);
  const paths = puzzle.thermos || [];
  root.innerHTML = `
    <p class="rule-reminder"><strong>${guide.reminder}</strong></p>
    <p class="game-instruction">
      Del
      <strong>1 al 6</strong>
      , sin repetir en cada fila, columna y región de borde grueso.
      <br />
      ${
        stage.variant === 0
          ? 'Las regiones son irregulares: sigue los bordes, no los cuadrados.'
          : 'En cada termómetro, los números aumentan desde el círculo hasta la punta.'
      }
    </p>
    <div class="sudoku-wrap">
      <div class="sudoku-board large" role="group" aria-label="Sudoku de seis por seis"></div>
      <svg class="thermo-overlay" viewBox="0 0 600 600" aria-hidden="true">
        ${paths
          .map(
            (path) =>
              `<polyline points="${path.map((i) => `${(i % 6) * 100 + 50},${Math.floor(i / 6) * 100 + 50}`).join(' ')}"/><circle cx="${(path[0] % 6) * 100 + 50}" cy="${Math.floor(path[0] / 6) * 100 + 50}" r="27"/>`,
          )
          .join('')}
      </svg>
    </div>
    <div class="sudoku-keypad">
      ${[1, 2, 3, 4, 5, 6, 0]
        .map(
          (n) =>
            `<button class="small-button" data-number="${n}" aria-label="${n || 'Borrar casilla'}">${n || '⌫'}</button>`,
        )
        .join('')}
    </div>
    <div class="game-actions">
      <button class="small-button pencil" aria-pressed="false">Lápiz: no</button>
      <button class="primary sudoku-check">Comprobar tablero</button>
    </div>
    <p class="feedback" role="status">Puedes usar el lápiz para anotar posibles números en una casilla.</p>
  `;
  function paint() {
    root.querySelector('.sudoku-board').innerHTML = board
      .map((n, i) => {
        const row = Math.floor(i / 6),
          col = i % 6;
        const boundaries = `${col < 5 && puzzle.regions[i] !== puzzle.regions[i + 1] ? 'border-right:3px solid var(--ink);' : ''}${row < 5 && puzzle.regions[i] !== puzzle.regions[i + 6] ? 'border-bottom:3px solid var(--ink);' : ''}`;
        const thermoLabel = paths
          .flatMap((path, p) =>
            path.includes(i) ? [`termómetro ${p + 1}, posición ${path.indexOf(i) + 1}`] : [],
          )
          .join(', ');
        return `<button class="sudoku-cell ${puzzle.givens[i] ? 'given' : ''} ${selected === i ? 'selected' : ''}" style="${boundaries}" data-cell="${i}" aria-label="Fila ${row + 1}, columna ${col + 1}: ${n || 'vacía'}${puzzle.givens[i] ? ', fija' : ''}${thermoLabel ? ', ' + thermoLabel : ''}" aria-pressed="${selected === i}" ${puzzle.givens[i] ? 'aria-disabled="true"' : ''}><span>${n || ''}</span>${!n ? `<small class="pencil-notes">${(notes[i] || []).join(' ')}</small>` : ''}</button>`;
      })
      .join('');
    root.querySelectorAll('[data-cell]').forEach(
      (button) =>
        (button.onclick = () => {
          if (puzzle.givens[Number(button.dataset.cell)]) return;
          selected = Number(button.dataset.cell);
          paint();
          root.querySelector(`[data-cell="${selected}"]`).focus({ preventScroll: true });
        }),
    );
  }
  function place(value) {
    if (puzzle.givens[selected]) return;
    if (pencil && value) {
      const marks = notes[selected] || [];
      notes[selected] = marks.includes(value)
        ? marks.filter((n) => n !== value)
        : [...marks, value].sort();
    } else {
      board[selected] = value;
      delete notes[selected];
    }
    ctx.patch({ board: [...board], notes });
    ctx.sound('tick');
    paint();
  }
  root
    .querySelectorAll('[data-number]')
    .forEach((button) => (button.onclick = () => place(Number(button.dataset.number))));
  root.querySelector('.pencil').onclick = (event) => {
    pencil = !pencil;
    event.currentTarget.textContent = `Lápiz: ${pencil ? 'sí' : 'no'}`;
    event.currentTarget.setAttribute('aria-pressed', String(pencil));
  };
  root.querySelector('.sudoku-check').onclick = () => {
    const conflicts = new Set();
    board.forEach((n, i) => {
      if (n && sudokuConflicts(board, i, n, puzzle).length) conflicts.add(i);
    });
    if (sudokuSolved(board, puzzle)) return ctx.win('¡Las 36 casillas están en su lugar!');
    conflicts.forEach((i) => root.querySelector(`[data-cell="${i}"]`).classList.add('conflict'));
    root.querySelector('.feedback').textContent = conflicts.size
      ? 'Hay números que no cumplen las reglas. Revisa las casillas marcadas; tus cambios se guardan.'
      : `Por ahora las reglas se cumplen. Faltan ${board.filter((n) => !n).length} casillas.`;
  };
  ctx.listen(document, 'keydown', (event) => {
    if (ctx.suspended() || ['INPUT', 'SELECT'].includes(event.target.tagName)) return;
    if (/^[1-6]$/.test(event.key) || ['Backspace', 'Delete', '0'].includes(event.key)) {
      event.preventDefault();
      place(Number(event.key) || 0);
    }
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -6, ArrowDown: 6 }[event.key];
    if (step) {
      event.preventDefault();
      selected = (selected + step + 36) % 36;
      paint();
      root.querySelector(`[data-cell="${selected}"]`).focus({ preventScroll: true });
    }
  });
  paint();
}
