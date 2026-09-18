import { ELEMENTS, puzzleRandom, shuffle } from './core.js';

export const ROUND_COUNTS = {
  sequence: 3,
  circle: 2,
  equation: 3,
  mystery: 3,
  grid: 3,
  visual: 3,
  memory: 3,
  chemistry: 2,
};
export const SEGMENTS = [
  'abcdef',
  'bc',
  'abdeg',
  'abcdg',
  'bcfg',
  'acdfg',
  'acdefg',
  'abc',
  'abcdefg',
  'abcdfg',
];
const signed = (n) => (n < 0 ? `− ${-n}` : `+ ${n}`);

export function numberQuestion(type, seed, round, attempt = 0) {
  const random = puzzleRandom(seed, round, attempt);
  const pick = (min, max) => min + Math.floor(random() * (max - min + 1));
  let question;
  if (type === 'sequence') {
    if (round === 0) {
      const start = pick(2, 9),
        shift = pick(0, 3),
        values = [start];
      for (let i = 2; i <= 8; i++) values.push(values.at(-1) + (i * (i + 1)) / 2 + shift);
      question = {
        values: [...values.slice(0, 6), 'A', 'B'],
        answers: values.slice(6),
        rule: `Los saltos son números triangulares${shift ? ` más ${shift}` : ''}: sus aumentos crecen de uno en uno.`,
      };
    } else if (round === 1) {
      const a = pick(2, 8),
        b = pick(38, 59),
        step = pick(3, 6),
        drop = pick(4, 7);
      question = {
        values: [a, b, a + step, b - drop, a + step * 2, b - drop * 2, 'A', 'B'],
        answers: [a + step * 3, b - drop * 3],
        rule: `Dos hilos: uno suma ${step}; el otro resta ${drop}.`,
      };
    } else {
      const values = [pick(1, 4), pick(5, 8)],
        extra = pick(1, 3);
      while (values.length < 8) values.push(values.at(-1) + values.at(-2) + extra);
      question = {
        values: [...values.slice(0, 6), 'A', 'B'],
        answers: values.slice(6),
        rule: `Cada ficha suma las dos anteriores y añade ${extra}.`,
      };
    }
    question.note = 'Encuentra los dos siguientes números. A va antes que B.';
  }
  if (type === 'circle') {
    if (round === 0) {
      const top = shuffle([2, 3, 4, 5, 6, 7, 8, 9], random).slice(0, 4),
        factor = pick(2, 4),
        add = pick(2, 7);
      question = {
        values: [...top, top[0] * factor + add, top[1] * factor + add, 'A', 'B'],
        answers: top.slice(2).map((n) => n * factor + add),
        note: 'Desde arriba, en sentido horario: las primeras cuatro fichas son entradas; sus opuestas, resultados. Misma multiplicación y misma suma.',
        rule: `Al otro lado del centro: × ${factor}, después + ${add}.`,
      };
    } else {
      const a = pick(2, 6),
        b = pick(9, 18),
        step = pick(2, 5);
      question = {
        values: [a, b, a * 2 + 1, b + step, (a * 2 + 1) * 2 + 1, b + step * 3, 'A', 'B'],
        answers: [((a * 2 + 1) * 2 + 1) * 2 + 1, b + step * 6],
        note: 'Desde arriba, en sentido horario. Dos caminos se alternan; ninguno salta al azar.',
        rule: `Un camino duplica y suma 1. El otro avanza +${step}, +${step * 2}, +${step * 3}.`,
      };
    }
  }
  if (type === 'equation') {
    const x = pick(3, 12),
      y = pick(2, 9),
      a = pick(2, 5),
      b = pick(2, 7);
    if (round === 0)
      question = {
        equations: [`2x + y = ${2 * x + y}`, `x + 3y = ${x + 3 * y}`],
        answers: [x, y],
        labels: ['x', 'y'],
        rule: `x = ${x}; y = ${y}. Las dos igualdades tienen que cumplirse a la vez.`,
      };
    if (round === 1)
      question = {
        equations: [`3(x − ${a}) + ${b} = 2x ${signed(x - 3 * a + b)}`],
        answers: [x],
        labels: ['x'],
        rule: `Al reunir las equis queda x = ${x}.`,
      };
    if (round === 2) {
      const left = pick(4, 8),
        right = pick(2, 5);
      question = {
        equations: [
          `(x ${signed(2 * left - x)}) / 2`,
          `+ (x ${signed(3 * right - x)}) / 3 = ${left + right}`,
        ],
        answers: [x],
        labels: ['x'],
        rule: `x = ${x}: las dos fracciones valen ${left} y ${right}.`,
      };
    }
    question.note =
      'Encuentra los valores que mantienen la balanza. Todas las respuestas son enteras.';
  }
  if (type === 'mystery') {
    let inputs, transform, note, rule;
    if (round === 0) {
      inputs = shuffle([12, 24, 39, 47, 58, 60, 73, 82, 91, 105, 248, 307, 619], random).slice(
        0,
        6,
      );
      transform = (n) =>
        [...String(n)].reduce((sum, digit) => sum + SEGMENTS[Number(digit)].length, 0);
      note =
        'Una pantalla de siete segmentos. La máquina no está haciendo aritmética con el valor del número.';
      rule = 'Cuenta los segmentos encendidos de cada pantalla, no el valor que escriben.';
    } else if (round === 1) {
      inputs = shuffle([13, 24, 35, 46, 57, 68, 14, 25, 36, 47, 58, 69], random).slice(0, 6);
      transform = (n) => (n % 10) ** 2 - Math.floor(n / 10) ** 2;
      note =
        'Aquí participan las dos cifras: potencias pequeñas y una resta. Siempre la misma regla.';
      rule = 'Cuadrado de la segunda cifra menos cuadrado de la primera.';
    } else {
      inputs = shuffle([214, 623, 851, 732, 941, 506, 382, 164, 275, 490, 817, 359], random).slice(
        0,
        6,
      );
      transform = (n) => {
        const digits = [...String(n)].sort();
        return Number([...digits].reverse().join('')) - Number(digits.join(''));
      };
      note =
        'Esta máquina reordena las mismas cifras antes de restar. Los ceros iniciales están permitidos.';
      rule = 'Ordena las cifras de mayor a menor y de menor a mayor; resta ambos números.';
    }
    question = {
      pairs: inputs.map((n, i) => [n, i < 4 ? transform(n) : i === 4 ? 'A' : 'B']),
      answers: inputs.slice(4).map(transform),
      note,
      rule,
      digital: round === 0,
    };
  }
  if (type === 'grid') {
    if (round === 0) {
      const pairs = shuffle(
        [
          [2, 3],
          [3, 4],
          [2, 5],
          [4, 6],
          [5, 3],
          [6, 2],
          [3, 7],
        ],
        random,
      ).slice(0, 4);
      question = {
        values: pairs.flatMap(([a, b], i) => [a, i === 3 ? 'A' : b, a * b + a + b]),
        answers: [pairs[3][1]],
        columns: 3,
        note: 'Cuatro filas, una misma regla. La casilla derecha depende de las dos entradas.',
        rule: 'La derecha vale izquierda × centro + izquierda + centro.',
      };
    } else if (round === 1) {
      const first = shuffle([2, 3, 4, 5, 6, 7, 8], random).slice(0, 4),
        factor = pick(2, 4);
      let second;
      do {
        second = shuffle([2, 3, 5, 6, 7, 9], random).slice(0, 4);
      } while (first[0] * second[1] === first[1] * second[0]);
      question = {
        values: [
          ...first,
          ...second,
          factor * first[0] + second[0],
          factor * first[1] + second[1],
          'A',
          'B',
        ],
        columns: 4,
        answers: first.slice(2).map((n, i) => n * factor + second[i + 2]),
        note: 'Mismo cálculo vertical en las cuatro columnas: una multiplicación y una suma.',
        rule: `Abajo = arriba × ${factor} + centro.`,
      };
    } else {
      const base = pick(1, 6),
        step = pick(2, 4),
        square = [8, 1, 6, 3, 5, 7, 4, 9, 2].map((n) => n * step + base);
      const hidden = [1, 5, 6];
      question = {
        values: square.map((n, i) => (hidden.includes(i) ? ['A', 'B', 'C'][hidden.indexOf(i)] : n)),
        columns: 3,
        answers: hidden.map((i) => square[i]),
        note: 'Cada fila, cada columna y las dos diagonales tienen la misma suma. Reconstruye A, B y C.',
        rule: `Cada línea suma ${15 * step + 3 * base}. Las tres piezas cierran el cuadrado.`,
      };
    }
  }
  return {
    ...question,
    labels: question.labels || question.answers.map((_, i) => String.fromCharCode(65 + i)),
  };
}

