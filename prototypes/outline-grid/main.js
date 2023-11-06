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

// https://en.wikipedia.org/wiki/Smoothstep
// 0 <= x <= 1
function smootherstep(x) {
	return 6 * (x ** 5) - 15 * (x ** 4) + 10 * (x ** 3);
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

// Perlin

function perlinCreate(seed, width, height) {
	const grid = gridMake(width, height);
	gridForEach(grid, 0, (tileCoord) => {
		grid.data[tileCoord.y][tileCoord.x] = rnhUnitVector([seed, tileCoord.x, tileCoord.y]);
	});
	return grid;
}

function perlinNoise(perlin, coord) {
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
	// this would is the only user controlled number
	// const seed = 0.3; // Math.random();

	const seedRandom = 0.7;
	const seedX = 0.9;
	const seedY = 0.8;

	const perlin = perlinCreate(seed, 10 + 2, 8 + 2);

	const gridBorderMin = 0.2;
	const gridBorderMax = 0.8;

	const w = Math.floor(options.width / options.gridSize);
	const h = Math.floor(options.height / options.gridSize);
	// TOOD use gridForEach for init?
	const g = gridMake(w, h);

	function selectBiome(p) {
		if (p.level > 1.4) return 'mountain';
		if ((p.level > 1.1) && (p.level < 1.2)) return 'tree';
		if (p.level > 1.0 && p.random < 0.02) return 'town';
		if (p.level > 0.8) return 'grass';
		return 'water';
	}

	// assign level & biomes
	gridForEach(g, 0, (tileCoord) => {
		const p = g.data[tileCoord.y][tileCoord.x];
		p.random = rnhNorm([seed, seedRandom, tileCoord.x, tileCoord.y]); // used in many places
		const sx = [seed, seedX, tileCoord.x, tileCoord.y];
		const sy = [seed, seedY, tileCoord.x, tileCoord.y];
		p.x = (rnhMinMax(sx, gridBorderMin, gridBorderMax) + tileCoord.x) * options.gridSize;
		p.y = (rnhMinMax(sy, gridBorderMin, gridBorderMax) + tileCoord.y) * options.gridSize;
		let noise = perlinNoise(perlin, { x: p.x / 200, y: p.y / 200 });
		p.level = noise + 1.0; // 0 .. 2
		p.biome = selectBiome(p);
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

	// grid
	if (isDrawGrid) {
		elementMap.appendChild(svgutil.createGrid(options.width, options.height, options.gridSize));
	}

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

	// towns
	const towns = [];
	gridForEach(map.grid, 0, (tileCoord) => {
		const d = map.grid.data[tileCoord.y][tileCoord.x];
		if (d.biome === 'town') {
			towns.push({ x: d.x, y: d.y });
		}
	});

	// streets
	const streets = [];
	for (const from of towns) {
		const toList = towns
			.filter(to => (from.x != to.x) || (from.y != to.y))
			.map(to => ({ x: to.x, y: to.y, distance: distance(from, to) }));
		// only search the closest town
		if (toList.length > 0) {
			toList.sort((a, b) => a.distance > b.distance ? 1 : -1);
			streets.push({ from: from, to: toList[0] });
		}
	}
	const SHOW_STREETS = true;
	if (SHOW_STREETS) {
		for (const street of streets) {
			elementMap.appendChild(svgutil.createLine(street.from, street.to, '#f40'));
		}
	}

	// mountains
	const items = [];
	gridForEach(map.grid, 0, (tileCoord) => {
		const p = map.grid.data[tileCoord.y][tileCoord.x];
		if (p.biome === 'mountain') {
			// currently using the same random number for everything
			const node = images.mountains[Math.floor(p.random * images.mountains.length)].cloneNode(true);
			const xScale = 1.1 + (p.random * 0.2);
			const yScale = 1.3 + (p.random * 0.2);
			const x = p.x;
			const y = p.y;
			items.push({ x: x, y: y, xs: xScale, ys: yScale, node: node });
		}
		if (p.biome === 'tree') {
			//const i = Math.floor(p.random * images.trees.length);
			const i = 1;
			const node = images.trees[i].cloneNode(true);
			const xScale = 0.8 + (p.random * 0.4);
			const yScale = 0.8 + (p.random * 0.4);
			const x = p.x;
			const y = p.y;
			items.push({ x: x, y: y, xs: xScale, ys: yScale, node: node });
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
	const images = { mountains, trees };
	const options = {
		width: 1000,
		height: 700,
		gridSize: 25,
	};

	let map = null;

	function clickCreate() {
		const seed = parseFloat(document.getElementById('seed').value);
		map = create(seed, options);
		// map.grid.data[17][35].biome = 'water';
		// map.grid.data[17][36].biome = 'water';
		draw(map, images, options);
	}

	function clickDraw() {
		draw(map, images, options);
	}

	function clickMap(event) {
		const x = Math.floor(event.offsetX / GRID_SIZE);
		const y = Math.floor(event.offsetY / GRID_SIZE);
		console.log(x, y);
		map.grid.data[y][x].biome = 'water';
		draw(map, images, options);
	}

	document.getElementById('create').addEventListener('click', clickCreate);
	document.getElementById('draw-grid').addEventListener('change', clickDraw);
	document.getElementById('draw-biomes').addEventListener('change', clickDraw);
	document.getElementById('draw-rose').addEventListener('change', clickDraw);
	document.getElementById('draw-border').addEventListener('change', clickDraw);
	document.getElementById('svg').addEventListener('click', clickMap);

	clickCreate();
}

document.addEventListener('DOMContentLoaded', main);
