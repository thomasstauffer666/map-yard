export function createCircle(center, color) {
	const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
	circle.setAttribute('cx', center.x);
	circle.setAttribute('cy', center.y);
	circle.setAttribute('r', 2);
	circle.setAttribute('style', 'fill:' + color);
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

export function createQuadraticBezier(point1, point2, point3, color) {
	const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
	path.setAttribute('d', `M${point1.x} ${point1.y} Q${point2.x} ${point2.y},${point3.x} ${point3.y}`);
	path.setAttribute('style', 'fill:none;stroke:' + color);
	return path;
}

export function createGrid(width, height, gridSize) {
	const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
	for (let y = 0; y <= height; y += gridSize) {
		group.appendChild(createLine({ x: 0, y: y }, { x: width, y: y }, '#999'));
	}
	for (let x = 0; x <= width; x += gridSize) {
		group.appendChild(createLine({ x: x, y: 0 }, { x: x, y: height }, '#999'));
	}
	return group;
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
