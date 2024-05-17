import * as d3 from 'd3';
import { JSDOM } from 'jsdom';
import * as d3Regression from 'd3-regression';

import Constants from './constants.js';
import { visualizeCenter } from './visualize_center.js';

/**
 * @typedef {import('./country.js').Country} Country
 * @typedef {import('./country.js').Region} Region
 */

function replaceIconFillColor( svgText, fillColor ) {
  return svgText.replaceAll(/(fill="[^"]*")|style="[^"]*(fill:[^;"]+;?)[^"]*"/g,
  (match, colorAttribute, colorStyle) => {
    if( colorAttribute ) {
      return `fill="${fillColor}"`;
    }

    return match.replaceAll(/fill:[^;"]+;?/g, `fill:${fillColor};`);
  });
}

function circleCoordX(index, count, radius) {
  const angle = (2 * Math.PI * index) / count;
  return Constants.center.x + radius * Math.sin(angle);
}

function circleCoordY(index, count, radius) {
  const angle = (2 * Math.PI * index) / count;
  return Constants.center.y + radius * -Math.cos(angle);
}

/**  @param {Country[]} countries */
function computeCountryPositions(countries) {
  // Create scale for positioning
  const minGdp = d3.min(
    countries.filter(c => c.gdp > 0),
    c => c.gdp
  );
  const maxGdp = d3.max(countries, c => c.gdp);

  const gdpScale = d3
    .scaleLog()
    .domain([minGdp, maxGdp])
    .range([Constants.centerMargin, Constants.radius]);

  // Compute the position of each country based on its index
  for (const country of countries) {
    const vectorLength = Constants.radius;
    country.x = circleCoordX(country.index, countries.length, vectorLength);
    country.y = circleCoordY(country.index, countries.length, vectorLength);

    const vectorX = country.x - Constants.center.x;
    const vectorY = country.y - Constants.center.y;

    country.unitX = vectorX / vectorLength;
    country.unitY = vectorY / vectorLength;
    country.unitNormalX = vectorY / vectorLength;
    country.unitNormalY = -vectorX / vectorLength;

    const gdp = Math.max(minGdp, country.gdp);
    country.gdpVectorLength= gdpScale(gdp);
    country.gdpX = circleCoordX(country.index, countries.length, country.gdpVectorLength);
    country.gdpY = circleCoordY(country.index, countries.length, country.gdpVectorLength);

    // console.log( `${country.name} - GDP: ${country.gdp}, Index: ${country.index}, Position: (${country.x}, ${country.y})` )
  }

  return gdpScale;
}

/**
 * @param {Country[]} countries
 * @param {'Gold'|'Silver'|'Bronze'} medalType
 */
function computeTickYearArray(countries, medalType) {
  // Find the first and last year an olympic game happened for the filtered
  // countries and medal types
  const { firstYear, lastYear } = countries
    .map(c => c.getFirstAndLastYear(medalType))
    .reduce(
      ({ firstYear, lastYear }, c) => ({
        firstYear: Math.min(firstYear, c.firstYear),
        lastYear: Math.max(lastYear, c.lastYear),
      }),
      { firstYear: Number.MAX_SAFE_INTEGER, lastYear: 0 }
    );

  // Create an array of all years in between and including the
  // first and last year
  const tickYears = Array.from(
    { length: Math.floor(1 + (lastYear - firstYear) / 4) },
    (_, i) => firstYear + i * 4
  );

  return { firstYear, lastYear, tickYears };
}

/**
 * @param {Country[]} countries
 * @param {Region[]} regions
 * @param {'Gold'|'Silver'|'Bronze'} medalType
 */
export function visualize(countries, regions, medalType) {
  // Compute constants
  Constants.radius = Math.min(Constants.width, Constants.height) / 2 - Constants.margin;
  Constants.center = { x: Constants.width / 2, y: Constants.height / 2 };
  Constants.centerMargin = Constants.radius * Constants.centerMarginPercent;

  // Create DOM
  const dom = new JSDOM('<!DOCTYPE html><body></body>');
  const body = d3.select(dom.window.document.querySelector('body'));

  // Create SVG element
  const svg = body
    .append('svg')
    .attr('width', Constants.width)
    .attr('height', Constants.height)
    .attr('xmlns', 'http://www.w3.org/2000/svg');

  const gdpScale = computeCountryPositions(countries);

  // Draw circles for GDP levels
  const gdpCircles = svg
    .selectAll('.gdp-level')
    .data([1000, 10000, 100000])
    .enter()
    .append('circle')
    .attr('cx', Constants.center.x)
    .attr('cy', Constants.center.y)
    .attr('r', c => gdpScale(c))
    .style('stroke', 'lightgrey')
    .style('fill', 'none');

  /*const regionSeparators = svg
    .selectAll('.region-line')
    .data(regions)
    .enter()
    .append('line')
    .attr('x1', r => circleCoordX(r.firstCountry.index, countries.length, Constants.radius))
    .attr('y1', r => circleCoordY(r.firstCountry.index, countries.length, Constants.radius))
    .attr('x2', Constants.center.x)
    .attr('y2', Constants.center.y)
    .style('stroke', 'lightgrey');*/

  svg
    .selectAll('.gdp')
    .data( countries )
    .enter()
    .append('line')
    .attr('x1', c => c.gdpX + c.unitNormalX* c.gdpVectorLength / 30)
    .attr('y1', c => c.gdpY + c.unitNormalY* c.gdpVectorLength / 30)
    .attr('x2', c => c.gdpX - c.unitNormalX* c.gdpVectorLength / 30)
    .attr('y2', c => c.gdpY - c.unitNormalY* c.gdpVectorLength / 30)
    .style('stroke', Constants.spiralColor)
    .style('stroke-width', 2.5);

  // Draw linear regression as a spiral
  const spiralRegression = d3Regression
    .regressionLinear()
    .x(c => c.index)
    .y(c => gdpScale(c.gdp))(countries);

  const spiral = d3
    .line()
    .x(c =>
      circleCoordX(c.index, countries.length, spiralRegression.a * c.index + spiralRegression.b)
    )
    .y(c =>
      circleCoordY(c.index, countries.length, spiralRegression.a * c.index + spiralRegression.b)
    )
    .curve(d3.curveBasis);

  svg
    .append('path')
    .attr('class', '.spiral')
    .attr('d', spiral(countries))
    .attr('stroke-width', '2.5')
    .attr('stroke', Constants.spiralColor)
    .attr('fill', 'none');

  // Draw the bundled edges
  const edgeColors = d3
    .scaleOrdinal()
    .domain(Object.keys(Constants.categoryColors))
    .range(Object.keys(Constants.categoryColors).map(name => Constants.categoryColors[name]));

  const regionsColors = d3
    .scaleOrdinal()
    .domain(Object.keys(Constants.regionColors))
    .range(Object.keys(Constants.regionColors).map(name => Constants.regionColors[name]));

  const edges = svg
    .selectAll('.edge')
    .data(countries)
    .enter()
    .append('g')
    .attr('class', c => `edge ${c.noc}`);

  const { firstYear, lastYear, tickYears } = computeTickYearArray(countries, medalType);
  const tickScaleX = d3.scaleLinear().domain([firstYear, lastYear]);
  const tickScaleY = d3.scaleLinear().domain([firstYear, lastYear]);

  function countryTicks(country) {
    // Compute the offsets to the bundle to draw the tick line across it
    const halfWidth = country.filledSportCategories().length / 2 + 2;
    const xlen = country.unitNormalX * halfWidth;
    const ylen = country.unitNormalY * halfWidth;

    // Compute the starting position for the first tick based on the country
    // position and center margins
    const startX =
      Constants.center.x +
      country.unitX * Constants.centerMargin * Constants.centerTimeTicksPercent;
    const startY =
      Constants.center.y +
      country.unitY * Constants.centerMargin * Constants.centerTimeTicksPercent;

    tickScaleX.range([startX, country.x]);
    tickScaleY.range([startY, country.y]);

    // Make an array of positions on the bundle for the ticks
    return tickYears.map(year => {
      const x = tickScaleX(year);
      const y = tickScaleY(year);

      return { x, y, xlen, ylen, year };
    });
  }

  edges
    .selectAll('.ticks')
    .data(c => [c])
    .enter()
    .append('g')
    .attr('class', () => 'ticks')
    .selectAll('.tick')
    .data(countryTicks)
    .enter()
    .append('line')
    .attr('x1', t => t.x + t.xlen)
    .attr('y1', t => t.y + t.ylen)
    .attr('x2', t => t.x - t.xlen)
    .attr('y2', t => t.y - t.ylen)
    .style('stroke', t => t.year % 5 === 0 ? 'black' : 'gray')
    .style('stroke-width', 0.5);

  /** @param {Country} country */
  function filledSportCategoriesWithGradientScale(country) {
    const fr = Constants.centerMargin * Constants.centerNodePercent;
    const ticksBegin = Constants.centerMargin * Constants.centerTimeTicksPercent;
    const clearRadius = ticksBegin - fr;
    const usableGradientLength = Constants.radius - fr;
    const ticksRangeBegin = clearRadius / usableGradientLength;

    const maxMedalCount = country.getMaxMedalCountPerGame(medalType);

    // Helper function to mix the background color with the category's color
    function mixedBaseColor(category) {
      return d3
        .scaleLinear()
        .domain([0, 1])
        .range([Constants.backgroundColor, edgeColors(category.name)])(
        Constants.edgeBaseColorIntensity
      );
    }

    // Compute scales for the categories
    return country.filledSportCategories().map(e => ({
      ...e,
      positionScale: d3.scaleLinear().domain([firstYear, lastYear]).range([ticksRangeBegin, 1]),
      colorScale: d3
        .scaleLinear()
        .domain([0, maxMedalCount])
        .range([mixedBaseColor(e.category), edgeColors(e.category.name)]),
    }));
  }

  edges
    .selectAll('.gradient')
    .data(filledSportCategoriesWithGradientScale)
    .enter()
    .append('radialGradient')
    .attr('gradientUnits', 'userSpaceOnUse')
    .attr('cx', Constants.center.x)
    .attr('cy', Constants.center.y)
    .attr('r', Constants.radius)
    .attr('fr', Constants.centerMargin * Constants.centerNodePercent)
    .attr('id', e => `gradient-${e.country.iso2}-${e.category.name}`)
    .selectAll('stop')
    .data(e => [
      // Color stop that connects the line to the center node
      { offset: '0%', color: regionsColors(e.country.region) },

      // Color stops for each game based on the number of medals won
      ...tickYears.map(year => ({
        offset: e.positionScale(year),
        color:
          year < e.country.defunctSince ?
            e.colorScale(e.category.medalCount(medalType, year))
          : Constants.defunctColor,
      })),
    ])
    .enter()
    .append('stop')
    .attr('offset', d => d.offset)
    .attr('stop-color', d => d.color);

  edges
    .selectAll('.bundle')
    .data(c => c.filledSportCategories())
    .enter()
    .append('line')
    .attr('x1', (e, i, n) => e.country.x + e.country.unitNormalX * (i - n.length / 2))
    .attr('y1', (e, i, n) => e.country.y + e.country.unitNormalY * (i - n.length / 2))
    .attr('x2', (e, i, n) => Constants.center.x + e.country.unitNormalX * (i - n.length / 2))
    .attr('y2', (e, i, n) => Constants.center.y + e.country.unitNormalY * (i - n.length / 2))
    .style('stroke', e => `url(#gradient-${e.country.iso2}-${e.category.name})`);
  //.style('stroke', e => edgeColors(e.category.name));

  // Draw nodes for countries
  const countryNodes = svg
    .selectAll('.country')
    .data(countries)
    .enter()
    .append('g')
    .attr('class', c => `country ${c.noc}`);

  countryNodes
    .append('circle')
    .attr('cx', c => c.x)
    .attr('cy', c => c.y)
    .attr('r', 2)
    .style('fill', c =>
      c.region === 'No Region' ? 'black'
      : c.gdp < 1 ? 'darkred'
      : 'steelblue'
    );

  /**
   * @param {function(Country):number} xoff 
   * @param {function(Country):number} yoff 
   * @param {function(Country):string} text 
   */
  function addCountryNodeText( xoff, yoff, text) {
    countryNodes
      .append('text')
      .attr('x', c => c.x + c.unitX * Constants.countryNameOffset + xoff(c))
      .attr('y', c => c.y + c.unitY * Constants.countryNameOffset + yoff(c))
      .attr('text-anchor', c => (c.x >= Constants.center.x ? 'start' : 'end'))
      .attr('dominant-baseline', 'central')
      .attr('transform', (c, i, nodes) => {
        const flipAngle = c.x >= Constants.center.x ? 0 : 180;
        const angle = (Math.atan2(c.unitY, c.unitX) * 180) / Math.PI + flipAngle;
        const x = nodes[i].getAttribute('x');
        const y = nodes[i].getAttribute('y');
        return `rotate(${angle}, ${x}, ${y})`;
      })
      .text( text );
  }

  addCountryNodeText(
    c => c.unitNormalX* 8 * (c.x >= Constants.center.x ? 1 : -1),
    c => c.unitNormalY* 8 * (c.x >= Constants.center.x ? 1 : -1),
    c => c.displayName
  );

  addCountryNodeText(
    c => c.unitNormalX* 8* (c.x >= Constants.center.x ? -1 : 1),
    c => c.unitNormalY* 8* (c.x >= Constants.center.x ? -1 : 1),
    c => `${c.medals( medalType )} Medals`
  );

  countryNodes
    .selectAll((c, i, n) => (c.svgIcon ? [n[i]] : []))
    .append('g')
    .attr('transform', c => `translate(${c.x}, ${c.y}) scale(0.025) translate(-800, -800)`)
    .html(c => replaceIconFillColor(c.svgIcon, regionsColors(c.region)));

  // Draw the center node
  visualizeCenter(svg, countries, regions, medalType);

  return body;
}
