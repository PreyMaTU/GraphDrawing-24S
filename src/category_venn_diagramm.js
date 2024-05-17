import * as d3 from 'd3';
import { JSDOM } from 'jsdom';
import FlatQueue from 'flatqueue';

const Constants = {
  width: 1050,
  height: 1050,
  margin: 100,
  centerMarginPercent: 0.3,
  centerNodePercent: 0.5,
  centerTimeTicksPercent: 0.75,
  backgroundColor: '#ffffff',
  edgeBaseColorIntensity: 0.15,
  categoryNameOffset: 20,

  categoryCount: 11,

  categoryColors: {
    shooting: '#1f77b4',
    fighting: '#ff7f0e',
    cycling: '#2ca02c',
    swimming: '#d62728',
    gymnastics: '#9467bd',
    athletics: '#8c564b',
    equestrian: '#e377c2',
    boating: '#7f7f7f',
    other: '#bcbd22',
    racquets: '#17becf',
    teams: '#ff0e7e',
  },

  categoryIndices: {
    shooting: 0,
    fighting: 1,
    cycling: 2,
    swimming: 3,
    gymnastics: 4,
    athletics: 5,
    equestrian: 6,
    boating: 7,
    other: 8,
    racquets: 9,
    teams: 10,
  },

  // Computed
  radius: -1,
  center: null,
  centerMargin: -1,
};

function circleCoordX(index, count, radius) {
  const angle = (2 * Math.PI * index) / count;
  return radius * Math.sin(angle);
}

function circleCoordY(index, count, radius) {
  const angle = (2 * Math.PI * index) / count;
  return radius * -Math.cos(angle);
}

/**  @param {string[]} categoryCombinations */
function computeCategoryCombinationPositions(categoryCombinations) {
  const sizeScale = d3
    .scaleLinear()
    .domain([Constants.categoryCount, 1])
    .range([0, Constants.radius]);

  // Compute the position of each country based on its index
  for (const categoryCombination of categoryCombinations) {
    const categories = categoryCombination['category'].split('_');
    const combinationSize = categories.length;
    var averageX = 0;
    var averageY = 0;

    for (const category of categories) {
      averageX += circleCoordX(Constants.categoryIndices[category], Constants.categoryCount, 1);
      averageY += circleCoordY(Constants.categoryIndices[category], Constants.categoryCount, 1);
    }

    const length = Math.sqrt(averageX * averageX + averageY * averageY);
    averageX /= length;
    averageY /= length;

    averageX *= sizeScale(combinationSize);
    averageY *= sizeScale(combinationSize);

    averageX += Constants.center.x;
    averageY += Constants.center.y;

    categoryCombination['x'] = averageX;
    categoryCombination['y'] = averageY;

    const vectorX = categoryCombination['x'] - Constants.center.x;
    const vectorY = categoryCombination['y'] - Constants.center.y;
    const vectorLength = Math.sqrt(vectorX * vectorX + vectorY * vectorY);

    categoryCombination['vectorLength'] = vectorLength;
    categoryCombination['unitX'] = vectorX / vectorLength;
    categoryCombination['unitY'] = vectorY / vectorLength;
    categoryCombination['unitNormalX'] = vectorY / vectorLength;
    categoryCombination['unitNormalY'] = -vectorX / vectorLength;

    // console.log( `${country.name} - GDP: ${country.gdp}, Index: ${country.index}, Position: (${country.x}, ${country.y})` )
  }

  return sizeScale;
}

/**  @param {string[]} categoryCombinations */
function computePointsPerCategory(categoryCombinations) {
  var pointsPerCategory = {};
  for (const categoryCombination of categoryCombinations) {
    const categories = categoryCombination.category.split('_');
    for (const category of categories) {
      if (!(category in pointsPerCategory)) {
        pointsPerCategory[category] = [];
      }
      pointsPerCategory[category].push([categoryCombination.x, categoryCombination.y]);
    }
  }

  return pointsPerCategory;
}

