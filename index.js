
import * as d3 from 'd3';
import { loadDatasets } from './src/data.js';
import { countMedals } from './src/country.js';

const { olympics }= await loadDatasets()
const countries= countMedals( olympics )

