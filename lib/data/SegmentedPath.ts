import { assert, clamp } from './utilities';
import { GraphicsPath } from '../draw/GraphicsPath';
import { PathSegment } from './PathSegment';
import { GradientType } from '../draw/GradientType';
import { FillType } from './FillType';
import { GraphicsFillStyle } from '../draw/GraphicsFillStyle';
import { Matrix } from '@awayjs/core';
import { GradientFillStyle } from '../draw/GradientFillStyle';
import { BitmapFillStyle } from '../draw/BitmapFillStyle';
import { LineScaleMode } from '../draw/LineScaleMode';
import { CapsStyle } from '../draw/CapsStyle';
import { GraphicsStrokeStyle } from '../draw/GraphicsStrokeStyle';

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

	serializeAJS(shape: GraphicsPath, morphShape: GraphicsPath) {
		//console.log("serializeAJS");
		let segment1 = this.head();

		if (!segment1) {
			// Path is empty.
			return;
		}

		if (this.fillStyle) {
			const style = this.fillStyle;
			const morph = style.morph;
			switch (style.type) {
				case FillType.Solid:
					style.alpha = (style.color & 0xff) / 0xff;
					style.color = this.rgbaToArgb(style.color);
					shape.style = new GraphicsFillStyle(style.color, style.alpha);

					//	style.color=ColorUtils.ARGBtoFloat32(255, r, g, b);
					//	shape.style=new GraphicsStrokeStyle(style.color, 5, 1);

					if (morph) {
						morph.alpha = (morph.color & 0xff) / 0xff;
						morph.color = this.rgbaToArgb(morph.color);
						morphShape.style = new GraphicsFillStyle(morph.color, morph.alpha);
					}

					break;
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

					shape.style = new GradientFillStyle(
						gradientType,
						style.colors,
						alphas,
						style.ratios,
						awayMatrix,
						style.spreadMethod,
						style.interpolationMode,
						style.focalPoint / 2 | 0);

					if (morph) {
						const gradientType = morph.type === FillType.LinearGradient
							? GradientType.LINEAR
							: GradientType.RADIAL;

						const alphas: number[] = [];
						for (let i = 0; i < morph.colors.length; i++) {
							alphas[i] = (morph.colors[i] & 0xff)  / 0xff;
							morph.colors[i] = this.rgbaToArgb(morph.colors[i]);
						}

						const awayMatrix = new Matrix(
							morph.transform.a,
							morph.transform.b,
							morph.transform.c,
							morph.transform.d,
							morph.transform.tx,
							morph.transform.ty);

						morphShape.style = new GradientFillStyle(
							gradientType,
							morph.colors,
							alphas,
							morph.ratios,
							awayMatrix,
							morph.spreadMethod,
							morph.interpolationMode,
							morph.focalPoint / 2 | 0);

						//console.log("writeMorphGradient not handled yet");
						//writeMorphGradient(morph, shape);
					}
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

					shape.style = new BitmapFillStyle(
						style.material,
						awayMatrix,
						style.repeat,
						style.smooth);
					//shape.beginBitmap(command, style.bitmapIndex, style.transform, style.repeat, style.smooth);
					if (morph) {
						//console.log("writeMorphBitmap not handled yet");
						const awayMatrix = new Matrix(
							morph.transform.a,
							morph.transform.b,
							morph.transform.c,
							morph.transform.d,
							morph.transform.tx,
							morph.transform.ty);

						morphShape.style = new BitmapFillStyle(
							style.material,
							awayMatrix,
							style.repeat,
							style.smooth);

						//writeMorphBitmap(morph, shape);
					}

					break;
				}
				default:
					console.log('Invalid fill style type: ' + style.type);
			}
		} else {
			const style = this.lineStyle;
			const morph = style.morph;
			assert(style);
			switch (style.type) {
				case FillType.Solid: {
					/*
					const scaleMode = style.noHscale
						? (style.noVscale ? 0 : 2)
						: style.noVscale ? 3 : 1;
					*/
					// TODO: Figure out how to handle startCapsStyle
					const thickness =  (clamp(style.width, 0, 0xff * 20) | 0) / 20;

					style.alpha = (style.color & 0xff) / 0xff;
					style.color = this.rgbaToArgb(style.color);

					const scaleModeAWJ = thickness <= 0.05
						? LineScaleMode.HAIRLINE
						: LineScaleMode.NORMAL;
					//if(style.noVscale==null && style.noHscale==null){
					//	scaleModeAWJ="HAIRLINE";
					//}

					if (style.startCapsStyle != style.endCapsStyle) {
						console.log('Warning: different end vs start capstyöe');
					}

					style.startCapsStyle = CapsStyle.ROUND;
					style.jointStyle = 0;
					//console.log("style.startCapsStyle", style.startCapsStyle, style.endCapsStyle, style );
					shape.style = new GraphicsStrokeStyle(
						style.color,
						style.alpha,
						thickness,
						style.jointStyle,
						style.startCapsStyle,
						style.miterLimit,
						scaleModeAWJ);

					if (morph) {
						const thickness = (clamp(morph.width, 0, 0xff * 20)|0) / 20;
						morph.alpha = this.getAlpha(morph.color) / 255;
						morph.color = this.rgbaToArgb(morph.color);
						morphShape.style = new GraphicsStrokeStyle(
							morph.color,
							morph.alpha,
							thickness,
							style.jointStyle,
							style.startCapsStyle,
							style.miterLimit,
							scaleModeAWJ);
						//console.log("writeMorphLineStyle not handled yet");
						//writeMorphLineStyle(morph, shape);
					}
					break;
				}
				case FillType.LinearGradient:
				case FillType.RadialGradient:
				case FillType.FocalRadialGradient: {
					/*
					const scaleMode = style.noHscale
						? (style.noVscale ? 0 : 2)
						: style.noVscale ? 3 : 1;
					*/
					// TODO: Figure out how to handle startCapsStyle
					//console.log("style.startCapsStyle", style.startCapsStyle, style.endCapsStyle, style );
					const thickness = (clamp(style.width, 0, 0xff * 20)|0) / 20;
					style.alpha = (style.color & 0xff) / 0xff;
					style.color = this.rgbaToArgb(style.color);

					shape.style = new GraphicsStrokeStyle(
						style.color,
						style.alpha,
						thickness,
						style.jointStyle,
						style.endCapsStyle,
						style.miterLimit);

					const gradientType: GradientType = style.type === FillType.LinearGradient
						? GradientType.LINEAR
						: GradientType.RADIAL;

					const alphas: number[] = [];
					for (let i = 0; i < style.colors.length; i++) {
						style.colors[i] = this.rgbaToArgb(style.colors[i]);
						alphas[i] = 1;
					}

					shape.style = new GradientFillStyle(
						gradientType,
						style.colors,
						alphas,
						style.ratios,
						style.transform,
						style.spreadMethod,
						style.interpolationMode,
						style.focalPoint / 2 | 0);

					if (morph) {
						//console.log("writeMorphLineStyle not handled yet");
						//console.log("writeMorphGradient not handled yet");
						//writeMorphLineStyle(morph, shape);
						//writeMorphGradient(morph, shape);
					}
					break;
				}
				case FillType.ClippedBitmap:
				case FillType.RepeatingBitmap:
				case FillType.NonsmoothedClippedBitmap:
				case FillType.NonsmoothedRepeatingBitmap: {
					/*
					const scaleMode = style.noHscale
						? (style.noVscale ? 0 : 2)
						: style.noVscale ? 3 : 1;
					*/
					// TODO: Figure out how to handle startCapsStyle
					//console.log("style.startCapsStyle", style.startCapsStyle, style.endCapsStyle, style );
					const thickness = clamp(style.width, 0, 0xff * 20)|0;
					shape.style = new GraphicsStrokeStyle(
						style.color, 1,
						thickness,
						style.jointStyle,
						style.endCapsStyle,
						style.miterLimit);

					//console.log("writeBitmap not handled yet");
					//writeBitmap(PathCommand.LineStyleBitmap, style, shape);
					if (morph) {
						//console.log("writeMorphLineStyle not handled yet");
						//console.log("writeMorphBitmap not handled yet");
						//writeMorphLineStyle(morph, shape);
						//writeMorphBitmap(morph, shape);
					}
					break;
				}
				default:
				//console.error('Line style type not yet supported: ' + style.type);
			}

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
