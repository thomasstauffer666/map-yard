
import * as xxhash from './xxhash.js';
import * as svgutil from './svgutil.js';

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

function gridMake(width, height, callable) {
	const data = [];
	for (let y = 0; y < height; y += 1) {
		const row = [];
		for (let x = 0; x < width; x += 1) {
			const v = callable({ x: x, y: y });
			row.push(v);
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
	//const result = Math.random();
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
	return gridMake(width, height, p => rnhUnitVector([seed, p.x, p.y]));
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

// TODO remove
const WIDTH = 1000;
const HEIGHT = 700;
const GRID_SIZE = 25;

function create(seed) {
	// this would is the only user controlled number
	//const seed = 0.3; // Math.random();

	const seedRandom = 0.7;
	const seedX = 0.9;
	const seedY = 0.8;

	const perlin = perlinCreate(seed, 10 + 2, 8 + 2);

	const gridBorderMin = 0.2;
	const gridBorderMax = 0.8;

	const w = Math.floor(WIDTH / GRID_SIZE);
	const h = Math.floor(HEIGHT / GRID_SIZE);
	// TOOD use gridForEach for init?
	const g = gridMake(w, h, (p) => {
		return {
			random: rnhNorm([seed, seedRandom, p.x, p.y]), // used in many places
			x: (rnhMinMax([seed, seedX, p.x, p.y], gridBorderMin, gridBorderMax) + p.x) * GRID_SIZE,
			y: (rnhMinMax([seed, seedY, p.x, p.y], gridBorderMin, gridBorderMax) + p.y) * GRID_SIZE
		};
	});

	function selectBiome(p) {
		if (p.level > 1.4) return 'mountain';
		if (p.level > 1.0 && p.random < 0.02) return 'town';
		if (p.level > 0.8) return 'grass';
		return 'water';
	}

	// assign level & biomes
	gridForEach(g, 0, (tile) => {
		const p = g.data[tile.y][tile.x];
		let noise = perlinNoise(perlin, { x: p.x / 200, y: p.y / 200 });
		p.level = noise + 1.0; // 0 .. 2
		p.biome = selectBiome(p);
	});

	return { grid: g };
}

function draw(map, images) {
	const elementMap = document.getElementById('svg');
	elementMap.innerHTML = '';
	elementMap.setAttribute('width', WIDTH);
	elementMap.setAttribute('height', HEIGHT);

	const isDrawGrid = document.getElementById('draw-grid').checked;
	const isDrawBiomes = document.getElementById('draw-biomes').checked;

	// grid
	if (isDrawGrid) {
		elementMap.appendChild(svgutil.createGrid(WIDTH, HEIGHT, GRID_SIZE));
	}

	// biomes
	const BIOMES_COLORS = {
		'town': '#f0f',
		'water': '#00f',
		'grass': '#9f9',
		'mountain': '#999',
	};
	if (isDrawBiomes) {
		gridForEach(map.grid, 0, (tile) => {
			const p = map.grid.data[tile.y][tile.x];
			elementMap.appendChild(svgutil.createCircle(p, BIOMES_COLORS[p.biome]));
		});
	}

	// towns
	const towns = [];
	gridForEach(map.grid, 0, (tile) => {
		const d = map.grid.data[tile.y][tile.x];
		if (d.biome === 'town') {
			towns.push({ x: d.x, y: d.y });
		}
	});

	// streets
	const streets = [];
	for (const from of towns) {
		const toList = towns.
			filter(to => (from.x != to.x) || (from.y != to.y)).
			map(to => ({ x: to.x, y: to.y, distance: distance(from, to) }));
		// only search the closest town
		if (toList.length > 0) {
			toList.sort((a, b) => a.distance > b.distance ? 1 : -1);
			streets.push({ from: from, to: toList[0] });
		}
	}
	const SHOW_STREETS = true;
	if (SHOW_STREETS) {
		for (const street of streets) {
			elementMap.appendChild(svgutil.createLine(street.from, street.to, '#999'));
		}
	}

	// mountains
	const items = [];
	gridForEach(map.grid, 0, (tile) => {
		const p = map.grid.data[tile.y][tile.x];
		if (p.biome === 'mountain') {
			// currently using the same random number for everything
			const m = images.mountains[Math.floor(p.random * images.mountains.length)];
			const node = m.cloneNode(true);
			const xScale = 1.1 + (p.random * 0.2);
			const yScale = 1.3 + (p.random * 0.2);
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
	gridForEach(map.grid, 1, (tile) => {
		const p = map.grid.data[tile.y][tile.x];
		const pl = map.grid.data[tile.y + 0][tile.x - 1];
		const pr = map.grid.data[tile.y + 0][tile.x + 1];
		const pt = map.grid.data[tile.y - 1][tile.x - 0];
		const pb = map.grid.data[tile.y + 1][tile.x + 0];
		const ptl = map.grid.data[tile.y - 1][tile.x - 1];
		const ptr = map.grid.data[tile.y - 1][tile.x + 1];
		const pbl = map.grid.data[tile.y + 1][tile.x - 1];
		const pbr = map.grid.data[tile.y + 1][tile.x + 1];
		let ps = [];

		// tr
		if (p.biome === 'water' && pt.biome == 'water' && ptr.biome == 'water' && pr.biome == 'grass') {
			ps.push(ptr);
		}
		if (p.biome === 'water' && pt.biome == 'water' && ptr.biome == 'grass' && pr.biome == 'grass') {
			ps.push(pt);
		}
		if (p.biome === 'water' && pt.biome == 'grass' && ptr.biome == 'grass' && pr.biome == 'water') {
			ps.push(pr);
		}
		if (p.biome === 'water' && pt.biome == 'grass' && ptr.biome == 'water' && pr.biome == 'water') {
			ps.push(ptr);
		}
		// br
		if (p.biome === 'water' && pb.biome == 'water' && pbr.biome == 'water' && pr.biome == 'grass') {
			ps.push(pbr);
		}
		if (p.biome === 'water' && pb.biome == 'water' && pbr.biome == 'grass' && pr.biome == 'grass') {
			ps.push(pb);
		}
		if (p.biome === 'water' && pb.biome == 'grass' && pbr.biome == 'water' && pr.biome == 'water') {
			ps.push(pbr);
		}
		if (p.biome === 'water' && pb.biome == 'grass' && pbr.biome == 'grass' && pr.biome == 'water') {
			ps.push(pr);
		}
		// bl
		if (p.biome === 'water' && pb.biome == 'water' && pbl.biome == 'water' && pl.biome == 'grass') {
			ps.push(pbl);
		}
		if (p.biome === 'water' && pb.biome == 'water' && pbl.biome == 'grass' && pl.biome == 'grass') {
			ps.push(pb);
		}
		if (p.biome === 'water' && pb.biome == 'grass' && pbl.biome == 'water' && pl.biome == 'water') {
			ps.push(pbl);
		}
		if (p.biome === 'water' && pb.biome == 'grass' && pbl.biome == 'grass' && pl.biome == 'water') {
			ps.push(pl);
		}
		// tl
		if (p.biome === 'water' && pt.biome == 'water' && ptl.biome == 'water' && pl.biome == 'grass') {
			ps.push(ptl);
		}
		if (p.biome === 'water' && pt.biome == 'water' && ptl.biome == 'grass' && pl.biome == 'grass') {
			ps.push(pt);
		}
		if (p.biome === 'water' && pt.biome == 'grass' && ptl.biome == 'water' && pl.biome == 'water') {
			ps.push(ptl);
		}
		if (p.biome === 'water' && pt.biome == 'grass' && ptl.biome == 'grass' && pl.biome == 'water') {
			ps.push(pl);
		}

		if (ps.length == 2) {
			elementMap.appendChild(svgutil.createQuadraticBezier(middle(p, ps[0]), p, middle(p, ps[1]), '#00f'));
		} else if (ps.length == 4) {
			// other combinations 0213 may also work
			elementMap.appendChild(svgutil.createQuadraticBezier(middle(p, ps[0]), p, middle(p, ps[1]), '#00f'));
			elementMap.appendChild(svgutil.createQuadraticBezier(middle(p, ps[2]), p, middle(p, ps[3]), '#00f'));
		}
	});
}

async function main() {
	const mountains = await Promise.all(['mountain1.svg', 'mountain2.svg', 'mountain3.svg'].map($ => svgutil.load($)));
	const images = { mountains: mountains };

	let map = null;

	function clickCreate() {
		const seed = parseFloat(document.getElementById('seed').value);
		map = create(seed);
		draw(map, images);
	}

	function clickDraw() {
		draw(map, images);
	}

	function clickMap(event) {
		const x = Math.floor(event.offsetX / GRID_SIZE);
		const y = Math.floor(event.offsetY / GRID_SIZE);
		map.grid.data[y][x].biome = 'water';
		draw(map, images);
	}

	document.getElementById('create').addEventListener('click', clickCreate);
	document.getElementById('draw-grid').addEventListener('change', clickDraw);
	document.getElementById('draw-biomes').addEventListener('change', clickDraw);
	document.getElementById('svg').addEventListener('click', clickMap);

	clickCreate();
}

document.addEventListener('DOMContentLoaded', main);
