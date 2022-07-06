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

	private nearest_neighbor_scaling(
		frame: Uint8ClampedArray,
		old_width: number,
		old_height: number,
		new_width: number,
		new_height: number
	): Uint8ClampedArray {
		// https://tech-algorithm.com/articles/nearest-neighbor-image-scaling/
		const x_ratio = old_width / new_width;
		const y_ratio = old_height / new_height;
		const data = new Uint8ClampedArray(new_width * new_height * 4);

		for (let y = 0; y < new_height; y++) {
			for (let x = 0; x < new_width; x++) {
				let px = Math.floor(x * x_ratio);
				let py = Math.floor(y * y_ratio);
				let new_pixel_index = y * (new_width * 4) + x * 4;
				let old_pixel_index = Math.floor(py * (old_width * 4) + px * 4);

				data[new_pixel_index + 0] = frame[old_pixel_index + 0];
				data[new_pixel_index + 1] = frame[old_pixel_index + 1];
				data[new_pixel_index + 2] = frame[old_pixel_index + 2];
				data[new_pixel_index + 3] = frame[old_pixel_index + 3];
			}
		}
		return data;
	}

	render(upscale_factor: number = 1) {
		const encoder = new GIFEncoder(this.width * upscale_factor, this.height * upscale_factor);
		encoder.setRepeat(0);
		encoder.setQuality(1);
		encoder.setGlobalPalette(true);

		encoder.writeHeader();
		for (const frame of this.frames) {
			encoder.setDelay(frame.delay);
			encoder.addFrame(
				this.nearest_neighbor_scaling(frame.data, frame.width, frame.height, encoder.width, encoder.height)
			);
		}
		encoder.finish();

		const buf = encoder.stream().getData();
		const data_url = `data:image/gif;base64,${btoa(buf)}`;

		fetch(data_url)
			.then((res) => res.blob())
			.then((blob) => window.open(URL.createObjectURL(blob)));
	}
}
