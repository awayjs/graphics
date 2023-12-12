import { assert } from './utilities';
import { GraphicsPath } from '../draw/GraphicsPath';
import { DataBuffer } from './DataBuffer';
import { PathCommand } from './ShapeData';

export class PathSegment {

	private static _counter = 0;
	public id;
	private startPoint: string;
	private endPoint: string;
	public isValidFill: boolean=true;

	constructor(public commands: DataBuffer, public data: DataBuffer, public morphData: DataBuffer,
		public prev: PathSegment, public next: PathSegment, public isReversed: boolean) {
		this.id = PathSegment._counter++;
	}

	static FromDefaults(isMorph: boolean) {
		const commands = new DataBuffer();
		const data = new DataBuffer();
		commands.endian = data.endian = 'auto';
		let morphData: any = null;
		if (isMorph) {
			morphData = new DataBuffer();
			morphData.endian = 'auto';
		}
		return new PathSegment(commands, data, morphData, null, null, false);
	}

	moveTo(x: number, y: number) {
		this.commands.writeUnsignedByte(PathCommand.MoveTo);
		this.data.write2Ints(x, y);
	}

	morphMoveTo(x: number, y: number, mx: number, my: number) {
		this.moveTo(x, y);
		this.morphData.write2Ints(mx, my);
	}

	lineTo(x: number, y: number) {
		this.commands.writeUnsignedByte(PathCommand.LineTo);
		this.data.write2Ints(x, y);
	}

	morphLineTo(x: number, y: number, mx: number, my: number) {
		this.lineTo(x, y);
		this.morphData.write2Ints(mx, my);
	}

	curveTo(cpx: number, cpy: number, x: number, y: number) {
		this.commands.writeUnsignedByte(PathCommand.CurveTo);
		this.data.write4Ints(cpx, cpy, x, y);
	}

	morphCurveTo(cpx: number, cpy: number, x: number, y: number,
		mcpx: number, mcpy: number, mx: number, my: number) {
		this.curveTo(cpx, cpy, x, y);
		this.morphData.write4Ints(mcpx, mcpy, mx, my);
	}

	/**
	 * Returns a shallow copy of the segment1 with the "isReversed" flag set.
	 * Reversed segments play themselves back in reverse when they're merged into the final
	 * non-segmented path1.
	 * Note: Don't modify the original, or the reversed copy, after this operation!
	 */
	toReversed(): PathSegment {
		assert(!this.isReversed);
		return new PathSegment(this.commands, this.data, this.morphData, null, null, true);
	}

	clone(): PathSegment {
		return new PathSegment(this.commands, this.data, this.morphData, null, null, this.isReversed);
	}

	storeStartAndEnd() {
		const data = this.data.ints;
		const endPoint1 = data[0] + ',' + data[1];
		const endPoint2Offset = (this.data.length >> 2) - 2;
		const endPoint2 = data[endPoint2Offset] + ',' + data[endPoint2Offset + 1];
		if (!this.isReversed) {
			this.startPoint = endPoint1;
			this.endPoint = endPoint2;
		} else {
			this.startPoint = endPoint2;
			this.endPoint = endPoint1;
		}
	}

	connectsTo(other: PathSegment): boolean {
		//assert(other !== this);
		if (other === this)
			return false;
		assert(this.endPoint);
		assert(other.startPoint);
		return this.endPoint === other.startPoint;
	}

	startConnectsTo(other: PathSegment): boolean {
		if (other === this)
			return false;
		//	assert(other !== this);
		return this.startPoint === other.startPoint;
	}

	flipDirection() {
		let tempPoint = '';
		tempPoint = this.startPoint;
		this.startPoint = this.endPoint;
		this.endPoint = tempPoint;
		this.isReversed = !this.isReversed;
	}

