const { getDefaultConfig } = require('expo/metro-config');
const { withUniwindConfig } = require('uniwind/metro');

const config = getDefaultConfig(__dirname);

// withUniwindConfig debe ser el wrapper EXTERNO de todo el config (docs.uniwind.dev).
module.exports = withUniwindConfig(config, {
  // Punto de entrada CSS: su ubicación define la raíz de escaneo de classNames (src/).
  cssEntryFile: './src/global.css',
  dtsFile: './src/uniwind-types.d.ts',
});
