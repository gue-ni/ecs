// usefull types
type seconds = number;
type milliseconds = number;
type pixels = number;

function randomInteger(min: number, max: number): number {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number): number {
	return Math.random() * (max - min) + min;
}

function normalize(val: number, min: number, max: number) {
	return (val - min) / (max - min);
}

function approach(goal: number, current: number, delta: number) {
	let diff = goal - current;

	if (diff > delta) {
		return current + delta;
	}
	if (diff < -delta) {
		return current - delta;
	}

	return goal;
}

function normalizeToRange(val: number, minVal: number, maxVal: number, newMin: number, newMax: number) {
	return newMin + ((val - minVal) * (newMax - newMin)) / (maxVal - minVal);
}

function lerp(min: number, max: number, factor: number) {
	factor = clamp(factor, 0, 1);
	return min * (1 - factor) + max * factor;
}

function clamp(val: number, min: number, max: number): number {
	return Math.max(min, Math.min(val, max));
}

export { randomFloat, randomInteger, clamp, lerp, approach, seconds, milliseconds, pixels };