	serializeAJS(shape: GraphicsPath, morphShape: GraphicsPath, lastPosition: {x: number; y: number}) {
		// mark that this is morp source, this should disable some optimisation for regular shapes
		if (morphShape) {
			morphShape.morphSource = shape.morphSource = true;
		}

		//console.log("serializeAJS segment1");
		if (this.isReversed) {
			this._serializeReversedAJS(shape, morphShape, lastPosition);
			return;
		}
		const commands = this.commands.bytes;
		// Note: this *must* use `this.data.length`, because buffers will have padding.
		const dataLength = this.data.length >> 2;
		const morphData = this.morphData ? this.morphData.ints : null;
		const data = this.data.ints;

		// If the segment1's first moveTo goes to the current coordinates, we have to skip it.
		let offset = 0;
		if (data[0] === lastPosition.x && data[1] === lastPosition.y && !morphShape) {
			offset++;
		}

		const commandsCount = this.commands.length;
		let dataPosition = offset * 2;

		for (let i = offset; i < commandsCount; i++) {
			switch (commands[i]) {
				case PathCommand.MoveTo:
					//console.log("moveTo",data[dataPosition]/20, data[dataPosition+1]/20);
					shape.moveTo(data[dataPosition] / 20, data[dataPosition + 1] / 20);
					if (morphShape) {
						morphShape.moveTo(morphData[dataPosition] / 20, morphData[dataPosition + 1] / 20);
					}
					break;
				case PathCommand.LineTo:
					//console.log("lineTo",data[dataPosition]/20, data[dataPosition+1]/20);
					shape.lineTo(data[dataPosition] / 20, data[dataPosition + 1] / 20);
					if (morphShape) {
						morphShape.lineTo(morphData[dataPosition] / 20, morphData[dataPosition + 1] / 20);
					}
					break;
				case PathCommand.CurveTo:
					//console.log("curveTo",data[dataPosition]/20, data[dataPosition+1]/20,data[dataPosition+2]/20, data[dataPosition+3]/20);
					shape.curveTo(data[dataPosition] / 20, data[dataPosition + 1] / 20,data[dataPosition + 2] / 20, data[dataPosition + 3] / 20);
					if (morphShape) {
						morphShape.curveTo(morphData[dataPosition] / 20, morphData[dataPosition + 1] / 20,morphData[dataPosition + 2] / 20, morphData[dataPosition + 3] / 20);
					}
					//shape.curveTo(data[dataPosition]/20, data[dataPosition+1]/20, data[dataPosition+2]/20, data[dataPosition+3]/20 );
					dataPosition += 2;
					break;

			}
			dataPosition += 2;
		}
		//assert(dataPosition === dataLength);
		lastPosition.x = data[dataLength - 2];
		lastPosition.y = data[dataLength - 1];
	}

	private _serializeReversedAJS(shape: GraphicsPath, morphShape: GraphicsPath, lastPosition: {x: number; y: number}) {
		//console.log("_serializeReversedAJS segment1");
		// For reversing the fill0 segments, we rely on the fact that each segment1
		// starts with a moveTo. We first write a new moveTo with the final drawing command's
		// target coordinates (if we don't skip it, see below). For each of the following
		// commands, we take the coordinates of the command originally *preceding*
		// it as the new target coordinates. The final coordinates we target will be
		// the ones from the original first moveTo.
		// Note: these *must* use `this.{data,commands}.length`, because buffers will have padding.
		const commandsCount = this.commands.length;
		let dataPosition = (this.data.length >> 2) - 2;
		const commands = this.commands.bytes;
		assert(commands[0] === PathCommand.MoveTo);
		const data = this.data.ints;
		const morphData = this.morphData ? this.morphData.ints : null;

		// Only write the first moveTo if it doesn't go to the current coordinates.
		if (data[dataPosition] !== lastPosition.x || data[dataPosition + 1] !== lastPosition.y) {
			shape.moveTo(data[dataPosition] / 20, data[dataPosition + 1] / 20);
			if (morphShape) {
				morphShape.moveTo(morphData[dataPosition] / 20, morphData[dataPosition + 1] / 20);
			}
		}
		if (commandsCount === 1) {
			lastPosition.x = data[0];
			lastPosition.y = data[1];
			return;
		}
		for (let i = commandsCount; i-- > 1;) {
			dataPosition -= 2;

			switch (commands[i]) {
				case PathCommand.MoveTo:
					//console.log("moveTo",data[dataPosition]/20, data[dataPosition+1]/20);
					shape.moveTo(data[dataPosition] / 20, data[dataPosition + 1] / 20);
					if (morphShape) {
						morphShape.moveTo(morphData[dataPosition] / 20, morphData[dataPosition + 1] / 20);
					}
					break;
				case PathCommand.LineTo:
					//console.log("lineTo",data[dataPosition]/20, data[dataPosition+1]/20);
					shape.lineTo(data[dataPosition] / 20, data[dataPosition + 1] / 20);
					if (morphShape) {
						morphShape.lineTo(morphData[dataPosition] / 20, morphData[dataPosition + 1] / 20);
					}
					break;
				case PathCommand.CurveTo:
					dataPosition -= 2;
					//console.log("curveTo",data[dataPosition+2]/20, data[dataPosition+3]/20,data[dataPosition]/20, data[dataPosition+1]/20);
					shape.curveTo(data[dataPosition + 2] / 20, data[dataPosition + 3] / 20,data[dataPosition] / 20, data[dataPosition + 1] / 20);
					if (morphShape) {
						morphShape.curveTo(morphData[dataPosition + 2] / 20, morphData[dataPosition + 3] / 20,morphData[dataPosition] / 20, morphData[dataPosition + 1] / 20);
					}
					break;

			}
		}
		//assert(dataPosition === 0);
		lastPosition.x = data[0];
		lastPosition.y = data[1];
	}
}