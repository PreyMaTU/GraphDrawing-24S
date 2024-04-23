
export class Medal {
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

export class SportCategory {
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


