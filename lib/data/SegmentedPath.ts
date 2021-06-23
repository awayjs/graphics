import { assert, clamp } from './utilities';
import { GraphicsPath } from '../draw/GraphicsPath';
import { PathSegment } from './PathSegment';
import { GradientType } from '../draw/GradientType';
import { FillType } from './FillType';
import { GraphicsFillStyle } from '../draw/GraphicsFillStyle';
import { Matrix } from '@awayjs/core';
import { GradientFillStyle } from '../draw/fills/GradientFillStyle';
import { BitmapFillStyle } from '../draw/fills/BitmapFillStyle';
import { SolidFillStyle } from '../draw/fills/SolidFillStyle';

import { LineScaleMode } from '@awayjs/renderer';
import { CapsStyle } from '../draw/CapsStyle';
import { GraphicsStrokeStyle } from '../draw/GraphicsStrokeStyle';
import { IFillStyle } from '../draw/IGraphicsData';

export class SegmentedPath {
	private _head: PathSegment;
	constructor(public fillStyle, public lineStyle) {
		this._head = null;
	}

	addSegment(segment1: PathSegment) {
		assert(segment1);
		assert(segment1.next === null);
		assert(segment1.prev === null);
		const currentHead = this._head;
		if (currentHead) {
			assert(segment1 !== currentHead);
			currentHead.next = segment1;
			segment1.prev = currentHead;
		}
		this._head = segment1;
	}

	// Does *not* reset the segment1's prev and next pointers!
	removeSegment(segment1: PathSegment) {
		if (segment1.prev) {
			segment1.prev.next = segment1.next;
		}
		if (segment1.next) {
			segment1.next.prev = segment1.prev;
		}
	}

	insertSegment(segment1: PathSegment, next: PathSegment) {
		const prev = next.prev;
		segment1.prev = prev;
		segment1.next = next;
		if (prev) {
			prev.next = segment1;
		}
		next.prev = segment1;
	}

	head(): PathSegment {
		return this._head;
	}

	rgbaToArgb(float32Color: number): number {
		const r: number = (float32Color & 0xff000000) >>> 24;
		const g: number = (float32Color & 0xff0000) >>> 16;
		const b: number = (float32Color & 0xff00) >>> 8;
		const a: number = float32Color & 0xff;
		return (a << 24) | (r << 16) |
		(g << 8) | b;
	}

	getAlpha(float32Color: number): number {
		//var r:number = ( float32Color & 0xff000000 ) >>> 24;
		//var g:number = ( float32Color & 0xff0000 ) >>> 16;
		//var b:number = ( float32Color & 0xff00 ) >>> 8;
		const a: number = float32Color & 0xff;
		return a;
	}

	rgbToArgb(float32Color: number): number {
		const a: number = (float32Color & 0xff000000) >>> 24;
		const b: number = (float32Color & 0xff0000) >>> 16;
		const g: number = (float32Color & 0xff00) >>> 8;
		const r: number = float32Color & 0xff;
		return (a << 24) | (r << 16) |
			(g << 8) | b;
	}

