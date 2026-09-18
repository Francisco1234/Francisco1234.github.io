import { ELEMENTS } from './core.js';
import {
  numberQuestion,
  chemistryQuestion,
  normalizeAnswer,
  cookiePuzzle,
  cookieValid,
  visualQuestion,
  memoryPuzzle,
  nextMemoryAttempt,
  MEMORY_SYMBOLS,
  SEGMENTS,
  LIGHT_MASKS,
  lightPuzzle,
  ROUND_COUNTS,
} from './puzzles.js';

function feedback(root, message, good = false) {
  const output = root.querySelector('.feedback');
  if (!output) return;
  output.textContent = message;
  output.className = `feedback ${good ? 'good' : 'bad'}`;
  if (!good) {
    void output.offsetWidth;
    output.classList.add('shake');
  }
}

function anotherRound(ctx, explanation, next) {
  ctx.root.innerHTML = `
    <div class="round-cleared">
      <img src="assets/ui/star.svg" alt="" />
      <h2>Una pieza más.</h2>
      <p>${explanation}</p>
      <button class="primary round-next">Otra vuelta →</button>
    </div>
  `;
  ctx.root.querySelector('button').onclick = next;
  ctx.root.querySelector('button').focus();
}

function digitalNumber(number) {
  return `
    <span class="digital-number" role="img" aria-label="${number}">
      ${[...String(number)]
        .map(
          (n) =>
            `<span class="digital-digit" aria-hidden="true">${[...'abcdefg'].map((segment) => `<i class="segment ${segment} ${SEGMENTS[Number(n)].includes(segment) ? 'lit' : ''}"></i>`).join('')}</span>`,
        )
        .join('')}
    </span>
  `;
}

export function numberPuzzle(ctx) {
  const { root, stage } = ctx;
  let round = ctx.state.round || 0,
    attempt = ctx.state.attempt || 0;
  function paint(message = '') {
    const question = numberQuestion(stage.type, stage.seed, round, attempt);
    let board = '';
    if (stage.type === 'sequence')
      board = `<div class="sequence-row">${question.values.map((n) => `<span class="number-tile ${typeof n === 'string' ? 'missing' : ''}">${n}</span>`).join('')}</div>`;
    if (stage.type === 'circle')
      board = `<div class="circle-board"><span class="circle-center" aria-hidden="true">↻</span>${question.values.map((n, i) => `<span class="number-tile ${typeof n === 'string' ? 'missing' : ''}" style="--x:${Math.sin((i * Math.PI) / 4) * 108}px;--y:${-Math.cos((i * Math.PI) / 4) * 108}px">${n}</span>`).join('')}</div>`;
    if (stage.type === 'equation')
      board = `<div class="equation-display">${question.equations.map((line) => `<div>${line}</div>`).join('')}</div>`;
    if (stage.type === 'mystery')
      board = `<div class="machine">${question.pairs.map(([input, output]) => `<div class="machine-row">${question.digital ? digitalNumber(input) : `<span>${input}</span>`}<span aria-label="se transforma en">→</span><span>${output}</span></div>`).join('')}</div>`;
    if (stage.type === 'grid')
      board = `<div class="number-grid" style="grid-template-columns:repeat(${question.columns},minmax(0,1fr))">${question.values.map((n) => `<span class="number-tile ${typeof n === 'string' ? 'missing' : ''}">${n}</span>`).join('')}</div>`;
    root.innerHTML = `
      <div class="round-label">RETO ${round + 1} / ${ROUND_COUNTS[stage.type]}</div>
      <p class="game-instruction">${question.note}</p>
      ${board}
      <form class="answer-form multi-answer">
        ${question.answers
          .map(
            (answer, i) =>
              `<label>${question.labels[i]}<input name="answer-${i}" type="text" inputmode="${answer < 0 ? 'text' : 'numeric'}" autocomplete="off" maxlength="6" required aria-label="Valor de ${question.labels[i]}"></label>`,
          )
          .join('')}
        <button class="primary" type="submit">Enviar solución ↵</button>
      </form>
      <p class="attempt-note">
        Una solución incorrecta cambia el reto. Las rondas ya resueltas se conservan.
      </p>
      <p class="feedback" role="status">${message}</p>
    `;
    root.querySelector('form').onsubmit = (event) => {
      event.preventDefault();
      const values = [...root.querySelectorAll('input')].map((input) =>
        input.value.trim().replace('−', '-'),
      );
      if (values.some((value) => !/^-?\d+$/.test(value))) {
        feedback(root, 'Escribe un número entero en cada casilla.');
        return;
      }
      if (!values.every((value, i) => Number(value) === question.answers[i])) {
        const previous = JSON.stringify(question);
        do {
          attempt++;
        } while (
          JSON.stringify(numberQuestion(stage.type, stage.seed, round, attempt)) === previous
        );
        ctx.patch({ attempt });
        ctx.sound('wrong');
        paint(
          'No encajaba. Ha llegado un reto nuevo; piensa la solución completa antes de enviarla.',
        );
        return;
      }
      ctx.sound('pop');
      round++;
      if (round === ROUND_COUNTS[stage.type]) return ctx.win(question.rule);
      ctx.patch({ round, attempt });
      anotherRound(ctx, question.rule, () => paint());
    };
  }
  paint();
}

