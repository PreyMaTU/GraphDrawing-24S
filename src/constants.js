export default {
  width: 1050,
  height: 1050,
  margin: 150,
  centerMarginPercent: 0.4,
  centerNodePercent: 0.5,
  centerTimeTicksPercent: 0.75,
  backgroundColor: '#ffffff',
  defunctOpacity: 0.6, // 0.0 - 1.0
  edgeBaseColorIntensity: 0.15,
  countryNameOffset: 50,
  countryIconOffset: 25,
  timeSteps: 5,
  scaleTickLength: 5,

  categoryCount: 11,
  countryCount: 35,

  categoryIndices: {
    shooting: 0,
    fighting: 1,
    cycling: 2,
    swimming: 3,
    gymnastics: 4,
    athletics: 5,
    equestrian: 6,
    boating: 7,
    other: 8,
    racquets: 9,
    teams: 10,
  },

  categoryColors: {
    shooting: '#1f77b4',
    fighting: '#ff7f0e',
    cycling: '#2ca02c',
    swimming: '#d62728',
    gymnastics: '#9467bd',
    athletics: '#8c564b',
    equestrian: '#e377c2',
    boating: '#7f7f7f',
    other: '#bcbd22',
    racquets: '#17becf',
    teams: '#ff0e7e',
  },

  regionColors: {
    Europe: '#0081C8',
    Asia: '#FCB131',
    Africa: '#000000',
    Oceania: '#00A651',
    America: '#EE334E',
    'No Region': '#FFFFFF',
  },

  spiralColor: '#c098f7',
  defunctColor: '#BBB',

  // Computed
  radius: -1,
  center: null,
  centerMargin: -1,
};
