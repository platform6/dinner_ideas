import { extendTheme, type ThemeConfig } from '@chakra-ui/react';

/**
 * "Kitchen Table" theme — Dinner Ideas.
 * Olive on near-white, Lora headings / Outfit UI. Light mode only.
 *
 * Fonts: add to index.html <head> before this is used —
 * <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
 * <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Lora:wght@400..600&family=Outfit:wght@300..700&display=swap">
 */

const config: ThemeConfig = { initialColorMode: 'light', useSystemColorMode: false };

const colors = {
  // Olive — primary accent. 500 is the only one used for fills.
  brand: {
    50: '#F3F5EE',
    100: '#EEF1E8',
    200: '#CFD6C2',
    300: '#A9B79A',
    400: '#7A9169',
    500: '#4A6741',
    600: '#3E5636',
    700: '#32452C',
    800: '#263421',
    900: '#1B2517',
  },
  // Terracotta — Rosie-approved heart, and inline notices only. Never a button fill.
  heart: {
    50: '#FBF1EC',
    100: '#F7E6DE',
    200: '#F0DDD4',
    500: '#B3543F',
    600: '#9E4A37',
    700: '#8E4633',
  },
  // Warm neutrals. "paper" = surfaces, "ink" = text, "line" = borders.
  paper: { base: '#FFFDFA', subtle: '#FAF8F3', sunken: '#F1EEE6' },
  line: {
    subtle: '#EDE9DE',
    DEFAULT: '#E0DCD1',
    dashed: '#DCD7C9',
    brand: '#CFD6C2',
    brandSubtle: '#E3E7DA',
  },
  ink: {
    900: '#232019',
    700: '#5C5749',
    500: '#7E7869',
    400: '#726C5B',
    300: '#757060',
    200: '#8A8272',
  },
};

const semanticTokens = {
  colors: {
    'chakra-body-bg': 'paper.base',
    'chakra-body-text': 'ink.900',
    'chakra-border-color': 'line.subtle',
    'chakra-placeholder-color': 'ink.300',
  },
};

const fonts = {
  heading: `Lora, Georgia, 'Times New Roman', serif`,
  body: `Outfit, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`,
};

const fontSizes = {
  eyebrow: '0.6875rem', // 11px, uppercase, tracked
  meta: '0.78125rem', // 12.5px
  faint: '0.71875rem', // 11.5px
  cardTitle: '1.03125rem', // 16.5px
  pageTitle: '1.875rem', // 30px
};

const radii = {
  chip: '999px',
  control: '0.75rem', // 12px — buttons, inputs, step tiles
  card: '1rem', // 16px — every card and list row
  field: '0.875rem', // 14px — login inputs, primary CTA
};

const shadows = {
  // Deliberately almost none: this theme separates with warm fills + hairlines.
  card: 'none',
  raised: '0 6px 16px -12px rgba(35, 32, 25, 0.35)',
};

const textStyles = {
  eyebrow: {
    fontFamily: 'body',
    fontSize: 'eyebrow',
    fontWeight: 400,
    lineHeight: 1,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: 'ink.400',
  },
  pageTitle: {
    fontFamily: 'heading',
    fontSize: 'pageTitle',
    fontWeight: 400,
    lineHeight: 1.05,
    letterSpacing: '-0.01em',
  },
  cardTitle: {
    fontFamily: 'heading',
    fontSize: 'cardTitle',
    fontWeight: 500,
    lineHeight: 1.25,
  },
  meta: { fontFamily: 'body', fontSize: 'meta', fontWeight: 400, lineHeight: 1, color: 'ink.500' },
  faint: { fontFamily: 'body', fontSize: 'faint', fontWeight: 400, lineHeight: 1, color: 'ink.300' },
  sectionLabel: {
    fontFamily: 'body',
    fontSize: '0.71875rem',
    fontWeight: 600,
    lineHeight: 1,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: 'brand.500',
  },
};

