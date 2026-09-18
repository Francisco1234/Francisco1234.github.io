import { TOTAL, STORAGE_KEY, LEGACY_KEY, TYPES, freshSave, restoreSave, shuffle } from './core.js';
import {
  numberPuzzle,
  chemistry,
  memory,
  reaction,
  visual,
  logic,
  egg,
  switches,
} from './games.js';
import { pacman } from './pacman.js';
import { sudoku } from './sudoku.js';
import { rabbit } from './rabbit.js';
import { trivia } from './trivia.js';

const screen = document.querySelector('#screen');
const modal = document.querySelector('#modal');
const soundToggle = document.querySelector('#sound-toggle');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let save,
  storageAvailable = true,
  cleanup = () => {},
  audio,
  toastTimer;

try {
  save = restoreSave(localStorage.getItem(STORAGE_KEY));
  if (!save) {
    save = freshSave();
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      save.legacyEdition = true;
      try {
        const old = JSON.parse(legacy);
        save.muted = old.muted !== false;
        if (Number.isFinite(old.bestReaction) && old.bestReaction >= 100)
          save.bestReaction = old.bestReaction;
      } catch {}
    }
  }
} catch {
  save = freshSave();
  storageAvailable = false;
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
    storageAvailable = true;
  } catch {
    storageAvailable = false;
  }
  const status = document.querySelector('#save-status');
  status.textContent = storageAvailable
    ? 'tu progreso se guarda aquí'
    : 'sin guardado: mantén esta pestaña abierta';
  status.classList.toggle('storage-warning', !storageAvailable);
}

function sound(kind) {
  if (save.muted) return;
  if (!audio) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    try {
      audio = new AudioContext();
    } catch {
      return;
    }
  }
  if (audio.state === 'suspended') audio.resume().catch(() => {});
  const notes = { tick: [620, 0.035], pop: [810, 0.09], wrong: [180, 0.13], success: [660, 0.12] };
  const [frequency, duration] = notes[kind] || notes.tick;
  const playNote = (pitch, delay) => {
    const oscillator = audio.createOscillator(),
      gain = audio.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(pitch, audio.currentTime + delay);
    oscillator.frequency.exponentialRampToValueAtTime(
      pitch * 1.3,
      audio.currentTime + delay + duration,
    );
    gain.gain.setValueAtTime(0.0001, audio.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.045, audio.currentTime + delay + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + delay + duration);
    oscillator.connect(gain);
    gain.connect(audio.destination);
    oscillator.start(audio.currentTime + delay);
    oscillator.stop(audio.currentTime + delay + duration + 0.02);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
    };
  };
  playNote(frequency, 0);
  if (kind === 'success') {
    playNote(830, 0.13);
    playNote(990, 0.26);
  }
}

function updateSoundButton() {
  soundToggle.innerHTML = `
    ♪
    <span>${save.muted ? 'off' : 'on'}</span>
  `;
  soundToggle.setAttribute('aria-label', save.muted ? 'Activar sonido' : 'Silenciar sonido');
  soundToggle.setAttribute('aria-pressed', String(!save.muted));
}

soundToggle.onclick = () => {
  if (save.muted) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) {
      toast('Este navegador prefiere el silencio. Todos los juegos siguen funcionando.');
      return;
    }
    try {
      audio ||= new AudioContext();
    } catch {
      toast('No se pudo activar el sonido. Puedes seguir jugando en silencio.');
      return;
    }
  }
  save.muted = !save.muted;
  updateSoundButton();
  persist();
  sound('pop');
};

function toast(message) {
  const element = document.querySelector('#toast');
  clearTimeout(toastTimer);
  element.textContent = message;
  element.classList.add('visible');
  toastTimer = setTimeout(() => element.classList.remove('visible'), 3300);
}