/**  @param {string[]} categoryCombinations */
function computeConvexHulls(categoryCombinations) {
  var pointsPerCategory = computePointsPerCategory(categoryCombinations);

  var hullsPerCategory = {};
  for (const category of Object.keys(Constants.categoryIndices)) {
    hullsPerCategory[category] = d3.polygonHull(pointsPerCategory[category]);
  }

  return hullsPerCategory;
}

// https://observablehq.com/@mbostock/minimum-spanning-tree
function computeMinimumSpanningTree(points) {
  function distance2(i, j) {
    const dx = points[i][0] - points[j][0];
    const dy = points[i][1] - points[j][1];
    return dx * dx + dy * dy;
  }

  const delaunay = d3.Delaunay.from(points);

  const set = new Uint8Array(delaunay.points.length / 2);
  const heap = new FlatQueue();
  const tree = [];

  set[0] = 1;
  for (const i of delaunay.neighbors(0)) {
    heap.push([0, i], distance2(0, i));
  }

  // For each remaining minimum edge in the heap…
  let edge;
  while ((edge = heap.pop())) {
    const [i, j] = edge;

    // If j is already connected, skip; otherwise add the new edge to point j.
    if (set[j]) continue;
    set[j] = 1;
    tree.push(edge);

    // Add each unconnected neighbor k of point j to the heap.
    for (const k of delaunay.neighbors(j)) {
      if (set[k]) continue;
      heap.push([j, k], distance2(j, k));
    }
  }

  const lines = [];
  for (edge of tree) {
    const [i, j] = edge;
    lines.push({ x1: points[i][0], y1: points[i][1], x2: points[j][0], y2: points[j][1] });
  }

  return lines;
}

/**  @param {string[]} categoryCombinations */
function computeMISs(categoryCombinations) {
  var pointsPerCategory = computePointsPerCategory(categoryCombinations);

  var misPerCategory = {};
  for (const category of Object.keys(Constants.categoryIndices)) {
    misPerCategory[category] = computeMinimumSpanningTree(pointsPerCategory[category]);
  }

  return misPerCategory;
}

function collectMISsLines(misPerCategory) {
  var categoryPerLine = {};
  for (const category of Object.keys(Constants.categoryIndices)) {
    const lines = misPerCategory[category];
    for (const line of lines) {
      const hash = line.x1 + line.y1 + line.x2 + line.y2;
      if (!(hash in categoryPerLine)) {
        var dx = line.x2 - line.x1;
        var dy = line.y2 - line.y1;
        var length = Math.sqrt(dx * dx + dy * dy);
        dx /= length;
        dy /= length;
        categoryPerLine[hash] = { categories: [], line: line, normal: { x: dy, y: -dx } };
      }
      categoryPerLine[hash].categories.push(category);
    }
  }
  return categoryPerLine;
}

function drawConvexHulls(hulls) {
  for (const category of Object.keys(Constants.categoryIndices)) {
    const h = svg
      .append('path')
      .style('stroke', Constants.categoryColors[category])
      .style('fill-opacity', '0.3')
      .style('fill', Constants.categoryColors[category]);
    //style('fill', 'none')

    const hull = hulls[category];

    for (let i = 2; i <= hull.length; i++) {
      const visible = hull.slice(0, i);
      h.attr('d', `M${visible.join('L')}Z`);
    }
  }
}

function drawCategoryMarkers(pointsPerCategory) {
  for (const category of Object.keys(Constants.categoryIndices)) {
    const h = svg.append('g');

    const points = pointsPerCategory[category];
    const xOffset = circleCoordX(Constants.categoryIndices[category], Constants.categoryCount, 6);
    const yOffset = circleCoordY(Constants.categoryIndices[category], Constants.categoryCount, 6);

    for (const point of points) {
      h.append('circle')
        .attr('cx', c => point[0] + xOffset)
        .attr('cy', c => point[1] + yOffset)
        .attr('r', 2)
        .style('fill', Constants.categoryColors[category]);
    }
  }
}

