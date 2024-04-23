
import fs from 'node:fs';
import { loadDatasets, mapGdpData, mapRegion } from './src/data.js';
import { mapCountries } from './src/country.js';
import { visualize } from './src/visualize.js';

const { olympics, gdp, codes, ioc, committees }= await loadDatasets();
const regions= mapRegion( committees );
const countryGdps= mapGdpData( gdp, codes, ioc );
const countries= mapCountries( olympics, countryGdps, regions )


/*console.log( countries.map( c => c.noc ).join() )
console.log("\n")
console.log( countries.map( c => c.name ).join() )
console.log("\n")
console.log( [...countryGdps.keys()].join() )*/

const body= visualize( countries );
const svgText= body.html();
// console.log( svgText );
fs.writeFileSync( './out.svg', svgText );
