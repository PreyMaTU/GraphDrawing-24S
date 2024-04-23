
import * as d3 from 'd3';
import { loadDatasets, mapGdpData } from './src/data.js';
import { mapCountries } from './src/country.js';

const { olympics, gdp, codes, ioc }= await loadDatasets()
const countryGdps= mapGdpData( gdp, codes, ioc );
const countries= mapCountries( olympics, countryGdps )


/*console.log( countries.map( c => c.noc ).join() )
console.log("\n")
console.log( countries.map( c => c.name ).join() )
console.log("\n")
console.log( [...countryGdps.keys()].join() )*/