const layerStyles = {
  // Default dinner card / list row.
  card: {
    bg: 'paper.base',
    borderWidth: '1px',
    borderColor: 'line.subtle',
    borderRadius: 'card',
    p: 3,
  },
  // Same card once it is picked for the week.
  cardSelected: {
    bg: 'brand.50',
    borderWidth: '1px',
    borderColor: 'line.brandSubtle',
    borderRadius: 'card',
    p: 3,
  },
  // Empty states and end-of-list notes.
  cardDashed: {
    bg: 'transparent',
    borderWidth: '1px',
    borderStyle: 'dashed',
    borderColor: 'line.dashed',
    borderRadius: 'card',
    p: 4,
  },
  notice: {
    bg: 'heart.50',
    borderWidth: '1px',
    borderColor: 'heart.200',
    borderRadius: 'field',
    color: 'heart.700',
    px: 3,
    py: '11px',
  },
};

const components = {
  Heading: {
    baseStyle: { fontFamily: 'heading', fontWeight: 400, letterSpacing: '-0.01em' },
    sizes: {
      lg: { fontSize: 'pageTitle', lineHeight: 1.05 },
      md: { fontSize: '1.25rem', lineHeight: 1.15, fontWeight: 500 },
      sm: { fontSize: 'cardTitle', lineHeight: 1.25, fontWeight: 500 },
    },
  },
  Button: {
    baseStyle: {
      fontFamily: 'body',
      fontWeight: 600,
      borderRadius: 'chip',
      // Focus ring is defined once, globally, in styles.global (theme-patch.ts §5).
    },
    sizes: {
      // Every tappable control is >= 44px tall on phone.
      md: { h: '44px', minW: '44px', fontSize: '0.875rem', px: 4 },
      sm: { h: '34px', minW: '34px', fontSize: '0.75rem', px: 3 },
      lg: { h: '52px', fontSize: '0.9375rem', px: 5, borderRadius: 'field' },
    },
    variants: {
      solid: {
        bg: 'brand.500',
        color: 'paper.base',
        _hover: { bg: 'brand.600', _disabled: { bg: 'brand.500' } },
        _active: { bg: 'brand.700' },
        _disabled: { bg: 'paper.sunken', color: 'ink.300', opacity: 1 },
      },
      outline: {
        bg: 'transparent',
        borderWidth: '1px',
        borderColor: 'line.brand',
        color: 'brand.500',
        _hover: { bg: 'brand.50' },
      },
      // Neutral secondary — "Not interested", "Remove".
      quiet: {
        bg: 'transparent',
        borderWidth: '1px',
        borderColor: 'line.DEFAULT',
        color: 'ink.400',
        _hover: { bg: 'paper.subtle', color: 'ink.700' },
      },
      ghost: { color: 'ink.400', _hover: { bg: 'paper.subtle' } },
    },
    defaultProps: { variant: 'solid' },
  },
  Badge: {
    baseStyle: {
      fontFamily: 'body',
      fontWeight: 600,
      textTransform: 'none',
      borderRadius: 'chip',
      px: 2.5,
      py: 1.5,
      fontSize: 'meta',
      lineHeight: 1,
    },
    variants: {
      count: { bg: 'brand.100', color: 'brand.500' },
      countFull: { bg: 'brand.500', color: 'paper.base' },
      rosie: { bg: 'heart.50', color: 'heart.500' },
      muted: { bg: 'paper.sunken', color: 'ink.300' },
    },
    defaultProps: { variant: 'count' },
  },
  Checkbox: {
    baseStyle: {
      control: {
        borderRadius: '6px',
        borderWidth: '1.6px',
        borderColor: 'line.dashed',
        bg: 'paper.base',
        _checked: {
          bg: 'brand.500',
          borderColor: 'brand.500',
          color: 'paper.base',
          _hover: { bg: 'brand.600', borderColor: 'brand.600' },
        },
        _disabled: { bg: 'paper.sunken', borderColor: 'paper.sunken' },
      },
      label: { fontFamily: 'body', fontSize: '0.8125rem', color: 'ink.700', ml: 2 },
    },
    sizes: { md: { control: { w: '19px', h: '19px' } } },
  },
  Switch: {
    baseStyle: {
      track: { bg: 'line.DEFAULT', _checked: { bg: 'brand.500' } },
    },
  },
  Input: {
    variants: {
      filled: {
        field: {
          bg: 'paper.subtle',
          borderWidth: '1px',
          borderColor: 'line.brandSubtle',
          borderRadius: 'field',
          h: '50px',
          fontSize: '0.9375rem',
          _hover: { bg: 'paper.subtle' },
          _focusVisible: { bg: 'paper.base', borderColor: 'brand.300', boxShadow: 'none' },
        },
      },
    },
    defaultProps: { variant: 'filled' },
  },
  FormLabel: {
    baseStyle: { fontFamily: 'body', fontSize: 'meta', fontWeight: 500, color: 'ink.700', mb: 2 },
  },
  Select: {
    variants: {
      outline: {
        field: {
          borderColor: 'line.DEFAULT',
          borderRadius: 'chip',
          h: '38px',
          fontSize: 'meta',
          _focusVisible: { borderColor: 'brand.300', boxShadow: 'none' },
        },
      },
    },
  },
  Menu: {
    baseStyle: {
      list: {
        bg: 'paper.base',
        borderWidth: '1px',
        borderColor: 'line.subtle',
        borderRadius: 'card',
        boxShadow: 'raised',
        py: 1.5,
        minW: '10rem',
      },
      item: {
        fontFamily: 'body',
        fontSize: '0.8125rem',
        color: 'ink.700',
        px: 3,
        py: 2,
        bg: 'transparent',
        _hover: { bg: 'paper.subtle', color: 'ink.900' },
        _focus: { bg: 'paper.subtle', color: 'ink.900' },
        _active: { bg: 'brand.50' },
      },
      groupTitle: {
        fontFamily: 'body',
        fontSize: 'eyebrow',
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: 'ink.400',
        mx: 3,
        my: 2,
      },
    },
  },
  Textarea: {
    variants: {
      filled: {
        bg: 'paper.subtle',
        borderWidth: '1px',
        borderColor: 'line.brandSubtle',
        borderRadius: 'field',
        fontSize: '0.875rem',
        _hover: { bg: 'paper.subtle' },
        _focusVisible: { bg: 'paper.base', borderColor: 'brand.300', boxShadow: 'none' },
      },
    },
    defaultProps: { variant: 'filled' },
  },
  CloseButton: {
    baseStyle: {
      color: 'ink.400',
      borderRadius: 'chip',
      _hover: { bg: 'transparent', color: 'ink.700' },
    },
    sizes: {
      sm: { w: '16px', h: '16px', fontSize: '9px' },
    },
  },
  Alert: {
    baseStyle: {
      container: {
        borderRadius: 'field',
        borderWidth: '1px',
        fontFamily: 'body',
        fontSize: 'meta',
        lineHeight: 1.45,
        px: 3,
        py: '11px',
        alignItems: 'flex-start',
      },
      icon: { w: '16px', h: '16px', mr: 2, mt: '1px', flexShrink: 0 },
    },
    variants: {
      subtle: (props: { status?: string }) => {
        const map: Record<string, { bg: string; borderColor: string; color: string }> = {
          error: { bg: 'heart.50', borderColor: 'heart.200', color: 'heart.700' },
          success: { bg: 'brand.50', borderColor: 'line.brandSubtle', color: 'brand.600' },
          info: { bg: 'paper.subtle', borderColor: 'line.subtle', color: 'ink.700' },
          warning: { bg: 'heart.50', borderColor: 'heart.200', color: 'heart.700' },
        };
        const tone = map[props.status ?? 'info'] ?? map.info;
        return { container: tone, icon: { color: tone.color } };
      },
    },
    defaultProps: { variant: 'subtle' },
  },
  Spinner: { baseStyle: { color: 'brand.500' } },
};

export const theme = extendTheme({
  config,
  colors,
  semanticTokens,
  fonts,
  fontSizes,
  radii,
  shadows,
  textStyles,
  layerStyles,
  components,
  styles: {
    global: {
      body: { bg: 'paper.base', color: 'ink.900', textRendering: 'optimizeLegibility' },
      '*::selection': { bg: 'brand.100' },
      // Olive focus ring on every focusable control, not just Button (theme-patch.ts §5).
      'a:focus-visible, button:focus-visible, [role="button"]:focus-visible, input:focus-visible, select:focus-visible, textarea:focus-visible, [tabindex]:focus-visible':
        {
          outline: 'none',
          boxShadow: '0 0 0 3px rgba(74, 103, 65, 0.28)',
          borderRadius: 'control',
        },
    },
  },
});

export default theme;