export function chemistry(ctx) {
  const { root, stage } = ctx;
  let round = ctx.state.round || 0,
    attempt = ctx.state.attempt || 0;
  const rounds = stage.variant === 3 ? 1 : 2;
  function paint(message = '') {
    const question = chemistryQuestion(stage.variant, stage.seed, round, attempt);
    let assignments = ctx.state.assignments || {},
      selected = null,
      ordered = ctx.state.ordered || [];
    const fail = () => {
      const previous = JSON.stringify(question);
      do {
        attempt++;
      } while (
        JSON.stringify(chemistryQuestion(stage.variant, stage.seed, round, attempt)) === previous
      );
      ctx.patch({ attempt, assignments: {}, ordered: [], entries: [] });
      ctx.sound('wrong');
      paint('Ese lote no cuadraba. Mesa nueva: no se conserva la respuesta anterior.');
    };
    const pass = () => {
      ctx.sound('pop');
      round++;
      if (round === rounds)
        return ctx.win('Fichas, protones y símbolos. El laboratorio queda en orden.');
      ctx.patch({ round, assignments: {}, ordered: [], entries: [] });
      anotherRound(ctx, 'Lote comprobado. El siguiente trae otras fichas.', () => paint());
    };
    let content = '';
    if (question.kind === 'files' || question.kind === 'deduction') {
      const fields =
        question.kind === 'files'
          ? question.fields
          : question.targets.map((index, i) => ({
              label: `Símbolo de ${String.fromCharCode(65 + i)}`,
              answer: ELEMENTS[index][0],
            }));
      content = `${question.clues ? `<ul class="clue-list">${question.clues.map((clue) => `<li>${clue}</li>`).join('')}</ul>` : ''}<form class="chem-files">${fields.map((field, i) => `<label class="chem-file">${field.label}<input data-entry="${i}" autocomplete="off" maxlength="24" required></label>`).join('')}<button class="primary" type="submit">Comprobar lote</button></form>`;
      root.innerHTML = `
        <div class="round-label">
          ${question.kind === 'files' ? 'FICHAS EXTRAVIADAS' : 'DETECTIVE DE PROTONES'} ·
          ${round + 1} / ${rounds}
        </div>
        <p class="game-instruction">
          ${
            question.kind === 'files'
              ? 'Reconstruye las cinco fichas. Símbolos, nombres y números atómicos se han mezclado.'
              : 'Identifica A, B, C y D. Z es el número de protones. Escribe sus símbolos.'
          }
          <br />
          Solo los primeros 15 elementos. Sin tabla de respuestas.
        </p>
        ${content}
        <p class="feedback" role="status">${message}</p>
      `;
      root.querySelectorAll('input').forEach((input, i) => {
        input.value = ctx.state.entries?.[i] || '';
        input.oninput = () =>
          ctx.patch({ entries: [...root.querySelectorAll('input')].map((field) => field.value) });
      });
      root.querySelector('form').onsubmit = (event) => {
        event.preventDefault();
        const correct = [...root.querySelectorAll('input')].every(
          (input, i) => normalizeAnswer(input.value) === normalizeAnswer(fields[i].answer),
        );
        correct ? pass() : fail();
      };
    } else if (question.kind === 'match') {
      root.innerHTML = `
        <div class="round-label">PAREJAS SOSPECHOSAS · ${round + 1} / ${rounds}</div>
        <p class="game-instruction">
          Toca un símbolo y luego su nombre. Completa las siete parejas antes de comprobar.
          <br />
          Para cambiar una pareja, vuelve a tocar su símbolo.
        </p>
        <div class="matching-board">
          <div class="match-symbols"></div>
          <div class="match-names"></div>
        </div>
        <div class="game-center">
          <button class="primary check-matches">Sellar las siete parejas</button>
        </div>
        <p class="feedback" role="status">${message}</p>
      `;
      function renderMatches() {
        root.querySelector('.match-symbols').innerHTML = question.targets
          .map(
            (index) =>
              `<button class="match-card ${selected === index ? 'selected' : ''}" data-symbol="${index}"><strong>${ELEMENTS[index][0]}</strong><span>${assignments[index] !== undefined ? ELEMENTS[assignments[index]][1] : '¿quién soy?'}</span></button>`,
          )
          .join('');
        root.querySelector('.match-names').innerHTML = question.names
          .map(
            (index) =>
              `<button class="match-card" data-name="${index}" ${Object.values(assignments).includes(index) ? 'disabled' : ''}>${ELEMENTS[index][1]}</button>`,
          )
          .join('');
        root.querySelectorAll('[data-symbol]').forEach(
          (button) =>
            (button.onclick = () => {
              selected = Number(button.dataset.symbol);
              delete assignments[selected];
              ctx.patch({ assignments });
              renderMatches();
            }),
        );
        root.querySelectorAll('[data-name]').forEach(
          (button) =>
            (button.onclick = () => {
              if (selected === null) {
                feedback(root, 'Selecciona primero una ficha de la izquierda.');
                return;
              }
              assignments[selected] = Number(button.dataset.name);
              selected = null;
              ctx.patch({ assignments });
              ctx.sound('tick');
              renderMatches();
            }),
        );
      }
      root.querySelector('.check-matches').onclick = () => {
        if (Object.keys(assignments).length < question.targets.length) {
          feedback(root, 'Todavía faltan parejas.');
          return;
        }
        question.targets.every((index) => assignments[index] === index) ? pass() : fail();
      };
      renderMatches();
    } else {
      root.innerHTML = `
        <div class="round-label">ARCHIVO ATÓMICO</div>
        <p class="game-instruction">
          Ordena las diez fichas de menor a mayor número atómico.
          <br />
          Algunas usan nombres, otras símbolos y otras describen a un vecino.
        </p>
        <div class="order-slots chem-order"></div>
        <div class="order-choices"></div>
        <div class="game-center">
          <button class="primary check-order">Cerrar el archivo</button>
        </div>
        <p class="feedback" role="status">${message}</p>
      `;
      function renderOrder() {
        root.querySelector('.order-slots').innerHTML = question.targets
          .map(
            (_, i) =>
              `<button class="order-slot ${ordered[i] !== undefined ? 'filled' : ''}" data-slot="${i}" aria-label="Posición ${i + 1}, deshacer desde aquí">${ordered[i] === undefined ? i + 1 : question.cards.find((card) => card.index === ordered[i]).text}</button>`,
          )
          .join('');
        root.querySelector('.order-choices').innerHTML = question.cards
          .map(
            (card) =>
              `<button class="choice" data-card="${card.index}" ${ordered.includes(card.index) ? 'disabled' : ''}>${card.text}</button>`,
          )
          .join('');
        root.querySelectorAll('[data-card]').forEach(
          (button) =>
            (button.onclick = () => {
              ordered.push(Number(button.dataset.card));
              ctx.patch({ ordered });
              ctx.sound('tick');
              renderOrder();
            }),
        );
        root.querySelectorAll('[data-slot]').forEach(
          (button) =>
            (button.onclick = () => {
              ordered = ordered.slice(0, Number(button.dataset.slot));
              ctx.patch({ ordered });
              renderOrder();
            }),
        );
      }
      root.querySelector('.check-order').onclick = () => {
        if (ordered.length < question.targets.length) {
          feedback(root, 'El archivo todavía tiene huecos.');
          return;
        }
        ordered.every((index, i) => index === question.targets[i]) ? pass() : fail();
      };
      renderOrder();
    }
  }
  paint();
}

