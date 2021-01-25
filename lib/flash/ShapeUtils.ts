import { FillType } from '../data/FillType';
import { SegmentedPath } from '../data/SegmentedPath';
import { ShapeMatrix } from '../data/ShapeData';
import { ShapeStyle } from './ShapeStyle';

const IDENTITY_MATRIX: ShapeMatrix = { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 };
export function processStyle(style: any, isLineStyle: boolean, isMorph: boolean, parser: any): ShapeStyle {
	const shapeStyle: ShapeStyle = style;
	if (isMorph) {
		shapeStyle.morph = processMorphStyle(style, isLineStyle);
	}
	if (isLineStyle) {
		shapeStyle.miterLimit = (style.miterLimitFactor || 1.5) * 2;
		if (!style.color && style.hasFill) {
			const fillStyle = processStyle(style.fillStyle, false, false, parser);
			shapeStyle.type = fillStyle.type;
			shapeStyle.transform = fillStyle.transform;
			shapeStyle.colors = fillStyle.colors;
			shapeStyle.ratios = fillStyle.ratios;
			shapeStyle.focalPoint = fillStyle.focalPoint;
			shapeStyle.bitmapId = fillStyle.bitmapId;
			shapeStyle.material = fillStyle.material;
			shapeStyle.repeat = fillStyle.repeat;
			style.fillStyle = null;
			return shapeStyle;
		} else {
			shapeStyle.type = FillType.Solid;
			return shapeStyle;
		}
	}

	if (style.type === undefined || style.type === FillType.Solid) {
		return shapeStyle;
	}

	let scale: number = 1;
	switch (style.type) {
		case FillType.LinearGradient:
		case FillType.RadialGradient:
		case FillType.FocalRadialGradient: {
			const records = style.records;
			const colors = shapeStyle.colors = [];
			const ratios = shapeStyle.ratios = [];

			for (let i = 0; i < records.length; i++) {
				const record = records[i];
				if (ratios.length == 0 || ratios[ratios.length - 1] != record.ratio) {
					colors.push(record.color);
					ratios.push(record.ratio);
				}
			}
			scale = 1;
			break;
		}
		case FillType.RepeatingBitmap:
		case FillType.ClippedBitmap:
		case FillType.NonsmoothedRepeatingBitmap:
		case FillType.NonsmoothedClippedBitmap:
			shapeStyle.smooth =
					(
						style.type !== FillType.NonsmoothedRepeatingBitmap &&
						style.type !== FillType.NonsmoothedClippedBitmap
					);

			shapeStyle.repeat =
				(
					style.type !== FillType.ClippedBitmap &&
					style.type !== FillType.NonsmoothedClippedBitmap
				);

			/*var index = dependencies.indexOf(style.bitmapId);
			if (index === -1) {
				index = dependencies.length;
				dependencies.push(style.bitmapId);
			}*/
			shapeStyle.material = parser.getMaterial(style.bitmapId);
			scale = 1 / 20;
			break;
		default:
			console.log('shape parser encountered invalid fill style ' + style.type);
	}

	if (!style.matrix) {
		shapeStyle.transform = IDENTITY_MATRIX;
		return shapeStyle;
	}

	const matrix = style.matrix;
	shapeStyle.transform = {
		a: matrix.a * scale,
		b: matrix.b * scale,
		c: matrix.c * scale,
		d: matrix.d * scale,
		tx: matrix.tx / 20,
		ty: matrix.ty / 20
	};
	// null data that's unused from here on out
	style.matrix = null;
	return shapeStyle;
}

export function processMorphStyle(style: any, isLineStyle: boolean): ShapeStyle {
	const morphStyle: ShapeStyle = Object.create(style);
	if (isLineStyle) {
		morphStyle.width = style.widthMorph;
		if (!style.color && style.hasFill) {
			const fillStyle = processMorphStyle(style.fillStyle, false);
			morphStyle.transform = fillStyle.transform;
			morphStyle.colors = fillStyle.colors;
			morphStyle.ratios = fillStyle.ratios;
			return morphStyle;
		} else {
			morphStyle.color = style.colorMorph;
			return morphStyle;
		}
	}
	if (style.type === undefined) {
		return morphStyle;
	}
	if (style.type === FillType.Solid) {
		morphStyle.color = style.colorMorph;
		return morphStyle;
	}
	let scale = 1;
	switch (style.type) {
		case FillType.LinearGradient:
		case FillType.RadialGradient:
		case FillType.FocalRadialGradient: {
			const records = style.records;
			const colors = morphStyle.colors = [];
			const ratios = morphStyle.ratios = [];

			for (let i = 0; i < records.length; i++) {
				const record = records[i];
				colors.push(record.colorMorph);
				ratios.push(record.ratioMorph);
			}
			scale = 1;
			break;
		}
		case FillType.RepeatingBitmap:
		case FillType.ClippedBitmap:
		case FillType.NonsmoothedRepeatingBitmap:
		case FillType.NonsmoothedClippedBitmap:
			scale = 1 / 20;
			break;
		default:
			console.log('shape parser encountered invalid fill style');
	}
	if (!style.matrix) {
		morphStyle.transform = IDENTITY_MATRIX;
		return morphStyle;
	}
	const matrix = style.matrixMorph;
	morphStyle.transform = {
		a: (matrix.a * scale),
		b: (matrix.b * scale),
		c: (matrix.c * scale),
		d: (matrix.d * scale),
		tx: matrix.tx / 20,
		ty: matrix.ty / 20
	};
	return morphStyle;
}

/*
* Paths are stored in 2-dimensional arrays. Each of the inner arrays contains
* all the paths for a certain fill or line style.
*/
export function createPathsList(styles: any[], isLineStyle: boolean, isMorph: boolean,
	parser: any): SegmentedPath[] {
	const paths: SegmentedPath[] = [];
	for (let i = 0; i < styles.length; i++) {
		const style = processStyle(styles[i], isLineStyle, isMorph, parser);
		if (!isLineStyle) {
			paths[i] = new SegmentedPath(style, null);
		} else {
			paths[i] = new SegmentedPath(null, style);
		}
	}
	return paths;
}
