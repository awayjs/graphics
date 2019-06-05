import { assert, clamp } from './utilities';
import { GraphicsPath } from '../draw/GraphicsPath';
import { GraphicsFillStyle } from '../draw/GraphicsFillStyle';
import { GradientFillStyle } from '../draw/GradientFillStyle';
import { Matrix } from '@awayjs/core';
import { BitmapFillStyle } from '../draw/BitmapFillStyle';
import { LineScaleMode } from '../draw/LineScaleMode';
import { GraphicsStrokeStyle } from '../draw/GraphicsStrokeStyle';
import { FillType } from './FillType';
import { GradientType } from '../draw/GradientType';
import { BitmapImage2D } from '@awayjs/stage';
import { PathSegment } from './PathSegment';
import { CapsStyle } from '../draw/CapsStyle';

export class SegmentedPath {
	private _head: PathSegment;
	constructor(public fillStyle, public lineStyle, public parser) {
		this._head = null;
	}

	addSegment(segment1: PathSegment) {
		assert(segment1);
		assert(segment1.next === null);
		assert(segment1.prev === null);
		var currentHead = this._head;
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
		var prev = next.prev;
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


	rgbaToArgb(float32Color:number):number
	{
		var r:number = ( float32Color & 0xff000000 ) >>> 24;
		var g:number = ( float32Color & 0xff0000 ) >>> 16;
		var b:number = ( float32Color & 0xff00 ) >>> 8;
		var a:number = float32Color & 0xff;
		return (a << 24) | (r << 16) |
		(g << 8) | b;
	}

	getAlpha(float32Color:number):number
	{
		//var r:number = ( float32Color & 0xff000000 ) >>> 24;
		//var g:number = ( float32Color & 0xff0000 ) >>> 16;
		//var b:number = ( float32Color & 0xff00 ) >>> 8;
		var a:number = float32Color & 0xff;
		return a;
	}

	rgbToArgb(float32Color:number):number
	{
		var a:number = ( float32Color & 0xff000000 ) >>> 24;
		var b:number = ( float32Color & 0xff0000 ) >>> 16;
		var g:number = ( float32Color & 0xff00 ) >>> 8;
		var r:number = float32Color & 0xff;
		return (a << 24) | (r << 16) |
			(g << 8) | b;
	}

	serializeAJS(shape: GraphicsPath, morphShape: GraphicsPath) {
		//console.log("serializeAJS");
		var segment1 = this.head();

		while (segment1) {
			segment1.storeStartAndEnd();
			segment1 = segment1.prev;
		}

		var start = this.head();
		var end = start;

		var finalRoot: PathSegment = null;
		var finalHead: PathSegment = null;

		// Path segments for one style can appear in arbitrary order in the tag's list
		// of edge records.
		// Before we linearize them, we have to identify all pairs of segments where
		// one ends at a coordinate the other starts at.
		// The following loop does that, by creating ever-growing runs of matching
		// segments. If no more segments are found that match the current run (either
		// at the beginning, or at the end), the current run is complete, and a new
		// one is started. Rinse, repeat, until no solitary segments remain.
		var current = start.prev;
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


				if(current.startConnectsTo(end)) {
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

		var lastPosition = {x: 0, y: 0};
		current = finalRoot;
		while (current) {
			if(current.isValidFill){
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
