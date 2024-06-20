import * as d3 from 'd3';
import { JSDOM } from 'jsdom';
import * as d3Regression from 'd3-regression';

import Constants from './constants.js';
import { visualizeCenter } from './visualize_center.js';
import { capitalize } from './country.js';

/**
 * @typedef {import('./country.js').Country} Country
 * @typedef {import('./country.js').Region} Region
 */

function replaceIconFillColor(svgText, fillColor) {
  return svgText.replaceAll(
    /(fill="[^"]*")|style="[^"]*(fill:[^;"]+;?)[^"]*"/g,
    (match, colorAttribute, _colorStyle) => {
      if (colorAttribute) {
        return `fill="${fillColor}"`;
      }

      // Replace all fill-rules in the style attribute
      return match.replaceAll(/fill:[^;"]+;?/g, `fill:${fillColor};`);
    }
  );
}

function circleCoordX(index, count, radius) {
  if (!Constants.center) {
    console.error(
      `Expected const 'center' to be truthy, found ${typeof Constants.center} instead. This should not happen.`
    );
    return;
  }

  const angle = (2 * Math.PI * index) / (count + 1);
  return Constants.center['x'] + radius * Math.sin(angle);
}

function circleCoordY(index, count, radius) {
  if (!Constants.center) {
    console.error(
      `Expected const 'center' to be truthy, found ${typeof Constants.center} instead. This should not happen.`
    );
    return;
  }

  const angle = (2 * Math.PI * index) / (count + 1);
  return Constants.center['y'] + radius * -Math.cos(angle);
}

function scaleLineTickCoordX(
  radius,
  scaleLineVector,
  tickDirection,
  radiusOffset = 0,
  distanceOffset = 0
) {
  const normalVectorSign = { none: 0, left: -1, right: +1 }[tickDirection];
  return (
    Constants.center.x +
    scaleLineVector.unitX * (radiusOffset + radius) -
    scaleLineVector.unitNormalX * normalVectorSign * (distanceOffset + Constants.scaleTickLength)
  );
}

function scaleLineTickCoordY(
  radius,
  scaleLineVector,
  tickDirection,
  radiusOffset = 0,
  distanceOffset = 0
) {
  const normalVectorSign = { none: 0, left: -1, right: +1 }[tickDirection];
  return (
    Constants.center.y +
    scaleLineVector.unitY * (radiusOffset + radius) -
    scaleLineVector.unitNormalY * normalVectorSign * (distanceOffset + Constants.scaleTickLength)
  );
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
    country.gdpVectorLength = gdpScale(gdp);
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
    .map(c => {
      const validTypes =
        medalType.toLowerCase() === 'total' ?
          ['Gold', 'Silver', 'Bronze']
        : [capitalize(medalType)];
      const payload = { firstYear: Number.MAX_SAFE_INTEGER, lastYear: Number.MIN_SAFE_INTEGER };

      for (const vt of validTypes) {
        const catFirstLast = c.getFirstAndLastYear(vt);

        payload.firstYear = Math.min(payload.firstYear, catFirstLast.firstYear);
        payload.lastYear = Math.max(payload.lastYear, catFirstLast.lastYear);
      }

      return payload;
    })
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
 */
function makeScaleLine(countries) {
  const x = circleCoordX(countries.length, countries.length, Constants.radius);
  const y = circleCoordY(countries.length, countries.length, Constants.radius);
  const dx = x - Constants.center.x;
  const dy = y - Constants.center.y;

  const unitX = dx / Constants.radius;
  const unitY = dy / Constants.radius;

  const unitNormalX = unitY;
  const unitNormalY = -unitX;

  return { x, y, unitX, unitY, unitNormalX, unitNormalY };
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

  if (Constants.useBackground) {
    svg.style('background-color', Constants.colors.backgroundColor);
  }

  // Add font family (and other design elements?)
  svg
    .append('defs')
    .append('style')
    .attr('type', 'text/css')
    .text(
      `@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@100..900&display=swap');`
    );

  const gdpScale = computeCountryPositions(countries);
  const { firstYear, lastYear, tickYears } = computeTickYearArray(countries, medalType);

  // Draw the center node
  visualizeCenter(svg, countries, regions, medalType);

  // Draw circles for each n years
  const timeScale = d3
    .scaleLinear()
    .domain([firstYear, lastYear])
    .range([Constants.centerMargin, Constants.radius]);

  const timeRingYears = [];
  for (let i = 0; i < Constants.timeSteps; i++) {
    const year = Math.round(firstYear + (i * (lastYear - firstYear)) / (Constants.timeSteps - 1));
    const error = year % 4;
    const adjustment = error <= 2 ? -error : 4 - error;
    timeRingYears.push(year + adjustment);
  }

  const timeRings = svg
    .selectAll('.time-circle')
    .data(timeRingYears)
    .enter()
    .append('circle')
    .attr('class', '.time-circle')
    .attr('cx', Constants.center.x)
    .attr('cy', Constants.center.y)
    .attr('r', c => timeScale(c))
    .style('stroke', Constants.colors.timeRingColor)
    .style('fill', 'none')
    .style('stroke-width', (c, i, n) => (i === 0 ? 2 : 1));

  // Draw each country's GDP as blue line
  svg
    .selectAll('.gdp')
    .data(countries)
    .enter()
    .append('line')
    .attr('x1', c => c.gdpX + (c.unitNormalX * c.gdpVectorLength) / 30)
    .attr('y1', c => c.gdpY + (c.unitNormalY * c.gdpVectorLength) / 30)
    .attr('x2', c => c.gdpX - (c.unitNormalX * c.gdpVectorLength) / 30)
    .attr('y2', c => c.gdpY - (c.unitNormalY * c.gdpVectorLength) / 30)
    .style('stroke', Constants.colors.spiralColor)
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
    .attr('stroke', Constants.colors.spiralColor)
    .attr('fill', 'none');

  const regionsColors = d3
    .scaleOrdinal()
    .domain(Object.keys(Constants.colors.regionColors))
    .range(
      Object.keys(Constants.colors.regionColors).map(name => Constants.colors.regionColors[name])
    );

  const edges = svg
    .selectAll('.edge')
    .data(countries)
    .enter()
    .append('g')
    .attr('class', c => `edge ${c.noc}`);

  // Draw the axis
  edges
    .append('line')
    .attr('x1', c => Constants.center.x + c.unitX * Constants.centerMargin * 0.98)
    .attr('y1', c => Constants.center.y + c.unitY * Constants.centerMargin * 0.98)
    .attr('x2', c => c.x)
    .attr('y2', c => c.y)
    .style('stroke', Constants.colors.edgeColor)
    .style('stroke-width', 2); // Optional TODO: Change line width after defunct

  // Draw the bar diagramm
  edges
    .selectAll('.bars')
    .data(c => c.getMedalCountTimeline(medalType))
    .enter()
    .append('line')
    .attr(
      'x1',
      ([c, year, count]) =>
        Constants.center.x + c.unitX * timeScale(year) + c.unitNormalX * Math.log(count) * 2.0
    )
    .attr(
      'y1',
      ([c, year, count]) =>
        Constants.center.y + c.unitY * timeScale(year) + c.unitNormalY * Math.log(count) * 2.0
    )
    .attr(
      'x2',
      ([c, year, count]) =>
        Constants.center.x + c.unitX * timeScale(year) - c.unitNormalX * Math.log(count) * 2.0
    )
    .attr(
      'y2',
      ([c, year, count]) =>
        Constants.center.y + c.unitY * timeScale(year) - c.unitNormalY * Math.log(count) * 2.0
    )
    .style('stroke', Constants.colors.barChartColor)
    .style('stroke-width', 5);

  // Draw nodes for countries
  const countryNodes = svg
    .selectAll('.country')
    .data(countries)
    .enter()
    .append('g')
    .attr('class', c => `country ${c.noc}`);

  /**
   * @param {function(Country):number} xoff
   * @param {function(Country):number} yoff
   * @param {function(Country):string} inputText
   */
  function addCountryNodeText(xoff, yoff, inputText, isMedalCount) {
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
      .text(inputText)

      // Font-styling
      .style('font-size', isMedalCount ? '0.8em' : '1em')
      .style('font-family', 'Outfit, sans-serif')
      .attr('fill', Constants.colors.countryLabelColor);
    //.style('opacity', c => (c.isDefunct() ? Constants.defunctOpacity : 1.0)); // [link 1]
  }

  addCountryNodeText(
    c => c.unitNormalX * 8 * (c.x >= Constants.center.x ? 1 : -1),
    c => c.unitNormalY * 8 * (c.x >= Constants.center.x ? 1 : -1),
    c => c.displayName, // c.displayName + (c.isDefunct() ? ' (†)' : '')
    false
  );

  addCountryNodeText(
    c => c.unitNormalX * 8 * (c.x >= Constants.center.x ? -1 : 1),
    c => c.unitNormalY * 8 * (c.x >= Constants.center.x ? -1 : 1),
    c =>
      Constants.useAbsolute ?
        c.totalMedals + ' Medals'
      : `${Math.trunc(c.medalsPerMil * 10) / 10} mpm | ${c.totalMedals} Medals`,
    true
  );

  // Uncomment [link 1] and remove this if only the text should be grayed out
  countryNodes
    .selectAll((c, i, n) => (c.isDefunct() ? [n[i]] : []))
    .style('opacity', Constants.defunctOpacity);

  countryNodes
    .selectAll((c, i, n) => (c.svgIcon ? [n[i]] : []))
    .append('g')
    .attr(
      'transform',
      c =>
        `translate(${c.x + c.unitX * Constants.countryIconOffset}, ${
          c.y + c.unitY * Constants.countryIconOffset
        }) scale(0.025) translate(-700, -700)`
    )
    .html(c => replaceIconFillColor(c.svgIcon, regionsColors(c.region)));

  // Draw the scale
  const scaleLineVector = makeScaleLine(countries);
  svg
    .selectAll('.scale-line')
    .data([scaleLineVector])
    .enter()
    .append('line')
    .attr('x1', ({ unitX }) => Constants.center.x + unitX * Constants.centerMargin)
    .attr('y1', ({ unitY }) => Constants.center.y + unitY * Constants.centerMargin)
    .attr('x2', ({ x }) => x)
    .attr('y2', ({ y }) => y)
    .style('stroke', Constants.colors.edgeColor)
    .style('stroke-width', 2);

  function addScaleLineTicks(
    data,
    scale,
    groupName,
    tickColor,
    tickDirection,
    roff,
    doff,
    textFunc
  ) {
    const elementGroup = svg.append('g').attr('class', groupName);

    elementGroup
      .selectAll('line')
      .data(data)
      .enter()
      .append('line')
      .attr('x1', item => scaleLineTickCoordX(scale(item), scaleLineVector, 'none'))
      .attr('y1', item => scaleLineTickCoordY(scale(item), scaleLineVector, 'none'))
      .attr('x2', item => scaleLineTickCoordX(scale(item), scaleLineVector, tickDirection))
      .attr('y2', item => scaleLineTickCoordY(scale(item), scaleLineVector, tickDirection))
      .style('stroke', tickColor)
      .style('stroke-width', 2);

    elementGroup
      .selectAll('text')
      .data(data)
      .enter()
      .append('text')
      .attr('x', item =>
        scaleLineTickCoordX(scale(item), scaleLineVector, tickDirection, roff, doff)
      )
      .attr('y', item =>
        scaleLineTickCoordY(scale(item), scaleLineVector, tickDirection, roff, doff)
      )
      .attr('text-anchor', 'end')
      .attr('dominant-baseline', 'central')
      .attr('transform', (c, i, nodes) => {
        const angle = 360 * (1 - 1 / (countries.length + 1)) + 90;
        const x = nodes[i].getAttribute('x');
        const y = nodes[i].getAttribute('y');
        return `rotate(${angle}, ${x}, ${y})`;
      })
      .text(textFunc)
      .style('font-size', '0.7em')
      .style('font-family', 'Outfit, sans-serif')
      .attr('fill', tickColor); // Remove for black font
  }

  addScaleLineTicks(
    timeRingYears,
    timeScale,
    'time-scale',
    Constants.colors.edgeColor,
    'right',
    3,
    1,
    year => `${year}`
  );

  addScaleLineTicks(
    // Only draw the outer most and center tick
    [
      timeRingYears[0],
      timeRingYears[Math.floor(timeRingYears.length / 2)],
      timeRingYears[timeRingYears.length - 1],
    ],
    timeScale,
    'gdp-scale',
    Constants.colors.spiralColor,
    'left',
    3,
    1,
    year => {
      // As we want to draw the gdp ticks exactly on the time rings we need to convert
      // their positions back to a gdp value by using the inverse scale
      const position = timeScale(year);
      const gdp = Math.round(gdpScale.invert(position) / 1000);

      return `$${gdp}b`;
    }
  );

  return body;
}