export function memory(ctx) {
  const { root, stage } = ctx;
  let round = ctx.state.round || 0,
    attempt = ctx.state.attempt || 0,
    phase = ctx.state.phase || 'intro';
  let entered = ctx.state.entered || [],
    timer;
  const instructions = [
    'Seis fichas: recuérdalas en el mismo orden.',
    'Cinco fichas: tendrás que repetirlas de derecha a izquierda.',
    'Recuerda dónde están las cinco pegatinas. Después toca sus casillas en el orden indicado.',
  ];
  function save() {
    ctx.patch({ round, attempt, phase, entered });
  }
  function intro(message = '') {
    phase = 'intro';
    entered = [];
    save();
    const puzzle = memoryPuzzle(stage.seed, round, attempt);
    root.innerHTML = `
      <div class="round-label">MEMORIA ${round + 1} / 3</div>
      <p class="game-instruction">
        ${instructions[round]}
        <br />
        Tienes ${puzzle.seconds} segundos para mirar. Un fallo trae una combinación nueva.
      </p>
      <div class="memory-display"><span style="font-size:42px" aria-hidden="true">◉ ◡ ◉</span></div>
      <div class="game-center">
        <button class="primary reveal-memory">Hacer foto mental →</button>
      </div>
      <p class="feedback" role="status">${message}</p>
    `;
    root.querySelector('button').onclick = reveal;
  }
  function reveal() {
    const puzzle = memoryPuzzle(stage.seed, round, attempt);
    phase = 'show';
    entered = [];
    save();
    root.innerHTML = `
      <p class="game-instruction">${instructions[round]}</p>
      ${
        round === 2
          ? `<div class="memory-map">${Array.from({ length: 9 }, (_, i) => `<span>${puzzle.positions.includes(i) ? puzzle.sequence[puzzle.positions.indexOf(i)] : '·'}</span>`).join('')}</div>`
          : `<div class="memory-display">${puzzle.sequence.map((symbol) => `<span class="number-tile">${symbol}</span>`).join('')}</div>`
      }
      <div class="memory-timer" aria-hidden="true">
        <span style="--duration:${puzzle.seconds}s"></span>
      </div>
    `;
    timer = ctx.later(() => {
      phase = 'recall';
      save();
      recall();
    }, puzzle.seconds * 1000);
  }
  function recall(message = '') {
    const puzzle = memoryPuzzle(stage.seed, round, attempt);
    root.innerHTML = `
      <div class="round-label">MEMORIA ${round + 1} / 3</div>
      <p class="game-instruction">
        ${
          round === 2
            ? `Toca dónde estaban, en este orden: ${puzzle.sequence.join(' ')}`
            : round === 1
              ? 'Ahora, de derecha a izquierda.'
              : 'Ahora, en el mismo orden.'
        }
      </p>
      <div class="memory-display">
        ${puzzle.answer
          .map(
            (_, i) =>
              `<span class="number-tile ${entered[i] === undefined ? 'missing' : ''}">${entered[i] === undefined ? '·' : round === 2 ? Number(entered[i]) + 1 : entered[i]}</span>`,
          )
          .join('')}
      </div>
      ${
        round === 2
          ? `<div class="memory-map">${Array.from({ length: 9 }, (_, i) => `<button class="small-button" data-memory="${i}" ${entered.includes(i) ? 'disabled' : ''}>${i + 1}</button>`).join('')}</div>`
          : `<div class="memory-keys">${MEMORY_SYMBOLS.map((symbol, i) => `<button class="small-button" data-memory="${i}">${symbol}</button>`).join('')}</div>`
      }
      <div class="game-actions">
        <button class="small-button undo-memory">← Borrar último</button>
        <button class="primary check-memory">Confirmar recuerdo</button>
      </div>
      <p class="feedback" role="status">${message}</p>
    `;
    root.querySelectorAll('[data-memory]').forEach(
      (button) =>
        (button.onclick = () => {
          if (entered.length >= puzzle.answer.length) return;
          entered.push(
            round === 2
              ? Number(button.dataset.memory)
              : MEMORY_SYMBOLS[Number(button.dataset.memory)],
          );
          save();
          ctx.sound('tick');
          recall();
        }),
    );
    root.querySelector('.undo-memory').onclick = () => {
      entered.pop();
      save();
      recall();
    };
    root.querySelector('.check-memory').onclick = () => {
      if (entered.length !== puzzle.answer.length) {
        feedback(root, 'Faltan fichas en tu recuerdo.');
        return;
      }
      if (!entered.every((value, i) => value === puzzle.answer[i])) {
        attempt = nextMemoryAttempt(stage.seed, round, attempt);
        intro('Se mezclaron los recuerdos. La nueva foto será distinta.');
        ctx.sound('wrong');
        return;
      }
      round++;
      entered = [];
      phase = 'intro';
      save();
      if (round === 3) return ctx.win('Orden, reverso y posiciones. Tu memoria vino a trabajar.');
      anotherRound(ctx, 'Foto guardada en el cerebro. Ahora cambia la regla.', () => intro());
    };
  }
  function pauseReveal() {
    if (phase === 'show') {
      clearTimeout(timer);
      attempt = nextMemoryAttempt(stage.seed, round, attempt);
      intro('Foto interrumpida. La siguiente empieza cuando tú quieras.');
    }
  }
  ctx.listen(document, 'visibilitychange', () => {
    if (document.hidden) pauseReveal();
  });
  ctx.listen(window, 'arcade-pause', pauseReveal);
  if (round >= 3) ctx.win('Tres recuerdos, tres reglas.');
  else if (phase === 'recall') recall();
  else {
    if (phase === 'show') attempt = nextMemoryAttempt(stage.seed, round, attempt);
    intro();
  }
}

