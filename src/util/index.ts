function randomInteger(min: number, max: number): number {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number): number {
	return Math.random() * (max - min) + min;
}

function normalize(val: number, min: number, max: number) {
	return (val - min) / (max - min);
}

function normalizeToRange(val: number, minVal: number, maxVal: number, newMin: number, newMax: number) {
	return newMin + ((val - minVal) * (newMax - newMin)) / (maxVal - minVal);
}

function clamp(val: number, min: number, max: number): number {
	return Math.max(min, Math.min(val, max));
}

export { randomFloat, randomInteger, clamp };
