const parse_xy = (x: number, y: number, image: ImageData) => {
	if (x < 0 || x > image.width - 1 || y < 0 || y > image.height - 1) return "tile";

	const [r, g, b, a] = pixel(x, y, image);

	const hex = r + g + b;

	//const str = `rgb(${r}, ${g}, ${b})`

	if (r == 255 && g == 0 && b == 0) {return "player";
	} else if (r == 0 && g == 255 && b == 0) { return "tile";
	} else if (r == 255 && g == 255 && b == 0) { return "platform";
	} else if (r == 0 && g == 0 && b == 255) { return "spike";
	} else if (r == 255 && g == 0 && b == 255) {return "dash";
	} else if (r == 0 && g == 255 && b == 255) { return "fragile";
	} else {	return null;
	}
};

const pixel = (x: number, y: number, image: ImageData) => {
	let index = y * (image.width * 4) + x * 4;
	let r = image.data[index + 0];
	let g = image.data[index + 1];
	let b = image.data[index + 2];
	let a = image.data[index + 3];
	return [r, g, b, a];
};

const parseTile = (x: number, y: number, image: ImageData) => {
	const t = parse_xy(x, y, image);
	//if (!t) return null;
	if (!t) return { x, y, type: t };

	let side = "up";

	const tl = "tile";

	if (t == "tile") {
		if (
			parse_xy(x, y - 1, image) != tl &&
			parse_xy(x, y + 1, image) == tl &&
			parse_xy(x + 1, y, image) == tl &&
			parse_xy(x - 1, y, image) != tl
		) {
			side = "top-left";
		} else if (
			parse_xy(x, y - 1, image) != tl &&
			parse_xy(x, y + 1, image) == tl &&
			parse_xy(x + 1, y, image) != tl &&
			parse_xy(x - 1, y, image) == tl
		) {
			side = "top-right";
		} else if (
			parse_xy(x, y - 1, image) == tl &&
			parse_xy(x, y + 1, image) != tl &&
			parse_xy(x + 1, y, image) != tl &&
			parse_xy(x - 1, y, image) == tl
		) {
			side = "bottom-right";
		} else if (
			parse_xy(x, y - 1, image) == tl &&
			parse_xy(x, y + 1, image) != tl &&
			parse_xy(x + 1, y, image) == tl &&
			parse_xy(x - 1, y, image) != tl
		) {
			side = "bottom-left";
		} else if (
			parse_xy(x, y - 1, image) == tl &&
			parse_xy(x, y + 1, image) == tl &&
			parse_xy(x + 1, y, image) == tl &&
			parse_xy(x - 1, y, image) == tl &&
			parse_xy(x - 1, y - 1, image) != tl
		) {
			side = "up";
		} else if (
			parse_xy(x, y - 1, image) == tl &&
			parse_xy(x, y + 1, image) == tl &&
			parse_xy(x + 1, y, image) == tl &&
			parse_xy(x - 1, y, image) == tl &&
			parse_xy(x + 1, y - 1, image) != tl
		) {
			side = "up";
		} else if (
			parse_xy(x, y - 1, image) == tl &&
			parse_xy(x, y + 1, image) == tl &&
			parse_xy(x + 1, y, image) == tl &&
			parse_xy(x - 1, y, image) == tl &&
			parse_xy(x + 1, y + 1, image) != tl
		) {
			side = "down";
		} else if (
			parse_xy(x, y - 1, image) == tl &&
			parse_xy(x, y + 1, image) == tl &&
			parse_xy(x + 1, y, image) == tl &&
			parse_xy(x - 1, y, image) == tl &&
			parse_xy(x - 1, y + 1, image) != tl
		) {
			side = "down";
		} else if (
			parse_xy(x, y - 1, image) == tl &&
			parse_xy(x, y + 1, image) == tl &&
			parse_xy(x + 1, y, image) == tl &&
			parse_xy(x - 1, y, image) != tl
		) {
			side = "left";
		} else if (
			parse_xy(x, y - 1, image) == tl &&
			parse_xy(x, y + 1, image) == tl &&
			parse_xy(x + 1, y, image) != tl &&
			parse_xy(x - 1, y, image) == tl
		) {
			side = "right";
		} else if (
			parse_xy(x, y - 1, image) == tl &&
			parse_xy(x, y + 1, image) != tl &&
			parse_xy(x + 1, y, image) == tl &&
			parse_xy(x - 1, y, image) == tl
		) {
			side = "down";
		} else if (
			parse_xy(x, y - 1, image) != tl &&
			parse_xy(x, y + 1, image) == tl &&
			parse_xy(x + 1, y, image) == tl &&
			parse_xy(x - 1, y, image) == tl
		) {
			side = "up";
		} else {
			//console.log({ x, y, w: image.width, h: image.height });
			side = "middle";
		}
	}

	if (t == "spike") {
		if (parse_xy(x + 1, y, image) == tl && parse_xy(x - 1, y, image) == null) {
			side = "left";
		} else if (parse_xy(x + 1, y, image) == null && parse_xy(x - 1, y, image) == tl) {
			side = "right";
		} else if (parse_xy(x, y - 1, image) == null && parse_xy(x, y + 1, image) == tl) {
			side = "up";
		} else if (parse_xy(x, y - 1, image) == tl && parse_xy(x, y + 1, image) == null) {
			side = "down";
		} else {
			side = "up";
		}
	}

	return { x, y, type: t, side };
};

function loadLevelFromImage(level: number) {
		const parseTiles = (data: ImageData) => {
			const objects = [];
			for (let x = 0; x < 40; x++) {
				for (let y = 0; y < 23; y++) {
					const object = parseTile(x, y, data);
					if (object) objects.push(object);
				}
			}
			return objects;
		};

		return new Promise((resolve, reject) => {
			const map_num = Math.floor(level / 10);
			const filename = `assets/levels-${map_num}.png`;

			const cached = localStorage.getItem(filename);

			const image = new Image();
			image.src = cached || filename;
			image.onload = () => {
				const cnvs = document.createElement("canvas");
				(cnvs.width = image.width), (cnvs.height = image.height);
				const ctx = cnvs.getContext("2d");
				ctx.drawImage(image, 0, 0);

				if (!localStorage.getItem(filename)) {
					localStorage.setItem(filename, cnvs.toDataURL());
				}

				const data = ctx.getImageData((level % 10) * 40, 0, 40, 23);
				const objects = parseTiles(data);
				resolve(objects);
			};
			image.onerror = (e) => {
				console.log("error loading iamge");
				reject(e);
			};
		});
	}



export { parseTile, loadLevelFromImage };