export const REACTION_MINIMUM = 100;
export const REACTION_EXCELLENT = 150;
export function reactionPassed(trials, threshold) {
  return trials.length === 5 && [...trials].sort((a, b) => a - b)[2] <= threshold;
}
export function reaction(ctx) {
  const { root } = ctx;
  const threshold = matchMedia('(pointer: coarse)').matches ? 290 : 260;
  let trials = ctx.state.trials || [],
    phase = 'idle',
    started = 0,
    timer;
  root.innerHTML = `
    <p class="game-instruction">
      <strong>Cinco intentos. Mediana de ${threshold} ms o menos.</strong>
      <br />
      150 ms o menos es excelente, no obligatorio. Anticiparte consume un intento de 1000 ms.
    </p>
    <div class="reaction-trials"></div>
    <button class="reaction-pad" aria-live="polite">
      <strong>¿LISTA?</strong>
      <span>Toca para empezar · también vale Espacio</span>
    </button>
    <p class="reaction-best"></p>
    <p class="feedback" role="status"></p>
  `;
  const pad = root.querySelector('.reaction-pad');
  function hud() {
    root.querySelector('.reaction-trials').textContent =
      `Serie: ${trials.map((n) => (n === 1000 ? 'antes de tiempo' : n + ' ms')).join(' · ') || '0 / 5'}`;
    root.querySelector('.reaction-best').textContent = ctx.bestReaction()
      ? `MEJOR REFLEJO VÁLIDO: ${ctx.bestReaction()} ms`
      : 'MEJOR REFLEJO: todavía es un misterio';
  }
  function finishTrial(elapsed, early = false) {
    phase = 'result';
    trials.push(early ? 1000 : elapsed);
    ctx.patch({ trials });
    if (!early) ctx.setBestReaction(elapsed);
    hud();
    pad.className = 'reaction-pad result';
    pad.innerHTML = `
      <strong>${early ? '¡ANTES NO!' : `${elapsed} ms`}</strong>
      <span>
        ${
          early
            ? 'Esta salida cuenta como 1000 ms.'
            : elapsed <= REACTION_EXCELLENT
              ? '¡Excelente! Ahora hace falta constancia.'
              : elapsed <= threshold
                ? 'Dentro del objetivo.'
                : 'Too slow :( · La serie todavía puede recuperarse.'
        }
        Toca para seguir.
      </span>
    `;
    if (trials.length === 5) {
      const median = [...trials].sort((a, b) => a - b)[2];
      if (reactionPassed(trials, threshold)) {
        phase = 'won';
        ctx.patch({ won: true, median });
        ctx.later(
          () => ctx.win(`Mediana de ${median} ms en cinco intentos. Eso es constancia.`),
          850,
        );
      } else {
        feedback(
          root,
          `Mediana: ${median} ms. Objetivo: ${threshold}. La siguiente pulsación empieza otra serie.`,
        );
      }
    }
  }
  function press() {
    if (ctx.suspended() || phase === 'won') return;
    if (phase === 'idle' || phase === 'result') {
      if (trials.length >= 5) {
        trials = [];
        ctx.patch({ trials });
        hud();
      }
      phase = 'waiting';
      pad.className = 'reaction-pad waiting';
      pad.innerHTML = '<strong>WAIT…</strong><span>Solo cuenta la señal verde con CLICK.</span>';
      timer = ctx.later(
        () =>
          ctx.frame(() => {
            if (phase !== 'waiting') return;
            if (ctx.suspended()) return cancel();
            pad.className = 'reaction-pad ready';
            pad.innerHTML = '<strong>CLICK!</strong><span>¡Ahora!</span>';
            started = performance.now();
            phase = 'ready';
          }),
        1500 + Math.random() * 3100,
      );
    } else if (phase === 'waiting') {
      clearTimeout(timer);
      finishTrial(1000, true);
    } else if (phase === 'ready') {
      const elapsed = Math.round(performance.now() - started);
      finishTrial(elapsed, elapsed < REACTION_MINIMUM);
    }
  }
  function cancel() {
    if (phase !== 'waiting' && phase !== 'ready') return;
    clearTimeout(timer);
    phase = 'idle';
    pad.className = 'reaction-pad';
    pad.innerHTML = '<strong>PAUSA</strong><span>La serie se conserva. Toca para continuar.</span>';
  }
  ctx.listen(pad, 'pointerdown', (event) => {
    if (event.button === 0) {
      event.preventDefault();
      pad.focus();
      press();
    }
  });
  ctx.listen(pad, 'keydown', (event) => {
    if ([' ', 'Enter'].includes(event.key)) {
      event.preventDefault();
      if (!event.repeat) press();
    }
  });
  ctx.listen(pad, 'click', (event) => {
    if (event.detail === 0 && !event.pointerType) press();
  });
  ctx.listen(document, 'visibilitychange', () => {
    if (document.hidden) cancel();
  });
  ctx.listen(window, 'blur', cancel);
  ctx.listen(window, 'arcade-pause', cancel);
  hud();
  if (ctx.state.won) {
    phase = 'won';
    ctx.later(
      () => ctx.win(`Mediana de ${ctx.state.median} ms. El reflejo se había guardado.`),
      300,
    );
  }
}