export function chemistryQuestion(variant, seed, round = 0, attempt = 0) {
  const random = puzzleRandom(seed, round, attempt);
  const indices = shuffle(
    Array.from({ length: 15 }, (_, i) => i),
    random,
  );
  if (variant === 0) {
    const selected = indices.filter((i) => i > 1).slice(0, 5);
    return {
      kind: 'files',
      fields: selected.map((index, i) => ({
        label:
          i < 2
            ? `Símbolo de ${ELEMENTS[index][1]}`
            : i < 4
              ? `Nombre de ${ELEMENTS[index][0]}`
              : `Número atómico de ${ELEMENTS[index][0]}`,
        answer: i < 2 ? ELEMENTS[index][0] : i < 4 ? ELEMENTS[index][1] : String(index + 1),
      })),
    };
  }
  if (variant === 1) {
    const targets = indices.slice(0, 7);
    return { kind: 'match', targets, names: shuffle(targets, random) };
  }
  if (variant === 2) {
    const selected = indices.slice(0, 4).sort((a, b) => a - b),
      [a, b, c, d] = selected.map((i) => i + 1);
    return {
      kind: 'deduction',
      targets: selected,
      clues: [
        `Los números atómicos de A y B suman ${a + b}.`,
        `B tiene ${b - a} protones más que A.`,
        `C tiene ${c - b} protones más que B.`,
        `Entre A, B, C y D suman ${a + b + c + d} protones.`,
      ],
    };
  }
  const targets = indices.slice(0, 10);
  return {
    kind: 'order',
    targets: [...targets].sort((a, b) => a - b),
    cards: targets.map((index, i) => ({
      index,
      text:
        i % 3 === 0
          ? ELEMENTS[index][0]
          : i % 3 === 1
            ? ELEMENTS[index][1]
            : index === 0
              ? 'Un solo protón'
              : `Un protón más que ${ELEMENTS[index - 1][0]}`,
    })),
  };
}

