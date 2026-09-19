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
export const RULE_GUIDES = {
  sequence: [
    {
      title: 'Encuentra los números que faltan',
      text: 'Lee las fichas de izquierda a derecha y descubre el patrón para completar A y B.',
      reminder: 'De izquierda a derecha · A va antes que B',
    },
    {
      title: 'Un nuevo patrón',
      text: 'Esta ronda tiene una regla distinta. Observa las seis fichas y deduce qué números faltan.',
      reminder: 'De izquierda a derecha · A va antes que B',
    },
    {
      title: 'Un último patrón',
      text: 'Completa A y B a partir de las fichas que aparecen. Puedes abrir la pista si la necesitas.',
      reminder: 'De izquierda a derecha · A va antes que B',
    },
  ],
  circle: [
    {
      title: 'Un número por descubrir',
      text: 'Observa todas las fichas del círculo y busca la relación que permite completar A.',
      reminder: 'Completa la casilla A',
    },
    {
      title: 'Otra vuelta, otro patrón',
      text: 'Empieza arriba y lee una sola vuelta en sentido horario, hasta B. Esta ronda tiene una regla distinta.',
      reminder: 'Desde arriba, en sentido horario ↻',
    },
  ],
  equation: [
    {
      title: 'Dos ecuaciones, los mismos valores',
      text: 'Busca x e y. Los valores que elijas tienen que servir en las dos ecuaciones.',
      reminder: 'x e y deben cumplir las dos igualdades',
    },
    {
      title: 'Ahora busca solo x',
      text: 'Esta ronda tiene una sola incógnita. Los paréntesis también forman parte de la cuenta.',
      reminder: 'Una incógnita: x',
    },
    {
      title: 'Ahora hay fracciones',
      text: 'Las dos líneas forman una sola ecuación. La respuesta de x sigue siendo un número entero.',
      reminder: 'Una sola ecuación · respuesta entera',
    },
  ],
  mystery: [
    {
      title: '¿Qué hace esta máquina?',
      text: 'Las cuatro primeras filas son ejemplos completos. Descubre la regla y encuentra los dos resultados que faltan.',
      reminder: 'Entrada → salida · La misma regla en cada fila',
    },
    {
      title: 'Nueva máquina, nueva regla',
      text: 'Esta máquina no sigue la regla de la anterior. Compara los ejemplos y completa A y B.',
      reminder: 'Entrada → salida · La misma regla en cada fila',
    },
    {
      title: 'La última máquina',
      text: 'La regla vuelve a cambiar. Usa los ejemplos completos para descubrir qué hace esta máquina.',
      reminder: 'Entrada → salida · La misma regla en cada fila',
    },
  ],
  grid: [
    {
      title: 'Esta regla se lee por filas',
      text: 'Cada fila sigue la misma regla. Compara las tres filas completas y deduce qué número falta en la última.',
      reminder: 'Lee cada fila de izquierda a derecha →',
    },
    {
      title: 'Ahora la regla va por columnas',
      text: 'No sigas la regla de las filas. En cada columna, las dos casillas de arriba sirven para calcular la de abajo.',
      reminder: 'Lee cada columna de arriba abajo ↓',
    },
    {
      title: 'Ahora todas las líneas suman lo mismo',
      text: 'Cada fila, cada columna y las dos diagonales deben dar el mismo total. No se usa la regla de la ronda anterior.',
      reminder: 'Filas, columnas y diagonales: la misma suma',
    },
  ],
  visual: [
    {
      title: 'Encuentra la ficha que sigue',
      text: 'Lee de izquierda a derecha. Si las fichas ocupan dos filas, sigue por la segunda. Elige la que falta.',
      reminder: 'De izquierda a derecha →',
    },
    {
      title: 'Ahora mira las filas',
      text: 'Las dos primeras filas están completas. Busca el patrón que permite completar la tercera.',
      reminder: 'Cada fila se lee de izquierda a derecha',
    },
    {
      title: 'Otra cuadrícula, otro patrón',
      text: 'Esta ronda tiene una regla distinta. Mira los ejemplos de arriba y completa la última fila.',
      reminder: 'Usa las filas completas como ejemplos',
    },
  ],
  memory: [
    {
      title: 'De izquierda a derecha',
      text: 'Mira las seis fichas. Después repítelas en el mismo orden en que aparecen.',
      reminder: 'IZQUIERDA → DERECHA',
    },
    {
      title: 'Esta ronda va de derecha a izquierda',
      text: 'La regla cambió: empieza por la última ficha y termina por la primera. No repitas el orden de la ronda anterior.',
      reminder: '← DE DERECHA A IZQUIERDA · empieza por la última',
    },
    {
      title: 'Ahora recuerda las posiciones',
      text: 'Memoriza en qué casilla está cada símbolo. Después verás los símbolos en una lista: toca sus casillas en el orden de esa lista.',
      reminder: 'Ahora importan las casillas, no leer al revés',
    },
  ],
  sudoku: [
    {
      title: 'Las regiones tienen formas distintas',
      text: 'Usa del 1 al 6 sin repetir en filas, columnas ni regiones. Para ver las regiones, sigue los bordes gruesos: no son los bloques rectangulares de siempre.',
      reminder: 'Regiones irregulares: sigue los bordes gruesos',
    },
    {
      title: 'Ahora también cuentan los termómetros',
      text: 'Sigue usando del 1 al 6 en filas, columnas y regiones. Además, en cada termómetro los números deben aumentar desde el círculo hasta la punta. Pueden saltarse números.',
      reminder: 'TERMÓMETROS: del círculo hacia la punta, siempre aumentando',
    },
  ],
};

