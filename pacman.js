import { seeded, shuffle } from './core.js';

export const DIRECTIONS = {
  up: { x: 0, y: -1 },
  left: { x: -1, y: 0 },
  down: { x: 0, y: 1 },
  right: { x: 1, y: 0 },
};
const opposite = { up: 'down', down: 'up', left: 'right', right: 'left' };
const ghostColors = ['#db7889', '#9c87ce', '#6cafa6', '#dda450'];
const pointKey = (x, y) => `${x},${y}`;

export function buildMaze(level) {
  const width = level === 0 ? 19 : 23,
    height = level === 0 ? 17 : 21;
  const grid = Array.from({ length: height }, () => Array(width).fill('#'));
  const columns = level === 0 ? [1, 5, 9, 13, 17] : [1, 5, 9, 13, 17, 21];
  const rows = level === 0 ? [1, 5, 9, 13, 15] : [1, 5, 9, 13, 17, 19];
  const edges = [];
  for (let y = 0; y < rows.length; y++)
    for (let x = 0; x < columns.length; x++) {
      const node = y * columns.length + x;
      if (x + 1 < columns.length) edges.push([node, node + 1]);
      if (y + 1 < rows.length) edges.push([node, node + columns.length]);
    }
  const random = seeded(719 + level * 143);
  const count = columns.length * rows.length;
  let retained = [...edges];
  for (const edge of shuffle(edges, random).slice(0, level === 0 ? 9 : 17)) {
    const remaining = retained.filter((candidate) => candidate !== edge);
    const neighbors = Array.from({ length: count }, () => []);
    remaining.forEach(([a, b]) => {
      neighbors[a].push(b);
      neighbors[b].push(a);
    });
     
    if (neighbors.some((list) => list.length < 2)) continue;
    const seen = new Set([0]),
      queue = [0];
    for (let i = 0; i < queue.length; i++)
      for (const next of neighbors[queue[i]])
        if (!seen.has(next)) {
          seen.add(next);
          queue.push(next);
        }
    if (seen.size === count) retained = remaining;
  }
  for (const [a, b] of retained) {
    let x = columns[a % columns.length],
      y = rows[Math.floor(a / columns.length)];
    const endX = columns[b % columns.length],
      endY = rows[Math.floor(b / columns.length)];
    grid[y][x] = '.';
    while (x !== endX || y !== endY) {
      x += Math.sign(endX - x);
      y += Math.sign(endY - y);
      grid[y][x] = '.';
    }
  }
  const home = { x: Math.floor(width / 2), y: Math.floor(height / 2) };
  const cx = home.x,
    cy = home.y;
  for (let y = cy - 2; y <= cy + 3; y++) for (let x = cx - 3; x <= cx + 3; x++) grid[y][x] = '.';
  for (let y = cy - 1; y <= cy + 2; y++) for (let x = cx - 2; x <= cx + 2; x++) grid[y][x] = '#';
  for (let y = cy; y <= cy + 1; y++) for (let x = cx - 1; x <= cx + 1; x++) grid[y][x] = 'h';
  grid[cy - 1][cx] = 'd';
  let above = cy - 3;
  while (above > 0 && grid[above][cx] === '#') {
    grid[above][cx] = '.';
    above--;
  }
  let below = cy + 4;
  while (below < height - 1 && grid[below][cx] === '#') {
    grid[below][cx] = '.';
    below++;
  }
  const power = [
    [1, 1],
    [width - 2, 1],
    [1, height - 2],
    [width - 2, height - 2],
    [1, rows[2]],
    [width - 2, rows[2]],
    [cx - 3, cy - 2],
    [cx + 3, cy + 3],
  ].map(([x, y]) => pointKey(x, y));
  return {
    width,
    height,
    grid,
    home,
    exit: { x: cx, y: cy - 2 },
    start: { x: 1, y: height - 2 },
    power,
  };
}

