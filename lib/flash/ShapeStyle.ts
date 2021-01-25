import { IMaterial } from '@awayjs/renderer';
import { ShapeMatrix } from '../data/ShapeData';

export interface FillStyle {
	type: number;
}

export interface LineStyle {
	width: number;
	widthMorph?: number;
	startCapsStyle?: number;
	jointStyle?: number;
	hasFill?: number;
	noHscale?: boolean;
	noVscale?: boolean;
	pixelHinting?: boolean;
	noClose?: boolean;
	endCapsStyle?: number;
	miterLimitFactor?: number;
	fillStyle?: FillStyle;
	color?: number;
	colorMorph?: number;
}

export interface ShapeStyle {
	type: number;

	fillType?: number;
	width?: number;
	pixelHinting?: boolean;
	noHscale?: boolean;
	noVscale?: boolean;
	endCapsStyle?: number;
	jointStyle?: number;
	miterLimit?: number;

	color?: number;

	transform?: ShapeMatrix;
	colors?: number[];
	ratios?: number[];
	spreadMethod?: number;
	interpolationMode?: number;
	focalPoint?: number;
	bitmapId?: number;
	material?: IMaterial;
	repeat?: boolean;
	smooth?: boolean;

	morph: ShapeStyle;
}