const signed = (n) => (n < 0 ? `− ${-n}` : `+ ${n}`);

export function numberQuestion(type, seed, round, attempt = 0) {
  const random = puzzleRandom(seed, round, attempt);
  const pick = (min, max) => min + Math.floor(random() * (max - min + 1));
  let question;
  if (type === 'sequence') {
    if (round === 0) {
      const start = pick(2, 9),
        firstStep = pick(3, 5),
        growth = pick(2, 3),
        values = [start];
      for (let i = 0; i < 7; i++) values.push(values.at(-1) + firstStep + i * growth);
      question = {
        values: [...values.slice(0, 6), 'A', 'B'],
        answers: values.slice(6),
        rule: `Los saltos empiezan en +${firstStep} y aumentan de ${growth} en ${growth}.`,
      };
    } else if (round === 1) {
      const a = pick(2, 8),
        b = pick(38, 59),
        step = pick(3, 6),
        drop = pick(4, 7);
      question = {
        values: [a, b, a + step, b - drop, a + step * 2, b - drop * 2, 'A', 'B'],
        answers: [a + step * 3, b - drop * 3],
        rule: `Hay dos series intercaladas: las posiciones 1, 3, 5… suman ${step}; las posiciones 2, 4, 6… restan ${drop}.`,
      };
    } else {
      const values = [pick(1, 4), pick(5, 8)];
      while (values.length < 8) values.push(values.at(-1) + values.at(-2));
      question = {
        values: [...values.slice(0, 6), 'A', 'B'],
        answers: values.slice(6),
        hint: 'Mira los números de dos en dos. ¿Cómo puedes combinarlos para obtener el que viene después?',
        rule: 'Cada número es la suma de los dos anteriores.',
      };
    }
    question.note = 'Encuentra los dos siguientes números. A va antes que B.';
  }
  if (type === 'circle') {
    if (round === 0) {
      const top = shuffle([2, 3, 4, 5, 6, 7, 8, 9], random).slice(0, 4),
        factor = pick(2, 3),
        add = pick(1, 4);
      question = {
        values: [...top, ...top.slice(0, 3).map((n) => n * factor + add), 'A'],
        answers: [top[3] * factor + add],
        note: '¿Qué valor debe tener A para completar el círculo?',
        rule: `Las cuatro primeras fichas se relacionan con sus opuestas: multiplica por ${factor} y después suma ${add}.`,
      };
    } else {
      const a = pick(2, 9),
        b = pick(25, 40),
        step = pick(2, 4),
        drop = pick(3, 5);
      question = {
        values: [a, b, a + step, b - drop, a + step * 2, b - drop * 2, 'A', 'B'],
        answers: [a + step * 3, b - drop * 3],
        note: 'Encuentra los valores de A y B. Lee una sola vuelta siguiendo la flecha.',
        rule: `Leyendo desde arriba, se alternan dos series: una suma ${step} cada vez y la otra resta ${drop}.`,
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
        rule: `Al resolver la ecuación, x = ${x}.`,
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
      note = 'Completa A y B a partir de los ejemplos de la pantalla.';
      rule = 'Cuenta los segmentos encendidos de cada pantalla, no el valor que escriben.';
    } else if (round === 1) {
      inputs = shuffle([12, 23, 24, 35, 46, 52, 63, 74, 82, 93, 26, 47], random).slice(0, 6);
      const extra = pick(1, 4);
      transform = (n) => (n % 10) * Math.floor(n / 10) + extra;
      note = 'Los ejemplos completos siguen una misma regla. ¿Qué valores faltan?';
      rule = `Multiplica las dos cifras y suma ${extra}.`;
    } else {
      const differences = shuffle([1, 2, 3, 4, 5, 6], random);
      inputs = differences.map((difference) => {
        const last = pick(1, 9 - difference);
        return (last + difference) * 10 + last;
      });
      transform = (n) => n - Number(String(n).split('').reverse().join(''));
      note = 'Compara las entradas con sus resultados y completa las dos salidas.';
      rule = 'Resta al número original el que se forma al invertir sus cifras.';
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
      const extra = pick(1, 5);
      question = {
        values: pairs.flatMap(([a, b], i) => [a, i === 3 ? 'A' : b, a * b + extra]),
        answers: [pairs[3][1]],
        columns: 3,
        note: 'Las tres filas completas sirven como ejemplo para resolver la última.',
        rule: `La última casilla es el producto de las dos primeras más ${extra}.`,
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
        note: 'Las columnas completas muestran la regla. Encuentra los dos números que faltan.',
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
    guide: RULE_GUIDES[type][round],
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
    const selected = indices.filter((i) => i >= 3 && i <= 13).slice(0, 5);
    const [a, b, c, d, e] = selected;
    const add = 1 + Math.floor(random() * 3);
    const split = 1 + Math.floor(random() * c);
    const subtract = 1 + Math.floor(random() * (14 - d));
    const lower = indices.find((i) => i < e);
    return {
      kind: 'files',
      fields: [
        {
          label: `Símbolo con Z = Z(${ELEMENTS[a - add][0]}) + ${add}`,
          answer: ELEMENTS[a][0],
          kind: 'symbol',
        },
        {
          label: `Símbolo del elemento que va justo antes de ${ELEMENTS[b + 1][1]}`,
          answer: ELEMENTS[b][0],
          kind: 'symbol',
        },
        {
          label: `Nombre con Z = Z(${ELEMENTS[split - 1][0]}) + Z(${ELEMENTS[c - split][0]})`,
          answer: ELEMENTS[c][1],
          kind: 'name',
        },
        {
          label: `Nombre con Z = Z(${ELEMENTS[d + subtract][0]}) − ${subtract}`,
          answer: ELEMENTS[d][1],
          kind: 'name',
        },
        {
          label: `¿Cuánto vale Z(${ELEMENTS[e][0]}) − Z(${ELEMENTS[lower][0]})?`,
          answer: String(e - lower),
          kind: 'integer',
        },
      ],
    };
  }
  if (variant === 1) {
    const targets = indices.filter((i) => i > 1).slice(0, 7);
    const cards = targets.map((index, i) => {
      const split = 1 + Math.floor(random() * index);
      return {
        index,
        text:
          i % 2 === 0
            ? `Z(${ELEMENTS[index - 2][0]}) + 2`
            : `Z(${ELEMENTS[split - 1][0]}) + Z(${ELEMENTS[index - split][0]})`,
      };
    });
    return { kind: 'match', targets, cards, names: shuffle(targets, random) };
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
    tiles = [a, second, third, fourth, a, null];
    answer = second;
    note = '¿Qué ficha sigue en esta secuencia?';
    rule = 'Cada ficha gira 90° hacia la derecha.';
    columns = 6;
  } else if (round === 1) {
    const [a, b, c, d, e, f] = masks;
    tiles = [a, b, a ^ b, c, d, c ^ d, e, f, null];
    answer = e ^ f;
    columns = 3;
    note = 'Las filas siguen una misma regla. Elige la ficha que falta.';
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
    note = 'Observa las filas completas y elige la ficha que falta.';
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
  return { tiles, answer, options, note, rule, columns, guide: RULE_GUIDES.visual[round] };
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
