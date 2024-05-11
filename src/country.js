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

    /** @type {Map<number, Medal[]>} */
    this.goldMedals = new Map();
    /** @type {Map<number, Medal[]>} */
    this.silverMedals = new Map();
    /** @type {Map<number, Medal[]>} */
    this.bronzeMedals = new Map();

    this.goldMedalCount = 0;
    this.silverMedalCount = 0;
    this.bronzeMedalCount = 0;
  }

  _medalMapByType(type) {
    switch (type) {
      case 'Gold':
        return this.goldMedals;
      case 'Silver':
        return this.silverMedals;
      case 'Bronze':
        return this.bronzeMedals;
      default:
        return null;
    }
  }

  addMedal(type, medal) {
    const medals = this._medalMapByType(type);
    if (!medals) {
      console.error(`Cannot add unknown medal type '${type}'`);
      return;
    }

    let array = medals.get(medal.year);
    if (!array) {
      medals.set(medal.year, (array = []));
    }

    array.push(medal);
  }

  /** @param {SportCategory} other */
  mergeWith(other) {
    function mergeMap(ownedMap, otherMap) {
      otherMap.forEach((medals, year) => {
        const ownedArray = ownedMap.get(year);
        if (ownedArray) {
          ownedArray.push(...medals);
        } else {
          ownedMap.set(year, medals);
        }
      });
    }

    mergeMap(this.goldMedals, other.goldMedals);
    mergeMap(this.silverMedals, other.silverMedals);
    mergeMap(this.bronzeMedals, other.bronzeMedals);
  }

  countMedals() {
    this.goldMedalCount = 0;
    this.silverMedalCount = 0;
    this.bronzeMedalCount = 0;

    this.goldMedals.forEach(medalArray => (this.goldMedalCount += medalArray.length));
    this.silverMedals.forEach(medalArray => (this.silverMedalCount += medalArray.length));
    this.bronzeMedals.forEach(medalArray => (this.bronzeMedalCount += medalArray.length));
  }

  get isEmpty() {
    return this.goldMedals.size + this.silverMedals.size + this.bronzeMedals.size <= 0;
  }

  firstMedalYear(type) {
    const medals = this._medalMapByType(type);
    if (!medals) {
      return 0;
    }

    let firstYear = Number.MAX_SAFE_INTEGER;
    medals.forEach((_, year) => (firstYear = Math.min(firstYear, year)));
    return firstYear;
  }

  lastMedalYear(type) {
    const medals = this._medalMapByType(type);
    if (!medals) {
      return 0;
    }

    let lastYear = 0;
    medals.forEach((_, year) => (lastYear = Math.max(lastYear, year)));
    return lastYear;
  }

  maxMedalCountPerGame(type) {
    const medals = this._medalMapByType(type);
    if (!medals) {
      return 0;
    }

    let maxMedals = 0;
    medals.forEach(medalArray => (maxMedals = Math.max(maxMedals, medalArray.length)));
    return maxMedals;
  }

  medalCount(type, year) {
    const medals = this._medalMapByType(type);
    return medals?.get(year)?.length || 0;
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
    this.vectorLength = 0;
    this.unitNormalX = 0;
    this.unitNormalY = 0;
    this.svgIcon = null;

    // Cached values
    /** @type {{ country: Country, category: SportCategory }[]?} */
    this.cachedFilledSportCategories = null;
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
      category.countMedals();

      this.goldMedals += category.goldMedalCount;
      this.silverMedals += category.silverMedalCount;
      this.bronzeMedals += category.bronzeMedalCount;
    });

    this.totalMedals = this.goldMedals + this.silverMedals + this.bronzeMedals;
  }

  /** @param {Country[]} others  */
  mergeWith(...others) {
    for (const other of others) {
      this.forEachCategory((category, categoryName) => category.mergeWith(other[categoryName]));
    }

    this.countMedals();
  }

  filledSportCategories(recompute = false) {
    if (!recompute && this.cachedFilledSportCategories) {
      return this.cachedFilledSportCategories;
    }

    this.cachedFilledSportCategories = Country.Categories.map(categoryName => ({
      country: this,
      category: this[categoryName],
    })).filter(({ category }) => !category.isEmpty);

    Object.freeze(this.cachedFilledSportCategories);

    return this.cachedFilledSportCategories;
  }

  getFirstAndLastYear(medalType) {
    let firstYear = Number.MAX_SAFE_INTEGER,
      lastYear = 0;

    this.forEachCategory(cat => {
      firstYear = Math.min(firstYear, cat.firstMedalYear(medalType));
      lastYear = Math.max(lastYear, cat.lastMedalYear(medalType));
    });

    return { firstYear, lastYear };
  }

  getMaxMedalCountPerGame(medalType) {
    let maxMedals = 0;
    this.forEachCategory(
      cat => (maxMedals = Math.max(maxMedals, cat.maxMedalCountPerGame(medalType)))
    );

    return maxMedals;
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
