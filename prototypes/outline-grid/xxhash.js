// https://github.com/Cyan4973/xxHash
export function xxHash32(input, seed) {
	function rotl(x, rotate) {
		return (x << rotate) | (x >>> (32 - rotate));
	}

	function round(acc, input) {
		acc += Math.imul(input, prime2);
		acc = rotl(acc, 13);
		acc = Math.imul(acc, prime1);
		return acc;
	}

	const prime1 = 0x9e3779b1;
	const prime2 = 0x85ebca77;
	const prime3 = 0xc2b2ae3d;
	const prime4 = 0x27d4eb2f;
	const prime5 = 0x165667b1;

	let v1 = (seed + prime1 + prime2) >>> 0;
	let v2 = (seed + prime2) >>> 0;
	let v3 = (seed + 0) >>> 0;
	let v4 = (seed - prime1) >>> 0;

	let hash = 0;

	if (input.length >= 4) {
		for (let i = 0; i < (input.length - 3); i += 4) {
			v1 = round(v1, input[i + 0]);
			v2 = round(v2, input[i + 1]);
			v3 = round(v3, input[i + 2]);
			v4 = round(v4, input[i + 3]);
		}
		hash = rotl(v1, 1) + rotl(v2, 7) + rotl(v3, 12) + rotl(v4, 18);
	} else {
		hash = seed + prime5;
	}

	hash += input.length * 4;

	// finalize

	const rest = input.length - (input.length % 4);
	for (let i = rest; i < input.length; i += 1) {
		hash += Math.imul(input[i], prime3);
		hash = Math.imul(rotl(hash, 17), prime4);
	}

	// avalanche

	hash ^= hash >>> 15;
	hash = Math.imul(hash, prime2);
	hash ^= hash >>> 13;
	hash = Math.imul(hash, prime3);
	hash ^= hash >>> 16;

	return hash >>> 0;
}
