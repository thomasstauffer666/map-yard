export function createCircle(center, radius, strokeColor, fillColor) {
	const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
	circle.setAttribute('cx', center.x);
	circle.setAttribute('cy', center.y);
	circle.setAttribute('r', radius);
	circle.setAttribute('style', `stroke:${strokeColor};fill:${fillColor}`);
	return circle;
}

export function createLine(start, end, color) {
	const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
	line.setAttribute('x1', start.x);
	line.setAttribute('y1', start.y);
	line.setAttribute('x2', end.x);
	line.setAttribute('y2', end.y);
	line.setAttribute('style', 'stroke:' + color);
	return line;
}

export function createQuadraticBezier(point1, point2, point3, strokeColor) {
	const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
	path.setAttribute('d', `M${point1.x} ${point1.y} Q${point2.x} ${point2.y},${point3.x} ${point3.y}`);
	path.setAttribute('style', `stroke:${strokeColor};fill:none`);
	return path;
}

export function createGrid(width, height, gridSize) {
	let data = '';
	for (let y = 0; y <= height; y += gridSize) {
		data += `M0 ${y}L${width} ${y}`;
	}
	for (let x = 0; x <= width; x += gridSize) {
		data += `M${x} 0L${x} ${height}`;
	}
	const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
	path.setAttribute('d', data);
	path.setAttribute('style', 'stroke:#999;fill:none');
	return path;
}

export function createRosePeak(strokeColor) {
	const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
	path.setAttribute('d', 'M 100 0 L 1000 0 M 0 0 L 0 5 L 100 0 L 0 -5 z');
	path.setAttribute('style', `stroke:${strokeColor};fill:#fff`);
	return path;
}

export function createRose(center) {
	const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
	const strokeColor = '#ccc';
	group.appendChild(createCircle({ x: 0, y: 0 }, 40, strokeColor, '#fff'));
	for (let angle = 0; angle < 360; angle += 22.5) {
		const peak = createRosePeak(strokeColor);
		peak.setAttribute('transform', `rotate(${angle} 0 0)`);
		group.appendChild(peak);
	}
	group.appendChild(createCircle({ x: 0, y: 0 }, 20, strokeColor, '#fff'));
	group.setAttribute('transform', `translate(${center.x} ${center.y})`);
	return group;
}

export function createBorder(width, height, border) {
	const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
	const tl = { x: 0, y: 0 };
	const tr = { x: width, y: 0 };
	const bl = { x: 0, y: height };
	const br = { x: width, y: height };
	const b = border;
	const outer = `M${tl.x} ${tl.y} L${bl.x} ${bl.y} L${br.x} ${br.y} L${tr.x} ${tr.y} L${tl.x} ${tl.y} z`;
	const inner = `M${tl.x + b} ${tl.y + b} L${tr.x - b} ${tr.y + b} L${br.x - b} ${br.y - b} L${bl.x + b} ${bl.y - b} L${
		tl.x + b
	} ${tl.y + b} z`;
	path.setAttribute('d', outer + inner);
	path.setAttribute('style', 'fill:#fff;stroke:#000;stroke-width:2');
	return path;
}

export async function load(filename) {
	const response = await fetch(filename);
	const text = await response.text();
	const svg = (new DOMParser()).parseFromString(text, 'image/svg+xml');
	return svg.children[0].children[2];
}

// h = 0..360, s = 0..100, l = 0..100
export function hsl(h, s, l) {
	return 'hsl(' + h + ',' + s + '%,' + l + '%)';
}
