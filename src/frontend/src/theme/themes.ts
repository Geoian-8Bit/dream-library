/**
 * Lenguajes de material 2D para Dream Library.
 *
 * Activos en el selector (en este orden):
 *   - clay     → claymorphism cálido y chunky.
 *   - wood     → madera + cuero oxblood + canto de latón. Cabaña/biblioteca.
 *   - pillow   → neumorfismo cozy. Sombras concéntricas tipo cojín.
 *   - sticker  → pegatinas: doble outline (blanco + dark) + rotación leve.
 *
 * Archivado (fuera del selector pero su tema y CSS siguen funcionando si se
 * fuerza el styleId, p.ej. añadiéndolo a styleOrder):
 *   - glass, embroidery, crayon, watercolor.
 */

export type StyleId =
  | 'clay'
  | 'twilight'
  | 'pillow'
  | 'costura'
  | 'riso'
  | 'marble'
  | 'notebook'
  | 'origami'
  | 'confetti'
  | 'wood'
  | 'sticker'
  | 'glass'
  | 'embroidery'
  | 'crayon'
  | 'watercolor';

export interface ThemeTokens {
  page: string;
  surface: string;
  surface2: string;
  border: string;
  textStrong: string;
  textSoft: string;
  textOnAccent: string;
  accent: string;
  accentDeep: string;
  accentCool: string;
  ring: string;
}

export interface ThemeIllustration {
  shelfBack: string;
  shelfWood: string;
  shelfWoodLight: string;
  bookCream: string;
  bookCreamAccent: string;
  bookAccents: string[];
  plantLeaf: string;
  plantLeafDark: string;
  plantPot: string;
  frame: string;
  frameImage: string;
  tape: string;
}

export interface Theme {
  id: StyleId;
  name: string;
  tagline: string;
  fontDisplay: string;
  fontBody: string;
  tokens: ThemeTokens;
  illustration: ThemeIllustration;
}