function maskTile(mask) {
  return `
    <span
      class="mask-tile"
      role="img"
      aria-label="${
        mask === null
          ? 'Ficha que falta'
          : `Cuadros llenos: ${
              [0, 1, 2, 3]
                .filter((i) => mask & (1 << i))
                .map((i) => i + 1)
                .join(', ') || 'ninguno'
            }`
      }"
    >
      ${
        mask === null
          ? '<b>?</b>'
          : [0, 1, 2, 3]
              .map((i) => `<i class="${mask & (1 << i) ? 'filled' : ''}" aria-hidden="true"></i>`)
              .join('')
      }
    </span>
  `;
}
export function visual(ctx) {
  const { root, stage } = ctx;
  let round = ctx.state.round || 0,
    attempt = ctx.state.attempt || 0;
  function paint(message = '') {
    const question = visualQuestion(stage.seed, round, attempt);
    root.innerHTML = `
      <div class="round-label">OBSERVACIÓN ${round + 1} / 3</div>
      <p class="game-instruction">${question.note}</p>
      <div class="visual-matrix ${question.columns === 6 ? 'strip' : ''}">
        ${question.tiles.map(maskTile).join('')}
      </div>
      <p class="game-instruction">¿Qué ficha completa el dibujo?</p>
      <div class="choice-grid">
        ${question.options
          .map(
            (mask, i) =>
              `<button class="choice" data-pattern="${i}" aria-label="Opción ${i + 1}: cuadros ${
                [0, 1, 2, 3]
                  .filter((n) => mask & (1 << n))
                  .map((n) => n + 1)
                  .join(', ') || 'ninguno'
              }">${maskTile(mask)}</button>`,
          )
          .join('')}
      </div>
      <p class="feedback" role="status">${message}</p>
    `;
    root.querySelectorAll('[data-pattern]').forEach(
      (button) =>
        (button.onclick = () => {
          if (question.options[Number(button.dataset.pattern)] !== question.answer) {
            const previous = JSON.stringify(question.tiles);
            do {
              attempt++;
            } while (JSON.stringify(visualQuestion(stage.seed, round, attempt).tiles) === previous);
            ctx.patch({ attempt });
            ctx.sound('wrong');
            paint('No era esa transformación. Un dibujo distinto ocupa su lugar.');
            return;
          }
          round++;
          ctx.sound('pop');
          if (round === 3) return ctx.win('Giros, superposiciones y espejos. Lo has visto todo.');
          ctx.patch({ round, attempt });
          anotherRound(ctx, question.rule, () => paint());
        }),
    );
  }
  paint();
}

export function logic(ctx) {
  const { root, stage } = ctx;
  let attempt = ctx.state.attempt || 0;
  function paint(message = '') {
    const puzzle = cookiePuzzle(stage.seed, attempt);
    root.innerHTML = `
      <p class="game-instruction">
        Cuatro meriendas, cuatro cantidades y cuatro bebidas distintas.
        <br />
        Cada animal tiene una cantidad y una bebida. Las seis pistas se cumplen a la vez.
      </p>
      <ul class="clue-list">
        ${puzzle.clues.map((clue) => `<li>${clue}</li>`).join('')}
      </ul>
      <form class="cookie-form">
        <div class="logic-cards four">
          ${puzzle.animals
            .map(
              (animal, i) =>
                `<div class="logic-card"><span class="character" aria-hidden="true">${['🐻', '🐸', '🐈', '🦊'][i]}</span><strong>${animal}</strong><label for="cookies-${i}">Galletas</label><select id="cookies-${i}" required><option value="">¿Cuántas?</option>${puzzle.amounts.map((n) => `<option value="${n}">${n} 🍪</option>`).join('')}</select><label for="drink-${i}">Bebida</label><select id="drink-${i}" required><option value="">¿Qué bebe?</option>${puzzle.drinks.map((drink) => `<option>${drink}</option>`).join('')}</select></div>`,
            )
            .join('')}
        </div>
        <div class="game-center">
          <button class="primary check-logic">Servir las cuatro meriendas</button>
        </div>
      </form>
      <p class="feedback" role="status">${message}</p>
    `;
    const selects = [...root.querySelectorAll('select')];
    selects.forEach((select, i) => {
      select.value = ctx.state.choices?.[i] || '';
      select.onchange = () => ctx.patch({ choices: selects.map((field) => field.value) });
    });
    root.querySelector('form').onsubmit = (event) => {
      event.preventDefault();
      const choices = puzzle.animals.map((_, i) => ({
        cookies: Number(root.querySelector(`#cookies-${i}`).value),
        drink: root.querySelector(`#drink-${i}`).value,
      }));
      if (cookieValid(puzzle, choices))
        return ctx.win('Cuatro platos, cuatro bebidas. Ni una queja en la mesa.');
      const previous = JSON.stringify(puzzle);
      do {
        attempt++;
      } while (JSON.stringify(cookiePuzzle(stage.seed, attempt)) === previous);
      ctx.patch({ attempt, choices: [] });
      ctx.sound('wrong');
      paint('Ese reparto rompía una condición. Los animalitos han hecho un pedido nuevo.');
    };
  }
  paint();
}

