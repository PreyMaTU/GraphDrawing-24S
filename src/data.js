import * as d3 from 'd3';
import stripBom from 'strip-bom';
import fs from 'node:fs/promises';

import { CombinedCountry, Country, SportCategory, Medal, Region } from './country.js';

export async function readProjectRelativeFile(relativePath) {
  return stripBom(await fs.readFile(new URL(relativePath, import.meta.url), 'utf-8'));
}

export async function loadDatasets() {
  const [olympics, gdp, codes, ioc, committees, displayNames, defunct] = await Promise.all([
    readProjectRelativeFile('../data/olympics.json'),
    readProjectRelativeFile('../data/gdp_per_capita.csv'),
    readProjectRelativeFile('../data/country_codes.csv'),
    readProjectRelativeFile('../data/ioc_codes.csv'),
    readProjectRelativeFile('../data/olympic_committees.csv'),
    readProjectRelativeFile('../data/country_display_names.csv'),
    readProjectRelativeFile('../data/defunct_countries.json'),
  ]);

  // Drop the header row and convert it into an indexing object
  const gdpRows= d3.csvParseRows(gdp);
  gdpRows.columns= gdpRows.shift().reduce( (obj, columnName, idx) => { obj[columnName]= idx; return obj; }, {});

  return {
    olympics: JSON.parse(olympics),
    gdp: gdpRows,
    codes: d3.csvParse(codes),
    ioc: d3.csvParse(ioc),
    committees: d3.csvParse(committees),
    displayNames: d3.csvParse(displayNames),
    defunct: JSON.parse(defunct),
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
  const countriesByIso = new Map();

  // Populate the map with the iso code as key and the country name as value (noc needed later)
  for (const row of ioc) {
    const { country: name, IOC: noc, ISO: iso3 } = row;

    // Skip (iso3 -> name) rows of countries without valid NOC
    if (!noc || !noc.trim().length) {
      continue;
    }

    countriesByIso.set(iso3, { name: name, ioc: noc, iso2: null, value: -1 });
  }

  // Find iso2 for each country in the map (for icons)
  for (const row of codes) {
    const [iso2, iso3, isoNum] = row['ISO 3166'].split('|');

    // Set the iso2 field on each entry
    const entry = countriesByIso.get(iso3);
    if( entry ) {
      entry.iso2= iso2;
    }
  }

  // Find gdp per capita based on the country name
  const gdpCountryCodeColumnIndex= gdp.columns['Country Code'];
  for (const row of gdp) {
    // Find the last non-empty column
    const gdpPerCap = row.findLast( column => column && column.trim().length );
    const iso3 = row[ gdpCountryCodeColumnIndex ];

    const entry = countriesByIso.get(iso3);
    if (!entry) {
      continue;
    }

    // Try to parse the gdp value into a number
    entry.value = Math.round(parseFloat(gdpPerCap));
    if( Number.isNaN(entry.value) ) {
      console.error(`Could not parse GDP value for ISO '${entry.iso2}' / IOC '${entry.ioc}' with value: '${gdpPerCap}'`);
      entry.value= -1;
    }
  }

  // Swap iso3 and noc around, we want noc to be the key
  const countriesByNoc = new Map();
  for (const {ioc, name, value, iso2} of countriesByIso.values()) {
    countriesByNoc.set(ioc, { name, value, iso2 });
  }

  return countriesByNoc;
}

export function mergeIntoCountries(olympics, countryGdps, regions, displayNames, defunct) {
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

  setAdditionalCountryFields( countries, displayNames, defunct );

  // Handle some (ugly) special cases
  fixDataProblems(countries);

  const countryArray = [...countries.values()];
  for (const country of countryArray) {
    country.countMedals();
  }

  return countryArray;
}

function setAdditionalCountryFields( countries, displayNames, defunct ) {
  // Add shorter custom display names
  const displayNamesMap = new Map();
  displayNames.forEach(({ noc, display_name }) => displayNamesMap.set(noc, display_name));
  countries.forEach(c => (c.displayName = displayNamesMap.get(c.noc)));

  // Set the year of dissolving for defunct countries
  defunct.forEach( ({noc, defunct}) => {
    const country= countries.get(noc);
    if( country) {
      country.defunctSince= defunct; 
    }
  });
}

/**  @param {Country[]} countries */
export function orderIntoOrderedRegions(countries, medalType, orderByRegions= false ) {
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
  if( orderByRegions ) {
    regions.forEach(region => {
      region.countries.forEach(c => (c.index = idx++));
    });
  } else {
    countries
      .sort((a, b) => b.medals(medalType) - a.medals(medalType))
      .forEach(c => (c.index = idx++));
  }

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
    // When the group only has a single country, just add the country itself
    if( group.length < 2 ) {
      countries.push( group[0] );
      return;
    }

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

function fixDataProblems(countries) {
  // Hard-coded merges. Read as ROC -> RUS (ROC is merged into RUS)
  const merges = [
    ['ROC', 'RUS'], // https://en.wikipedia.org/wiki/Russian_Olympic_Committee
    ['AHO', 'NED'], // https://en.wikipedia.org/wiki/Netherlands_Antilles_at_the_Olympics
    ['BOH', 'CZE'], // https://de.wikipedia.org/wiki/Olympische_Geschichte_B%C3%B6hmens
    ['FRG', 'GER'], // West Germany continued as Germany, the DDR was consumed
    ['UAR', 'EGY'], // United Arab Republic is now Egypt according to https://en.wikipedia.org/wiki/List_of_IOC_country_codes
  ];

  // ROC = Russian Olympic Committee
  // URS = Soviet Union
  // BOH = Bohemia
  // GDR = Germany (Soviet)
  // ANZ = Australia + New Zealand
  // YUG = Yugoslavia
  // IOA = Independent
  // WIF = West Indies Federation (Jamaica, Antigua, Barbados, etc.)
  // FRG = Germany (Western)
  // SCG = Serbia & Montenegro
  // UAR = United Arab Republic (Egypt)
  // EUN = United Team (Former Soviet Republics, 1992)
  // AHO = Dutch Antilles (2012 IOA, then dutch or aruba)
  // TCH = Czechoslovakia

  for (const mergePair of merges) {
    const [a, b] = mergePair;

    const oldCountry = countries.get(a);
    const newCountry = countries.get(b);

    oldCountry.mergeWith(newCountry);
    countries.delete(oldCountry.noc);
  }
}
