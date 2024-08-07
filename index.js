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
import { visualize_category_venn_diagramm } from './src/category_venn_diagramm.js';

import Constants from './src/constants.js';

async function loadData() {
  const {
    olympics,
    gdp,
    codes,
    ioc,
    committees,
    displayNames,
    defunct,
    svgOffsets,
    categoryCombinations,
    popData,
  } = await loadDatasets();
  const regionTable = mapIntoRegionTable(committees);
  const countryGdps = mergeIntoGdpData(gdp, codes, ioc, popData);
  const countries = mergeIntoCountries(olympics, countryGdps, regionTable, displayNames, defunct, svgOffsets);

  return [countries, categoryCombinations, svgOffsets];
}

async function prepareData(medalType) {
  const [countries, categoryCombinations, svgOffsets] = await loadData();
  const filteredCountries = filterTopCountriesAndMergeRest(
    countries,
    Constants.countryCount,
    medalType,
    Constants.useAbsolute,
    svgOffsets
  );

  await Promise.all(filteredCountries.map(c => c.loadIcon()));

  return [orderIntoOrderedRegions(filteredCountries, medalType), categoryCombinations];
}

const medalType = 'total';

const [{ countries, regions }, categoryCombinations] = await prepareData(medalType.toLowerCase());
const body = visualize(countries, regions, medalType);
//const body = visualize_category_venn_diagramm(categoryCombinations);
const svgText = body.html();
fs.writeFileSync('./out.svg', svgText);
