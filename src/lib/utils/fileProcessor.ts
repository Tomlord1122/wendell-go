import cv from '@techstark/opencv-js';

const debug = false;

function find_intersections(row_line: cv.Point[], col_line: cv.Point[]) {
	const xdiff = new cv.Point(row_line[0].x - row_line[1].x, col_line[0].x - col_line[1].x);
	const ydiff = new cv.Point(row_line[0].y - row_line[1].y, col_line[0].y - col_line[1].y);

	function det(a: cv.Point, b: cv.Point) {
		return a.x * b.y - a.y * b.x;
	}

	const div = det(xdiff, ydiff);
	if (div == 0) {
		throw new Error('lines do not intersect');
	}

	const d = new cv.Point(det(row_line[0], row_line[1]), det(col_line[0], col_line[1]));
	const x = det(d, xdiff) / div;
	const y = det(d, ydiff) / div;
	return new cv.Point(x, y);
}

function sortCorners(corners: { x: number; y: number }[]) {
	const center = corners.reduce(
		(acc, corner) => {
			return new cv.Point(acc.x + corner.x, acc.y + corner.y);
		},
		new cv.Point(0, 0)
	);
	center.x /= corners.length;
	center.y /= corners.length;
	const sortedCorners = new Array(corners.length);
	for (const corner of corners) {
		if (corner.x > center.x && corner.y > center.y) {
			sortedCorners[3] = corner;
		} else if (corner.x < center.x && corner.y > center.y) {
			sortedCorners[2] = corner;
		} else if (corner.x < center.x && corner.y < center.y) {
			sortedCorners[1] = corner;
		} else {
			sortedCorners[0] = corner;
		}
	}
	return sortedCorners;
}

function rotate_bbox(img: cv.Mat, bboxes: cv.Point[][]) {
	const rotated_img = img.clone();
	const tempMat = new cv.Mat();
	try {
		for (const bbox of bboxes) {
			const top_left = bbox[0];
			const bottom_right = bbox[2];
			const x = top_left.x;
			const y = top_left.y;
			const w = bottom_right.x - top_left.x;
			const h = bottom_right.y - top_left.y;
			const roi = new cv.Rect(x, y, w, h);
			const crop = img.roi(roi);
			cv.rotate(crop, tempMat, cv.ROTATE_90_CLOCKWISE);
			crop.delete();
			const new_w = tempMat.cols;
			const new_h = tempMat.rows;
			const xx = x + (w - new_w) / 2;
			const yy = y + (h - new_h) / 2;
			const new_x = Math.max(0, Math.min(xx, img.cols - new_w));
			const new_y = Math.max(0, Math.min(yy, img.rows - new_h));
			const roi_rect = new cv.Rect(new_x, new_y, new_w, new_h);
			const cropped_image = rotated_img.roi(roi_rect);
			tempMat.copyTo(cropped_image);
			cropped_image.delete();
		}
	} finally {
		if (tempMat && !tempMat.isDeleted()) tempMat.delete();
		return rotated_img;
	}
}

