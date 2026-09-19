export const TOTAL = 20;
export const CONTENT_REVISION = 3;
export const STORAGE_KEY = 'puzzle-arcade-v2';
export const LEGACY_KEY = 'puzzle-arcade-v1';
export const TYPES = {
  sequence: { title: 'El siguiente, por favor', label: 'Secuencias', icon: '↗', color: 'lilac' },
  circle: { title: 'Dale una vuelta', label: 'Círculos', icon: '◉', color: 'mint' },
  equation: { title: 'Se busca: equis', label: 'Ecuaciones', icon: 'x', color: 'pink' },
  mystery: {
    title: 'La máquina sospechosa',
    label: 'Máquina misteriosa',
    icon: '⇄',
    color: 'lilac',
  },
  chemistry: {
    title: 'Un poquito de química',
    label: 'Mini laboratorio',
    icon: 'He',
    color: 'mint',
  },
  memory: { title: 'No te lo olvides', label: 'Memoria', icon: '▦', color: 'peach' },
  cat: {
    title: 'Operación: cerrar el jardín',
    label: 'Atrapa al conejo',
    icon: '🐰',
    color: 'peach',
  },
  pacman: {
    title: 'Conejito a la fuga',
    label: 'Laberinto del conejo',
    icon: '🐰',
    color: 'lilac',
  },
  reaction: { title: '¿Sigues ahí?', label: 'Reflejos', icon: '⚡', color: 'yellow' },
  visual: { title: 'Algo está cambiando', label: 'Patrones visuales', icon: '◒', color: 'pink' },
  grid: { title: 'Todo encaja', label: 'Cuadrícula numérica', icon: '▦', color: 'mint' },
  logic: {
    title: 'La merienda tiene condiciones',
    label: 'Lógica de bolsillo',
    icon: '🍪',
    color: 'peach',
  },
  sudoku: { title: 'Las casillas se han mudado', label: 'Sudoku 6 × 6', icon: '▦', color: 'lilac' },
  egg: { title: 'Es un huevo.', label: 'El huevo', icon: '🥚', color: 'yellow' },
  switches: { title: 'Buenas noches, luces', label: 'Interruptores', icon: '☼', color: 'mint' },
  trivia: {
    title: 'El club de los datos raros',
    label: 'Preguntas y respuestas',
    icon: '?',
    color: 'pink',
  },
};

export const ELEMENTS = [
  ['H', 'Hidrógeno'],
  ['He', 'Helio'],
  ['Li', 'Litio'],
  ['Be', 'Berilio'],
  ['B', 'Boro'],
  ['C', 'Carbono'],
  ['N', 'Nitrógeno'],
  ['O', 'Oxígeno'],
  ['F', 'Flúor'],
  ['Ne', 'Neón'],
  ['Na', 'Sodio'],
  ['Mg', 'Magnesio'],
  ['Al', 'Aluminio'],
  ['Si', 'Silicio'],
  ['P', 'Fósforo'],
];

export function seeded(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle(items, random = Math.random) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export const CAMPAIGN_BANDS = [
  [
    ['sequence', 0],
    ['memory', 0],
    ['equation', 0],
    ['visual', 0],
    ['chemistry', 0],
  ],
  [
    ['circle', 0],
    ['cat', 0],
    ['grid', 0],
    ['reaction', 0],
    ['chemistry', 1],
  ],
  [
    ['mystery', 0],
    ['logic', 0],
    ['chemistry', 2],
    ['egg', 0],
    ['sudoku', 0],
  ],
  [
    ['switches', 0],
    ['chemistry', 3],
    ['trivia', 0],
    ['pacman', 0],
    ['sudoku', 1],
  ],
];
const mathTypes = ['sequence', 'circle', 'equation', 'grid', 'mystery'];

export function validCampaign(stages) {
  if (!Array.isArray(stages) || stages.length !== TOTAL) return false;
  const expected = CAMPAIGN_BANDS.flat().map(([type, variant]) => `${type}-${variant}`);
  if (new Set(stages.map((s) => s?.id)).size !== TOTAL) return false;
  for (const [index, stage] of stages.entries()) {
    if (!stage || !expected.includes(stage.id) || stage.id !== `${stage.type}-${stage.variant}`)
      return false;
    if (!Number.isInteger(stage.seed) || stage.tier !== Math.floor(index / 5) + 1) return false;
    if (
      !CAMPAIGN_BANDS[stage.tier - 1].some(
        ([type, variant]) => type === stage.type && variant === stage.variant,
      )
    )
      return false;
    const previous = stages[index - 1];
    if (
      previous &&
      (previous.type === stage.type ||
        (['sequence', 'circle'].includes(previous.type) &&
          ['sequence', 'circle'].includes(stage.type)))
    )
      return false;
    if (index >= 2 && stages.slice(index - 2, index + 1).every((s) => mathTypes.includes(s.type)))
      return false;
  }
  return true;
}

export function createCampaign(seed = Math.floor(Math.random() * 2 ** 32)) {
  const random = seeded(seed);
   
  const bands = CAMPAIGN_BANDS.map((band, index) =>
    band.map(([type, variant]) => ({
      id: `${type}-${variant}`,
      type,
      variant,
      tier: index + 1,
      seed: Math.floor(random() * 2 ** 32),
    })),
  );
  for (let attempt = 0; attempt < 1000; attempt++) {
    const campaign = bands.flatMap((band) => shuffle(band, random));
    if (validCampaign(campaign)) return campaign;
  }
  return bands.flat();
}

export function freshSave(seed) {
  return {
    version: 2,
    contentRevision: CONTENT_REVISION,
    campaign: createCampaign(seed),
    completed: [],
    stars: 0,
    currentStage: 0,
    bonusUnlocked: false,
    started: false,
    bonusVisited: false,
    stageData: {},
    muted: true,
    bestReaction: null,
  };
}

export function restoreSave(raw) {
  try {
    const save = JSON.parse(raw);
    if (save?.version !== 2 || !validCampaign(save.campaign) || !Array.isArray(save.completed))
      return null;
    if (save.completed.length > TOTAL || save.completed.some((id, i) => id !== save.campaign[i].id))
      return null;
    const stageData = {};
    for (const stage of save.campaign) {
      const data = save.stageData?.[stage.id];
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        if (
          save.contentRevision !== CONTENT_REVISION &&
          ['sequence', 'circle', 'mystery', 'grid', 'visual', 'chemistry'].includes(stage.type)
        ) {
          const rounds =
            stage.type === 'circle'
              ? 2
              : stage.type === 'chemistry'
                ? stage.variant === 3
                  ? 1
                  : 2
                : 3;
          stageData[stage.id] = {
            round:
              Number.isInteger(data.round) && data.round >= 0 && data.round < rounds
                ? data.round
                : 0,
            attempt: Number.isInteger(data.attempt) && data.attempt >= 0 ? data.attempt : 0,
          };
        } else stageData[stage.id] = data;
      }
    }
    return {
      ...save,
      contentRevision: CONTENT_REVISION,
      currentStage: save.completed.length,
      stars: save.completed.length,
      bonusUnlocked: save.completed.length === TOTAL,
      stageData,
      bestReaction:
        Number.isFinite(save.bestReaction) && save.bestReaction >= 100 ? save.bestReaction : null,
    };
  } catch {
    return null;
  }
}

export function puzzleRandom(seed, round = 0, attempt = 0) {
  return seeded((seed + Math.imul(round, 2654435761) + Math.imul(attempt, 2246822519)) >>> 0);
}
