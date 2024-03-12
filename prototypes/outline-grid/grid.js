
export function make(width, height) {
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

export function forEach(grid, border, callable) {
	for (let y = border; y < (grid.height - border); y += 1) {
		for (let x = border; x < (grid.width - border); x += 1) {
			callable({ x: x, y: y });
		}
	}
}

export function isBorder(grid, tile) {
	return (tile.x === 0) || (tile.y === 0) || (tile.x === (grid.width - 1)) || (tile.y === (grid.height - 1));
}