export class BunnyMaze {
  constructor(level = 0, saved = {}) {
    this.level = level;
    this.maze = buildMaze(level);
    const checkpoint =
      saved.player &&
      Number.isInteger(saved.player.x) &&
      Number.isInteger(saved.player.y) &&
      this.canWalk(saved.player.x, saved.player.y)
        ? saved.player
        : this.maze.start;
    this.checkpoint = { x: checkpoint.x, y: checkpoint.y };
    this.player = {
      ...this.checkpoint,
      dir: checkpoint.dir || 'right',
      wanted: checkpoint.dir || 'right',
      target: null,
      progress: 0,
    };
    this.playerSpeed = 140;
    this.score = saved.score || 0;
    this.ghostsEaten = saved.ghostsEaten || 0;
    this.pellets = new Set();
    this.maze.grid.forEach((row, y) =>
      row.forEach((cell, x) => {
        if (cell === '.') this.pellets.add(pointKey(x, y));
      }),
    );
    this.pellets.delete(pointKey(this.maze.start.x, this.maze.start.y));
    if (Array.isArray(saved.remaining))
      this.pellets = new Set(
        saved.remaining.filter((key) => this.pellets.has(key) || this.maze.power.includes(key)),
      );
    this.powered = 0;
    this.safe = 2500;
    this.caught = false;
    this.finished = false;
    this.events = [];
    this.resetGhosts();
    this.checkFinished();
  }

  resetGhosts() {
    this.ghosts = ghostColors.map((color, i) => ({
      ...this.maze.home,
      color,
      personality: i,
      dir: 'up',
      target: null,
      progress: 0,
      mode: 'waiting',
      wait: 500 + i * 900,
      speed: 177 + i * 11,
    }));
  }

  canWalk(x, y, ghost = false) {
    const cell = this.maze.grid[y]?.[x];
    return cell === '.' || (ghost && (cell === 'h' || cell === 'd'));
  }

  neighbors(position, ghost = false) {
    const cell = { x: Math.round(position.x), y: Math.round(position.y) };
    return Object.entries(DIRECTIONS).flatMap(([dir, delta]) => {
      const x = cell.x + delta.x,
        y = cell.y + delta.y;
      return this.canWalk(x, y, ghost) ? [{ x, y, dir }] : [];
    });
  }

  distances(target, ghost = false) {
    target = { x: Math.round(target.x), y: Math.round(target.y) };
    const distances = new Map([[pointKey(target.x, target.y), 0]]),
      queue = [target];
    for (let i = 0; i < queue.length; i++)
      for (const next of this.neighbors(queue[i], ghost)) {
        const key = pointKey(next.x, next.y);
        if (!distances.has(key)) {
          distances.set(key, distances.get(pointKey(queue[i].x, queue[i].y)) + 1);
          queue.push(next);
        }
      }
    return distances;
  }

  reverse(actor) {
    actor.dir = opposite[actor.dir];
    if (!actor.target) return;
    const oldTarget = actor.target;
    actor.target = actor.from;
    actor.from = oldTarget;
    actor.progress = 1 - actor.progress;
  }

  steer(direction) {
    if (!DIRECTIONS[direction]) return;
    this.player.wanted = direction;
    if (direction === opposite[this.player.dir]) this.reverse(this.player);
  }

  startSegment(actor, next) {
    actor.from = { x: actor.x, y: actor.y };
    actor.target = { x: next.x, y: next.y };
    actor.dir = next.dir;
    actor.progress = 0;
  }

  travel(actor, distance) {
    const used = Math.min(distance, 1 - actor.progress);
    actor.progress += used;
    actor.x = actor.from.x + (actor.target.x - actor.from.x) * actor.progress;
    actor.y = actor.from.y + (actor.target.y - actor.from.y) * actor.progress;
    if (actor.progress >= 1 - 1e-9) {
      actor.x = actor.target.x;
      actor.y = actor.target.y;
      actor.target = null;
      actor.progress = 0;
    }
    return used;
  }

  advancePlayer(milliseconds) {
    let distance = milliseconds / this.playerSpeed;
    while (distance > 1e-9 && !this.caught && !this.finished) {
      if (!this.player.target) {
        const options = this.neighbors(this.player);
        const next =
          options.find((cell) => cell.dir === this.player.wanted) ||
          options.find((cell) => cell.dir === this.player.dir);
        if (!next) return;
        this.startSegment(this.player, next);
      }
      distance -= this.travel(this.player, distance);
      if (!this.player.target) this.collect();
    }
  }

  collect() {
    this.checkpoint = { x: this.player.x, y: this.player.y };
    const key = pointKey(this.player.x, this.player.y);
    if (this.pellets.delete(key)) {
      const power = this.maze.power.includes(key);
      this.score += power ? 50 : 10;
      if (power) {
        this.powered = 5000;
        this.ghosts
          .filter((ghost) => ghost.mode === 'normal')
          .forEach((ghost) => this.reverse(ghost));
        this.events.push('power');
      } else this.events.push('pellet');
      this.checkFinished();
    }
  }