export function switches(ctx) {
  const { root, stage } = ctx;
  let attempt = ctx.state.attempt || 0,
    puzzle = lightPuzzle(stage.seed, attempt);
  let lights = ctx.state.lights ?? puzzle.lights,
    history = ctx.state.history || [];
  function paint(message = '') {
    root.innerHTML = `
      <p class="game-instruction">
        Apaga las 16 luces en
        <strong>10 pulsaciones</strong>
        .
        <br />
        Cada botón cambia su propia luz y sus vecinas de arriba, abajo, izquierda y derecha. Puedes
        deshacer para planear.
      </p>
      <div class="light-board" role="group" aria-label="Luces de cuatro por cuatro">
        ${Array.from(
          { length: 16 },
          (_, i) =>
            `<button class="light ${lights & (1 << i) ? 'on' : ''}" data-light="${i}" aria-label="Luz ${i + 1}, ${lights & (1 << i) ? 'encendida' : 'apagada'}"><span>${lights & (1 << i) ? '☼' : '·'}</span>${i + 1}</button>`,
        ).join('')}
      </div>
      <p class="cat-caption">${history.length} / 10 pulsaciones · circuito ${attempt + 1}</p>
      <div class="game-actions">
        <button class="small-button undo-light" ${history.length ? '' : 'disabled'}>
          ← Deshacer
        </button>
        <button class="small-button reset-light">Replantear este circuito</button>
      </div>
      <p class="feedback" role="status">${message}</p>
    `;
    root.querySelectorAll('[data-light]').forEach(
      (button) =>
        (button.onclick = () => {
          history.push(lights);
          lights ^= LIGHT_MASKS[Number(button.dataset.light)];
          ctx.sound('tick');
          ctx.patch({ lights, history });
          if (lights === 0)
            return ctx.win('Todo apagado. Hasta las luces reconocen que ya era hora.');
          if (history.length >= 10) {
            const previous = puzzle.lights;
            do {
              attempt++;
              puzzle = lightPuzzle(stage.seed, attempt);
            } while (puzzle.lights === previous);
            lights = puzzle.lights;
            history = [];
            ctx.patch({ lights, history, attempt });
            paint(
              'Diez pulsaciones y aún había luz. Circuito nuevo; conserva la idea, no la secuencia.',
            );
          } else {
            const key = button.dataset.light;
            paint();
            root.querySelector(`[data-light="${key}"]`).focus({ preventScroll: true });
          }
        }),
    );
    root.querySelector('.undo-light').onclick = () => {
      lights = history.pop();
      ctx.patch({ lights, history });
      paint();
    };
    root.querySelector('.reset-light').onclick = () => {
      lights = puzzle.lights;
      history = [];
      ctx.patch({ lights, history });
      paint();
    };
  }
  paint();
}

