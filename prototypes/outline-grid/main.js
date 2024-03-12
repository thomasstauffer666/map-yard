import * as svgutil from './svgutil.js';
import * as rnh from './rnh.js';
import * as grid from './grid.js';

function middle(a, b) {
	return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function distance(a, b) {
	const dx = a.x - b.x;
	const dy = a.y - b.y;
	return Math.sqrt(dx ** 2 + dy ** 2);
}

// https://en.wikipedia.org/wiki/Linear_interpolation
/*
function lerp(a, b, x) {
	return a + x * (b - a);
}
*/

// Perlin

function perlinCreate(seed, width, height) {
	const g = grid.make(width, height);
	grid.forEach(g, 0, (tileCoord) => {
		g.data[tileCoord.y][tileCoord.x] = rnh.unitVector([seed, tileCoord.x, tileCoord.y]);
	});
	return g;
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
	const g = grid.make(w, h);

	function selectBiome(p) {
		if (p.level > 1.4) return 'mountain';
		if ((p.level > 1.1) && (p.level < 1.25)) return 'tree';
		if (p.level > 1.0 && p.random < 0.02) return 'town';
		if (p.level > 0.8) return 'grass';
		return 'water';
	}

	// assign level & biomes
	grid.forEach(g, 0, (tileCoord) => {
		const p = g.data[tileCoord.y][tileCoord.x];
		// currently using the same random number for many things (e.g. selected object, size of objects)
		p.random = rnh.norm([seed, 0.7, tileCoord.x, tileCoord.y]);
		const seedX = [seed, 0.9, tileCoord.x, tileCoord.y];
		const seedY = [seed, 0.8, tileCoord.x, tileCoord.y];
		p.x = (rnh.minMax(seedX, gridBorderMin, gridBorderMax) + tileCoord.x) * options.gridSize;
		p.y = (rnh.minMax(seedY, gridBorderMin, gridBorderMax) + tileCoord.y) * options.gridSize;
		const noise = perlinNoise(perlin, { x: p.x / 200, y: p.y / 200 });
		p.level = noise + 1.0; // 0 .. 2
		p.biome = grid.isBorder(g, tileCoord) ? 'grass' : selectBiome(p);
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
		grid.forEach(map.grid, 0, (tileCoord) => {
			const p = map.grid.data[tileCoord.y][tileCoord.x];
			elementMap.appendChild(svgutil.createCircle(p, 2, '', BIOMES_COLORS[p.biome]));
		});
	}

	// search towns
	const towns = [];
	grid.forEach(map.grid, 0, (tileCoord) => {
		const p = map.grid.data[tileCoord.y][tileCoord.x];
		if (p.biome === 'town') {
			towns.push({ x: tileCoord.x, y: tileCoord.y });
		}
	});

	// select streets
	const numberOfStreets = towns.length;
	const streets = [];
	for (let i = 0; i < numberOfStreets; i += 1) {
		const a = rnh.minMaxInt([seed, 0.2, i], 0, numberOfStreets);
		const b = rnh.minMaxInt([seed, 0.3, i], 0, numberOfStreets);
		const from = Math.min(a, b);
		const to = Math.max(b, a);
		if ((from !== to) && (streets.findIndex($ => ($.from === from) && ($.to === to)) === -1)) {
			streets.push({ from: from, to: to });
		}
	}

	const SHOW_STREETS_LINE = false;
	if (SHOW_STREETS_LINE) {
		for (const street of streets) {
			const townFrom = towns[street.from];
			const townTo = towns[street.to];
			const pFrom = map.grid.data[townFrom.y][townFrom.x];
			const pTo = map.grid.data[townTo.y][townTo.x];
			elementMap.appendChild(svgutil.createLine(pFrom, pTo, '#f40'));
		}
	}

	const SHOW_STREETS_ZIGZAG = false;
	if (SHOW_STREETS_ZIGZAG) {
		for (const street of streets) {
			const townStart = towns[street.from];
			const townEnd = towns[street.to];
			let tileCurrrent = { x: townStart.x, y: townStart.y };
			const tileEnd = { x: townEnd.x, y: townEnd.y };
			for (let n = 0; n < 100; n += 1) {
				let tileNext = {
					x: tileCurrrent.x + Math.sign(tileEnd.x - tileCurrrent.x),
					y: tileCurrrent.y + Math.sign(tileEnd.y - tileCurrrent.y)
				};
				const pCurrent = map.grid.data[tileCurrrent.y][tileCurrrent.x];
				const pNext = map.grid.data[tileNext.y][tileNext.x];
				elementMap.appendChild(svgutil.createLine(pCurrent, pNext, '#f40'));
				tileCurrrent = tileNext;
			}
		}
	}

	const SHOW_STREETS_BFS = true;
	if (SHOW_STREETS_BFS) {
		for (const street of streets) {
			const townStart = towns[street.from];
			const townEnd = towns[street.to];
			//console.log(townStart, townEnd);

			const queue = [];
			const visited = [];

			queue.push({ ...townStart });
			visited.push({ ...townStart });

			const same = (a, b) => (a.x == b.x) && (a.y == b.y);
			let front = {};

			for (let n = 0; n < 100000; n += 1) {
				if (queue.length == 0) {
					//console.log('queue empty');
					break;
				}

				if (n > 10000) {
					console.log('too long search');
					break;
				}

				front = queue.shift();

				if (same(front, townEnd)) {
					//console.log('target reached');
					break;
				}

				const t = { x: front.x + 0, y: front.y - 1 };
				const b = { x: front.x + 0, y: front.y + 1 };
				const l = { x: front.x - 1, y: front.y + 0 };
				const r = { x: front.x + 1, y: front.y + 0 };

				function visit(tile) {
					const isVisited = visited.findIndex($ => same($, tile)) !== -1;
					const isBorder = grid.isBorder(map.grid, tile);
					const isWater = map.grid.data[tile.y][tile.x].biome === 'water';
					if ((!isVisited) && (!isBorder) && (!isWater)) {
						visited.push({ x: tile.x, y: tile.y, parent: front });
						queue.push({ x: tile.x, y: tile.y });
					}
				}

				visit(t);
				visit(b);
				visit(l);
				visit(r);
			}

			let tileCurrent = visited[visited.findIndex($ => same($, front))];
			for (let n = 0; n < 100; n += 1) {
				if (tileCurrent.parent === undefined) {
					break;
				}
				const tileNext = visited[visited.findIndex($ => same($, tileCurrent.parent))];
				const pCurrent = map.grid.data[tileCurrent.y][tileCurrent.x];
				const pNext = map.grid.data[tileNext.y][tileNext.x];
				elementMap.appendChild(svgutil.createLine(pCurrent, pNext, '#f40'));
				tileCurrent = tileNext;
			}
		}
	}

	// draw grid elements
	const items = [];
	grid.forEach(map.grid, 0, (tileCoord) => {
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
	grid.forEach(map.grid, 1, (tileCoord) => {
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
