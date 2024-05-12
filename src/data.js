import * as d3 from 'd3';
import stripBom from 'strip-bom';
import fs from 'node:fs/promises';

import { CombinedCountry, Country, SportCategory, Medal, Region } from './country.js';

export async function readProjectRelativeFile(relativePath) {
  return stripBom(await fs.readFile(new URL(relativePath, import.meta.url), 'utf-8'));
}

export async function loadDatasets() {
  const [olympics, gdp, codes, ioc, committees, displayNames] = await Promise.all([
    readProjectRelativeFile('../data/olympics.json'),
    readProjectRelativeFile('../data/gdp_per_capita.csv'),
    readProjectRelativeFile('../data/country_codes.csv'),
    readProjectRelativeFile('../data/ioc_codes.csv'),
    readProjectRelativeFile('../data/olympic_committees.csv'),
    readProjectRelativeFile('../data/country_display_names.csv'),
  ]);

  return {
    olympics: JSON.parse(olympics),
    gdp: d3.csvParse(gdp),
    codes: d3.csvParse(codes),
    ioc: d3.csvParse(ioc),
    committees: d3.csvParse(committees),
    displayNames: d3.csvParse(displayNames),
  };
}

export function mapIntoRegionTable(committees) {
  const regionsByNoc = new Map();
  for (const row of committees) {
    const { Code: noc, Region: region } = row;
    regionsByNoc.set(noc, region);
  }

  return regionsByNoc;
}

/**
 * Merges the 3 provided datasets into one.
 * 
 * @param {*} gdp   The gdp dataset (i.e., gdp_per_capita.csv).
 * @param {*} codes The country code dataset (i.e., country_codes.csv).
 * @param {*} ioc   The ioc dataset (i.e., ioc_codes.csv).
 * @returns A map in the format [IOC_code (NOC)] -> [{ full_country_name, gdp_per_cap, iso2 }]
 */
export function mergeIntoGdpData(gdp, codes, ioc) {
  console.time('Data merge');
  const countriesByNoc = new Map();
  
  // Populate the map with the ioc code as key and the country name as first value
  for (const row of ioc) {
    const { country: name, IOC: noc, ISO: iso3 } = row;

    // No valid NOC -- but we can ignore this because athletes from overseas territories without an IOC code always represent the respective "main" country anyways, so only the ones with an existing code are of interest to us.
    if (!noc || !noc.trim().length) {
      continue;
    }

    countriesByNoc.set(iso3, { name: name });
  }

  // Find iso2 for each country in the map (NOTE: Do we really need this?)
  for (const row of codes) {
    const [iso2, iso3, isoNum] = row['ISO 3166'].split('|');

    const entry = countriesByNoc.get(iso3);
    if (!entry) {
      continue;
    }

    entry.iso2 = iso2;
    countriesByNoc.set(iso3, entry);
  }

  // Find gdp per capita based on the country name
  for (const row of gdp) {
    const gdpPerCap = Object.values(row).reverse().find(el => isNumeric(el));
    const iso3 = row['Country Code'];

    const entry = countriesByNoc.get(iso3);
    if (!entry) {
      continue;
    }

    entry.value = Math.round(parseFloat(gdpPerCap));
    countriesByNoc.set(iso3, entry);
  }

  console.timeEnd('Data merge');

  console.log(countriesByNoc);

  return countriesByNoc;
}

