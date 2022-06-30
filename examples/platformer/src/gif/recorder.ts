import GIFEncoder from "./GIFEncoder.js";

interface Frame {
	data: Uint8ClampedArray;
	width: number;
	height: number;
	index: number;
	delay: number; // milliseconds
	dispose: number;
}

export class GifRecorder {
	frames: Frame[] = [];
	width: number;
	height: number;
	repeat: number = 0;
	background: string = "#fff";
	quality: number = 10;
	index: number = 0;

	constructor(options: { width: number; height: number }) {
		this.width = options.width;
		this.height = options.height;

		console.log("w", this.width, "h", this.height);
	}

	addFrame(image: CanvasRenderingContext2D, options: { delay?: number; dispose?: number }) {
		const imagedata = image.getImageData(0, 0, this.width, this.height);
		const frame = {
			data: imagedata.data,
			width: imagedata.width,
			height: imagedata.height,
			index: this.index++,
			delay: options.delay ?? 100,
			dispose: options.dispose ?? -1,
		};

		this.frames.push(frame);
	}

	private resize(frame: Frame, factor: number = 2) : Uint8ClampedArray{
		const w1 = frame.width;
		const h1 = frame.height;
		const w2 = frame.width * factor;
		const h2 = frame.height * factor;

		let x_ratio = w1 / w2;
		let y_ratio = h1 / h2;
		let px, py;

		const temp = new Uint8ClampedArray(w2 * h2 * 4);

		for (let y = 0; y < h2; y++) {
			for (let x = 0; x < w2; x++) {
				px = Math.floor(x * x_ratio);
				py = Math.floor(y * y_ratio);

        let index1 = y * w2 + x
        let index2 = Math.floor(py * w1 + px)
				temp[index1 + 0] = frame.data[index2 + 0];
				temp[index1 + 1] = frame.data[index2 + 1];
				temp[index1 + 2] = frame.data[index2 + 2];
				temp[index1 + 3] = frame.data[index2 + 3];
			}
		}
		return temp;

		// https://tech-algorithm.com/articles/nearest-neighbor-image-scaling/
	}

	render(factor: number = 2) {
		const encoder = new GIFEncoder(this.width, this.height);
		encoder.setRepeat(0);
		encoder.setQuality(1);
		encoder.setGlobalPalette(true);

		encoder.writeHeader();
		for (const frame of this.frames) {
			encoder.setDelay(frame.delay);
			//encoder.addFrame(this.resize(frame, factor));
			encoder.addFrame(frame.data);
		}
		encoder.finish();

		const buf = encoder.stream().getData();
		const b64 = btoa(buf);
		const url = `data:image/gif;base64,${b64}`;

		fetch(url)
			.then((res) => res.blob())
			.then((blob) => {
				window.open(URL.createObjectURL(blob));
			});
	}
}
