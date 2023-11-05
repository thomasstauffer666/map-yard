// https://de.wikipedia.org/wiki/Xorshift
// XORShift128
export function rngCreate(seed) {
	// console.assert(isUint32(seed));
	// return { x: 123456789, y: 362436069, z: 521288629, w: 88675123 };
	// TODO possible initial states maybe limited too much? run a few first rounds?
	return { x: seed, y: 0, z: 0, w: 0 };
}

export function rngNext(state) {
	const t = state.x ^ (state.x << 11);
	const result = {
		x: state.y,
		y: state.z,
		z: state.w,
		w: (state.w ^ ((state.w >>> 19) ^ t ^ (t >>> 8))) >>> 0,
	};
	return result;
}
