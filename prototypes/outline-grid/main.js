import * as svgutil from './svgutil.js';
import * as xxhash from './xxhash.js';

const UINT32_MAX = 0xffffffff;

function middle(a, b) {
	return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function distance(a, b) {
	const dx = a.x - b.x;
	const dy = a.y - b.y;
	return Math.sqrt(dx ** 2 + dy ** 2);
}

function float2uint32(floats) {
	const float32Array = new Float32Array(floats);
	const uint32Array = new Uint32Array(float32Array.buffer);
	return Array.from(uint32Array);
}

// https://en.wikipedia.org/wiki/Linear_interpolation
/*
function lerp(a, b, x) {
	return a + x * (b - a);
}
*/

function gridMake(width, height) {
	const data = [];
	for (let y = 0; y < height; y += 1) {
		const row = [];
		for (let x = 0; x < width; x += 1) {
			row.push({});
		}
		data.push(row);
	}
	return { width: width, height: height, data: data };
}

function gridForEach(grid, border, callable) {
	for (let y = border; y < (grid.height - border); y += 1) {
		for (let x = border; x < (grid.width - border); x += 1) {
			callable({ x: x, y: y });
		}
	}
}

// rnh = Random Number Hash

function rnhUnitVector(seeds) {
	const angle = rnhNorm(seeds) * 2 * Math.PI;
	return { x: Math.cos(angle), y: Math.sin(angle) };
}

function rnhNorm(seeds) {
	// const result = Math.random();
	const result = xxhash.xxHash32(float2uint32(seeds), 0) / UINT32_MAX;
	console.assert((result >= 0.0) && (result <= 1.0));
	return result;
}

function rnhMinMax(seeds, min, max) {
	const r = rnhNorm(seeds);
	return min + (r * (max - min));
}

function rnhMinMaxInt(seeds, minInclusive, maxExclusive) {
	const r = rnhNorm(seeds);
	return minInclusive + Math.floor(r * (maxExclusive - minInclusive));
}

// Perlin

function perlinCreate(seed, width, height) {
	const grid = gridMake(width, height);
	gridForEach(grid, 0, (tileCoord) => {
		grid.data[tileCoord.y][tileCoord.x] = rnhUnitVector([seed, tileCoord.x, tileCoord.y]);
	});
	return grid;
}

function perlinNoise(perlin, coord) {
	// https://en.wikipedia.org/wiki/Smoothstep
	// 0 <= x <= 1
	function smootherstep(x) {
		return 6 * (x ** 5) - 15 * (x ** 4) + 10 * (x ** 3);
	}

	function interpolate(a, b, x) {
		return a + smootherstep(x) * (b - a);
	}

	function dot(p, pf) {
		const gradient = perlin.data[pf.y][pf.x];
		const v = { x: p.x - pf.x, y: p.y - pf.y };
		return v.x * gradient.x + v.y * gradient.y;
	}

	const xf = Math.floor(coord.x);
	const yf = Math.floor(coord.y);
	const tl = dot(coord, { x: xf + 0, y: yf + 0 });
	const tr = dot(coord, { x: xf + 1, y: yf + 0 });
	const bl = dot(coord, { x: xf + 0, y: yf + 1 });
	const br = dot(coord, { x: xf + 1, y: yf + 1 });
	const t = interpolate(tl, tr, coord.x - xf);
	const b = interpolate(bl, br, coord.x - xf);
	const v = interpolate(t, b, coord.y - yf);
	return v;
}

/*
function isUint32(x) {
	return Number.isInteger(x) && (x >= 0) && (x <= UINT32_MAX);
}
*/

function create(seed, options) {
	const perlin = perlinCreate(seed, 10 + 2, 8 + 2);

	const gridBorderMin = 0.2;
	const gridBorderMax = 0.8;

	const w = Math.floor(options.width / options.gridSize);
	const h = Math.floor(options.height / options.gridSize);
	// TOOD use gridForEach for init?
	const g = gridMake(w, h);

	function selectBiome(p) {
		if (p.level > 1.4) return 'mountain';
		if ((p.level > 1.1) && (p.level < 1.25)) return 'tree';
		if (p.level > 1.0 && p.random < 0.02) return 'town';
		if (p.level > 0.8) return 'grass';
		return 'water';
	}

	// assign level & biomes
	gridForEach(g, 0, (tileCoord) => {
		const p = g.data[tileCoord.y][tileCoord.x];
		// currently using the same random number for many things (e.g. selected object, size of objects)
		p.random = rnhNorm([seed, 0.7, tileCoord.x, tileCoord.y]);
		const seedX = [seed, 0.9, tileCoord.x, tileCoord.y];
		const seedY = [seed, 0.8, tileCoord.x, tileCoord.y];
		p.x = (rnhMinMax(seedX, gridBorderMin, gridBorderMax) + tileCoord.x) * options.gridSize;
		p.y = (rnhMinMax(seedY, gridBorderMin, gridBorderMax) + tileCoord.y) * options.gridSize;
		const noise = perlinNoise(perlin, { x: p.x / 200, y: p.y / 200 });
		p.level = noise + 1.0; // 0 .. 2
		const isBorder = (tileCoord.x === 0) || (tileCoord.y === 0) || (tileCoord.x === (w - 1)) || (tileCoord.y === (h - 1));
		p.biome = isBorder ? 'grass' : selectBiome(p);
	});

	return { grid: g };
}

function draw(map, images, options) {
	const elementMap = document.getElementById('svg');
	elementMap.innerHTML = '';
	elementMap.setAttribute('width', options.width);
	elementMap.setAttribute('height', options.height);

	const isDrawGrid = document.getElementById('draw-grid').checked;
	const isDrawBiomes = document.getElementById('draw-biomes').checked;
	const isDrawRose = document.getElementById('draw-rose').checked;
	const isDrawBorder = document.getElementById('draw-border').checked;
	const isDrawColors = document.getElementById('draw-colors').checked;

	// grid
	if (isDrawGrid) {
		elementMap.appendChild(svgutil.createGrid(options.width, options.height, options.gridSize));
	}

	// rose
	if (isDrawRose) {
		elementMap.appendChild(svgutil.createRose({ x: options.width - 200, y: options.height - 200 }));
	}

	// biomes
	const BIOMES_COLORS = {
		'town': '#f0f',
		'water': '#00f',
		'tree': '#393',
		'grass': '#9f9',
		'mountain': '#999',
	};
	if (isDrawBiomes) {
		gridForEach(map.grid, 0, (tileCoord) => {
			const p = map.grid.data[tileCoord.y][tileCoord.x];
			elementMap.appendChild(svgutil.createCircle(p, 2, '', BIOMES_COLORS[p.biome]));
		});
	}

	// search towns
	const towns = [];
	gridForEach(map.grid, 0, (tileCoord) => {
		const p = map.grid.data[tileCoord.y][tileCoord.x];
		if (p.biome === 'town') {
			towns.push({ x: tileCoord.x, y: tileCoord.y });
		}
	});

	// select streets
	const numberOfStreets = towns.length;
	const streets = [];
	for (let i = 0; i < numberOfStreets; i += 1) {
		const a = rnhMinMaxInt([seed, 0.2, i], 0, numberOfStreets);
		const b = rnhMinMaxInt([seed, 0.3, i], 0, numberOfStreets);
		const from = Math.min(a, b);
		const to = Math.max(b, a);
		if ((from !== to) && (streets.findIndex($ => ($.from === from) && ($.to === to)) === -1)) {
			streets.push({ from: from, to: to });
		}
	}

	const SHOW_STREETS = true;
	if (SHOW_STREETS) {
		for (const street of streets) {
			const townFrom = towns[street.from];
			const townTo = towns[street.to];
			const pFrom = map.grid.data[townFrom.y][townFrom.x];
			const pTo = map.grid.data[townTo.y][townTo.x];
			elementMap.appendChild(svgutil.createLine(pFrom, pTo, '#f40'));
		}
	}

	// draw grid elements
	const items = [];
	gridForEach(map.grid, 0, (tileCoord) => {
		const p = map.grid.data[tileCoord.y][tileCoord.x];
		if (p.biome === 'mountain') {
			const node = images.mountains[Math.floor(p.random * images.mountains.length)].cloneNode(true);
			const xScale = 1.1 + (p.random * 0.2);
			const yScale = 0.1 + (p.random * 0.1) + p.level * 1.2;
			items.push({ x: p.x, y: p.y, xs: xScale, ys: yScale, node: node });
		} else if (p.biome === 'tree') {
			// const i = Math.floor(p.random * images.trees.length);
			const i = 1;
			const node = images.trees[i].cloneNode(true);
			if (isDrawColors) {
				const treeToModify = node;
				const leaves = treeToModify.querySelector('#layer1 #path58');
				const stroke = treeToModify.querySelector('#layer1 #path48');
				const colorLeaves = svgutil.hsl(100 + 20 * p.random, 75, 20 + 10 * p.random);
				const colorTrunk = svgutil.hsl(40 + 20 * p.random, 75, 10 + 10 * p.random);
				leaves.style.fill = colorLeaves;
				leaves.style.stroke = colorLeaves;
				stroke.style.fill = colorTrunk;
				stroke.style.stroke = colorTrunk;
			}
			const xScale = 0.8 + (p.random * 0.4);
			const yScale = 0.8 + (p.random * 0.4);
			items.push({ x: p.x, y: p.y, xs: xScale, ys: yScale, node: node });
		} else if (p.biome === 'town') {
			const node = images.towns[0].cloneNode(true);
			const xScale = 1.0;
			const yScale = 1.0;
			items.push({ x: p.x, y: p.y, xs: xScale, ys: yScale, node: node });
		}
	});
	items.sort((a, b) => {
		return (a.y > b.y) ? 1 : -1;
	});
	for (const item of items) {
		const node = item.node;
		node.setAttribute('transform', 'translate(' + item.x + ' ' + item.y + ') scale(' + item.xs + ' ' + item.ys + ')');
		elementMap.appendChild(node);
	}

	// draw coast
	gridForEach(map.grid, 1, (tileCoord) => {
		const p = map.grid.data[tileCoord.y][tileCoord.x];
		const pl = map.grid.data[tileCoord.y + 0][tileCoord.x - 1];
		const pr = map.grid.data[tileCoord.y + 0][tileCoord.x + 1];
		const pt = map.grid.data[tileCoord.y - 1][tileCoord.x - 0];
		const pb = map.grid.data[tileCoord.y + 1][tileCoord.x + 0];
		const ptl = map.grid.data[tileCoord.y - 1][tileCoord.x - 1];
		const ptr = map.grid.data[tileCoord.y - 1][tileCoord.x + 1];
		const pbl = map.grid.data[tileCoord.y + 1][tileCoord.x - 1];
		const pbr = map.grid.data[tileCoord.y + 1][tileCoord.x + 1];
		let ps = [];

		// tr
		if (p.biome === 'water' && pt.biome === 'water' && ptr.biome === 'water' && pr.biome !== 'water') {
			ps.push(ptr);
		}
		if (p.biome === 'water' && pt.biome === 'water' && ptr.biome !== 'water' && pr.biome !== 'water') {
			ps.push(pt);
		}
		if (p.biome === 'water' && pt.biome !== 'water' && ptr.biome !== 'water' && pr.biome === 'water') {
			ps.push(pr);
		}
		if (p.biome === 'water' && pt.biome !== 'water' && ptr.biome === 'water' && pr.biome === 'water') {
			ps.push(ptr);
		}
		// br
		if (p.biome === 'water' && pb.biome === 'water' && pbr.biome === 'water' && pr.biome !== 'water') {
			ps.push(pbr);
		}
		if (p.biome === 'water' && pb.biome === 'water' && pbr.biome !== 'water' && pr.biome !== 'water') {
			ps.push(pb);
		}
		if (p.biome === 'water' && pb.biome !== 'water' && pbr.biome === 'water' && pr.biome === 'water') {
			ps.push(pbr);
		}
		if (p.biome === 'water' && pb.biome !== 'water' && pbr.biome !== 'water' && pr.biome === 'water') {
			ps.push(pr);
		}
		// bl
		if (p.biome === 'water' && pb.biome === 'water' && pbl.biome === 'water' && pl.biome !== 'water') {
			ps.push(pbl);
		}
		if (p.biome === 'water' && pb.biome === 'water' && pbl.biome !== 'water' && pl.biome !== 'water') {
			ps.push(pb);
		}
		if (p.biome === 'water' && pb.biome !== 'water' && pbl.biome === 'water' && pl.biome === 'water') {
			ps.push(pbl);
		}
		if (p.biome === 'water' && pb.biome !== 'water' && pbl.biome !== 'water' && pl.biome === 'water') {
			ps.push(pl);
		}
		// tl
		if (p.biome === 'water' && pt.biome === 'water' && ptl.biome === 'water' && pl.biome !== 'water') {
			ps.push(ptl);
		}
		if (p.biome === 'water' && pt.biome === 'water' && ptl.biome !== 'water' && pl.biome !== 'water') {
			ps.push(pt);
		}
		if (p.biome === 'water' && pt.biome !== 'water' && ptl.biome === 'water' && pl.biome === 'water') {
			ps.push(ptl);
		}
		if (p.biome === 'water' && pt.biome !== 'water' && ptl.biome !== 'water' && pl.biome === 'water') {
			ps.push(pl);
		}

		if (ps.length == 2) {
			elementMap.appendChild(svgutil.createQuadraticBezier(middle(p, ps[0]), p, middle(p, ps[1]), '#00f'));
		} else if (ps.length == 4) {
			// other combinations 0213 may also work
			elementMap.appendChild(svgutil.createQuadraticBezier(middle(p, ps[0]), p, middle(p, ps[2]), '#00f'));
			elementMap.appendChild(svgutil.createQuadraticBezier(middle(p, ps[1]), p, middle(p, ps[3]), '#00f'));
		}
	});

	if (isDrawBorder) {
		elementMap.appendChild(svgutil.createBorder(options.width, options.height, options.gridSize));
	}
}

async function main() {
	const mountains = await Promise.all(['mountain1.svg', 'mountain2.svg', 'mountain3.svg'].map($ => svgutil.load($)));
	const trees = await Promise.all(['tree1.svg', 'tree2.svg'].map($ => svgutil.load($)));
	const towns = await Promise.all(['town1.svg'].map($ => svgutil.load($)));
	const images = { mountains, trees, towns };
	const options = {
		width: 1000,
		height: 700,
		gridSize: 25,
	};

	let map = null;

	function clickCreate() {
		const seed = parseFloat(document.getElementById('seed').value);
		map = create(seed, options);
		draw(map, images, options);
	}

	function clickDraw() {
		draw(map, images, options);
	}

	function clickMap(event) {
		const x = Math.floor(event.offsetX / options.gridSize);
		const y = Math.floor(event.offsetY / options.gridSize);
		console.log(x, y);
		map.grid.data[y][x].biome = 'water';
		draw(map, images, options);
	}

	document.getElementById('create').addEventListener('click', clickCreate);
	document.getElementById('draw-grid').addEventListener('change', clickDraw);
	document.getElementById('draw-biomes').addEventListener('change', clickDraw);
	document.getElementById('draw-rose').addEventListener('change', clickDraw);
	document.getElementById('draw-border').addEventListener('change', clickDraw);
	document.getElementById('draw-colors').addEventListener('change', clickDraw);
	document.getElementById('svg').addEventListener('click', clickMap);

	clickCreate();
}

document.addEventListener('DOMContentLoaded', main);