function showModal(content, actions) {
  window.dispatchEvent(new Event('arcade-pause'));
  document.querySelector('#modal-content').innerHTML = content;
  const footer = document.createElement('div');
  footer.className = 'modal-actions';
  if (actions) actions(footer);
  else {
    const button = document.createElement('button');
    button.className = 'primary';
    button.textContent = 'Volver al juego';
    button.onclick = () => modal.close();
    footer.append(button);
  }
  document.querySelector('#modal-content').append(footer);
  modal.showModal();
}

modal.addEventListener('click', (event) => {
  if (event.target !== modal) return;
  const bounds = modal.getBoundingClientRect();
  if (
    event.clientX < bounds.left ||
    event.clientX > bounds.right ||
    event.clientY < bounds.top ||
    event.clientY > bounds.bottom
  )
    modal.close();
});

function burst() {
  if (reducedMotion.matches) return;
  const container = document.querySelector('#particles');
  for (let i = 0; i < 28; i++) {
    const particle = document.createElement('i');
    particle.className = 'particle';
    particle.style.cssText = `left:${50 + (Math.random() - 0.5) * 12}%;top:44%;--color:${['#d1b9f0', '#f4b9ca', '#f7cf68', '#9fceb0'][i % 4]};--dx:${(Math.random() - 0.5) * 460}px;--dy:${(Math.random() - 0.35) * 480}px;--rot:${Math.random() * 600}deg`;
    container.append(particle);
    setTimeout(() => particle.remove(), 1000);
  }
}

function setCaption(text, playing = false) {
  document.querySelector('#window-caption').textContent = text;
  document.querySelector('#map-toggle').hidden = !playing;
  document.querySelector('#home-footer').hidden = playing;
}

function focusHeading() {
  const heading = screen.querySelector('h1');
  if (heading) {
    heading.tabIndex = -1;
    heading.focus({ preventScroll: true });
  }
}

function bonusButton() {
  return `
    <button
      class="bonus-button ${save.bonusUnlocked ? 'unlocked' : ''}"
      ${
        save.bonusUnlocked
          ? 'data-bonus'
          : 'disabled aria-label="Bonus bloqueado. Consigue las veinte estrellas."'
      }
    >
      ${save.bonusUnlocked ? '✨ BONUS UNLOCKED ✨' : '🔒 BONUS'}
    </button>
  `;
}

function progressStrip() {
  return `
    <div class="progress-strip" aria-label="${save.stars} de ${TOTAL} etapas completadas">
      ${save.campaign
        .map(
          (stage, i) =>
            `<span class="progress-step ${i < save.stars ? 'done' : i === save.currentStage ? 'current' : ''}" title="Etapa ${i + 1}: ${i < save.stars ? 'completada' : i === save.currentStage ? 'actual' : 'bloqueada'}" ${i === save.currentStage ? 'aria-current="step"' : ''}>${i < save.stars ? '★' : i + 1}</span>`,
        )
        .join('')}${bonusButton()}
    </div>
  `;
}

function wireBonus() {
  screen.querySelectorAll('[data-bonus]').forEach((button) => (button.onclick = showBonus));
}

