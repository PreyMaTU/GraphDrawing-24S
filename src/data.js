import * as d3 from 'd3';
import stripBom from 'strip-bom';
import fs from 'node:fs/promises';

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

export function mapRegion( committees ) {
  const regionsByNoc= new Map();
  for( const row of committees ) {
    const { Code: noc, Region: region }= row;
    regionsByNoc.set( noc, region );
  }

  return regionsByNoc;
}

export function mapGdpData( gdp, codes, ioc ) {
  const countriesByName= new Map();

  for( const row of gdp ) {
    const { name, value: valueText }= row;

    const value= parseInt( valueText.replace(/[^\d]/g, '') );
    if( Number.isNaN( value ) ) {
      console.error(`Could not parse GDP value for '${name}' with '${valueText}'`);
    }

    countriesByName.set( name, { name, value });
  }

  const isoCodes= new Map();
  for( const row of codes ) {
    isoCodes.set( row.GENC, row.Name );
  }

  const countriesByNoc= new Map();
  for( const row of ioc ) {
    const { IOC: noc, ISO: iso }= row;

    if( !noc || !noc.trim().length ) {
      continue;
    }

    const ciaName= isoCodes.get( iso );
    if( !ciaName ) {
      console.error(`Could not find the name of country with ISO code '${iso}' / IOC '${noc}'`);
      continue;
    }

    const country= countriesByName.get( ciaName );
    if( !country ) {
      console.error(`Could not find country GDP by country name '${ciaName}'`);
      continue;
    }

    countriesByNoc.set( noc, country );
  }

  return countriesByNoc;
}