export async function processImage(file: File, rows: number, cols: number) {
	const imageElement = new Image();
	let mat: cv.Mat | null = null;
	let grayMat: cv.Mat | null = null;
	let threshMat: cv.Mat | null = null;
	let hierarchy: cv.Mat | null = null;
	let contours: cv.MatVector | null = null;
	let approx: cv.Mat | null = null;
	let contourMatVec: cv.MatVector | null = null;
	let tempMat: cv.Mat | null = null;
	let result: cv.Mat | null = null;
	try {
		// Create a promise to wait for image loading
		await new Promise((resolve, reject) => {
			imageElement.onload = resolve;
			imageElement.onerror = reject;
			imageElement.src = URL.createObjectURL(file);
		});

		mat = cv.imread(imageElement);
		grayMat = new cv.Mat();
		threshMat = new cv.Mat();
		hierarchy = new cv.Mat();
		contours = new cv.MatVector();
		contourMatVec = new cv.MatVector();
		approx = new cv.Mat();
		tempMat = new cv.Mat();
		result = new cv.Mat(); // delete by caller

		cv.cvtColor(mat, grayMat, cv.COLOR_BGR2GRAY);
		cv.adaptiveThreshold(
			grayMat,
			threshMat,
			255,
			cv.ADAPTIVE_THRESH_GAUSSIAN_C,
			cv.THRESH_BINARY_INV,
			57,
			5
		);
		grayMat.delete();
		cv.findContours(threshMat, contours, hierarchy, cv.RETR_TREE, cv.CHAIN_APPROX_SIMPLE);
		threshMat.delete();

		// create a list to store contours area to sort them, and get the sorted indices
		// where contour is a MatVector cannot use map
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const areas: any[] = [];
		for (let i = 0; i < contours.size(); i++) {
			areas.push(cv.contourArea(contours.get(i)));
		}
		// sort the areas in descending order, though we only use the first one
		// we keep this sort here for later use
		const sortedIndices = areas.map((_, index) => index).sort((a, b) => areas[b] - areas[a]);
		contourMatVec.push_back(contours.get(sortedIndices[0]));
		cv.drawContours(mat, contourMatVec, -1, new cv.Scalar(0, 255, 0), 3);
		contourMatVec.delete();
		// Approximate the contour to get corners
		const epsilon = 0.01 * cv.arcLength(contours.get(sortedIndices[0]), true);
		cv.approxPolyDP(contours.get(sortedIndices[0]), approx, epsilon, true);
		contours.delete();

		// Draw the corners and get their coordinates
		let corners = [];
		for (let i = 0; i < approx.rows; i++) {
			const [x, y] = [approx.data32S[i * 2], approx.data32S[i * 2 + 1]];
			corners.push({ x, y });
			if (debug) {
				cv.circle(mat, new cv.Point(x, y), 5, new cv.Scalar(0, 0, 255), -1);
			}
		}

		if (corners.length < 4) {
			throw new Error('網格邊界不清楚');
		} else if (corners.length > 4) {
			// use a rectangle to contain the corners
			const cornersMat = cv.matFromArray(
				corners.length,
				1,
				cv.CV_32SC2,
				corners.flatMap((corner) => [corner.x, corner.y])
			);
			const rect = cv.boundingRect(cornersMat);
			cornersMat.delete();
			corners = [
				{ x: rect.x, y: rect.y },
				{ x: rect.x + rect.width, y: rect.y },
				{ x: rect.x + rect.width, y: rect.y + rect.height },
				{ x: rect.x, y: rect.y + rect.height }
			];
		}
		// divide the image into cells, where each box is compted by the 4 corners
		// partition by the number of cols and rows manually added here.
		// then rotate each cell by 90 degrees clockwise
		// rotate the image counterclockwise by 90 degrees
		// cv.rotate(mat, mat, cv.ROTATE_90_COUNTERCLOCKWISE);
		// get the top left, top right, bottom left, bottom right
		const sortedCorners = sortCorners(corners);
		const top_right = sortedCorners[0];
		const top_left = sortedCorners[1];
		const bottom_left = sortedCorners[2];
		const bottom_right = sortedCorners[3];
		const left_points = [];
		const right_points = [];
		for (let i = 0; i <= rows; i++) {
			// Calculate points along the left and right edges
			const left_point = new cv.Point(
				Math.floor(top_left.x + ((bottom_left.x - top_left.x) * i) / rows),
				Math.floor(top_left.y + ((bottom_left.y - top_left.y) * i) / rows)
			);
			const right_point = new cv.Point(
				Math.floor(top_right.x + ((bottom_right.x - top_right.x) * i) / rows),
				Math.floor(top_right.y + ((bottom_right.y - top_right.y) * i) / rows)
			);
			left_points.push(left_point);
			right_points.push(right_point);
		}

		const top_points = [];
		const bottom_points = [];
		for (let j = 0; j <= cols; j++) {
			// Calculate points along the top and bottom edges
			const top_point = new cv.Point(
				Math.floor(top_left.x + ((top_right.x - top_left.x) * j) / cols),
				Math.floor(top_left.y + ((top_right.y - top_left.y) * j) / cols)
			);
			const bottom_point = new cv.Point(
				Math.floor(bottom_left.x + ((bottom_right.x - bottom_left.x) * j) / cols),
				Math.floor(bottom_left.y + ((bottom_right.y - bottom_left.y) * j) / cols)
			);
			top_points.push(top_point);
			bottom_points.push(bottom_point);
		}
		const bboxes = [];
		for (let r = 0; r < rows; r++) {
			for (let c = 0; c < cols; c++) {
				const row_line = [left_points[r], right_points[r]];
				const col_line = [top_points[c], bottom_points[c]];
				const next_row_line = [left_points[r + 1], right_points[r + 1]];
				const next_col_line = [top_points[c + 1], bottom_points[c + 1]];
				bboxes.push([
					find_intersections(row_line, col_line),
					find_intersections(next_row_line, col_line),
					find_intersections(next_row_line, next_col_line),
					find_intersections(row_line, next_col_line)
				]);
			}
		}
		const rotated_image = rotate_bbox(mat, bboxes);
		const cropped_image = rotated_image.roi(
			new cv.Rect(top_left.x, top_left.y, bottom_right.x - top_left.x, bottom_right.y - top_left.y)
		);
		cv.rotate(cropped_image, result, cv.ROTATE_90_COUNTERCLOCKWISE);
		cropped_image.delete();
		rotated_image.delete();
		tempMat.delete();
		hierarchy.delete();
		mat.delete();
		approx.delete();
		return result;
	} finally {
		URL.revokeObjectURL(imageElement.src);
	}
}
