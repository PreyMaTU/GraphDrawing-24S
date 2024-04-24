
import fs from 'node:fs';
import {
  loadDatasets,
  mergeIntoGdpData,
  mapIntoRegionTable,
  mergeIntoCountries,
  orderIntoOrderedRegions
} from './src/data.js';
import { visualize } from './src/visualize.js';

async function prepareData() {
  const { olympics, gdp, codes, ioc, committees }= await loadDatasets();
  const regionTable= mapIntoRegionTable( committees );
  const countryGdps= mergeIntoGdpData( gdp, codes, ioc );
  const countries= mergeIntoCountries( olympics, countryGdps, regionTable );
  return orderIntoOrderedRegions( countries, 'gold' );
}


/*console.log( countries.map( c => c.noc ).join() )
console.log("\n")
console.log( countries.map( c => c.name ).join() )
console.log("\n")
console.log( [...countryGdps.keys()].join() )*/

const { countries, regions }= await prepareData();
const body= visualize( countries, regions );
const svgText= body.html();
// console.log( svgText );
fs.writeFileSync( './out.svg', svgText );
