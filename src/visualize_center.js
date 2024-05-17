
import Constants from './constants.js';
import * as d3 from 'd3';

/**
 * @typedef {import('./country.js').Country} Country
 * @typedef {import('./country.js').Region} Region
 */

/**
 * @param {d3.Selection<SVGSVGElement, any, null, undefined>} svg
 * @param {Country[]} countries
 * @param {Region[]} regions
 * @param {'Gold'|'Silver'|'Bronze'} medalType
 */
export function visualizeCenter( svg, countries, regions, medalType ) {
  const regionsColors = d3
    .scaleOrdinal()
    .domain(Object.keys(Constants.regionColors))
    .range(Object.keys(Constants.regionColors).map(name => Constants.regionColors[name]));

  const centerNode = svg
    .append('g')
    .attr('class', 'center-node')
    .attr('transform', `translate(${Constants.center.x}, ${Constants.center.y})`);

  const centerPie = d3
    .pie()
    .value(r => r.size)
    .sortValues((a, b) => b.medals - a.medals);

  centerNode
    .selectAll('.arc')
    .data(centerPie(regions))
    .enter()
    .append('path')
    .attr(
      'd',
      d3
        .arc()
        .innerRadius(0)
        .outerRadius(Constants.centerMargin * Constants.centerNodePercent)
    )
    .attr('fill', d => regionsColors(d.data.name))
    .attr('stroke', 'black')
    .style('stroke-width', '2px');
}
