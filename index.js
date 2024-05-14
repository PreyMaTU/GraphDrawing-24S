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

async function loadData() {
  const { olympics, gdp, codes, ioc, committees, displayNames, defunct } = await loadDatasets();
  const regionTable = mapIntoRegionTable(committees);
  const countryGdps = mergeIntoGdpData(gdp, codes, ioc);
  const countries = mergeIntoCountries(olympics, countryGdps, regionTable, displayNames, defunct);

  return countries;
}

async function prepareData(medalType) {
  const countries = await loadData();
  const filteredCountries = filterTopCountriesAndMergeRest(countries, 40, medalType);

  await Promise.all(filteredCountries.map(c => c.loadIcon()));

  return orderIntoOrderedRegions(filteredCountries, medalType);
}

const medalType = 'Gold';

const { countries, regions } = await prepareData(medalType.toLowerCase());
const body = visualize(countries, regions, medalType);
const svgText = body.html();
// console.log( svgText );
fs.writeFileSync('./out.svg', svgText);