  checkFinished() {
    if (this.pellets.size) return;
    if (this.ghostsEaten > 0) {
      this.finished = true;
      this.events.push('finish');
    } else {
      this.pellets.add(this.maze.power[6]);
      this.events.push('extra-power');
    }
  }

  collide() {
    for (const ghost of this.ghosts) {
      if (
        ghost.mode !== 'normal' ||
        Math.hypot(ghost.x - this.player.x, ghost.y - this.player.y) > 0.57
      )
        continue;
      if (this.powered > 0) {
        ghost.mode = 'eyes';
        this.score += 200;
        this.ghostsEaten++;
        this.events.push('ghost');
        this.checkFinished();
      } else if (this.safe <= 0) {
        this.caught = true;
        this.events.push('caught');
        return;
      }
    }
  }

  nextGhostStep(ghost) {
    let options = this.neighbors(ghost, true);
    if (ghost.mode === 'eyes' || ghost.mode === 'leaving') {
      const target = ghost.mode === 'eyes' ? this.maze.home : this.maze.exit;
      const distance = this.distances(target, true);
      return options.sort(
        (a, b) =>
          (distance.get(pointKey(a.x, a.y)) ?? 999) - (distance.get(pointKey(b.x, b.y)) ?? 999),
      )[0];
    }
    options = options.filter((cell) => this.maze.grid[cell.y][cell.x] === '.');
    const forward = options.filter((cell) => cell.dir !== opposite[ghost.dir]);
    if (forward.length) options = forward;
    if (ghost.personality === 2 && !this.powered) return shuffle(options)[0];
    let target = { x: Math.round(this.player.x), y: Math.round(this.player.y) };
    if (ghost.personality === 1 && !this.powered) {
      const delta = DIRECTIONS[this.player.dir];
      for (let i = 0; i < 3; i++)
        if (this.canWalk(target.x + delta.x, target.y + delta.y)) {
          target.x += delta.x;
          target.y += delta.y;
        }
    }
    if (
      ghost.personality === 3 &&
      !this.powered &&
      Math.abs(ghost.x - target.x) + Math.abs(ghost.y - target.y) < 6
    )
      target = { x: this.maze.width - 2, y: this.maze.height - 2 };
    const distance = this.distances(target);
    options.sort((a, b) => {
      const difference =
        (distance.get(pointKey(a.x, a.y)) ?? 999) - (distance.get(pointKey(b.x, b.y)) ?? 999);
      return this.powered ? -difference : difference;
    });
    return options[0];
  }

  advanceGhost(ghost, milliseconds) {
    if (ghost.mode === 'waiting') {
      ghost.wait -= milliseconds;
      if (ghost.wait <= 0) ghost.mode = 'leaving';
      return;
    }
    let remaining = milliseconds;
    while (remaining > 1e-9) {
      if (!ghost.target) {
        const next = this.nextGhostStep(ghost);
        if (!next) return;
        this.startSegment(ghost, next);
      }
      const speed =
        ghost.mode === 'eyes'
          ? 80
          : ghost.speed + (this.powered && ghost.mode === 'normal' ? 65 : 0);
      remaining -= this.travel(ghost, remaining / speed) * speed;
      if (!ghost.target) {
        if (ghost.mode === 'eyes' && ghost.x === this.maze.home.x && ghost.y === this.maze.home.y) {
          ghost.mode = 'waiting';
          ghost.wait = 2200;
          this.events.push('home');
          return;
        }
        if (
          ghost.mode === 'leaving' &&
          ghost.x === this.maze.exit.x &&
          ghost.y === this.maze.exit.y
        )
          ghost.mode = 'normal';
      }
    }
  }

  step(milliseconds) {
    let remaining = Math.min(Math.max(milliseconds, 0), 250);
    while (remaining > 0 && !this.caught && !this.finished) {
      const delta = Math.min(8, remaining);
      remaining -= delta;
      this.powered = Math.max(0, this.powered - delta);
      this.safe = Math.max(0, this.safe - delta);
      this.advancePlayer(delta);
      this.collide();
      if (this.caught || this.finished) break;
      for (const ghost of this.ghosts) this.advanceGhost(ghost, delta);
      this.collide();
    }
  }

  retry() {
    this.checkpoint = { ...this.maze.start };
    this.player = { ...this.maze.start, dir: 'right', wanted: 'right', target: null, progress: 0 };
    this.safe = 3000;
    this.powered = 0;
    this.caught = false;
    this.resetGhosts();
  }

