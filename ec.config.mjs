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
  themeCssSelector: (theme) => {
    const lightThemes = ['github-light', 'catppuccin-latte'];
    const isLight = lightThemes.includes(theme.name);

    if (isLight) {
      // Light themes: only apply in light mode
      return `html.light[data-code-theme="${theme.name}"]`;
    }
    // Dark themes: only apply in dark mode (not .light)
    return `html:not(.light)[data-code-theme="${theme.name}"]`;
  },
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