export const themes: Record<StyleId, Theme> = {
  // ─────────────────────────────────────────────────────────────── ACTIVO
  clay: {
    id: 'clay',
    name: 'Arcilla',
    tagline: 'plastilina · pastel',
    fontDisplay: '"Fraunces", "Cormorant Garamond", serif',
    fontBody: '"Inter", system-ui, sans-serif',
    tokens: {
      page: '#F4EBDD',
      surface: '#FBF4E8',
      surface2: '#EAE0CD',
      border: '#D7C9B0',
      textStrong: '#4A3D2D',
      textSoft: '#826F58',
      textOnAccent: '#FFFFFF',
      accent: '#E89B83',
      accentDeep: '#C97A60',
      accentCool: '#B5C8A8',
      ring: '#E89B83',
    },
    illustration: {
      shelfBack: '#F4EBDD',
      shelfWood: '#C7A47A',
      shelfWoodLight: '#E0C39C',
      bookCream: '#F8EFDF',
      bookCreamAccent: '#C7A47A',
      bookAccents: ['#B5C8A8', '#E89B83', '#C7B5D6', '#A8C4D6', '#E2C66C'],
      plantLeaf: '#B5C8A8',
      plantLeafDark: '#8DAD83',
      plantPot: '#E89B83',
      frame: '#826F58',
      frameImage: '#B5C8A8',
      tape: '#B5C8A8',
    },
  },

  // ─────────────────────────────────────────────────────────────── ACTIVO
  costura: {
    id: 'costura',
    name: 'Costura',
    tagline: 'lino · puntada chunky',
    fontDisplay: '"Cormorant Garamond", "Fraunces", serif',
    fontBody: '"Inter", system-ui, sans-serif',
    tokens: {
      page: '#EFE5D0',
      surface: '#F8EFD8',
      surface2: '#DCC9A6',
      border: '#5F8B6E',
      textStrong: '#3A2A1F',
      textSoft: '#6F5740',
      textOnAccent: '#F8EFD8',
      accent: '#C26944',
      accentDeep: '#8C3F26',
      accentCool: '#5F8B6E',
      ring: '#C26944',
    },
    illustration: {
      shelfBack: '#EFE5D0',
      shelfWood: '#8E6535',
      shelfWoodLight: '#B89F70',
      bookCream: '#F4EAD0',
      bookCreamAccent: '#5F8B6E',
      bookAccents: ['#C26944', '#5F8B6E', '#8C3F26', '#A98456', '#D4A276'],
      plantLeaf: '#5F8B6E',
      plantLeafDark: '#3F6B4E',
      plantPot: '#C26944',
      frame: '#3A2A1F',
      frameImage: '#5F8B6E',
      tape: '#C26944',
    },
  },

  // ─────────────────────────────────────────────────────── ARCHIVADO ↓
  riso: {
    id: 'riso',
    name: 'Riso',
    tagline: 'risografía · sobreimpresión',
    fontDisplay: '"Fraunces", serif',
    fontBody: '"Inter", system-ui, sans-serif',
    tokens: {
      page: '#F4ECD2',
      surface: '#FBF6E2',
      surface2: '#E5D5A8',
      border: '#2A2418',
      textStrong: '#1A1812',
      textSoft: '#5A5040',
      textOnAccent: '#FBF6E2',
      accent: '#C95B33',
      accentDeep: '#8C3A1A',
      accentCool: '#5C8B6A',
      ring: '#C95B33',
    },
    illustration: {
      shelfBack: '#F4ECD2',
      shelfWood: '#8C3A1A',
      shelfWoodLight: '#C95B33',
      bookCream: '#FBF6E2',
      bookCreamAccent: '#5A5040',
      bookAccents: ['#C95B33', '#5C8B6A', '#3F4F8C', '#D4A638', '#9C5A8C'],
      plantLeaf: '#5C8B6A',
      plantLeafDark: '#3F6B4A',
      plantPot: '#C95B33',
      frame: '#1A1812',
      frameImage: '#5C8B6A',
      tape: '#C95B33',
    },
  },

  marble: {
    id: 'marble',
    name: 'Mármol',
    tagline: 'vetas · canto de oro',
    fontDisplay: '"Playfair Display", serif',
    fontBody: '"Source Sans 3", system-ui, sans-serif',
    tokens: {
      page: '#F2EDE2',
      surface: '#FAF6EC',
      surface2: '#E0D8C5',
      border: '#C5A663',
      textStrong: '#2A2418',
      textSoft: '#6F5E47',
      textOnAccent: '#FAF6EC',
      accent: '#6B4F33',
      accentDeep: '#3F2A18',
      accentCool: '#8FA88C',
      ring: '#C5A663',
    },
    illustration: {
      shelfBack: '#F2EDE2',
      shelfWood: '#3F2A18',
      shelfWoodLight: '#6B4F33',
      bookCream: '#FAF6EC',
      bookCreamAccent: '#C5A663',
      bookAccents: ['#6B4F33', '#8FA88C', '#3F2A18', '#C5A663', '#7A8FB8'],
      plantLeaf: '#8FA88C',
      plantLeafDark: '#5F7A60',
      plantPot: '#6B4F33',
      frame: '#3F2A18',
      frameImage: '#8FA88C',
      tape: '#C5A663',
    },
  },

  notebook: {
    id: 'notebook',
    name: 'Cuaderno',
    tagline: 'rayas · marcapáginas',
    fontDisplay: '"Caveat", "Fraunces", cursive',
    fontBody: '"Inter", system-ui, sans-serif',
    tokens: {
      page: '#FAF4E5',
      surface: '#FFFCF2',
      surface2: '#EDE3CC',
      border: '#B5A88A',
      textStrong: '#1F1812',
      textSoft: '#5C5040',
      textOnAccent: '#FFFCF2',
      accent: '#B85A3D',
      accentDeep: '#8C3A20',
      accentCool: '#6E8B69',
      ring: '#B85A3D',
    },
    illustration: {
      shelfBack: '#FAF4E5',
      shelfWood: '#8C6F47',
      shelfWoodLight: '#B5A88A',
      bookCream: '#FFFCF2',
      bookCreamAccent: '#5C5040',
      bookAccents: ['#B85A3D', '#6E8B69', '#3F5A8C', '#D4A276', '#8C6E5E'],
      plantLeaf: '#6E8B69',
      plantLeafDark: '#4F6F4A',
      plantPot: '#B85A3D',
      frame: '#1F1812',
      frameImage: '#6E8B69',
      tape: '#B85A3D',
    },
  },

  origami: {
    id: 'origami',
    name: 'Plegado',
    tagline: 'papel · pliegue diagonal',
    fontDisplay: '"Fraunces", serif',
    fontBody: '"Inter", system-ui, sans-serif',
    tokens: {
      page: '#F2EBDC',
      surface: '#FAF4E5',
      surface2: '#E5DBC2',
      border: '#B8A876',
      textStrong: '#2A2418',
      textSoft: '#6F5E47',
      textOnAccent: '#FAF4E5',
      accent: '#C75D3F',
      accentDeep: '#963F25',
      accentCool: '#6E8870',
      ring: '#C75D3F',
    },
    illustration: {
      shelfBack: '#F2EBDC',
      shelfWood: '#B8A876',
      shelfWoodLight: '#D4C094',
      bookCream: '#FAF4E5',
      bookCreamAccent: '#B8A876',
      bookAccents: ['#C75D3F', '#6E8870', '#A8B5C2', '#D4A276', '#8C6E5E'],
      plantLeaf: '#6E8870',
      plantLeafDark: '#4F6F58',
      plantPot: '#C75D3F',
      frame: '#2A2418',
      frameImage: '#6E8870',
      tape: '#C75D3F',
    },
  },

  confetti: {
    id: 'confetti',
    name: 'Confeti',
    tagline: 'pastel pop · micro acentos',
    fontDisplay: '"Fraunces", serif',
    fontBody: '"Inter", system-ui, sans-serif',
    tokens: {
      page: '#FCF1E5',
      surface: '#FFFAF1',
      surface2: '#F5E5D5',
      border: '#E5C8B5',
      textStrong: '#3A2A2A',
      textSoft: '#8C6E5E',
      textOnAccent: '#FFFFFF',
      accent: '#F0A88E',
      accentDeep: '#D08066',
      accentCool: '#B5C5D8',
      ring: '#F0A88E',
    },
    illustration: {
      shelfBack: '#FCF1E5',
      shelfWood: '#E5C8B5',
      shelfWoodLight: '#F5E5D5',
      bookCream: '#FFFAF1',
      bookCreamAccent: '#E5C8B5',
      bookAccents: ['#F0A88E', '#B5C5D8', '#F4D8A8', '#D8B5D0', '#A8D8C5'],
      plantLeaf: '#A8D8C5',
      plantLeafDark: '#80B89F',
      plantPot: '#F0A88E',
      frame: '#3A2A2A',
      frameImage: '#A8D8C5',
      tape: '#F0A88E',
    },
  },

  // ─────────────────────────────────────────────────────── ACTIVO (oscuro)
  twilight: {
    id: 'twilight',
    name: 'Crepúsculo',
    tagline: 'lámpara · noche cálida',
    fontDisplay: '"Cormorant Garamond", "Fraunces", serif',
    fontBody: '"Inter", system-ui, sans-serif',
    tokens: {
      page: '#1F1A14',
      surface: '#2A2218',
      surface2: '#3D2F22',
      border: '#5C4A33',
      textStrong: '#F4E8D0',
      textSoft: '#B8A38A',
      textOnAccent: '#1F1A14',
      accent: '#E5A86A',
      accentDeep: '#B87A40',
      accentCool: '#8AA88C',
      ring: '#E5A86A',
    },
    illustration: {
      shelfBack: '#2A2218',
      shelfWood: '#3D2F22',
      shelfWoodLight: '#5C4A33',
      bookCream: '#4A3D2A',
      bookCreamAccent: '#B87A40',
      bookAccents: ['#E5A86A', '#8AA88C', '#9A7BB0', '#7A8FB8', '#C9856E'],
      plantLeaf: '#8AA88C',
      plantLeafDark: '#5F7A60',
      plantPot: '#B87A40',
      frame: '#F4E8D0',
      frameImage: '#8AA88C',
      tape: '#E5A86A',
    },
  },

  wood: {
    id: 'wood',
    name: 'Madera',
    tagline: 'cuero · biblioteca · latón',
    fontDisplay: '"Cormorant Garamond", serif',
    fontBody: '"Inter", system-ui, sans-serif',
    tokens: {
      page: '#E8DCC4',
      surface: '#F1E6CE',
      surface2: '#C9B58D',
      border: '#8B6F47',
      textStrong: '#2A1810',
      textSoft: '#5C4530',
      textOnAccent: '#F1E6CE',
      accent: '#8B3A1F',
      accentDeep: '#5C2412',
      accentCool: '#5F6B3A',
      ring: '#8B3A1F',
    },
    illustration: {
      shelfBack: '#E8DCC4',
      shelfWood: '#5C3A20',
      shelfWoodLight: '#8B6F47',
      bookCream: '#E8D8B6',
      bookCreamAccent: '#8B6F47',
      bookAccents: ['#8B3A1F', '#5F6B3A', '#3D4F6B', '#7A4A2B', '#A88B5C'],
      plantLeaf: '#5F6B3A',
      plantLeafDark: '#3F4F22',
      plantPot: '#8B3A1F',
      frame: '#2A1810',
      frameImage: '#5F6B3A',
      tape: '#A88B5C',
    },
  },

  // ─────────────────────────────────────────────────────────────── ACTIVO
  pillow: {
    id: 'pillow',
    name: 'Almohadón',
    tagline: 'cojín · neumorfismo cozy',
    fontDisplay: '"Fraunces", serif',
    fontBody: '"Inter", system-ui, sans-serif',
    tokens: {
      page: '#ECE4D6',
      surface: '#F4ECDA',
      surface2: '#DCD0BA',
      border: '#C4B79A',
      textStrong: '#3E342A',
      textSoft: '#80705C',
      textOnAccent: '#FFFFFF',
      accent: '#D88E76',
      accentDeep: '#B86A52',
      accentCool: '#A8C2A0',
      ring: '#D88E76',
    },
    illustration: {
      shelfBack: '#ECE4D6',
      shelfWood: '#C4B79A',
      shelfWoodLight: '#DCD0BA',
      bookCream: '#F4ECDA',
      bookCreamAccent: '#C4B79A',
      bookAccents: ['#D88E76', '#A8C2A0', '#C8A8B8', '#A8B8C8', '#D8C28A'],
      plantLeaf: '#A8C2A0',
      plantLeafDark: '#80A07A',
      plantPot: '#D88E76',
      frame: '#80705C',
      frameImage: '#A8C2A0',
      tape: '#A8C2A0',
    },
  },

  sticker: {
    id: 'sticker',
    name: 'Vinilo',
    tagline: 'pegatina · doble outline',
    fontDisplay: '"Fraunces", serif',
    fontBody: '"Inter", system-ui, sans-serif',
    tokens: {
      page: '#F8EFD8',
      surface: '#FFFFFF',
      surface2: '#F4E8CB',
      border: '#2A2418',
      textStrong: '#2A2418',
      textSoft: '#6F5E4A',
      textOnAccent: '#FFFFFF',
      accent: '#E07A8E',
      accentDeep: '#B85070',
      accentCool: '#8FBE9A',
      ring: '#E07A8E',
    },
    illustration: {
      shelfBack: '#F8EFD8',
      shelfWood: '#E5C88A',
      shelfWoodLight: '#F0DDA4',
      bookCream: '#FFFFFF',
      bookCreamAccent: '#2A2418',
      bookAccents: ['#E07A8E', '#8FBE9A', '#7AAFE0', '#E0C57A', '#C285E0'],
      plantLeaf: '#8FBE9A',
      plantLeafDark: '#5F9E70',
      plantPot: '#E07A8E',
      frame: '#2A2418',
      frameImage: '#8FBE9A',
      tape: '#E07A8E',
    },
  },

  glass: {
    id: 'glass',
    name: 'Vidrio Cálido',
    tagline: 'cristal · luz filtrada',
    fontDisplay: '"Fraunces", serif',
    fontBody: '"Inter", system-ui, sans-serif',
    tokens: {
      page: '#F4EAD8',
      surface: '#FBF4E5',
      surface2: '#E8DCC2',
      border: '#D6C7A6',
      textStrong: '#3D2F1F',
      textSoft: '#7C6850',
      textOnAccent: '#3D2F1F',
      accent: '#E5A678',
      accentDeep: '#C28653',
      accentCool: '#BCD4C5',
      ring: '#E5A678',
    },
    illustration: {
      shelfBack: '#F4EAD8',
      shelfWood: '#C9A576',
      shelfWoodLight: '#DBC196',
      bookCream: '#FAF1DD',
      bookCreamAccent: '#C9A576',
      bookAccents: ['#BCD4C5', '#E5A678', '#C7B5D6', '#A8C4D6', '#E2C66C'],
      plantLeaf: '#BCD4C5',
      plantLeafDark: '#8DAD9D',
      plantPot: '#E5A678',
      frame: '#6F5740',
      frameImage: '#BCD4C5',
      tape: '#BCD4C5',
    },
  },

  embroidery: {
    id: 'embroidery',
    name: 'Bordado',
    tagline: 'lino · puntada',
    fontDisplay: '"Cormorant Garamond", "Fraunces", serif',
    fontBody: '"Inter", system-ui, sans-serif',
    tokens: {
      page: '#F2E8D5',
      surface: '#FAF1DA',
      surface2: '#DCC7A0',
      border: '#B89465',
      textStrong: '#3A2A1F',
      textSoft: '#6F5740',
      textOnAccent: '#FAF1DA',
      accent: '#B85A3D',
      accentDeep: '#8C3F26',
      accentCool: '#6E8B69',
      ring: '#B85A3D',
    },
    illustration: {
      shelfBack: '#F2E8D5',
      shelfWood: '#B89465',
      shelfWoodLight: '#D8B580',
      bookCream: '#F4EAD0',
      bookCreamAccent: '#6E8B69',
      bookAccents: ['#B85A3D', '#6E8B69', '#8C3F26', '#A98456', '#D4A276'],
      plantLeaf: '#6E8B69',
      plantLeafDark: '#4F6F4A',
      plantPot: '#B85A3D',
      frame: '#3A2A1F',
      frameImage: '#6E8B69',
      tape: '#B85A3D',
    },
  },

  crayon: {
    id: 'crayon',
    name: 'Crayón',
    tagline: 'storybook · hecho a mano',
    fontDisplay: '"Caveat", "Fraunces", cursive',
    fontBody: '"Inter", system-ui, sans-serif',
    tokens: {
      page: '#FAF3E5',
      surface: '#FFFAEE',
      surface2: '#F0E5CD',
      border: '#4A3A2A',
      textStrong: '#2A1F12',
      textSoft: '#6B5A47',
      textOnAccent: '#FFFAEE',
      accent: '#E5824B',
      accentDeep: '#B85A20',
      accentCool: '#6FA09B',
      ring: '#E5824B',
    },
    illustration: {
      shelfBack: '#FAF3E5',
      shelfWood: '#B85A20',
      shelfWoodLight: '#E5824B',
      bookCream: '#FFFAEE',
      bookCreamAccent: '#4A3A2A',
      bookAccents: ['#E5824B', '#6FA09B', '#D85A6B', '#7A8FB8', '#C2A33D'],
      plantLeaf: '#6FA09B',
      plantLeafDark: '#4F7A75',
      plantPot: '#E5824B',
      frame: '#2A1F12',
      frameImage: '#6FA09B',
      tape: '#E5824B',
    },
  },

  watercolor: {
    id: 'watercolor',
    name: 'Acuarela',
    tagline: 'pintura · cuento',
    fontDisplay: '"Playfair Display", serif',
    fontBody: '"Source Sans 3", system-ui, sans-serif',
    tokens: {
      page: '#FAF5EE',
      surface: '#FFFCF5',
      surface2: '#F0E9DC',
      border: '#E5DCC8',
      textStrong: '#34354A',
      textSoft: '#707182',
      textOnAccent: '#FFFFFF',
      accent: '#C5A1D5',
      accentDeep: '#9A7BB0',
      accentCool: '#A6CFC2',
      ring: '#C5A1D5',
    },
    illustration: {
      shelfBack: '#FAF5EE',
      shelfWood: '#C7A493',
      shelfWoodLight: '#E0C0AE',
      bookCream: '#FBF5EA',
      bookCreamAccent: '#D9B6E0',
      bookAccents: ['#C5A1D5', '#A6CFC2', '#F4C9C2', '#D9B6E0', '#E5C77A'],
      plantLeaf: '#A6CFC2',
      plantLeafDark: '#7AAFA0',
      plantPot: '#C5A1D5',
      frame: '#34354A',
      frameImage: '#A6CFC2',
      tape: '#C5A1D5',
    },
  },
};

