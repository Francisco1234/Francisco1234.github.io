export const GARDEN_SIZE = 11;
export const GARDENS = [
  {
    id: 'garden-18',
    rabbit: 60,
    walls: [
      13, 15, 17, 23, 25, 29, 34, 35, 36, 39, 40, 46, 64, 68, 69, 80, 81, 86, 89, 92, 96, 100, 103,
    ],
    
  },
  {
    id: 'garden-27',
    rabbit: 60,
    walls: [
      19, 24, 29, 30, 35, 36, 41, 42, 51, 53, 62, 63, 68, 74, 75, 79, 80, 81, 85, 86, 90, 94, 100,
      101, 107, 108,
    ],
    
  },
  {
    id: 'garden-56',
    rabbit: 60,
    walls: [
      12, 17, 18, 19, 20, 24, 25, 41, 42, 46, 50, 51, 69, 70, 74, 75, 80, 85, 91, 92, 100, 103, 104,
      106, 108,
    ],
    
  },
  {
    id: 'garden-57',
    rabbit: 60,
    walls: [
      12, 19, 26, 28, 30, 34, 35, 36, 40, 56, 57, 70, 73, 74, 75, 79, 80, 81, 83, 84, 85, 91, 100,
      102, 103, 108,
    ],
    
  },
  {
    id: 'garden-84',
    rabbit: 60,
    walls: [
      12, 19, 26, 27, 29, 31, 40, 45, 50, 53, 58, 64, 68, 74, 78, 80, 84, 86, 89, 90, 93, 100, 104,
    ],
    
  },
  {
    id: 'garden-108',
    rabbit: 60,
    walls: [
      13, 14, 17, 18, 27, 34, 36, 41, 45, 46, 53, 57, 62, 73, 75, 80, 91, 96, 97, 100, 104, 106,
      108,
    ],
    
  },
];

export function gardenNeighbors(cell) {
  const row = Math.floor(cell / GARDEN_SIZE),
    col = cell % GARDEN_SIZE;
  return [
    row > 0 ? cell - GARDEN_SIZE : -1,
    row < GARDEN_SIZE - 1 ? cell + GARDEN_SIZE : -1,
    col > 0 ? cell - 1 : -1,
    col < GARDEN_SIZE - 1 ? cell + 1 : -1,
  ].filter((n) => n >= 0);
}

export function gardenBorder(cell) {
  return (
    cell < GARDEN_SIZE ||
    cell >= GARDEN_SIZE * (GARDEN_SIZE - 1) ||
    cell % GARDEN_SIZE === 0 ||
    cell % GARDEN_SIZE === GARDEN_SIZE - 1
  );
}

export function escapeMap(walls) {
  const distance = new Int16Array(GARDEN_SIZE ** 2).fill(-1),
    routes = new Float64Array(GARDEN_SIZE ** 2),
    queue = [];
  for (let i = 0; i < distance.length; i++)
    if (gardenBorder(i) && !walls.has(i)) {
      distance[i] = 0;
      routes[i] = 1;
      queue.push(i);
    }
  for (let head = 0; head < queue.length; head++) {
    const cell = queue[head];
    for (const next of gardenNeighbors(cell)) {
      if (walls.has(next)) continue;
      if (distance[next] < 0) {
        distance[next] = distance[cell] + 1;
        queue.push(next);
      }
      if (distance[next] === distance[cell] + 1) routes[next] += routes[cell];
    }
  }
  return { distance, routes };
}

export function rabbitTurn(walls, rabbit, fence) {
  if (
    gardenBorder(fence) ||
    fence === rabbit ||
    walls.has(fence) ||
    !Number.isInteger(fence) ||
    fence < 0 ||
    fence >= GARDEN_SIZE ** 2
  )
    return null;
  const nextWalls = new Set(walls);
  nextWalls.add(fence);
  const map = escapeMap(nextWalls);
  if (map.distance[rabbit] < 0) return { walls: nextWalls, rabbit, outcome: 'trapped' };
  const options = gardenNeighbors(rabbit).filter(
    (i) => map.distance[i] === map.distance[rabbit] - 1,
  );
  options.sort(
    (a, b) =>
      map.routes[b] - map.routes[a] ||
      gardenNeighbors(b).filter((i) => !nextWalls.has(i)).length -
        gardenNeighbors(a).filter((i) => !nextWalls.has(i)).length ||
      a - b,
  );
  const next = options[0];
  return { walls: nextWalls, rabbit: next, outcome: gardenBorder(next) ? 'escaped' : 'playing' };
}

export function rabbitGarden(seed, round = 0, attempt = 0) {
  return GARDENS[((seed % GARDENS.length) + round * 3 + attempt) % GARDENS.length];
}