export function mergeIntoCountries(olympics, countryGdps, regions, displayNames) {
  /** @type {Map<string, Country>} */
  const countries = new Map();

  // Create all the countries from the node section
  for (const node of olympics.nodes) {
    if (node.noc) {
      // Try to lookup GDP data for the country
      const gdpData = countryGdps.get(node.noc);
      if (!gdpData) {
        console.error(`Could not find a GDP for NOC '${node.noc}'`);
      }

      // Try to lookup region for the country
      const region = regions.get(node.noc);
      if (!region) {
        console.error(`Could not find a region for NOC '${node.noc}'`);
      }

      const { value: gdp, iso2 } = gdpData || { value: 0, iso2: '' };
      const country = new Country(node.name, node.noc, region || 'No Region', gdp, iso2);
      countries.set(node.noc, country);
    }
  }

  // Populate the countries with their medals
  for (const link of olympics.links) {
    const country = countries.get(link.target);
    if (!country) {
      console.error(`Link refers to unknown country '${link.target}'`);
      continue;
    }

    const category = country[link.source];
    if (!(category instanceof SportCategory)) {
      console.error(`Link refers to unknown sport category '${link.source}'`);
      continue;
    }

    // Iterate over the link's attributes
    for (const attr of link.attr) {
      const year = parseInt(attr.year);
      const medal = new Medal(attr.athlete.name, year, attr.sport);
      category.addMedal(attr.medal, medal);
    }
  }

  // Add shorter custom display names
  const displayNamesMap = new Map();
  displayNames.forEach(({ noc, display_name }) => displayNamesMap.set(noc, display_name));
  countries.forEach(c => (c.displayName = displayNamesMap.get(c.noc)));

  // Handle some (ugly) special cases
  fixDataProblems(countries);

  const countryArray = [...countries.values()];
  for (const country of countryArray) {
    country.countMedals();
  }

  return countryArray;
}

/**  @param {Country[]} countries */
export function orderIntoOrderedRegions(countries, medalType) {
  if (['bronze', 'silver', 'gold', 'total'].indexOf(medalType) < 0) {
    throw Error(`Invalid medal type '${medalType}' for ordering`);
  }

  // Remove countries without any medals
  const unfilteredCount = countries.length;
  countries = countries.filter(c => c.medals(medalType) > 0);
  console.log(
    `Filtered out ${unfilteredCount - countries.length} countries without '${medalType}' medals`
  );

  // Group countries by region
  const groupedCountries = d3.group(countries, c => c.region);

  /** @type {Region[]} */
  const regions = [];
  groupedCountries.forEach((group, name) => {
    // Sort countries within each region by medal count
    group = group.sort((a, b) => b.medals(medalType) - a.medals(medalType));

    // Count the medals per region
    const medals = group.reduce((sum, c) => sum + c.medals(medalType), 0);
    regions.push(new Region(name, medals, group));
  });

  // Sort regions by their total medal counts
  regions.sort((a, b) => b.medals - a.medals);

  // Set the index of each country
  let idx = 0;
  regions.forEach(region => {
    region.countries.forEach(c => (c.index = idx++));
  });

  return { countries, regions };
}

/**
 * @param {Country[]} countries
 * @param {number} count
 * @param {string} medalType
 */
export function filterTopCountriesAndMergeRest(countries, count, medalType) {
  // Split the data into top countries and rest
  countries.sort((a, b) => b.medals(medalType) - a.medals(medalType));

  const rest = countries.slice(count);
  countries = countries.slice(0, count);

  // Merge the rest into combined countries with summed medals, averaged GDP
  const groupedCountries = d3.group(rest, c => c.region);
  groupedCountries.forEach((group, name) => {
    // Calculate combined GDP
    const avgGdp = group.reduce((sum, c) => sum + c.gdp, 0) / group.length;
    const combinedCountry = new CombinedCountry(
      'Combined ' + name,
      '',
      name,
      avgGdp,
      Region.fakeIso2[name] || '',
      group
    );

    // Merge all countries in the group
    combinedCountry.mergeWith(...group);

    countries.push(combinedCountry);
  });

  return countries;
}

/* --- LOCAL HELPER FUNCTIONS --- */
function formatName(name) {
  if (name.includes(',')) {
    name = name.normalize(); // Try to get rid of diacritics etc.
    const frags = name.split(',').map(f => f.trim()); // Split...
    name = frags[1] + ' ' + frags[0]; // ...and swap
  }

  return name;
}

function fixDataProblems(countries) {
  const fakeRussia = countries.get('ROC');
  const realRussia = countries.get('RUS');

  realRussia.mergeWith(fakeRussia);
  countries.delete(fakeRussia.noc);
}

const isNumeric = num => (typeof(num) === 'number' || typeof(num) === "string" && num.trim() !== '') && !isNaN(num);