function home() {
  cleanup();
  setCaption('bienvenida.exe');
  screen.innerHTML = `
    <div class="home">
      <div class="orbit" aria-hidden="true"></div>
      <span class="eyebrow">✦ una colección de pequeños retos ✦</span>
      <h1 class="home-title">
        <span>PUZZLE</span>
        <span class="arcade-word">ARCADE</span>
      </h1>
      <p class="home-subtitle">Camila, termina esto porque tengo mucho sueño</p>
      ${save.legacyEdition && !save.started ? '<p class="edition-note">Nueva edición: 20 retos. Tu partida anterior de 15 sigue guardada por separado.</p>' : ''}
      <button class="primary play-button" id="play">
        <span class="play-triangle" aria-hidden="true">▶</span>
        ${save.bonusUnlocked ? 'BONUS' : save.started ? 'CONTINUAR' : 'PLAY'}
      </button>
      <p class="home-caption">
        ${
          save.started
            ? `${save.stars} de ${TOTAL} estrellas guardadas. Justo donde lo dejaste.`
            : `${TOTAL} juegos. Más ingenio. La misma adorable tontería.`
        }
      </p>
      <p class="home-note">(mi cerebro ya esta frito)</p>
      <img class="home-sticker sticker-cat" src="assets/cat/cat.svg" alt="" aria-hidden="true" />
      <img class="home-sticker sticker-star" src="assets/ui/star.svg" alt="" aria-hidden="true" />
      <img
        class="home-sticker sticker-bunny"
        src="assets/pacman/bunny.svg"
        alt="Un pequeño conejo de peluche"
      />
      <span class="bunny-caption" aria-hidden="true">yo solo venía a mirar ↗</span>
      <div class="home-sticker sticker-note" aria-hidden="true">
        incluye un
        <br />
        huevo.
        <br />
        no preguntes.
      </div>
      <span class="home-spark spark-1" aria-hidden="true">✳</span>
      <span class="home-spark spark-2" aria-hidden="true">✦</span>
      <span class="home-spark spark-3" aria-hidden="true">⌁</span>
      <div class="home-bottom">
        <span>un poquito de ingenio</span>
        <span aria-hidden="true">·</span>
        <span>cero presión</span>
        ${bonusButton()}
      </div>
    </div>
  `;
  document.querySelector('#play').onclick = () => {
    sound('pop');
    if (save.bonusUnlocked) return showBonus();
    save.started = true;
    persist();
    showStage();
  };
  wireBonus();
}

function showStage() {
  cleanup();
  if (save.currentStage >= TOTAL) return showFinal();
  const index = save.currentStage,
    stage = save.campaign[index],
    info = TYPES[stage.type];
  setCaption(`${stage.type.replace('chemistry', 'mini-lab').replace('cat', 'jardín')}.exe`, true);
  screen.innerHTML = `
    <div class="game-shell ${info.color}" data-game="${stage.type}">
      <div class="game-top">
        <span class="stage-tag">
          <span class="mode-icon" aria-hidden="true">${info.icon}</span>
          ${info.label}
        </span>
        <span class="star-counter" aria-label="${save.stars} de ${TOTAL} estrellas">
          <img src="assets/ui/star.svg" alt="" />
          ${save.stars} / ${TOTAL}
        </span>
      </div>
      <div class="stage-heading">
        <div class="eyebrow">
          ETAPA ${String(index + 1).padStart(2, '0')} / ${TOTAL} ·
          ${
            [
              '',
              'calentando motores',
              'ya le coges el truco',
              'un poquito de ingenio',
              'la recta final',
            ][stage.tier]
          }
        </div>
        <h1>
          ${
            stage.type === 'sudoku' && stage.variant === 1
              ? 'El sudoku tiene temperatura'
              : info.title
          }
        </h1>
      </div>
      <div class="game-area" id="game"></div>
      ${progressStrip()}
    </div>
  `;
  let alive = true;
  const controller = new AbortController(),
    timers = new Set(),
    intervals = new Set(),
    frames = new Set();
   
  cleanup = () => {
    alive = false;
    controller.abort();
    timers.forEach(clearTimeout);
    intervals.forEach(clearInterval);
    frames.forEach(cancelAnimationFrame);
    cleanup = () => {};
  };
  const state = (save.stageData[stage.id] ||= {});
  const ctx = {
    root: document.querySelector('#game'),
    stage,
    state,
    active: () => alive,
    suspended: () => document.hidden || modal.open,
    patch: (changes) => {
      if (alive) {
        Object.assign(state, changes);
        persist();
      }
    },
    listen: (target, event, handler) =>
      target.addEventListener(event, handler, { signal: controller.signal }),
    later: (handler, delay) => {
      const id = setTimeout(() => {
        timers.delete(id);
        if (alive) handler();
      }, delay);
      timers.add(id);
      return id;
    },
    every: (handler, delay) => {
      const id = setInterval(() => {
        if (alive) handler();
      }, delay);
      intervals.add(id);
      return id;
    },
    frame: (handler) => {
      const id = requestAnimationFrame((time) => {
        frames.delete(id);
        if (alive) handler(time);
      });
      frames.add(id);
      return id;
    },
    win: (message) => {
      if (alive && !save.completed.includes(stage.id)) completeStage(stage, message);
    },
    sound,
    modal: showModal,
    bestReaction: () => save.bestReaction,
    setBestReaction: (value) => {
      if (!save.bestReaction || value < save.bestReaction) {
        save.bestReaction = value;
        persist();
      }
    },
  };
  switch (stage.type) {
    case 'sequence':
    case 'circle':
    case 'equation':
    case 'mystery':
    case 'grid':
      numberPuzzle(ctx);
      break;
    case 'chemistry':
      chemistry(ctx);
      break;
    case 'memory':
      memory(ctx);
      break;
    case 'cat':
      rabbit(ctx);
      break;
    case 'reaction':
      reaction(ctx);
      break;
    case 'visual':
      visual(ctx);
      break;
    case 'logic':
      logic(ctx);
      break;
    case 'sudoku':
      sudoku(ctx);
      break;
    case 'egg':
      egg(ctx);
      break;
    case 'switches':
      switches(ctx);
      break;
    case 'pacman':
      pacman(ctx);
      break;
    case 'trivia':
      trivia(ctx);
      break;
  }
  wireBonus();
  focusHeading();
  window.scrollTo({ top: 0, behavior: reducedMotion.matches ? 'instant' : 'smooth' });
}