/** Estilos visibles en el selector (los demás están archivados). */
export const styleOrder: StyleId[] = ['clay', 'twilight', 'pillow', 'costura'];

const VALID_IDS: ReadonlySet<StyleId> = new Set<StyleId>([
  'clay',
  'twilight',
  'pillow',
  'costura',
  'riso',
  'marble',
  'notebook',
  'origami',
  'confetti',
  'wood',
  'sticker',
  'glass',
  'embroidery',
  'crayon',
  'watercolor',
]);

export function isStyleId(v: unknown): v is StyleId {
  return typeof v === 'string' && VALID_IDS.has(v as StyleId);
}

/** "#RRGGBB" → "R G B" para usar en CSS vars con `<alpha-value>`. */
export function hexToRgbTriplet(hex: string): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `${r} ${g} ${b}`;
}

export function themeToCssVars(theme: Theme): Record<string, string> {
  const t = theme.tokens;
  return {
    '--c-page': hexToRgbTriplet(t.page),
    '--c-surface': hexToRgbTriplet(t.surface),
    '--c-surface-2': hexToRgbTriplet(t.surface2),
    '--c-border': hexToRgbTriplet(t.border),
    '--c-text-strong': hexToRgbTriplet(t.textStrong),
    '--c-text-soft': hexToRgbTriplet(t.textSoft),
    '--c-text-on-accent': hexToRgbTriplet(t.textOnAccent),
    '--c-accent': hexToRgbTriplet(t.accent),
    '--c-accent-deep': hexToRgbTriplet(t.accentDeep),
    '--c-accent-cool': hexToRgbTriplet(t.accentCool),
    '--c-ring': hexToRgbTriplet(t.ring),
    '--font-display': theme.fontDisplay,
    '--font-body': theme.fontBody,
  };
}
