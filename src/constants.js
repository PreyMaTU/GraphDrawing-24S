export default {
  width: 1150,
  height: 1150,
  margin: 200,
  centerMarginPercent: 0.4,
  centerNodePercent: 0.5,
  centerTimeTicksPercent: 0.75,
  defunctOpacity: 0.6, // 0.0 - 1.0
  edgeBaseColorIntensity: 0.15,
  countryNameOffset: 50,
  countryIconOffset: 25,
  timeSteps: 5,
  scaleTickLength: 7,

  categoryCount: 11,
  countryCount: 35,

  useAbsolute: true,
  useBackground: true, // set to false for a transparent bg (likely what you want for exporting)

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

  colors: {
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

    backgroundColor: '#252222', // "light mode" '#ffffff'
    spiralColor: '#919eee', // "light mode" '#c098f7'
    edgeColor: '#999999', // "light mode" '#aaa'
    countryLabelColor: '#ffffff', // "light mode" '#000'
    barChartColor: '#f0f0f0', // "light mode" '#000'
    timeRingColor: '#555555', // "light mode" '#d3d3d3'

    centerNodeDotColor: '#999999', // "light mode" '#aaa'
    centerStructureColor: '#f0f0f0',
  },

  // Computed
  radius: -1,
  center: null,
  centerMargin: -1,
};
