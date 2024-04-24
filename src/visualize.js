
import * as d3 from 'd3';
import { JSDOM } from 'jsdom';

/** 
 * @typedef {import('./country.js').Country} Country
 * @typedef {import('./country.js').Region} Region
 */

const Constants= {
  width: 1000,
  height: 1000,
  margin: 50,
  centerMarginPercent: 0.3,
  centerNodePercent: 0.5,
  
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

    const vectorX= country.x - Constants.center.x;
    const vectorY= country.y - Constants.center.y;
    const vectorLength= Math.sqrt( vectorX* vectorX+ vectorY* vectorY );

    country.unitNormalX= vectorY / vectorLength;
    country.unitNormalY= -vectorX / vectorLength;

    // console.log( `${country.name} - GDP: ${country.gdp}, Index: ${country.index}, Position: (${country.x}, ${country.y})` )
  }

  return gdpScale;
}

/**
 *  @param {Country[]} countries
 *  @param {Region[]} regions
 */
export function visualize( countries, regions ) {
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
    .attr('x1', r => circleCoordX( r.firstCountry.index, countries.length, Constants.radius) )
    .attr('y1', r => circleCoordY( r.firstCountry.index, countries.length, Constants.radius) )
    .attr('x2', Constants.center.x)
    .attr('y2', Constants.center.y)
    .style('stroke', 'lightgrey');

  // Draw the bundled edges
  const edgeColors = d3.scaleOrdinal()
    .domain( ['shooting', 'fighting', 'cycling', 'swimming', 'gymnastics', 'athletics', 'equestrian', 'boating', 'other'  , 'racquets', 'teams'] )
    .range([  "#1f77b4" , "#ff7f0e" , "#2ca02c", "#d62728" , "#9467bd"   ,  "#8c564b" , "#e377c2"   , "#7f7f7f", "#bcbd22", "#17becf" , "#ff0e7e"]);

  const edges = svg.selectAll('.edge')
    .data( countries )
    .enter().append('g')
    .attr('class', c => `edge ${c.noc}` );

  edges.selectAll('line')
    .data( c => c.filledSportCategories() )
    .enter().append('line')
    .attr('x1', (e, i, n) => e.country.x+ e.country.unitNormalX* (i - n.length / 2) )
    .attr('y1', (e, i, n) => e.country.y+ e.country.unitNormalY* (i - n.length / 2) )
    .attr('x2', (e, i, n) => Constants.center.x+ e.country.unitNormalX* (i - n.length / 2) )
    .attr('y2', (e, i, n) => Constants.center.y+ e.country.unitNormalY* (i - n.length / 2) )
    .style('stroke', e => edgeColors( e.category.name ) );

  // Draw nodes for countries
  const countryNodes = svg.selectAll('.country')
    .data( countries )
    .enter().append('g')
    .attr('class', c => `country ${c.noc}` );

  countryNodes.append('circle')
    .attr('cx', c => c.x )
    .attr('cy', c => c.y )
    .attr('r', 2)
    .style('fill', c => c.region === 'No Region' ? 'black' : c.gdp < 1 ? 'darkred' : 'steelblue');

  countryNodes.append('text')
    .attr('x', c => c.x + 10)
    .attr('y', c => c.y + 5)
    .text(c => c.name);

  countryNodes
    .selectAll( (c, i, n) => c.svgIcon ? [n[i]] : [] )
    .append('g')
    .attr('transform', c => `translate(${c.x}, ${c.y}) scale(0.025) translate(-800, -800)`)
    .html( c => c.svgIcon );


  // Draw the center node
  const centerNode = svg.append('g')
    .attr('class', 'center-node')
    .attr('transform', `translate(${Constants.center.x}, ${Constants.center.y})`);

  const centerPie = d3.pie()
      .value( r => r.size )
      .sortValues( (a, b) => b.medals - a.medals );

  const centerPieColor = d3.scaleOrdinal()
    .domain( ['Europe', 'Asia', 'Africa', 'Oceania', 'America', 'No Region'] )
    .range(["#0081C8", "#FCB131", "#000000", "#00A651", "#EE334E", "#FFFFFF"]);
    
  centerNode
    .selectAll('.arc')
    .data( centerPie(regions) )
    .enter()
    .append('path')
    .attr('d', d3.arc()
      .innerRadius(0)
      .outerRadius( Constants.centerMargin * Constants.centerNodePercent )
    )
    .attr('fill', d => centerPieColor(d.data.name) )
    .attr("stroke", "black")
    .style("stroke-width", "2px");

  return body;
}
