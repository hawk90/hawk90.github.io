import { defineEcConfig } from 'astro-expressive-code';
import { pluginLineNumbers } from '@expressive-code/plugin-line-numbers';

export default defineEcConfig({
  plugins: [pluginLineNumbers()],
  themes: [
    'github-dark-dimmed',
    'github-light',
    'dracula',
    'one-dark-pro',
    'catppuccin-mocha',
    'catppuccin-latte',
    'nord',
    'tokyo-night',
  ],
  // Switch theme purely by the data-code-theme attribute on <html>.
  // The inline pre-paint script in BaseLayout writes the correct value
  // (a dark theme in dark mode, a light theme in light mode), so we
  // don't need to encode mode into the selector — and avoiding :not()
  // sidesteps an expressive-code selector-merge quirk that produced
  // `.expressive-codehtml:not(...)` (mashed together, never matched).
  themeCssSelector: (theme) => `[data-code-theme="${theme.name}"]`,
  emitExternalStylesheet: false,
  styleOverrides: {
    borderRadius: '0.5rem',
    codeFontFamily: 'var(--font-mono)',
    codeFontSize: '0.9rem',
    codeLineHeight: '1.7',
    codePaddingBlock: '1rem',
    codePaddingInline: '1.25rem',
    frames: {
      shadowColor: 'transparent',
    },
  },
  defaultProps: {
    showLineNumbers: true,
    wrap: true,
  },
});
