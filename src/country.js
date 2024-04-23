
class Medal {
  /**
   * @param {string} athlete 
   * @param {year} year 
   * @param {string} sport
   */
  constructor(athlete, year, sport) {
    this.athlete= athlete;
    this.year= year;
    this.sport= sport;
  }
}

class SportCategory {
  /** @param {string} name */
  constructor( name ) {
    this.name= name;
    
    /** @type {Medal[]} */
    this.goldMedals= [];
    /** @type {Medal[]} */
    this.silverMedals= [];
    /** @type {Medal[]} */
    this.bronzeMedals= [];
  }

  addMedal( type, medal ) {
    switch( type ) {
      case 'Gold': this.goldMedals.push( medal ); break;
      case 'Silver': this.silverMedals.push( medal ); break;
      case 'Bronze': this.bronzeMedals.push( medal ); break;
      default:
        console.error(`Cannot add unknown medal type '${type}'`);
        break;
    }
  }

  orderMedals() {
    function comparator( a, b ) {
      return a.year - b.year;
    }

    this.goldMedals.sort( comparator );
    this.silverMedals.sort( comparator );
    this.bronzeMedals.sort( comparator );
  }

  /** @param {SportCategory} other */
  mergeWith( other ) {
    this.goldMedals.push( ...other.goldMedals );
    this.silverMedals.push( ...other.silverMedals );
    this.bronzeMedals.push( ...other.bronzeMedals );
  }
}

export class Country {
  static Categories= [
    'shooting', 'fighting', 'cycling', 'swimming', 'gymnastics',
    'athletics', 'equestrian', 'boating', 'other', 'racquets', 'teams'
  ];

  /**
   * @param {string} name 
   * @param {string} noc
   * @param {string} region
   * @param {number} gdp GPD per capita
   */
  constructor(name, noc, region, gdp) {
    this.name= name;
    this.noc= noc;
    this.region= region;
    this.gdp= gdp;

    this.totalMedals= 0;
    this.goldMedals= 0;
    this.silverMedals= 0;
    this.bronzeMedals= 0;

    this.shooting= new SportCategory('shooting');
    this.fighting= new SportCategory('fighting');
    this.cycling= new SportCategory('cycling');
    this.swimming= new SportCategory('swimming');
    this.gymnastics= new SportCategory('gymnastics');
    this.athletics= new SportCategory('athletics');
    this.equestrian= new SportCategory('equestrian');
    this.boating= new SportCategory('boating');
    this.other= new SportCategory('other');
    this.racquets= new SportCategory('racquets');
    this.teams= new SportCategory('teams');

    // Data used for visualization
    this.index= 0;
    this.x= 0;
    this.y= 0;
  }

  /** @param {function(SportCategory, string):void} fn  */
  forEachCategory( fn ) {
    for( const category of Country.Categories ) {
      fn( this[category], category )
    }
  }

  countMedals() {
    this.goldMedals= 0;
    this.silverMedals= 0;
    this.bronzeMedals= 0;

    this.forEachCategory( category => {
      this.goldMedals+= category.goldMedals.length;
      this.silverMedals+= category.silverMedals.length;
      this.bronzeMedals+= category.bronzeMedals.length;
    });

    this.totalMedals= this.goldMedals+ this.silverMedals+ this.bronzeMedals;
  }

  orderMedals() {
    this.forEachCategory( category => category.orderMedals() );
  }

  /** @param {Country} other  */
  mergeWith( other ) {
    this.forEachCategory( (category, categoryName) => category.mergeWith( other[categoryName] ) )
    this.countMedals();
  }
}

export function mapCountries( olympics, countryGdps, regions ) {
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
