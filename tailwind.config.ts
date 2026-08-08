import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#333333',
          dark: '#1a1a1a',
          light: '#4d4d4d',
        },
        secondary: {
          DEFAULT: '#666666',
          dark: '#4d4d4d',
          light: '#808080',
        },
        success: {
          DEFAULT: '#4CAF50',
          dark: '#388E3C',
          light: '#81C784',
        },
        warning: {
          DEFAULT: '#FFC107',
          dark: '#FFA000',
          light: '#FFD54F',
        },
        danger: {
          DEFAULT: '#F44336',
          dark: '#D32F2F',
          light: '#E57373',
        },
        info: {
          DEFAULT: '#2196F3',
          dark: '#1976D2',
          light: '#64B5F6',
        },
        'dark-bg': '#1a1a1a',
        'dark-card': '#2a2a2a',
        'dark-border': '#444444',
        'light-text': '#e0e0e0',
        'medium-text': '#b0b0b0',
        'dark-text': '#808080',
        'accent-gray': '#666666',
        'accent-color': '#cac292',
        'accent-color-light': '#e0d8b0',
        'accent-color-dark': '#8b8460',
        'link-DEFAULT': '#cac292',
        'link-hover': '#e0d8b0',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'sans-serif'],
        serif: ['var(--font-merriweather)', 'Merriweather', 'serif'],
        mono: ['var(--font-fira-code)', 'Fira Code', 'monospace'],
      },
      spacing: {
        '72': '18rem',
        '84': '21rem',
        '96': '24rem',
      },
      screens: {
        xs: '480px',
      },
    },
  },
  safelist: [
    'text-success-DEFAULT',
    'border-success-DEFAULT',
    'hover:bg-success-light',
    'text-danger-DEFAULT',
    'border-danger-DEFAULT',
    'hover:bg-danger-light',
    'text-info-DEFAULT',
    'border-info-DEFAULT',
    'hover:bg-info-light',
    'text-warning-DEFAULT',
    'border-warning-DEFAULT',
    'hover:bg-warning-light',
    'text-primary-DEFAULT',
    'border-primary-DEFAULT',
    'hover:bg-primary-light',
    'text-secondary-DEFAULT',
    'border-secondary-DEFAULT',
    'hover:bg-secondary-light',
    'text-link-DEFAULT',
    'hover:text-link-hover',
  ],
  plugins: [],
};

export default config;