export function normalizeAnswer(value) {
  return String(value)
    .trim()
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

export function cookiePuzzle(seed, attempt = 0) {
  const random = puzzleRandom(seed, 0, attempt),
    unit = 2 + Math.floor(random() * 2);
  const animals = ['Oso', 'Rana', 'Gato', 'Zorro'],
    drinks = ['leche', 'té', 'cacao', 'agua'];
  const order = shuffle([0, 1, 2, 3], random),
    cups = shuffle(drinks, random);
  const [a, b, c, d] = order.map((i) => animals[i]);
  const amounts = [unit, unit * 2, unit * 3, unit * 4];
  const answers = animals.map((_, i) => ({
    cookies: amounts[order.indexOf(i)],
    drink: [cups[3], cups[2], cups[0], cups[1]][order.indexOf(i)],
  }));
  return {
    animals,
    drinks,
    amounts,
    answers,
    order,
    cups,
    unit,
    clues: [
      `${a} tiene la mitad de galletas que ${b}.`,
      `${c} tiene ${unit} galletas más que ${b}.`,
      `${d} tiene más galletas que ${b}, pero no tiene ${unit * 3}.`,
      `Quien bebe ${cups[0]} tiene tantas galletas como ${a} y ${b} juntos.`,
      `Quien bebe ${cups[1]} tiene el doble que quien bebe ${cups[2]}.`,
      `${a} no bebe ${cups[2]}.`,
    ],
  };
}

export function cookieValid(puzzle, choices) {
  const {
    order: [a, b, c, d],
    cups,
    unit,
  } = puzzle;
  if (
    choices.length !== 4 ||
    new Set(choices.map((c) => c.cookies)).size !== 4 ||
    new Set(choices.map((c) => c.drink)).size !== 4
  )
    return false;
  if (choices.some((c) => !puzzle.amounts.includes(c.cookies) || !puzzle.drinks.includes(c.drink)))
    return false;
  const forCup = (cup) => choices.find((c) => c.drink === cup).cookies;
  return (
    choices[a].cookies * 2 === choices[b].cookies &&
    choices[c].cookies === choices[b].cookies + unit &&
    choices[d].cookies > choices[b].cookies &&
    choices[d].cookies !== unit * 3 &&
    forCup(cups[0]) === choices[a].cookies + choices[b].cookies &&
    forCup(cups[1]) === forCup(cups[2]) * 2 &&
    choices[a].drink !== cups[2]
  );
}

export function rotateMask(mask) {
  const rotation = [2, 0, 3, 1];
  return rotation.reduce((value, source, index) => value | (((mask >> source) & 1) << index), 0);
}

export function visualQuestion(seed, round, attempt = 0) {
  const random = puzzleRandom(seed, round, attempt);
  const masks = shuffle([1, 2, 3, 4, 5, 7, 8, 10, 11, 12, 13, 14], random);
  let tiles, answer, note, rule, columns;
  if (round === 0) {
    const a = masks[0],
      second = rotateMask(a),
      third = rotateMask(second),
      fourth = rotateMask(third);
    tiles = [a, second ^ 15, third, fourth ^ 15, a, null];
    answer = second ^ 15;
    note = 'Hay dos cambios simultáneos en estas fichas. ¿Cuál sigue?';
    rule = 'Giro de 90° horario y cambio de todos los cuadros: lleno ↔ vacío.';
    columns = 6;
  } else if (round === 1) {
    const [a, b, c, d, e, f] = masks;
    tiles = [a, b, a ^ b, c, d, c ^ d, e, f, null];
    answer = e ^ f;
    columns = 3;
    note = 'En cada fila, la tercera ficha combina las otras dos de la misma manera.';
    rule = 'Un cuadro compartido se borra. Si está en una sola de las dos fichas, se queda.';
  } else {
    const mirror = (mask) => ((mask & 5) << 1) | ((mask & 10) >> 1);
    const [a, b, c] = masks;
    tiles = [
      a,
      mirror(a),
      rotateMask(mirror(a)),
      b,
      mirror(b),
      rotateMask(mirror(b)),
      c,
      mirror(c),
      null,
    ];
    answer = rotateMask(mirror(c));
    columns = 3;
    note = 'Cada fila repite las mismas dos transformaciones. Encuentra la ficha que falta.';
    rule = 'Reflejo izquierda-derecha, seguido de un cuarto de vuelta horario.';
  }
  const options = shuffle(
    [
      answer,
      ...shuffle(
        Array.from({ length: 16 }, (_, i) => i).filter((n) => n !== answer),
        random,
      ).slice(0, 3),
    ],
    random,
  );
  return { tiles, answer, options, note, rule, columns };
}

export const MEMORY_SYMBOLS = ['★', '☂', '3', '◆', '7', '●', '☾', '✿'];
export function memoryPuzzle(seed, round, attempt = 0) {
  const random = puzzleRandom(seed, round, attempt),
    sequence = shuffle(MEMORY_SYMBOLS, random).slice(0, round === 0 ? 6 : 5);
  const positions =
    round === 2
      ? shuffle(
          Array.from({ length: 9 }, (_, i) => i),
          random,
        ).slice(0, 5)
      : [];
  return {
    sequence,
    answer: round === 1 ? [...sequence].reverse() : round === 2 ? positions : sequence,
    positions,
    seconds: round === 2 ? 6 : 5,
  };
}

export function nextMemoryAttempt(seed, round, attempt) {
  const previous = JSON.stringify(memoryPuzzle(seed, round, attempt));
  do {
    attempt++;
  } while (JSON.stringify(memoryPuzzle(seed, round, attempt)) === previous);
  return attempt;
}

export const LIGHT_MASKS = Array.from({ length: 16 }, (_, i) => {
  const row = Math.floor(i / 4),
    col = i % 4;
  return [i, row > 0 ? i - 4 : -1, row < 3 ? i + 4 : -1, col > 0 ? i - 1 : -1, col < 3 ? i + 1 : -1]
    .filter((n) => n >= 0)
    .reduce((mask, n) => mask | (1 << n), 0);
});
let lightPaths;
export function lightSolutions() {
  if (lightPaths) return lightPaths;
  lightPaths = new Map([[0, []]]);
  const queue = [0];
  for (let i = 0; i < queue.length; i++)
    for (let key = 0; key < 16; key++) {
      const next = queue[i] ^ LIGHT_MASKS[key];
      if (!lightPaths.has(next)) {
        lightPaths.set(next, [...lightPaths.get(queue[i]), key]);
        queue.push(next);
      }
    }
  return lightPaths;
}
export function lightPuzzle(seed, attempt = 0) {
  const candidates = [...lightSolutions()].filter(
    ([, path]) => path.length >= 6 && path.length <= 7,
  );
  const random = puzzleRandom(seed, 0, attempt);
  const [lights, solution] = candidates[Math.floor(random() * candidates.length)];
  return { lights, solution, limit: 10 };
}