// TODO convert from spanning tree to euler diagramm
function drawEulerDiagramm(misPerCategory) {
  for (const category of Object.keys(Constants.categoryIndices)) {
    const h = svg.append('g');

    const minimumSpanningTree = misPerCategory[category];

    for (const line of minimumSpanningTree) {
      h.append('line')
        .attr('x1', line.x1)
        .attr('y1', line.y1)
        .attr('x2', line.x2)
        .attr('y2', line.y2)
        .attr('stroke-width', 20)
        .attr('stroke-opacity', 0.3)
        .style('stroke-linecap', 'round')
        .style('stroke', Constants.categoryColors[category]);
    }
  }
}

/**
 * @param {string[]} categoryCombinations
 */
export function visualize_category_venn_diagramm(categoryCombinations) {
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

  const sizeScale = computeCategoryCombinationPositions(categoryCombinations);
  const hulls = computeConvexHulls(categoryCombinations);
  const pointsPerCategory = computePointsPerCategory(categoryCombinations);
  const misPerCategory = computeMISs(categoryCombinations);
  const categoryPerLine = collectMISsLines(misPerCategory);

  // Draw circles for GDP levels
  const sizeCircles = svg
    .append('g')
    .selectAll('.size-level')
    .data(d3.range(1, Constants.categoryCount + 1))
    .enter()
    .append('circle')
    .attr('cx', Constants.center.x)
    .attr('cy', Constants.center.y)
    .attr('r', c => sizeScale(c))
    .style('stroke', 'lightgrey')
    .style('fill', 'none');

  const categorySeparators = svg
    .append('g')
    .selectAll('.category-line')
    .data(d3.range(1, Constants.categoryCount + 1))
    .enter()
    .append('line')
    .attr(
      'x1',
      r => Constants.center.x + circleCoordX(r, Constants.categoryCount, Constants.radius)
    )
    .attr(
      'y1',
      r => Constants.center.y + circleCoordY(r, Constants.categoryCount, Constants.radius)
    )
    .attr('x2', Constants.center.x)
    .attr('y2', Constants.center.y)
    .style('stroke', 'lightgrey');

  const h = svg.append('g');

  for (const lineCategoryData of Object.values(categoryPerLine)) {
    const line = lineCategoryData.line;
    const normal = lineCategoryData.normal;

    var categoryCount = 0;
    for (const category of lineCategoryData.categories) {
      var offset = categoryCount - (lineCategoryData.categories.length - 1.0) * 0.5;
      offset *= 3;

      h.append('line')
        .attr('x1', line.x1 + normal.x * offset)
        .attr('y1', line.y1 + normal.y * offset)
        .attr('x2', line.x2 + normal.x * offset)
        .attr('y2', line.y2 + normal.y * offset)
        .attr('stroke-width', 2)
        .attr('stroke-opacity', 1)
        .style('stroke-linecap', 'round')
        .style('stroke', Constants.categoryColors[category]);

      categoryCount++;
    }
  }

  // Draw nodes for countries
  const categoryCombinationNodes = svg
    .selectAll('.categoryCombination')
    .data(categoryCombinations)
    .enter()
    .append('g');

  categoryCombinationNodes
    .append('circle')
    .attr('cx', c => c.x)
    .attr('cy', c => c.y)
    .attr('r', 4)
    .style('fill', 'black');

  categoryCombinationNodes
    .append('text')
    .attr('x', c => c.x + c.unitX * Constants.categoryNameOffset)
    .attr('y', c => c.y + c.unitY * Constants.categoryNameOffset)
    .attr('text-anchor', c => (c.x >= Constants.center.x ? 'start' : 'end'))
    .attr('dominant-baseline', 'central')
    .attr('transform', c => {
      const flipAngle = c.x >= Constants.center.x ? 0 : 180;
      const angle = (Math.atan2(c.unitY, c.unitX) * 180) / Math.PI + flipAngle;
      const x = c.x + c.unitX * Constants.categoryNameOffset;
      const y = c.y + c.unitY * Constants.categoryNameOffset;
      return `rotate(${angle}, ${x}, ${y})`;
    })
    .text(c => c.displayName);

  return body;
}