  snapshot() {
    return {
      level: this.level,
      score: this.score,
      remaining: [...this.pellets],
      ghostsEaten: this.ghostsEaten,
      player: { ...this.checkpoint, dir: this.player.dir },
    };
  }
}

export function pacman(ctx) {
  const { root } = ctx;
  let game = new BunnyMaze(Math.min(ctx.state.level || 0, 1), ctx.state);
  let running = false,
    lastFrame = 0,
    lastSave = 0,
    caughtShown = false,
    completedLevel = false;
  root.innerHTML = `
    <p class="game-instruction">
      Dos laberintos, un peluche y muchos puntos por recoger.
      <br />
      Flechas / WASD o botones.
      <strong>EN CADA MAPA: recoge todos los puntos y atrapa al menos un fantasma usando una estrella.</strong>
    </p>
    <div class="pac-layout">
      <div class="pac-hud">
        <span class="hud-pill pac-level"></span>
        <span class="hud-pill pac-score"></span>
        <span class="hud-pill pac-left"></span>
        <span class="hud-pill pac-ghost-goal"></span>
        <button class="small-button pac-pause" aria-label="Pausar laberinto">Ⅱ</button>
      </div>
      <div class="pac-canvas-wrap">
        <canvas
          class="pac-canvas"
          tabindex="0"
          role="img"
          aria-label="Laberinto del conejito. Controla con flechas, WASD o botones de dirección."
        >Tu navegador no puede mostrar este laberinto.</canvas>
        <div class="pac-overlay"></div>
      </div>
      <div class="pac-legend">
        <span>✦ atrapa fantasmas durante 5 segundos</span>
        <span>◉◉ ojitos: vuelven a casa</span>
        <span>sin vidas · puntos guardados</span>
      </div>
      <p class="pac-status" role="status"></p>
      <div class="pac-controls" aria-label="Controles de dirección">
        ${Object.entries({ up: '↑', left: '←', down: '↓', right: '→' })
          .map(
            ([direction, symbol]) =>
              `<button data-dir="${direction}" aria-label="${{ up: 'Arriba', left: 'Izquierda', down: 'Abajo', right: 'Derecha' }[direction]}">${symbol}</button>`,
          )
          .join('')}
      </div>
    </div>
  `;
  const canvas = root.querySelector('canvas'),
    drawing = canvas.getContext('2d'),
    overlay = root.querySelector('.pac-overlay');
  const bunny = new Image();
  bunny.src = 'assets/pacman/bunny.svg';
  bunny.onload = () => {
    if (ctx.active()) draw();
  };
  const tile = 25;
  function resize() {
    canvas.width = game.maze.width * tile * 2;
    canvas.height = game.maze.height * tile * 2;
    drawing.setTransform(2, 0, 0, 2, 0, 0);
  }
  function save() {
    ctx.patch(game.snapshot());
  }
  function hud() {
    const labels = {
      'pac-level': `MAPA ${game.level + 1} / 2`,
      'pac-score': `${game.score} puntos`,
      'pac-left': `${game.pellets.size} por recoger`,
      'pac-ghost-goal': `fantasma ${Math.min(1, game.ghostsEaten)} / 1`,
      'pac-status': game.powered
        ? `✦ ¡Peluche imparable! ${Math.ceil(game.powered / 1000)} s`
        : game.safe
          ? 'Tienes unos segundos de protección para empezar.'
          : 'Rosa: te sigue · morado: se adelanta · verde: explora · amarillo: cambia de plan.',
    };
    for (const [className, text] of Object.entries(labels)) {
      const label = root.querySelector(`.${className}`);
      if (label.textContent !== text) label.textContent = text;
    }
  }
  function showOverlay(title, description, label, action) {
    running = false;
    overlay.hidden = false;
    overlay.innerHTML = `
      <img src="assets/pacman/bunny.svg" alt="Conejito de peluche con pañuelo lila" />
      <h2>${title}</h2>
      <p>${description}</p>
      <button class="primary">${label}</button>
    `;
    overlay.querySelector('button').onclick = action;
  }
  function resume() {
    overlay.hidden = true;
    running = true;
    lastFrame = performance.now();
    canvas.focus({ preventScroll: true });
  }
  function pause() {
    if (!running) return;
    save();
    showOverlay(
      'Pausa de peluche',
      'Las miguitas no se van a ir a ninguna parte.',
      'Seguir jugando →',
      resume,
    );
  }
  root.querySelector('.pac-pause').onclick = pause;
  function direction(name) {
    if (running) game.steer(name);
  }
  const keyMap = {
    ArrowUp: 'up',
    w: 'up',
    ArrowLeft: 'left',
    a: 'left',
    ArrowDown: 'down',
    s: 'down',
    ArrowRight: 'right',
    d: 'right',
  };
  ctx.listen(document, 'keydown', (event) => {
    if (ctx.suspended()) return;
    const dir = keyMap[event.key] || keyMap[event.key.toLowerCase()];
    if (dir && !['INPUT', 'SELECT', 'TEXTAREA'].includes(event.target.tagName)) {
      event.preventDefault();
      direction(dir);
    }
    if (event.key === 'Escape' && running) pause();
  });
  root.querySelectorAll('[data-dir]').forEach((button) => {
    ctx.listen(button, 'pointerdown', (event) => {
      event.preventDefault();
      direction(button.dataset.dir);
    });
    button.onclick = () => direction(button.dataset.dir);
  });
  let touchStart = null;
  ctx.listen(canvas, 'pointerdown', (event) => {
    touchStart = { x: event.clientX, y: event.clientY };
    canvas.setPointerCapture(event.pointerId);
  });
  ctx.listen(canvas, 'pointermove', (event) => {
    if (!touchStart) return;
    const dx = event.clientX - touchStart.x,
      dy = event.clientY - touchStart.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 12) return;
    direction(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up');
    touchStart = { x: event.clientX, y: event.clientY };
  });
  ctx.listen(canvas, 'pointerup', (event) => {
    if (!touchStart) return;
    const dx = event.clientX - touchStart.x,
      dy = event.clientY - touchStart.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) > 12)
      direction(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up');
    touchStart = null;
  });
  ctx.listen(canvas, 'pointercancel', () => {
    touchStart = null;
  });
  ctx.listen(document, 'visibilitychange', () => {
    if (document.hidden) pause();
  });
  ctx.listen(window, 'blur', pause);
  ctx.listen(window, 'arcade-pause', pause);
  ctx.listen(window, 'pagehide', save);
  function roundedRect(x, y, width, height, radius, fill, stroke) {
    drawing.beginPath();
    drawing.roundRect(x, y, width, height, radius);
    drawing.fillStyle = fill;
    drawing.fill();
    if (stroke) {
      drawing.strokeStyle = stroke;
      drawing.lineWidth = 1.1;
      drawing.stroke();
    }
  }
  function draw() {
    const maze = game.maze;
    drawing.clearRect(0, 0, canvas.width / 2, canvas.height / 2);
    drawing.fillStyle = '#fff9ed';
    drawing.fillRect(0, 0, maze.width * tile, maze.height * tile);
    maze.grid.forEach((row, y) =>
      row.forEach((cell, x) => {
        if (cell === '#')
          roundedRect(
            x * tile + 2,
            y * tile + 2,
            tile - 4,
            tile - 4,
            5,
            game.level ? '#b4d4c1' : '#cbbce5',
            game.level ? '#82a990' : '#a38dbf',
          );
        if (cell === 'h') {
          drawing.fillStyle = '#eee2d0';
          drawing.fillRect(x * tile, y * tile, tile, tile);
        }
        if (cell === 'd') roundedRect(x * tile + 1, y * tile + 10, tile - 2, 5, 2, '#dc8b9e');
      }),
    );
    drawing.fillStyle = '#93826b';
    drawing.font = '7px monospace';
    drawing.textAlign = 'center';
    drawing.fillText('zona de siesta', maze.home.x * tile + 12, (maze.home.y + 1) * tile + 22);
    for (const key of game.pellets) {
      const [x, y] = key.split(',').map(Number),
        px = (x + 0.5) * tile,
        py = (y + 0.5) * tile;
      if (maze.power.includes(key)) {
        drawing.fillStyle = '#bc8519';
        drawing.font = 'bold 21px sans-serif';
        drawing.fillText('✦', px, py + 7);
      } else {
        drawing.beginPath();
        drawing.arc(px, py, 2.6, 0, Math.PI * 2);
        drawing.fillStyle = '#ae8760';
        drawing.fill();
      }
    }
    for (const ghost of game.ghosts) {
      const x = (ghost.x + 0.5) * tile;
      const y = (ghost.y + 0.5) * tile;
      if (ghost.mode !== 'eyes') {
        drawing.beginPath();
        drawing.moveTo(x - 10, y + 9);
        drawing.lineTo(x - 10, y - 1);
        drawing.arc(x, y - 1, 10, Math.PI, 0);
        drawing.lineTo(x + 10, y + 9);
        drawing.lineTo(x + 5, y + 5);
        drawing.lineTo(x, y + 9);
        drawing.lineTo(x - 5, y + 5);
        drawing.closePath();
        drawing.fillStyle = game.powered && ghost.mode === 'normal' ? '#7a6ca5' : ghost.color;
        drawing.fill();
        drawing.strokeStyle = '#554952';
        drawing.lineWidth = 1;
        drawing.stroke();
      }
      drawing.fillStyle = '#fff';
      drawing.beginPath();
      drawing.ellipse(x - 4, y - 1, 3.8, 4.4, 0, 0, Math.PI * 2);
      drawing.ellipse(x + 4, y - 1, 3.8, 4.4, 0, 0, Math.PI * 2);
      drawing.fill();
      drawing.fillStyle = '#343334';
      drawing.beginPath();
      drawing.arc(x - 3, y - 1, 1.7, 0, Math.PI * 2);
      drawing.arc(x + 5, y - 1, 1.7, 0, Math.PI * 2);
      drawing.fill();
      if (game.powered && ghost.mode === 'normal') {
        drawing.strokeStyle = '#fff';
        drawing.beginPath();
        drawing.moveTo(x - 5, y + 6);
        drawing.lineTo(x - 2, y + 4);
        drawing.lineTo(x + 1, y + 6);
        drawing.lineTo(x + 4, y + 4);
        drawing.stroke();
      }
    }
    const px = (game.player.x + 0.5) * tile;
    const py = (game.player.y + 0.5) * tile;
    if (game.powered || game.safe) {
      drawing.beginPath();
      drawing.arc(px, py, 14, 0, Math.PI * 2);
      drawing.strokeStyle = game.powered ? '#d9a522' : '#9abcb0';
      drawing.lineWidth = 2;
      drawing.stroke();
    }
    if (bunny.complete && bunny.naturalWidth) drawing.drawImage(bunny, px - 12, py - 18, 24, 29);
    else {
      drawing.fillStyle = '#fff';
      drawing.beginPath();
      drawing.arc(px, py, 10, 0, Math.PI * 2);
      drawing.fill();
    }
  }
  function frame(time) {
    if (!ctx.active()) return;
    if (running && ctx.suspended()) pause();
    if (running) {
      game.step(Math.min(time - lastFrame, 60));
      for (const event of game.events.splice(0)) {
        if (event === 'power' || event === 'ghost') ctx.sound('pop');
        if (event === 'pellet' && game.pellets.size % 4 === 0) ctx.sound('tick');
      }
      if (time - lastSave > 1000) {
        save();
        lastSave = time;
      }
      if (game.caught && !caughtShown) {
        caughtShown = true;
        save();
        ctx.sound('wrong');
        showOverlay(
          'Abrazo de fantasma.',
          'No pierdes lo que ya recogiste ni el fantasma que atrapaste. Al volver tienes 3 segundos de protección.',
          'Intentar otra vez →',
          () => {
            game.retry();
            caughtShown = false;
            resume();
          },
        );
      }
      if (game.finished && !completedLevel) {
        completedLevel = true;
        save();
        if (game.level === 1) {
          ctx.win('¡Dos laberintos completos! Este peluche puede con todo.');
          return;
        }
        ctx.sound('success');
        showOverlay(
          '¡Primer mapa limpio!',
          '<strong>En el segundo mapa también debes recoger todos los puntos y atrapar un fantasma.</strong> El mapa es un poco más grande, pero los controles son los mismos.',
          'Al segundo jardín →',
          () => {
            game = new BunnyMaze(1, { score: game.score });
            completedLevel = false;
            resize();
            save();
            hud();
            draw();
            resume();
          },
        );
      }
      hud();
      draw();
    }
    lastFrame = time;
    ctx.frame(frame);
  }
  resize();
  hud();
  draw();
  showOverlay(
    game.level ? 'De vuelta al jardín' : 'Operación: miguitas',
    '<strong>Tienes dos objetivos en cada mapa: recoger todos los puntos y atrapar al menos un fantasma.</strong> Las estrellas te permiten atraparlos durante 5 segundos. Puedes preparar un giro antes de llegar a la esquina. Si al final aún falta el fantasma, aparece otra estrella.',
    '¡Conejito, corre! →',
    resume,
  );
  ctx.frame(frame);
}
