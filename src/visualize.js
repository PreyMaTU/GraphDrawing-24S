
import * as d3 from 'd3';
import { JSDOM } from 'jsdom';

/** @typedef {import('./country.js').Country} Country */

const Constants= {
  width: 1000,
  height: 1000,
  margin: 50,
  centerMarginPercent: 0.3,
  
  // Computed
  radius: -1,
  center: null,
  centerMargin: -1,
};

function circleCoordX( index, count, radius ) {
  const angle= (2* Math.PI* index) / count;
  return Constants.center.x + radius* Math.sin(angle);
}

function circleCoordY( index, count, radius ) {
  const angle= (2* Math.PI* index) / count;
  return Constants.center.y + radius* -Math.cos(angle);
}

/**  @param {Country[]} countries */
function computeCountryIndices( countries ) {
  // Group countries by region
  const regionGroups = d3.group(countries, c => c.region);

  // TODO: We are currently just using the total medals, but in actuality
  // we are supposed to make three charts for each kind of medal

  /** @type {{name: string, medals: number, firstCountry: Country, lastCountry: Country}[]} */
  const regionSizes= [];
  regionGroups.forEach((group, name) => {
    // Sort countries within each region by medal count
    group.sort((a, b) => b.totalMedals - a.totalMedals);

    // Count the medals per region
    const medals= group.reduce( (sum, c) => sum+ c.totalMedals, 0 );
    const firstCountry= group[0];
    const lastCountry= group[group.length- 1];
    regionSizes.push({name, medals, firstCountry, lastCountry});
  });

  // Sort regions by their total medal counts
  regionSizes.sort((a, b) => b.medals- a.medals);

  // Set the index of each country
  let idx= 0;
  regionSizes.forEach( region => {
    regionGroups.get( region.name ).forEach( c => c.index= idx++ );
  });

  return regionSizes;
}

/**  @param {Country[]} countries */
function computeCountryPositions( countries ) {
  // Create scale for positioning
  const minGdp= d3.min(countries.filter(c => c.gdp > 0), c => c.gdp);
  const maxGdp= d3.max(countries, c => c.gdp);

  const gdpScale = d3.scaleLog()
    .domain([ minGdp, maxGdp ])
    .range([Constants.centerMargin, Constants.radius]);

  // Compute the position of each country based on its index
  for( const country of countries ) {
    const gdp= Math.max( minGdp, country.gdp );
    country.x= circleCoordX( country.index, countries.length, gdpScale( gdp ) );
    country.y= circleCoordY( country.index, countries.length, gdpScale( gdp ) );

    // console.log( `${country.name} - GDP: ${country.gdp}, Index: ${country.index}, Position: (${country.x}, ${country.y})` )
  }

  return gdpScale;
}

/**  @param {Country[]} countries */
export function visualize( countries ) {
  // Compute constants
  Constants.radius= Math.min(Constants.width, Constants.height) / 2 - Constants.margin;
  Constants.center= { x: Constants.width / 2, y: Constants.height / 2 };
  Constants.centerMargin= Constants.radius* Constants.centerMarginPercent;

  // Create DOM
  const dom = new JSDOM('<!DOCTYPE html><body></body>');
  const body = d3.select( dom.window.document.querySelector('body') );

  // Create SVG element
  const svg = body.append('svg')
    .attr('width', Constants.width)
    .attr('height', Constants. height)
    .attr('xmlns', 'http://www.w3.org/2000/svg');

  const regions= computeCountryIndices( countries );
  const gdpScale= computeCountryPositions( countries );

  // Draw circles for GDP levels
  const gdpCircles= svg.selectAll('.gdp-level')
    .data( [1000, 10000, 100000] )
    .enter().append('circle')
    .attr('cx', Constants.center.x )
    .attr('cy', Constants.center.y )
    .attr('r', c => gdpScale( c ) )
    .style('stroke', 'lightgrey')
    .style('fill', 'none');

  const regionSeparators= svg.selectAll('.region-line')
    .data( regions )
    .enter().append('line')
    .attr('x1', r => circleCoordX( r.lastCountry.index, countries.length, Constants.radius) )
    .attr('y1', r => circleCoordY( r.lastCountry.index, countries.length, Constants.radius) )
    .attr('x2', Constants.center.x)
    .attr('y2', Constants.center.y)
    .style('stroke', 'lightgrey');

  // Draw nodes for countries
  const countryNodes = svg.selectAll('.country')
    .data( countries )
    .enter().append('g')
    .attr('class', 'country');

  countryNodes.append('circle')
    .attr('cx', c => c.x )
    .attr('cy', c => c.y )
    .attr('r', 2)
    .style('fill', c => c.region === 'No Region' ? 'black' : c.gdp < 1 ? 'darkred' : 'steelblue');

  countryNodes.append('text')
    .attr('x', c => c.x + 10)
    .attr('y', c => c.y + 5)
    .text(c => c.name);

  /*
  // Draw edges for medals
  const edges = svg.selectAll('.edge')
    .data(data)
    .enter().append('g')
    .attr('class', 'edge');

  edges.selectAll('line')
    .data(d => d.medals.map(medal => ({ country: d, sport: medal.sport })))
    .enter().append('line')
    .attr('x1', (d, i) => getPosition(data.indexOf(d.country), data.length).x)
    .attr('y1', (d, i) => getPosition(data.indexOf(d.country), data.length).y)
    .attr('x2', center.x)
    .attr('y2', center.y)
    .style('stroke', 'gray');

  console.log(  )
  */

  return body;
}
