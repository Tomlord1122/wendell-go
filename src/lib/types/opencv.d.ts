declare module '@techstark/opencv-js' {
	export interface Point {
		x: number;
		y: number;
	}

	export interface Rect {
		x: number;
		y: number;
		width: number;
		height: number;
	}

	export interface Scalar {
		r: number;
		g: number;
		b: number;
		a?: number;
	}

	export interface Mat {
		rows: number;
		cols: number;
		data32S: Int32Array;
		clone(): Mat;
		roi(rect: Rect): Mat;
		copyTo(dst: Mat): void;
		delete(): void;
		isDeleted(): boolean;
	}

	export interface MatVector {
		size(): number;
		get(index: number): Mat;
		push_back(mat: Mat): void;
		delete(): void;
	}

	const cv: {
		Point: new (x: number, y: number) => Point;
		Rect: new (x: number, y: number, width: number, height: number) => Rect;
		Scalar: new (r: number, g: number, b: number, a?: number) => Scalar;
		Mat: new () => Mat;
		MatVector: new () => MatVector;

		// Constants
		COLOR_BGR2GRAY: number;
		ADAPTIVE_THRESH_GAUSSIAN_C: number;
		THRESH_BINARY_INV: number;
		RETR_TREE: number;
		CHAIN_APPROX_SIMPLE: number;
		ROTATE_90_CLOCKWISE: number;
		ROTATE_90_COUNTERCLOCKWISE: number;
		CV_32SC2: number;

		// Functions
		imread(element: HTMLImageElement): Mat;
		imshow(canvas: HTMLCanvasElement, mat: Mat): void;
		cvtColor(src: Mat, dst: Mat, code: number): void;
		adaptiveThreshold(
			src: Mat,
			dst: Mat,
			maxValue: number,
			adaptiveMethod: number,
			thresholdType: number,
			blockSize: number,
			C: number
		): void;
		findContours(
			image: Mat,
			contours: MatVector,
			hierarchy: Mat,
			mode: number,
			method: number
		): void;
		drawContours(
			image: Mat,
			contours: MatVector,
			contourIdx: number,
			color: Scalar,
			thickness: number
		): void;
		contourArea(contour: Mat): number;
		arcLength(curve: Mat, closed: boolean): number;
		approxPolyDP(curve: Mat, approxCurve: Mat, epsilon: number, closed: boolean): void;
		boundingRect(array: Mat): Rect;
		matFromArray(rows: number, cols: number, type: number, array: number[]): Mat;
		circle(img: Mat, center: Point, radius: number, color: Scalar, thickness: number): void;
		rotate(src: Mat, dst: Mat, rotateCode: number): void;
	};

	export = cv;
}