	private applyStyle (shape: GraphicsPath, style: any, isFill = true) {

		let awayStyle: GraphicsStrokeStyle<any> | GraphicsFillStyle<any>;
		let fillStyle: IFillStyle;

		switch (style.type) {
			case FillType.Solid: {
				style.alpha = (style.color & 0xff) / 0xff;
				style.color = this.rgbaToArgb(style.color);

				fillStyle = new SolidFillStyle(style.color, style.alpha);
				break;
			}
			case FillType.LinearGradient:
			case FillType.RadialGradient:
			case FillType.FocalRadialGradient: {
				const gradientType = style.type === FillType.LinearGradient
					? GradientType.LINEAR
					: GradientType.RADIAL;

				const alphas: number[] = [];
				for (let i = 0; i < style.colors.length; i++) {
					alphas[i] = (style.colors[i] & 0xff) / 0xff;
					style.colors[i] = this.rgbaToArgb(style.colors[i]);
				}

				const awayMatrix = new Matrix(
					style.transform.a,
					style.transform.b,
					style.transform.c,
					style.transform.d,
					style.transform.tx,
					style.transform.ty);

				fillStyle = new GradientFillStyle(
					gradientType,
					style.colors,
					alphas,
					style.ratios,
					awayMatrix,
					style.spreadMethod,
					style.interpolationMode,
					style.focalPoint / 2 | 0);
				break;
			}
			case FillType.ClippedBitmap:
			case FillType.RepeatingBitmap:
			case FillType.NonsmoothedClippedBitmap:
			case FillType.NonsmoothedRepeatingBitmap: {
				const awayMatrix = new Matrix(
					style.transform.a,
					style.transform.b,
					style.transform.c,
					style.transform.d,
					style.transform.tx,
					style.transform.ty);

				fillStyle = new BitmapFillStyle(
					style.material,
					awayMatrix,
					style.repeat,
					style.smooth
				);
				break;
			}
			default: {
				console.error('Unknown style type:', style.type);
			}
		}

		if (isFill) {
			awayStyle = new GraphicsFillStyle(fillStyle);
		} else {
			// TODO: Figure out how to handle startCapsStyle
			const thickness =  (clamp(style.width, 0, 0xff * 20) | 0) / 20;
			const scaleModeAWJ = thickness <= 0.05
				? LineScaleMode.HAIRLINE
				: LineScaleMode.NORMAL;

			if (style.startCapsStyle != style.endCapsStyle) {
				console.log('Warning: different end vs start capstyle');
			}

			style.startCapsStyle = CapsStyle.ROUND;
			style.jointStyle = 0;

			awayStyle = new GraphicsStrokeStyle<IFillStyle>(
				fillStyle,
				thickness,
				style.jointStyle,
				style.startCapsStyle,
				style.miterLimit,
				scaleModeAWJ
			);
		}

		shape.style = awayStyle;
	}

	serializeAJS(shape: GraphicsPath, morphShape: GraphicsPath) {
		//console.log("serializeAJS");
		let segment1 = this.head();

		if (!segment1) {
			// Path is empty.
			return;
		}

		const isFill = !!this.fillStyle;
		const mainStyle = isFill ? this.fillStyle : this.lineStyle;
		const morphStyle = mainStyle.morph;

		this.applyStyle (shape, mainStyle, isFill);

		if (morphStyle && morphShape) {
			this.applyStyle (morphShape, morphStyle, isFill);
		}

		while (segment1) {
			segment1.storeStartAndEnd();
			segment1 = segment1.prev;
		}

		let start = this.head();
		let end = start;

		let finalRoot: PathSegment = null;
		let finalHead: PathSegment = null;

		// Path segments for one style can appear in arbitrary order in the tag's list
		// of edge records.
		// Before we linearize them, we have to identify all pairs of segments where
		// one ends at a coordinate the other starts at.
		// The following loop does that, by creating ever-growing runs of matching
		// segments. If no more segments are found that match the current run (either
		// at the beginning, or at the end), the current run is complete, and a new
		// one is started. Rinse, repeat, until no solitary segments remain.
		let current = start.prev;
		while (start) {
			while (current) {

				// if this segment1 has the same startpoint as the start-startpoint it needs to be reversed.
				if (current.startConnectsTo(start)) {
					current.flipDirection();
				}

				// if this segment1 connects to another, we remove it and add it at the end.
				if (current.connectsTo(start)) {
					if (current.next !== start) {
						this.removeSegment(current);
						this.insertSegment(current, start);
					}
					start = current;
					current = start.prev;
					continue;
				}

				if (current.startConnectsTo(end)) {
					current.flipDirection();
				}
				if (end.connectsTo(current)) {
					this.removeSegment(current);
					end.next = current;
					current = current.prev;
					end.next.prev = end;
					end.next.next = null;
					end = end.next;
					continue;
				}
				current = current.prev;
			}
			// This run of segments is finished. Store and forget it (for this loop).
			current = start.prev;
			if (!finalRoot) {
				finalRoot = start;
				finalHead = end;
			} else {
				finalHead.next = start;
				start.prev = finalHead;
				finalHead = end;
				finalHead.next = null;
			}
			if (!current) {
				break;
			}
			start = end = current;
			current = start.prev;
		}

		const lastPosition = { x: 0, y: 0 };
		current = finalRoot;
		while (current) {
			if (current.isValidFill) {
				current.serializeAJS(shape, morphShape, lastPosition);
			}
			current = current.next;
		}
		/*
		if (this.fillStyle) {
			shape.endFill();
		} else {
			shape.endLine();
		}*/
		return shape;
	}

}
