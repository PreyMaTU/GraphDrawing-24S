
import fs from 'node:fs';
import {
  loadDatasets,
  mergeIntoGdpData,
  mapIntoRegionTable,
  mergeIntoCountries
} from './src/data.js';
import { visualize } from './src/visualize.js';

async function prepareData() {
  const { olympics, gdp, codes, ioc, committees }= await loadDatasets();
  const regionTable= mapIntoRegionTable( committees );
  const countryGdps= mergeIntoGdpData( gdp, codes, ioc );
  const countries= mergeIntoCountries( olympics, countryGdps, regionTable );

  return { countries };
}


/*console.log( countries.map( c => c.noc ).join() )
console.log("\n")
console.log( countries.map( c => c.name ).join() )
console.log("\n")
console.log( [...countryGdps.keys()].join() )*/

const { countries }= await prepareData();
const body= visualize( countries );
const svgText= body.html();
// console.log( svgText );
fs.writeFileSync( './out.svg', svgText );
