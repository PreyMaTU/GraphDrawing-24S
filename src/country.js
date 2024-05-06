import { readProjectRelativeFile } from './data.js';

export class Medal {
  /**
   * @param {string} athlete
   * @param {year} year
   * @param {string} sport
   */
  constructor(athlete, year, sport) {
    this.athlete = athlete;
    this.year = year;
    this.sport = sport;
  }
}

export class SportCategory {
  /** @param {string} name */
  constructor(name) {
    this.name = name;

    /** @type {Medal[]} */
    this.goldMedals = [];
    /** @type {Medal[]} */
    this.silverMedals = [];
    /** @type {Medal[]} */
    this.bronzeMedals = [];
  }

  addMedal(type, medal) {
    switch (type) {
      case 'Gold':
        this.goldMedals.push(medal);
        break;
      case 'Silver':
        this.silverMedals.push(medal);
        break;
      case 'Bronze':
        this.bronzeMedals.push(medal);
        break;
      default:
        console.error(`Cannot add unknown medal type '${type}'`);
        break;
    }
  }

  orderMedals() {
    function comparator(a, b) {
      return a.year - b.year;
    }

    this.goldMedals.sort(comparator);
    this.silverMedals.sort(comparator);
    this.bronzeMedals.sort(comparator);
  }

  /** @param {SportCategory} other */
  mergeWith(other) {
    this.goldMedals.push(...other.goldMedals);
    this.silverMedals.push(...other.silverMedals);
    this.bronzeMedals.push(...other.bronzeMedals);
  }

  get isEmpty() {
    return this.goldMedals.length + this.silverMedals.length + this.bronzeMedals.length <= 0;
  }
}

export class Country {
  static Categories = [
    'shooting',
    'fighting',
    'cycling',
    'swimming',
    'gymnastics',
    'athletics',
    'equestrian',
    'boating',
    'other',
    'racquets',
    'teams',
  ];

  /**
   * @param {string} name
   * @param {string} noc
   * @param {string} region
   * @param {number} gdp GPD per capita
   * @param {string} iso2
   */
  constructor(name, noc, region, gdp, iso2) {
    this.name = name;
    this.noc = noc;
    this.region = region;
    this.gdp = gdp;
    this.iso2 = iso2;

    this.totalMedals = 0;
    this.goldMedals = 0;
    this.silverMedals = 0;
    this.bronzeMedals = 0;

    this.shooting = new SportCategory('shooting');
    this.fighting = new SportCategory('fighting');
    this.cycling = new SportCategory('cycling');
    this.swimming = new SportCategory('swimming');
    this.gymnastics = new SportCategory('gymnastics');
    this.athletics = new SportCategory('athletics');
    this.equestrian = new SportCategory('equestrian');
    this.boating = new SportCategory('boating');
    this.other = new SportCategory('other');
    this.racquets = new SportCategory('racquets');
    this.teams = new SportCategory('teams');

    // Data used for visualization
    this.index = 0;
    this.x = 0;
    this.y = 0;
    this.unitNormalX = 0;
    this.unitNormalY = 0;
    this.svgIcon = null;
  }

  medals(type) {
    return this[type + 'Medals'];
  }

  /** @param {function(SportCategory, string):void} fn  */
  forEachCategory(fn) {
    for (const category of Country.Categories) {
      fn(this[category], category);
    }
  }

  countMedals() {
    this.goldMedals = 0;
    this.silverMedals = 0;
    this.bronzeMedals = 0;

    this.forEachCategory(category => {
      this.goldMedals += category.goldMedals.length;
      this.silverMedals += category.silverMedals.length;
      this.bronzeMedals += category.bronzeMedals.length;
    });

    this.totalMedals = this.goldMedals + this.silverMedals + this.bronzeMedals;
  }

  orderMedals() {
    this.forEachCategory(category => category.orderMedals());
  }

  /** @param {Country[]} others  */
  mergeWith(...others) {
    for (const other of others) {
      this.forEachCategory((category, categoryName) => category.mergeWith(other[categoryName]));
    }

    this.countMedals();
    this.orderMedals();
  }

  filledSportCategories() {
    return Country.Categories.map(categoryName => ({
      country: this,
      /** @type {SportCategory} */
      category: this[categoryName],
    })).filter(({ category }) => !category.isEmpty);
  }

  async loadIcon() {
    if (!this.iso2 || !this.iso2.length) {
      return;
    }

    try {
      this.svgIcon = await readProjectRelativeFile(`../icons/${this.iso2}.svg`);
    } catch (e) {
      console.error(`Could not load icon for country '${this.noc}' with ISO2 '${this.iso2}':`, e);
    }
  }
}

export class CombinedCountry extends Country {
  /**
   * @param {string} name
   * @param {string} noc
   * @param {string} region
   * @param {number} gdp GPD per capita
   * @param {string} iso2
   * @param {Country[]} group
   */
  constructor(name, noc, region, gdp, iso2, group) {
    super(name, noc, region, gdp, iso2);

    this.group = group;
  }
}

export class Region {
  static fakeIso2 = {
    Africa: '_af',
    America: '_am',
    Asia: '_as',
    Europe: '_eu',
    Oceania: '_oc',
  };

  /**
   * @param {string} name
   * @param {number} medals
   * @param {Country[]} countries
   */
  constructor(name, medals, countries) {
    this.name = name;
    this.medals = medals;
    this.countries = countries;
  }

  get firstCountry() {
    return this.countries[0];
  }
  get lastCountry() {
    return this.countries[this.countries.length - 1];
  }
  get size() {
    return this.countries.length;
  }
}
