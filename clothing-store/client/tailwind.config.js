/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#000000',
        paper: '#FAFAF8',
        mist: '#EDEAE4',
        sand: '#D8CFC2',
        stone: '#8C857B',
        sale: '#8A1C1C',
      },
      fontFamily: {
        display: ['"Bodoni Moda"', 'Didot', '"Times New Roman"', 'serif'],
        sans: ['Jost', '"Futura"', '"Century Gothic"', 'system-ui', 'sans-serif'],
      },
      letterSpacing: { wordmark: '-0.04em' },
      keyframes: {
        rise: { '0%': { transform: 'translateY(40%)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
        slidein: { '0%': { transform: 'translateX(100%)' }, '100%': { transform: 'translateX(0)' } },
        fadein: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
      },
      animation: {
        rise: 'rise 1.1s cubic-bezier(.2,.7,.1,1) both',
        slidein: 'slidein .35s cubic-bezier(.2,.7,.1,1) both',
        fadein: 'fadein .25s ease both',
      },
    },
  },
  plugins: [],
};