function completeStage(stage, message) {
  cleanup();
  save.completed.push(stage.id);
  save.stars = save.completed.length;
  save.currentStage = save.stars;
  save.bonusUnlocked = save.stars === TOTAL;
  delete save.stageData[stage.id];
  persist();
  sound('success');
  burst();
  setCaption('pequeña-victoria.exe', true);
  screen.innerHTML = `
    <div class="game-shell ${TYPES[stage.type].color}">
      <div class="game-top">
        <span class="stage-tag">UN RETO MENOS, UN BRILLITO MÁS</span>
        <span class="star-counter">
          <img src="assets/ui/star.svg" alt="Estrellas" />
          ${save.stars} / ${TOTAL}
        </span>
      </div>
      <div class="success-screen">
        <img class="success-star" src="assets/ui/star.svg" alt="Una estrella ganada" />
        <h1>
          ${
            save.bonusUnlocked
              ? 'Veinte de veinte.'
              : ['¡Eso era!', 'Un pequeño «ajá».', 'Estrellita para ti.', 'Muy bien, cerebro.'][
                  save.stars % 4
                ]
          }
        </h1>
        <p>${message}</p>
        <span class="success-count">
          ${
            save.bonusUnlocked
              ? '✨ BONUS UNLOCKED ✨'
              : `${TOTAL - save.stars} pequeños retos por descubrir`
          }
        </span>
        <button class="primary next-stage">
          ${save.bonusUnlocked ? 'Abrir el BONUS →' : 'Siguiente juego →'}
        </button>
      </div>
      ${progressStrip()}
    </div>
  `;
  screen.querySelector('.next-stage').onclick = save.bonusUnlocked ? showBonus : showStage;
  wireBonus();
  focusHeading();
}

function showFinal() {
  cleanup();
  setCaption('colección-completa.exe', true);
  screen.innerHTML = `
    <div class="game-shell yellow">
      <div class="success-screen">
        <img class="success-star" src="assets/ui/star.svg" alt="" />
        <h1>Veinte de veinte.</h1>
        <p>Colección completa. Tu recompensa es… bastante peculiar.</p>
        <span class="success-count">✨ BONUS UNLOCKED ✨</span>
        <button class="primary" data-bonus>Abrir el BONUS →</button>
      </div>
      ${progressStrip()}
    </div>
  `;
  wireBonus();
  focusHeading();
}

