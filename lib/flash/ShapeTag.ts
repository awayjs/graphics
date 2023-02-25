import { IMaterialFactory } from '@awayjs/renderer';
import { FillStyle, LineStyle } from './ShapeStyle';

export interface ShapeTag extends DefinitionTag {
	lineBounds: BBox;
	lineBoundsMorph?: BBox;
	fillBounds?: BBox;
	fillBoundsMorph?: BBox;
	flags: number;
	fillStyles: FillStyle[];
	lineStyles: LineStyle[];
	records: ShapeRecord[];
	recordsMorph?: ShapeRecord[];
	factory: IMaterialFactory;
}

export interface BBox {
	xMin: number;
	xMax: number;
	yMin: number;
	yMax: number;
}

export interface ShapeRecord {
	type: number;
	flags: number;
	deltaX?: number;
	deltaY?: number;
	controlDeltaX?: number;
	controlDeltaY?: number;
	anchorDeltaX?: number;
	anchorDeltaY?: number;
	moveX?: number;
	moveY?: number;
	fillStyle0?: number;
	fillStyle1?: number;
	lineStyle?: number;
	fillStyles?: FillStyle[];
	lineStyles?: LineStyle[];
	lineBits?: number;
	fillBits?: number;
}

export interface SwfTag {
	code: number;
	ns?: string;
}

export interface DefinitionTag extends SwfTag {
	id: number;
	lazyParser: () => any;
	needParse: boolean;
	lazyTaskDone?: (tag: DefinitionTag) => void;
	parsingTime?: number;
}

export const enum ShapeRecordFlags {
	Move = 0x01,
	HasFillStyle0 = 0x02,
	HasFillStyle1 = 0x04,
	HasLineStyle = 0x08,
	HasNewStyles = 0x10,
	IsStraight = 0x20,
	IsGeneral = 0x40,
	IsVertical = 0x80
}