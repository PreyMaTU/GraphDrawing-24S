import * as d3 from 'd3';
import stripBom from 'strip-bom';
import fs from 'node:fs/promises';

import { Country, SportCategory, Medal, Region } from './country.js';

async function readProjectRelativeFile( relativePath ) {
  return stripBom( await fs.readFile( new URL( relativePath, import.meta.url ), 'utf-8' ) );
}

export async function loadDatasets() {
  const [ olympics, gdp, codes, ioc, committees ]= await Promise.all([
    readProjectRelativeFile( '../data/olympics.json' ),
    readProjectRelativeFile( '../data/gdp_per_capita.csv' ),
    readProjectRelativeFile( '../data/country_codes.csv' ),
    readProjectRelativeFile( '../data/ioc_codes.csv' ),
    readProjectRelativeFile( '../data/olympic_committees.csv' )
  ]);

  return {
    olympics: JSON.parse( olympics ),
    gdp: d3.csvParse( gdp ),
    codes: d3.csvParse( codes ),
    ioc: d3.csvParse( ioc ),
    committees: d3.csvParse( committees )
  };
}

export function mapIntoRegionTable( committees ) {
  const regionsByNoc= new Map();
  for( const row of committees ) {
    const { Code: noc, Region: region }= row;
    regionsByNoc.set( noc, region );
  }

  return regionsByNoc;
}

export function mergeIntoGdpData( gdp, codes, ioc ) {

  // Create a map from CIA GDP values
  // name -> {name, value}
  const countriesByName= new Map();
  for( const row of gdp ) {
    const { name, value: valueText }= row;

    const value= parseInt( valueText.replace(/[^\d]/g, '') );
    if( Number.isNaN( value ) ) {
      console.error(`Could not parse GDP value for '${name}' with '${valueText}'`);
    }

    countriesByName.set( name, { name, value });
  }

  // Create a map for conversion from iso code to CIA name
  // ISO -> name
  const isoCodes= new Map();
  for( const row of codes ) {
    isoCodes.set( row.GENC, row.Name );
  }

  // Join the the three data sets together to create a map
  // of IOC codes (NOC) to a countries name and GDP value
  // NOC -> { name, value }
  const countriesByNoc= new Map();
  for( const row of ioc ) {
    // NOC -> ISO
    const { IOC: noc, ISO: iso }= row;

    // No valid NOC
    if( !noc || !noc.trim().length ) {
      continue;
    }

    // Get NOC -> ISO -> name
    const ciaName= isoCodes.get( iso );
    if( !ciaName ) {
      console.error(`Could not find the name of country with ISO code '${iso}' / IOC '${noc}'`);
      continue;
    }

    // Get NOC -> ISO -> name -> { name, value }
    const country= countriesByName.get( ciaName );
    if( !country ) {
      console.error(`Could not find country GDP by country name '${ciaName}'`);
      continue;
    }

    // Set NOC -> { name, value }
    countriesByNoc.set( noc, country );
  }

  return countriesByNoc;
}

export function mergeIntoCountries( olympics, countryGdps, regions ) {
  /** @type {Map<string, Country>} */
  const countries= new Map();

  // Create all the countries from the node section
  for( const node of olympics.nodes ) {
    if( node.noc ) {
      // Try to lookup GDP data for the country
      const gdpData= countryGdps.get( node.noc );
      if( !gdpData ) {
        console.error(`Could not find a GDP for NOC '${node.noc}'`);
      }

      // Try to lookup region for the country
      const region= regions.get( node.noc );
      if( !region ) {
        console.error(`Could not find a region for NOC '${node.noc}'`);
      }

      const country= new Country( node.name, node.noc, region || 'No Region', gdpData ? gdpData.value : 0 );
      countries.set( node.noc, country );
    }
  }

  // Populate the countries with their medals
  for( const link of olympics.links ) {
    const country= countries.get( link.target )
    if( !country ) {
      console.error( `Link refers to unknown country '${link.target}'` );
      continue;
    }

    const category= country[link.source];
    if( !(category instanceof SportCategory) ) {
      console.error( `Link refers to unknown sport category '${link.source}'` );
      continue;
    }

    // Iterate over the link's attributes
    for( const attr of link.attr ) {
      const medal= new Medal( attr.athlete.name, attr.year, attr.sport );
      category.addMedal( attr.medal, medal );
    }
  }

  // Handle some (ugly) special cases
  fixDataProblems( countries );

  const countryArray= [ ...countries.values() ];
  for( const country of countryArray ) {
    country.countMedals();
    country.orderMedals();
  }

  return countryArray;
}


export function fixDataProblems( countries ) {
  const fakeRussia= countries.get('ROC');
  const realRussia= countries.get('RUS');

  realRussia.mergeWith( fakeRussia );
  countries.delete( fakeRussia.noc );
}


/**  @param {Country[]} countries */
export function orderIntoOrderedRegions( countries, medalType ) {
  if( ['bronze', 'silver', 'gold', 'total'].indexOf(medalType) < 0 ) {
    throw Error(`Invalid medal type '${medalType}' for ordering`);
  }

  function medalsOf( country ) {
    return country[ medalType+ 'Medals' ];
  }

  // Remove countries without any medals
  const unfilteredCount= countries.length;
  countries= countries.filter( c => medalsOf(c) > 0 );
  console.log(`Filtered out ${unfilteredCount- countries.length} countries without '${medalType}' medals`);

  // Group countries by region
  const groupedCountries = d3.group(countries, c => c.region);

  /** @type {Region[]} */
  const regions= [];
  groupedCountries.forEach((group, name) => {
    // Sort countries within each region by medal count
    group= group.sort((a, b) => medalsOf(b) - medalsOf(a) );

    // Count the medals per region
    const medals= group.reduce( (sum, c) => sum+ medalsOf(c), 0 );
    regions.push( new Region(name, medals, group) );
  });

  // Sort regions by their total medal counts
  regions.sort((a, b) => b.medals- a.medals);

  // Set the index of each country
  let idx= 0;
  regions.forEach( region => {
    region.countries.forEach( c => c.index= idx++ );
  });


  return { countries, regions };
}