function showBonus() {
  if (!save.bonusUnlocked) return;
  cleanup();
  save.bonusVisited = true;
  persist();
  setCaption('mucho-sueño.exe');
  const objects = [
    '🐔',
    '🐑',
    '🐈',
    '🐸',
    '🐟',
    '⭐',
    '🌙',
    '🥚',
    '💤',
    '🎈',
    '🍓',
    '🍄',
    '🦆',
    '🧦',
    '🍪',
    '🪴',
  ];
  screen.innerHTML = `
    <div class="bonus-room">
      <div class="bonus-message">
        <img src="assets/bonus/moon.svg" alt="Luna dormilona" />
        <h1>Tengo mucho sueño xD</h1>
        <p>Camila, tengo mucho sueño</p>
      </div>
      <button class="text-button bonus-home">Volver al inicio ↗</button>
    </div>
  `;
  const room = screen.querySelector('.bonus-room');
  const bonusItems = shuffle([...objects, ...objects, ...objects]);
  for (let i = 0; i < bonusItems.length; i++) {
    const object = document.createElement('span');
    object.className = 'bonus-object';
    object.setAttribute('aria-hidden', 'true');
    object.textContent = bonusItems[i];
    const column = i % 8,
      row = Math.floor(i / 8);
    object.style.cssText = `left:${column * 12.5 + Math.random() * 7}%;top:${row * 16.5 + Math.random() * 9}%;--size:${26 + Math.random() * 29}px;--speed:${2 + Math.random() * 4}s;--delay:${-Math.random() * 6}s;--tilt:${(Math.random() - 0.5) * 50}deg`;
    object.onclick = () => {
      object.classList.remove('popped');
      void object.offsetWidth;
      object.classList.add('popped');
      sound('tick');
    };
    object.addEventListener('animationend', () => object.classList.remove('popped'));
    room.append(object);
  }
  screen.querySelector('.bonus-home').onclick = home;
  focusHeading();
}

document.querySelector('#map-toggle').onclick = () =>
  showModal(
    `<h2>Tu pequeño recorrido</h2><p>${save.stars} / ${TOTAL} estrellas. Un juego cada vez. El orden se guarda hasta que reinicies.</p><ol class="map-list">${save.campaign.map((stage, i) => `<li class="${i < save.stars ? 'done' : i === save.currentStage ? 'current' : 'locked'}"><span class="map-number">${i < save.stars ? '★' : String(i + 1).padStart(2, '0')}</span><span>${TYPES[stage.type].label}${stage.type === 'chemistry' ? ` · ${['fichas', 'parejas', 'protones', 'archivo'][stage.variant]}` : stage.type === 'sudoku' && stage.variant === 1 ? ' termómetro' : ''}${i > save.currentStage ? ' · bloqueado' : ''}</span></li>`).join('')}</ol>`,
  );

document.querySelector('#reset').onclick = () =>
  showModal(
    '<h2>¿Empezamos de cero?</h2><p>Se borrarán las estrellas, los juegos guardados y tu récord de reflejos. Habrá un nuevo orden de 20 retos. Esta acción no se puede deshacer.</p>',
    (footer) => {
      const cancel = document.createElement('button');
      cancel.className = 'secondary';
      cancel.textContent = 'Mejor no';
      cancel.onclick = () => modal.close();
      const confirm = document.createElement('button');
      confirm.className = 'primary danger';
      confirm.textContent = 'Sí, reiniciar';
      confirm.onclick = () => {
        modal.close();
        cleanup();
        const muted = save.muted;
        save = freshSave();
        save.muted = muted;
        persist();
        home();
        focusHeading();
        toast('Un nuevo puñado de pequeños retos.');
      };
      footer.append(cancel, confirm);
    },
  );

document.querySelector('.wordmark').onclick = (event) => {
  event.preventDefault();
  home();
  focusHeading();
};
window.addEventListener('pagehide', persist);
window.addEventListener('storage', (event) => {
  if (event.key !== STORAGE_KEY) return;
  const updated = restoreSave(event.newValue);
  if (!updated) return;
  cleanup();
  save = updated;
  updateSoundButton();
  home();
  toast('El progreso cambió en otra pestaña. Continuamos desde lo guardado.');
});

updateSoundButton();
persist();
if (save.started) showStage();
else home();
