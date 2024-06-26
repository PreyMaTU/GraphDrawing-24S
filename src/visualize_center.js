import Constants from './constants.js';
import * as d3 from 'd3';

/**
 * @typedef {import('./country.js').Country} Country
 * @typedef {import('./country.js').Region} Region
 */


function circleCoordX(index, count, radius) {
  const angle = (2 * Math.PI * index) / count;
  return radius * Math.sin(angle);
}

function circleCoordY(index, count, radius) {
  const angle = (2 * Math.PI * index) / count;
  return radius * -Math.cos(angle);
}

function categoriesForCountry(country, medalType) {
  var categories = [];
  for (const category of Object.keys(Constants.categoryIndices)) {
    if (country[category][medalType].size != 0) {
      categories.push(category);
    }
  }
  return categories;
}

function drawCategoryMarkers(svg, position, categories) {
  for (const category of Object.keys(Constants.categoryIndices)) {
    const h = svg.append('g');

    var count = 8;
    var radius = 4;
    if (Constants.categoryIndices[category] < 3) {
      count = 3;
      radius = 1.5;
    }
    const xOffset = circleCoordX(Constants.categoryIndices[category], count, radius);
    const yOffset = circleCoordY(Constants.categoryIndices[category], count, radius);

    var dotSize = 0.4;
    var dotColor = "#aaa";
    if (categories.indexOf(category) >= 0) {
      dotSize = 1;
      dotColor = Constants.categoryColors[category];
    }

    
    h.append('circle')
      .attr('cx', position[0] + xOffset)
      .attr('cy', position[1] + yOffset)
      .attr('r', dotSize)
      .style('fill', dotColor);
  }
}


/**
 * @param {d3.Selection<SVGSVGElement, any, null, undefined>} svg
 * @param {Country[]} countries
 * @param {Region[]} regions
 * @param {'Gold'|'Silver'|'Bronze'} medalType
 */
export function visualizeCenter(svg, countries, regions, medalType) {
  // const regionsColors = d3
  //   .scaleOrdinal()
  //   .domain(Object.keys(Constants.regionColors))
  //   .range(Object.keys(Constants.regionColors).map(name => Constants.regionColors[name]));

  const centerNode = svg
    .append('g')
    .attr('class', 'center-node')
    .attr('transform', `translate(${Constants.center.x}, ${Constants.center.y})`);


  const mapNameMapping = {'Gold': 'goldMedals', 'Silver': 'silverMedals', 'Bronze': 'bronzeMedals'};

  const angleOffset = 0.0;//0.08;

  var arcs = {};
  var categoriesPerCountry = {};

  for (const country of countries) {
    var categories = categoriesForCountry(country, mapNameMapping[medalType]);
    categoriesPerCountry[country.index] = categories;

    var angle = (2.0 * Math.PI * country.index) / countries.length;
    if (!(categories in arcs)) {
      arcs[categories] = {
        start: angle - angleOffset, 
        end: angle + angleOffset, 
        level: 0, 
        length: 1, 
        startIndex: country.index
      };
    } else {
      arcs[categories].end = angle + angleOffset;
      arcs[categories].length++;
      arcs[categories].level = 1;
    }    
  }

  const numberOfArcs = Object.keys(arcs).length;
  for (var i=0; i<numberOfArcs; i++) {
    const arc1 = Object.values(arcs)[i];

    if (arc1.length == 1) {
      continue;
    }

    // check against all level 0 arcs
    var intersectsLevel0 = false;
    for (var j=0; j<numberOfArcs; j++) {
      const arc2 = Object.values(arcs)[j];
      if (arc2.level == 0 &&
          arc1.start < arc2.end && 
          arc2.start < arc1.end) {
        intersectsLevel0 = true;
        break;
      }
    }

    if (!intersectsLevel0) {
      arc1.level = 0;
      continue;
    }

    var hasIntersection = true;
    while (hasIntersection) {
      hasIntersection = false;
      for (var j=0; j<i; j++) {
        const arc2 = Object.values(arcs)[j];
        if (i != j &&
            arc1.level == arc2.level &&
            arc1.start < arc2.end && 
            arc2.start < arc1.end) {
          hasIntersection = true;
          arc1.level++;
          break;
        }
      }
    }
  }

  for (const country of countries) {
    const arc = arcs[categoriesPerCountry[country.index]];
    const radius = Constants.centerMargin - 10 - arc.level * 16;
    centerNode.append("line")
      .attr("x1", country.unitX*radius)
      .attr("y1", country.unitY*radius)
      .attr("x2", country.unitX*Constants.centerMargin)
      .attr("y2", country.unitY*Constants.centerMargin)
      .style("stroke", "#aaa")
      .style("stroke-width", 1);
  }

  for (const arc of Object.values(arcs)) {
    if (arc.length != 1) {
      const radius = Constants.centerMargin - 10 - arc.level * 16;
      const angleOffset = Math.atan(7 / radius);
      var svgArc = d3.arc()
        .innerRadius(radius-7)
        .outerRadius(radius+7)
        .startAngle(arc.start - angleOffset)
        .endAngle(arc.end + angleOffset)
        .cornerRadius(10);

      centerNode.append("path")
        .attr("d", svgArc)
        .style("fill", "#f0f0f0")
        .style("stroke", "white")
        .style("stroke-width", 0.5)

    } else {
      const angle = (arc.start + arc.end) * 0.5;
      const radius = Constants.centerMargin - 10 - arc.level * 16;
      centerNode.append("circle")
        .attr("cx", radius * Math.sin(angle))
        .attr("cy", radius * -Math.cos(angle))
        .attr("r", 7)
        .style("fill", "#f0f0f0")
        .style("stroke", "white")
        .style("stroke-width", 0.5)
    }
  }

  for (const country of countries) {
    const arc = arcs[categoriesPerCountry[country.index]];
    const radius = Constants.centerMargin - 10 - arc.level * 16;
    centerNode.append("circle")
      .attr("cx", country.unitX * (radius + 7))
      .attr("cy", country.unitY * (radius + 7))
      .attr("r", 1)
      .style("fill", "#aaa");

    if (arc.startIndex == country.index) {
      var markerPosition = [country.unitX*radius, country.unitY*radius];
      drawCategoryMarkers(centerNode, markerPosition, categoriesPerCountry[country.index]);
    }
  }
}
