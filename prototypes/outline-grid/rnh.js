// rnh = Random Number Hash

import * as xxhash from './xxhash.js';

const UINT32_MAX = 0xffffffff;

function float2uint32(floats) {
	const float32Array = new Float32Array(floats);
	const uint32Array = new Uint32Array(float32Array.buffer);
	return Array.from(uint32Array);
}

export function unitVector(seeds) {
	const angle = norm(seeds) * 2 * Math.PI;
	return { x: Math.cos(angle), y: Math.sin(angle) };
}

export function norm(seeds) {
	// const result = Math.random();
	const result = xxhash.xxHash32(float2uint32(seeds), 0) / UINT32_MAX;
	console.assert((result >= 0.0) && (result <= 1.0));
	return result;
}

export function minMax(seeds, min, max) {
	const r = norm(seeds);
	return min + (r * (max - min));
}

export function minMaxInt(seeds, minInclusive, maxExclusive) {
	const r = norm(seeds);
	return minInclusive + Math.floor(r * (maxExclusive - minInclusive));
}