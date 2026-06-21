export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: '#f8fbff',
        panel: 'rgba(255,255,255,0.85)',
        accent: '#8b8af5',
        violetSoft: '#ede9ff',
        ice: '#eef7ff'
      },
      boxShadow: {
        soft: '0 35px 120px rgba(100, 116, 139, 0.08)'
      },
      backdropBlur: {
        xs: '2px'
      }
    }
  },
  plugins: []
};