export function egg(ctx) {
  const { root } = ctx;
  let count = Math.min(250, ctx.state.count || 0),
    hatched = false;
  root.innerHTML = `
    <p class="game-instruction">
      Descanso del cerebro. Haz clic en el huevo exactamente
      <strong>250 veces</strong>
      .
      <br />
      No todo puede ser una deducción brillante.
    </p>
    <div class="egg-wrap">
      <button class="egg-button" aria-label="Tocar el huevo">
        <span class="egg-eyes" aria-hidden="true">··</span>
        <svg class="egg-crack" viewBox="0 0 160 205" aria-hidden="true">
          <path class="crack-1" d="M72 3 64 38 83 53 65 72 79 85" />
          <path class="crack-2" d="m154 101-32 14-13-21-21 30-19-9-15 24-33-13-19 12" />
          <path class="crack-3" d="m108 200-12-35 15-20-22-22M10 73l26 16 12-19 17 2" />
        </svg>
      </button>
      <span class="egg-hat" hidden aria-hidden="true">🎩</span>
    </div>
    <p class="egg-count" aria-live="off"></p>
    <div
      class="egg-progress"
      role="progressbar"
      aria-label="Toques del huevo"
      aria-valuemin="0"
      aria-valuemax="250"
    >
      <span></span>
    </div>
    <p class="egg-message" role="status"></p>
  `;
  const button = root.querySelector('.egg-button');
  function paint() {
    root.querySelector('.egg-count').textContent = `${count} / 250`;
    root.querySelector('.egg-progress').setAttribute('aria-valuenow', count);
    root.querySelector('.egg-progress span').style.width = `${count / 2.5}%`;
    button.dataset.crack = String(Math.min(3, Math.floor(count / 63)));
    root.querySelector('.egg-hat').hidden = count < 125;
    root.querySelector('.egg-message').textContent =
      count < 50
        ? 'Tiene una agenda bastante vacía.'
        : count < 100
          ? 'Ya sospecha algo.'
          : count < 125
            ? 'Esto podría haber sido un correo.'
            : count < 180
              ? 'Ahora es un huevo con sombrero. Normal.'
              : count < 225
                ? 'Está redactando una queja formal.'
                : 'Se oyen reuniones de gallinas ahí dentro.';
  }
  function hatch() {
    hatched = true;
    button.disabled = true;
    root.querySelector('.egg-wrap').innerHTML =
      '<span class="hatched" aria-label="Ha nacido una gallina">🐔</span><span class="egg-hat" aria-hidden="true">🎩</span>';
    root.querySelector('.egg-message').textContent = '¡CRACK! Era una gallina. Nadie lo vio venir.';
    ctx.sound('success');
    ctx.later(
      () => ctx.win('250 toques para una gallina con sombrero. Decisiones impecables.'),
      1200,
    );
  }
  button.onclick = () => {
    if (hatched) return;
    count++;
    ctx.patch({ count });
    if (count % 10 === 0) ctx.sound('tick');
    paint();
    if (count === 250) hatch();
  };
  ctx.listen(button, 'keydown', (event) => {
    if (event.repeat && ['Enter', ' '].includes(event.key)) event.preventDefault();
  });
  paint();
   
  if (count === 250) hatch();
}
