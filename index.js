import fs from 'node:fs';
import {
  loadDatasets,
  mergeIntoGdpData,
  mapIntoRegionTable,
  mergeIntoCountries,
  orderIntoOrderedRegions,
  filterTopCountriesAndMergeRest,
} from './src/data.js';
import { visualize } from './src/visualize.js';

async function prepareData() {
  const { olympics, gdp, codes, ioc, committees } = await loadDatasets();
  const regionTable = mapIntoRegionTable(committees);
  const countryGdps = mergeIntoGdpData(gdp, codes, ioc);
  const countries = mergeIntoCountries(olympics, countryGdps, regionTable);

  const medalType = 'gold';
  const filteredCountries = filterTopCountriesAndMergeRest(countries, 40, medalType);

  await Promise.all(filteredCountries.map(c => c.loadIcon()));

  return orderIntoOrderedRegions(filteredCountries, medalType);
}

const { countries, regions } = await prepareData();
const body = visualize(countries, regions);
const svgText = body.html();
// console.log( svgText );
fs.writeFileSync('./out.svg', svgText);