export function rabbit(ctx) {
  const { root, stage } = ctx;
  let round = ctx.state.round || 0,
    attempt = ctx.state.attempt || 0;
  let garden = rabbitGarden(stage.seed, round, attempt);
  let walls = new Set(ctx.state.walls || garden.walls),
    position = ctx.state.rabbit ?? garden.rabbit;
  let moves = ctx.state.moves || 0,
    selected = null,
    busy = false;
  let outcome = ctx.state.outcome || 'playing';
  let cursor = 49;
  function save() {
    ctx.patch({ round, attempt, walls: [...walls], rabbit: position, moves, outcome });
  }
  function newGarden() {
    garden = rabbitGarden(stage.seed, round, attempt);
    walls = new Set(garden.walls);
    position = garden.rabbit;
    moves = 0;
    selected = null;
    outcome = 'playing';
    save();
  }
  function paint(message = '') {
    if (walls.has(cursor) || cursor === position || gardenBorder(cursor)) {
      cursor = Array.from({ length: GARDEN_SIZE ** 2 }, (_, i) => i).find(
        (i) => !walls.has(i) && i !== position && !gardenBorder(i),
      );
    }
    root.innerHTML = `
      <div class="round-label">JARDÍN ${round + 1} / 2 · ${moves} VALLAS</div>
      <p class="game-instruction">
        Selecciona una casilla y coloca una valla. El conejo da un salto hacia su
        <strong>salida más cercana</strong>
        .
        <br />
        Ganas cuando ya no hay ningún camino al borde. El borde punteado siempre es una salida,
        nunca una pared.
      </p>
      <div class="trap-board" role="group" aria-label="Jardín de once por once. Usa las flechas para moverte y Enter para seleccionar.">
        ${Array.from({ length: GARDEN_SIZE ** 2 }, (_, i) => {
          const border = gardenBorder(i),
            wall = walls.has(i),
            animal = i === position;
          return `<button class="trap-cell ${border ? 'exit' : ''} ${wall ? 'wall' : ''} ${garden.walls.includes(i) ? 'hedge' : ''} ${selected === i ? 'selected' : ''} ${animal ? 'animal' : ''}" data-trap="${i}" tabindex="${i === cursor ? 0 : -1}" aria-label="Fila ${Math.floor(i / GARDEN_SIZE) + 1}, columna ${(i % GARDEN_SIZE) + 1}: ${animal ? 'conejo' : border ? 'salida abierta' : wall ? 'valla' : 'césped'}" ${border || wall || animal || outcome !== 'playing' ? 'disabled' : ''}>${animal ? '<img src="assets/pacman/bunny.svg" alt="">' : wall ? '▥' : border ? '·' : selected === i ? '+' : ''}</button>`;
        }).join('')}
      </div>
      <div class="game-actions">
        <button
          class="primary place-fence"
          ${selected === null || busy || outcome !== 'playing' ? 'disabled' : ''}
        >
          Poner valla ↵
        </button>
        <button class="small-button new-garden" ${busy ? 'disabled' : ''}>Otro jardín</button>
      </div>
      <p class="feedback ${outcome === 'trapped' ? 'good' : ''}" role="status">
        ${message || 'Un turno para ti, un salto para él. Puedes pensar sin reloj.'}
      </p>
      ${
        outcome === 'trapped'
          ? '<div class="game-center"><button class="primary garden-next">Jardín cerrado →</button></div>'
          : ''
      }
    `;
    root.querySelectorAll('[data-trap]').forEach(
      (button) =>
        (button.onclick = () => {
          if (busy || outcome !== 'playing') return;
          selected = Number(button.dataset.trap);
          cursor = selected;
          paint();
          root.querySelector('.place-fence').focus({ preventScroll: true });
        }),
    );
    root.querySelector('.place-fence').onclick = place;
    root.querySelector('.new-garden').onclick = () => {
      attempt++;
      newGarden();
      paint('Nuevo jardín. Las estrellas ganadas siguen contigo.');
    };
    const next = root.querySelector('.garden-next');
    if (next)
      next.onclick = () => {
        if (round === 1)
          return ctx.win('Dos jardines cerrados. El conejo presenta una reclamación.');
        round++;
        newGarden();
        paint();
      };
  }
  function place() {
    if (busy || selected === null || outcome !== 'playing') return;
    const result = rabbitTurn(walls, position, selected);
    if (!result) return;
    busy = true;
    walls = result.walls;
    selected = null;
    moves++;
    ctx.patch({
      round,
      attempt,
      walls: [...walls],
      rabbit: result.rabbit,
      moves,
      outcome: result.outcome,
    });
    paint('La valla está puesta…');
    ctx.later(() => {
      position = result.rabbit;
      outcome = result.outcome;
      busy = false;
      save();
      ctx.sound('pop');
      if (outcome === 'escaped') {
        attempt++;
        newGarden();
        paint(
          'Se escapó por el borde. Nuevo jardín: prueba a cortar sus rutas antes de perseguirlo.',
        );
      } else
        paint(
          outcome === 'trapped'
            ? '¡Encerrado! Puede pasear dentro; lo importante es que no puede salir.'
            : 'Ha elegido una ruta mínima. ¿Cuál le cerrarás ahora?',
        );
      root
        .querySelector(outcome === 'trapped' ? '.garden-next' : `[data-trap="${cursor}"]`)
        ?.focus({ preventScroll: true });
    }, 150);
  }
  ctx.listen(root, 'keydown', (event) => {
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -GARDEN_SIZE, ArrowDown: GARDEN_SIZE }[
      event.key
    ];
    if (!step || event.target.dataset.trap === undefined || busy || ctx.suspended()) return;
    event.preventDefault();
    let next = Number(event.target.dataset.trap);
    for (let i = 0; i < GARDEN_SIZE ** 2; i++) {
      next = (next + step + GARDEN_SIZE ** 2) % GARDEN_SIZE ** 2;
      const button = root.querySelector(`[data-trap="${next}"]`);
      if (button && !button.disabled) {
        event.target.tabIndex = -1;
        button.tabIndex = 0;
        cursor = next;
        button.focus({ preventScroll: true });
        break;
      }
    }
  });
  if (outcome === 'escaped') {
    attempt++;
    newGarden();
  }
  paint(outcome === 'trapped' ? '¡Encerrado! Este jardín ya no tiene salida.' : '');
}
