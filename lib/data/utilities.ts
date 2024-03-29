
export function assert(condition: any, message: any = 'assertion failed') {
	if (condition === '') {     // avoid inadvertent false positive
		condition = true;
	}
	if (!condition) {
		if (typeof console !== 'undefined' && 'assert' in console) {
			console.assert(false, message);
			throw new Error(message);
		} else {
			//Debug.error(message.toString());
			throw new Error(message);
		}
	}
}

export interface IDataDecoder {
	onData: (data: Uint8Array) => void;
	onError: (e) => void;
	push(data: Uint8Array);
	close();
}

export interface TypedArray {
	buffer: ArrayBuffer;
	length: number;
	set: (array: TypedArray, offset?: number) => void;
	subarray: (begin: number, end?: number) => TypedArray;
}

//export function memCopy<T extends TypedArray>(destination: T, source: T, doffset: number = 0,
export function memCopy(destination: any, source: any, doffset: number = 0,
	soffset: number = 0, length: number = 0) {
	if (soffset > 0 || (length > 0 && length < source.length)) {
		if (length <= 0) {
			length = source.length - soffset;
		}
		destination.set(source.subarray(soffset, soffset + length), doffset);
	} else {
		destination.set(source, doffset);
	}
}

/**
 * Faster release version of bounds.
 */
export class Bounds {
	xMin: number;
	yMin: number;
	xMax: number;
	yMax: number;

	constructor(xMin: number, yMin: number, xMax: number, yMax: number) {
		this.xMin = xMin | 0;
		this.yMin = yMin | 0;
		this.xMax = xMax | 0;
		this.yMax = yMax | 0;
	}

	//static FromUntyped(source:UntypedBounds):Bounds {
	static FromUntyped(source: any): Bounds {
		return new Bounds(source.xMin, source.yMin, source.xMax, source.yMax);
	}

	//static FromRectangle(source:ASRectangle):Bounds {
	static FromRectangle(source: any): Bounds {
		return new Bounds(source.x * 20 | 0, source.y * 20 | 0, (source.x + source.width) * 20 | 0,
			(source.y + source.height) * 20 | 0);
	}

	setElements(xMin: number, yMin: number, xMax: number, yMax: number): void {
		this.xMin = xMin;
		this.yMin = yMin;
		this.xMax = xMax;
		this.yMax = yMax;
	}

	copyFrom(source: Bounds): void {
		this.setElements(source.xMin, source.yMin, source.xMax, source.yMax);
	}

	contains(x: number, y: number): boolean {
		return x < this.xMin !== x < this.xMax &&
        y < this.yMin !== y < this.yMax;
	}

	unionInPlace(other: Bounds): void {
		if (other.isEmpty()) {
			return;
		}
		this.extendByPoint(other.xMin, other.yMin);
		this.extendByPoint(other.xMax, other.yMax);
	}

	extendByPoint(x: number, y: number): void {
		this.extendByX(x);
		this.extendByY(y);
	}

	extendByX(x: number): void {
		// Exclude default values.
		if (this.xMin === 0x8000000) {
			this.xMin = this.xMax = x;
			return;
		}
		this.xMin = Math.min(this.xMin, x);
		this.xMax = Math.max(this.xMax, x);
	}

	extendByY(y: number): void {
		// Exclude default values.
		if (this.yMin === 0x8000000) {
			this.yMin = this.yMax = y;
			return;
		}
		this.yMin = Math.min(this.yMin, y);
		this.yMax = Math.max(this.yMax, y);
	}

	public intersects(toIntersect: Bounds): boolean {
		return this.contains(toIntersect.xMin, toIntersect.yMin) ||
        this.contains(toIntersect.xMax, toIntersect.yMax);
	}

	isEmpty(): boolean {
		return this.xMax <= this.xMin || this.yMax <= this.yMin;
	}

	get width(): number {
		return this.xMax - this.xMin;
	}

	set width(value: number) {
		this.xMax = this.xMin + value;
	}

	get height(): number {
		return this.yMax - this.yMin;
	}

	set height(value: number) {
		this.yMax = this.yMin + value;
	}

	public getBaseWidth(angle: number): number {
		const u = Math.abs(Math.cos(angle));
		const v = Math.abs(Math.sin(angle));
		return u * (this.xMax - this.xMin) + v * (this.yMax - this.yMin);
	}

	public getBaseHeight(angle: number): number {
		const u = Math.abs(Math.cos(angle));
		const v = Math.abs(Math.sin(angle));
		return v * (this.xMax - this.xMin) + u * (this.yMax - this.yMin);
	}

	setEmpty(): void {
		this.xMin = this.yMin = this.xMax = this.yMax = 0;
	}

	/**
   * Set all fields to the sentinel value 0x8000000.
   *
   * This is what Flash uses to indicate uninitialized bounds. Important for bounds calculation
   * in `Graphics` instances, which start out with empty bounds but must not just extend them
   * from an 0,0 origin.
   */
	setToSentinels(): void {
		this.xMin = this.yMin = this.xMax = this.yMax = 0x8000000;
	}

	clone(): Bounds {
		return new Bounds(this.xMin, this.yMin, this.xMax, this.yMax);
	}

	toString(): string {
		return '{ ' +
        'xMin: ' + this.xMin + ', ' +
        'xMin: ' + this.yMin + ', ' +
        'xMax: ' + this.xMax + ', ' +
        'xMax: ' + this.yMax +
        ' }';
	}
}

export enum ImageType {
	None,

	/**
	 * Premultiplied ARGB (byte-order).
	 */
	PremultipliedAlphaARGB,

	/**
	 * Unpremultiplied ARGB (byte-order).
	 */
	StraightAlphaARGB,

	/**
	 * Unpremultiplied RGBA (byte-order), this is what putImageData expects.
	 */
	StraightAlphaRGBA,

	JPEG,
	PNG,
	GIF
}

export function clamp(value: number, min: number, max: number) {
	return Math.max(min, Math.min(max, value));
}

export function roundToMultipleOfFour(x: number) {
	return (x + 3) & ~0x3;
}

export function isObject(value): boolean {
	return typeof value === 'object' || typeof value === 'function';
}

export function isNullOrUndefined(value) {
	return value == undefined;
}

function utf8decode_impl(str: string): Uint8Array {
	const bytes = new Uint8Array(str.length * 4);
	let b = 0;
	for (let i = 0, j = str.length; i < j; i++) {
		let code = str.charCodeAt(i);
		if (code <= 0x7f) {
			bytes[b++] = code;
			continue;
		}

		if (0xD800 <= code && code <= 0xDBFF) {
			const codeLow = str.charCodeAt(i + 1);
			if (0xDC00 <= codeLow && codeLow <= 0xDFFF) {
				// convert only when both high and low surrogates are present
				code = ((code & 0x3FF) << 10) + (codeLow & 0x3FF) + 0x10000;
				++i;
			}
		}

		if ((code & 0xFFE00000) !== 0) {
			bytes[b++] = 0xF8 | ((code >>> 24) & 0x03);
			bytes[b++] = 0x80 | ((code >>> 18) & 0x3F);
			bytes[b++] = 0x80 | ((code >>> 12) & 0x3F);
			bytes[b++] = 0x80 | ((code >>> 6) & 0x3F);
			bytes[b++] = 0x80 | (code & 0x3F);
		} else if ((code & 0xFFFF0000) !== 0) {
			bytes[b++] = 0xF0 | ((code >>> 18) & 0x07);
			bytes[b++] = 0x80 | ((code >>> 12) & 0x3F);
			bytes[b++] = 0x80 | ((code >>> 6) & 0x3F);
			bytes[b++] = 0x80 | (code & 0x3F);
		} else if ((code & 0xFFFFF800) !== 0) {
			bytes[b++] = 0xE0 | ((code >>> 12) & 0x0F);
			bytes[b++] = 0x80 | ((code >>> 6) & 0x3F);
			bytes[b++] = 0x80 | (code & 0x3F);
		} else {
			bytes[b++] = 0xC0 | ((code >>> 6) & 0x1F);
			bytes[b++] = 0x80 | (code & 0x3F);
		}
	}
	return bytes.subarray(0, b);
}

function utf8encode_impl(bytes: Uint8Array): string {
	let j = 0, str = '';
	while (j < bytes.length) {
		const b1 = bytes[j++] & 0xFF;
		if (b1 <= 0x7F) {
			str += String.fromCharCode(b1);
		} else {
			let currentPrefix = 0xC0;
			let validBits = 5;
			do {
				const mask = (currentPrefix >> 1) | 0x80;
				if ((b1 & mask) === currentPrefix) break;
				currentPrefix = (currentPrefix >> 1) | 0x80;
				--validBits;
			} while (validBits >= 0);

			if (validBits <= 0) {
				// Invalid UTF8 character -- copying as is
				str += String.fromCharCode(b1);
				continue;
			}
			let code = (b1 & ((1 << validBits) - 1));
			let invalid = false;
			for (var i = 5; i >= validBits; --i) {
				const bi = bytes[j++];
				if ((bi & 0xC0) != 0x80) {
					// Invalid UTF8 character sequence
					invalid = true;
					break;
				}
				code = (code << 6) | (bi & 0x3F);
			}
			if (invalid) {
				// Copying invalid sequence as is
				for (let k = j - (7 - i); k < j; ++k) {
					str += String.fromCharCode(bytes[k] & 255);
				}
				continue;
			}
			if (code >= 0x10000) {
				str += String.fromCharCode((((code - 0x10000) >> 10) & 0x3FF) |
					0xD800, (code & 0x3FF) | 0xDC00);
			} else {
				str += String.fromCharCode(code);
			}
		}
	}
	return str;
}

const textEncoder = self.TextEncoder ? new self.TextEncoder() : null;
const textDecoder = self.TextDecoder ? new self.TextDecoder() : null;

export function utf8decode(str: string): Uint8Array {
	if (!textEncoder)
		return utf8decode_impl(str);

	try {
		return textEncoder.encode(str);
	} catch (e) {
		return utf8decode_impl(str);
	}
}

export function utf8encode(buffer: Uint8Array): string {
	if (!textDecoder)
		return utf8encode_impl(buffer);

	try {
		return textDecoder.decode(buffer);
	} catch (e) {
		return utf8encode_impl(buffer);
	}
}

/**
 * Simple pool allocator for ArrayBuffers. This reduces memory usage in data structures
 * that resize buffers.
 */
export class ArrayBufferPool {
	private _list: ArrayBuffer [];
	private _maxSize: number;
	private static _enabled = true;

	/**
	 * Creates a pool that manages a pool of a |maxSize| number of array buffers.
	 */
	constructor(maxSize: number = 32) {
		this._list = [];
		this._maxSize = maxSize;
	}

	/**
	 * Creates or reuses an existing array buffer that is at least the
	 * specified |length|.
	 */
	public acquire(length: number): ArrayBuffer {
		if (ArrayBufferPool._enabled) {
			const list = this._list;
			for (let i = 0; i < list.length; i++) {
				const buffer = list[i];
				if (buffer.byteLength >= length) {
					list.splice(i, 1);
					return buffer;
				}
			}
		}
		return new ArrayBuffer(length);
	}

	/**
	 * Releases an array buffer that is no longer needed back to the pool.
	 */
	public release(buffer: ArrayBuffer) {
		if (ArrayBufferPool._enabled) {
			const list = this._list;
			//release || Debug.assert(ArrayUtilities.indexOf(list, buffer) < 0);
			if (list.length === this._maxSize) {
				list.shift();
			}
			list.push(buffer);
		}
	}

	/**
	 * Resizes a Uint8Array to have the given length.
	 */
	public ensureUint8ArrayLength(array: Uint8Array, length: number): Uint8Array {
		if (array.length >= length) {
			return array;
		}
		const newLength = Math.max(array.length + length, ((array.length * 3) >> 1) + 1);
		const newArray = new Uint8Array(this.acquire(newLength), 0, newLength);
		newArray.set(array);
		this.release(array.buffer);
		return newArray;
	}

	/**
	 * Resizes a Float64Array to have the given length.
	 */
	public ensureFloat64ArrayLength(array: Float64Array, length: number): Float64Array {
		if (array.length >= length) {
			return array;
		}
		const newLength = Math.max(array.length + length, ((array.length * 3) >> 1) + 1);
		const newArray = new Float64Array(this.acquire(newLength * Float64Array.BYTES_PER_ELEMENT), 0, newLength);
		newArray.set(array);
		this.release(array.buffer);
		return newArray;
	}
}

/**
 * Makes sure that a typed array has the requested capacity. If required, it creates a new
 * instance of the array's class with a power-of-two capacity at least as large as required.
 */
//export function ensureTypedArrayCapacity<T extends TypedArray>(array: T, capacity: number): T {
export function ensureTypedArrayCapacity(array: any, capacity: number): any {

	if (array.length < capacity) {
		const oldArray = array;
		array = new (<any>array).constructor(IntegerUtilities.nearestPowerOfTwo(capacity));
		array.set(oldArray, 0);
	}
	return array;
}
/*
interface Math {
	imul(a: number, b: number): number;
	/**
	 * Returns the number of leading zeros of a number.
	 * @param x A numeric expression.
	 */
/*clz32(x: number): number;
}*/

export module IntegerUtilities {
	var sharedBuffer = new ArrayBuffer(8);
	export var i8 = new Int8Array(sharedBuffer);
	export var u8 = new Uint8Array(sharedBuffer);
	export var i32 = new Int32Array(sharedBuffer);
	export var f32 = new Float32Array(sharedBuffer);
	export var f64 = new Float64Array(sharedBuffer);
	export var nativeLittleEndian = new Int8Array(new Int32Array([1]).buffer)[0] === 1;

	/**
	 * Convert a float into 32 bits.
	 */
	export function floatToInt32(v: number) {
		f32[0] = v; return i32[0];
	}

	/**
	 * Convert 32 bits into a float.
	 */
	export function int32ToFloat(i: number) {
		i32[0] = i; return f32[0];
	}

	/**
	 * Swap the bytes of a 16 bit number.
	 */
	export function swap16(i: number) {
		return ((i & 0xFF) << 8) | ((i >> 8) & 0xFF);
	}

	/**
	 * Swap the bytes of a 32 bit number.
	 */
	export function swap32(i: number) {
		return ((i & 0xFF) << 24) | ((i & 0xFF00) << 8) | ((i >> 8) & 0xFF00) | ((i >> 24) & 0xFF);
	}

	/**
	 * Converts a number to s8.u8 fixed point representation.
	 */
	export function toS8U8(v: number) {
		return ((v * 256) << 16) >> 16;
	}

	/**
	 * Converts a number from s8.u8 fixed point representation.
	 */
	export function fromS8U8(i: number) {
		return i / 256;
	}

	/**
	 * Round trips a number through s8.u8 conversion.
	 */
	export function clampS8U8(v: number) {
		return fromS8U8(toS8U8(v));
	}

	/**
	 * Converts a number to signed 16 bits.
	 */
	export function toS16(v: number) {
		return (v << 16) >> 16;
	}

	export function bitCount(i: number): number {
		i = i - ((i >> 1) & 0x55555555);
		i = (i & 0x33333333) + ((i >> 2) & 0x33333333);
		return (((i + (i >> 4)) & 0x0F0F0F0F) * 0x01010101) >> 24;
	}

	export function ones(i: number): number {
		i = i - ((i >> 1) & 0x55555555);
		i = (i & 0x33333333) + ((i >> 2) & 0x33333333);
		return ((i + (i >> 4) & 0xF0F0F0F) * 0x1010101) >> 24;
	}

	export function trailingZeros(i: number): number {
		return IntegerUtilities.ones((i & -i) - 1);
	}

	export function getFlags(i: number, flags: string[]): string {
		let str = '';
		for (var i = 0; i < flags.length; i++) {
			if (i & (1 << i)) {
				str += flags[i] + ' ';
			}
		}
		if (str.length === 0) {
			return '';
		}
		return str.trim();
	}

	export function isPowerOfTwo(x: number) {
		return x && ((x & (x - 1)) === 0);
	}

	export function roundToMultipleOfFour(x: number) {
		return (x + 3) & ~0x3;
	}

	export function nearestPowerOfTwo(x: number) {
		x--;
		x |= x >> 1;
		x |= x >> 2;
		x |= x >> 4;
		x |= x >> 8;
		x |= x >> 16;
		x++;
		return x;
	}

	export function roundToMultipleOfPowerOfTwo(i: number, powerOfTwo: number) {
		const x = (1 << powerOfTwo) - 1;
		return (i + x) & ~x; // Round up to multiple of power of two.
	}

	export function toHEX(i: number) {
		var i = (i < 0 ? 0xFFFFFFFF + i + 1 : i);
		return '0x' + ('00000000' + i.toString(16)).substr(-8);
	}

	/**
	 * Polyfill imul.
	 */
	/*
	if (!Math.imul) {
		Math.imul = function imul(a, b) {
			var ah  = (a >>> 16) & 0xffff;
			var al = a & 0xffff;
			var bh  = (b >>> 16) & 0xffff;
			var bl = b & 0xffff;
			// the shift by 0 fixes the sign on the high part
			// the final |0 converts the unsigned value into a signed value
			return ((al * bl) + (((ah * bl + al * bh) << 16) >>> 0) | 0);
		};
	}*/

	/**
	 * Polyfill clz32.
	 */
	/*if (!Math.clz32) {
		Math.clz32 = function clz32(i: number) {
			i |= (i >> 1);
			i |= (i >> 2);
			i |= (i >> 4);
			i |= (i >> 8);
			i |= (i >> 16);
			return 32 - IntegerUtilities.ones(i);
		};
	}*/
}

export class ABCBlock {
	name: string;
	flags: number;
	data: Uint8Array;
}

export class EncryptedBlock {
	constructor(
		public data: Uint8Array,
		public size: ui32,
		public bytePos: ui32,
		public rawTagId: ui8 = 0
	) {}
}

export class ActionBlock {
	actionsData: Uint8Array;
	precedence: number;
	encryptedData?: EncryptedBlock;
}

export class InitActionBlock {
	spriteId: number;
	actionsData: Uint8Array;
	encryptedData?: EncryptedBlock;
}

export class SymbolExport {
	constructor(public symbolId: number, public className: string) {}
}

export class UnparsedTag {
	constructor(public tagCode: number, public byteOffset: number, public byteLength: number) {}
}

export class DictionaryEntry extends UnparsedTag {
	public id: number;
	constructor(id: number, tagCode: number, byteOffset: number, byteLength: number) {
		super(tagCode, byteOffset, byteLength);
		this.id = id;
	}
}

export class EagerlyParsedDictionaryEntry extends DictionaryEntry {
	type: string;
	definition: Object;
	ready: boolean;
	constructor(id: number, unparsed: UnparsedTag, type: string, definition: any) {
		super(id, unparsed.tagCode, unparsed.byteOffset, unparsed.byteLength);
		this.type = type;
		this.definition = definition;
		this.ready = false;
	}
}

/**
 * Similar to |toString| but returns |null| for |null| or |undefined| instead
 * of "null" or "undefined".
 */
export function axCoerceString(x): string {
	if (typeof x === 'string') {
		return x;
	} else if (x == undefined) {
		return null;
	}
	return x + '';
}
export var Errors = {
	/**
	 * AVM2 Error Codes
	 */

	//  OutOfMemoryError                     : {code: 1000, message: "The system is out of memory."},
	NotImplementedError                  : { code: 1001, message: 'The method %1 is not implemented.' },
	InvalidPrecisionError                : { code: 1002, message: 'Number.toPrecision has a range of 1 to 21. Number.toFixed and Number.toExponential have a range of 0 to 20. Specified value is not within expected range.' },
	InvalidRadixError                    : { code: 1003, message: 'The radix argument must be between 2 and 36; got %1.' },
	InvokeOnIncompatibleObjectError      : { code: 1004, message: 'Method %1 was invoked on an incompatible object.' },
	ArrayIndexNotIntegerError            : { code: 1005, message: 'Array index is not a positive integer (%1).' },
	CallOfNonFunctionError               : { code: 1006, message: '%1 is not a function.' },
	ConstructOfNonFunctionError          : { code: 1007, message: 'Instantiation attempted on a non-constructor.' },
	//  AmbiguousBindingError                : {code: 1008, message: "%1 is ambiguous; Found more than one matching binding."},
	ConvertNullToObjectError             : { code: 1009, message: 'Cannot access a property or method of a null object reference.' },
	ConvertUndefinedToObjectError        : { code: 1010, message: 'A term is undefined and has no properties.' },
	//  IllegalOpcodeError                   : {code: 1011, message: "Method %1 contained illegal opcode %2 at offset %3."},
	//  LastInstExceedsCodeSizeError         : {code: 1012, message: "The last instruction exceeded code size."},
	//  FindVarWithNoScopeError              : {code: 1013, message: "Cannot call OP_findproperty when scopeDepth is 0."},
	ClassNotFoundError                   : { code: 1014, message: 'Class %1 could not be found.' },
	//  IllegalSetDxns                       : {code: 1015, message: "Method %1 cannot set default xml namespace"},
	DescendentsError                     : { code: 1016, message: 'Descendants operator (..) not supported on type %1.' },
	//  ScopeStackOverflowError              : {code: 1017, message: "Scope stack overflow occurred."},
	//  ScopeStackUnderflowError             : {code: 1018, message: "Scope stack underflow occurred."},
	//  GetScopeObjectBoundsError            : {code: 1019, message: "Getscopeobject %1 is out of bounds."},
	//  CannotFallOffMethodError             : {code: 1020, message: "Code cannot fall off the end of a method."},
	//  InvalidBranchTargetError             : {code: 1021, message: "At least one branch target was not on a valid instruction in the method."},
	//  IllegalVoidError                     : {code: 1022, message: "Type void may only be used as a function return type."},
	StackOverflowError                   : { code: 1023, message: 'Stack overflow occurred.' },
	//  StackUnderflowError                  : {code: 1024, message: "Stack underflow occurred."},
	//  InvalidRegisterError                 : {code: 1025, message: "An invalid register %1 was accessed."},
	//  SlotExceedsCountError                : {code: 1026, message: "Slot %1 exceeds slotCount=%2 of %3."},
	//  MethodInfoExceedsCountError          : {code: 1027, message: "Method_info %1 exceeds method_count=%2."},
	//  DispIdExceedsCountError              : {code: 1028, message: "Disp_id %1 exceeds max_disp_id=%2 of %3."},
	//  DispIdUndefinedError                 : {code: 1029, message: "Disp_id %1 is undefined on %2."},
	//  StackDepthUnbalancedError            : {code: 1030, message: "Stack depth is unbalanced. %1 != %2."},
	//  ScopeDepthUnbalancedError            : {code: 1031, message: "Scope depth is unbalanced. %1 != %2."},
	CpoolIndexRangeError                 : { code: 1032, message: 'Cpool index %1 is out of range %2.' },
	CpoolEntryWrongTypeError             : { code: 1033, message: 'Cpool entry %1 is wrong type.' },
	CheckTypeFailedError                 : { code: 1034, message: 'Type Coercion failed: cannot convert %1 to %2.' },
	//  IllegalSuperCallError                : {code: 1035, message: "Illegal super expression found in method %1."},
	CannotAssignToMethodError            : { code: 1037, message: 'Cannot assign to a method %1 on %2.' },
	//  RedefinedError                       : {code: 1038, message: "%1 is already defined."},
	//  CannotVerifyUntilReferencedError     : {code: 1039, message: "Cannot verify method until it is referenced."},
	CantUseInstanceofOnNonObjectError    : { code: 1040, message: 'The right-hand side of instanceof must be a class or function.' },
	IsTypeMustBeClassError               : { code: 1041, message: 'The right-hand side of operator must be a class.' },
	InvalidMagicError                    : { code: 1042, message: 'Not an ABC file.  major_version=%1 minor_version=%2.' },
	//  InvalidCodeLengthError               : {code: 1043, message: "Invalid code_length=%1."},
	//  InvalidMethodInfoFlagsError          : {code: 1044, message: "MethodInfo-%1 unsupported flags=%2."},
	UnsupportedTraitsKindError           : { code: 1045, message: 'Unsupported traits kind=%1.' },
	//  MethodInfoOrderError                 : {code: 1046, message: "MethodInfo-%1 referenced before definition."},
	//  MissingEntryPointError               : {code: 1047, message: "No entry point was found."},
	PrototypeTypeError                   : { code: 1049, message: 'Prototype objects must be vanilla Objects.' },
	ConvertToPrimitiveError              : { code: 1050, message: 'Cannot convert %1 to primitive.' },
	//  IllegalEarlyBindingError             : {code: 1051, message: "Illegal early binding access to %1."},
	InvalidURIError                      : { code: 1052, message: 'Invalid URI passed to %1 function.' },
	//  IllegalOverrideError                 : {code: 1053, message: "Illegal override of %1 in %2."},
	//  IllegalExceptionHandlerError         : {code: 1054, message: "Illegal range or target offsets in exception handler."},
	WriteSealedError                     : { code: 1056, message: 'Cannot create property %1 on %2.' },
	//  IllegalSlotError                     : {code: 1057, message: "%1 can only contain methods."},
	//  IllegalOperandTypeError              : {code: 1058, message: "Illegal operand type: %1 must be %2."},
	//  ClassInfoOrderError                  : {code: 1059, message: "ClassInfo-%1 is referenced before definition."},
	//  ClassInfoExceedsCountError           : {code: 1060, message: "ClassInfo %1 exceeds class_count=%2."},
	//  NumberOutOfRangeError                : {code: 1061, message: "The value %1 cannot be converted to %2 without losing precision."},
	WrongArgumentCountError              : { code: 1063, message: 'Argument count mismatch on %1. Expected %2, got %3.' },
	//  CannotCallMethodAsConstructor        : {code: 1064, message: "Cannot call method %1 as constructor."},
	UndefinedVarError                    : { code: 1065, message: 'Variable %1 is not defined.' },
	//  FunctionConstructorError             : {code: 1066, message: "The form function('function body') is not supported."},
	//  IllegalNativeMethodBodyError         : {code: 1067, message: "Native method %1 has illegal method body."},
	//  CannotMergeTypesError                : {code: 1068, message: "%1 and %2 cannot be reconciled."},
	ReadSealedError                      : { code: 1069, message: 'Property %1 not found on %2 and there is no default value.' },
	//  CallNotFoundError                    : {code: 1070, message: "Method %1 not found on %2"},
	//  AlreadyBoundError                    : {code: 1071, message: "Function %1 has already been bound to %2."},
	//  ZeroDispIdError                      : {code: 1072, message: "Disp_id 0 is illegal."},
	//  DuplicateDispIdError                 : {code: 1073, message: "Non-override method %1 replaced because of duplicate disp_id %2."},
	ConstWriteError                      : { code: 1074, message: 'Illegal write to read-only property %1 on %2.' },
	//  MathNotFunctionError                 : {code: 1075, message: "Math is not a function."},
	//  MathNotConstructorError              : {code: 1076, message: "Math is not a constructor."},
	//  WriteOnlyError                       : {code: 1077, message: "Illegal read of write-only property %1 on %2."},
	//  IllegalOpMultinameError              : {code: 1078, message: "Illegal opcode/multiname combination: %1<%2>."},
	//  IllegalNativeMethodError             : {code: 1079, message: "Native methods are not allowed in loaded code."},
	//  IllegalNamespaceError                : {code: 1080, message: "Illegal value for namespace."},
	//  ReadSealedErrorNs                    : {code: 1081, message: "Property %1 not found on %2 and there is no default value."},
	//  NoDefaultNamespaceError              : {code: 1082, message: "No default namespace has been set."},
	XMLPrefixNotBound                    : { code: 1083, message: 'The prefix "%1" for element "%2" is not bound.' },
	//  XMLBadQName                          : {code: 1084, message: "Element or attribute (\"%1\") does not match QName production: QName::=(NCName':')?NCName."},
	XMLUnterminatedElementTag            : { code: 1085, message: 'The element type "%1" must be terminated by the matching end-tag "</%2>".' },
	XMLOnlyWorksWithOneItemLists         : { code: 1086, message: 'The %1 method only works on lists containing one item.' },
	XMLAssignmentToIndexedXMLNotAllowed  : { code: 1087, message: 'Assignment to indexed XML is not allowed.' },
	XMLMarkupMustBeWellFormed            : { code: 1088, message: 'The markup in the document following the root element must be well-formed.' },
	XMLAssigmentOneItemLists             : { code: 1089, message: 'Assignment to lists with more than one item is not supported.' },
	XMLMalformedElement                  : { code: 1090, message: 'XML parser failure: element is malformed.' },
	XMLUnterminatedCData                 : { code: 1091, message: 'XML parser failure: Unterminated CDATA section.' },
	XMLUnterminatedXMLDecl               : { code: 1092, message: 'XML parser failure: Unterminated XML declaration.' },
	XMLUnterminatedDocTypeDecl           : { code: 1093, message: 'XML parser failure: Unterminated DOCTYPE declaration.' },
	XMLUnterminatedComment               : { code: 1094, message: 'XML parser failure: Unterminated comment.' },
	//  XMLUnterminatedAttribute             : {code: 1095, message: "XML parser failure: Unterminated attribute."},
	XMLUnterminatedElement               : { code: 1096, message: 'XML parser failure: Unterminated element.' },
	//  XMLUnterminatedProcessingInstruction : {code: 1097, message: "XML parser failure: Unterminated processing instruction."},
	XMLNamespaceWithPrefixAndNoURI       : { code: 1098, message: 'Illegal prefix %1 for no namespace.' },
	RegExpFlagsArgumentError             : { code: 1100, message: 'Cannot supply flags when constructing one RegExp from another.' },
	//  NoScopeError                         : {code: 1101, message: "Cannot verify method %1 with unknown scope."},
	//  IllegalDefaultValue                  : {code: 1102, message: "Illegal default value for type %1."},
	//  CannotExtendFinalClass               : {code: 1103, message: "Class %1 cannot extend final base class."},
	//  XMLDuplicateAttribute                : {code: 1104, message: "Attribute \"%1\" was already specified for element \"%2\"."},
	//  CorruptABCError                      : {code: 1107, message: "The ABC data is corrupt, attempt to read out of bounds."},
	InvalidBaseClassError                : { code: 1108, message: 'The OP_newclass opcode was used with the incorrect base class.' },
	//  DanglingFunctionError                : {code: 1109, message: "Attempt to directly call unbound function %1 from method %2."},
	//  CannotExtendError                    : {code: 1110, message: "%1 cannot extend %2."},
	//  CannotImplementError                 : {code: 1111, message: "%1 cannot implement %2."},
	//  CoerceArgumentCountError             : {code: 1112, message: "Argument count mismatch on class coercion.  Expected 1, got %1."},
	//  InvalidNewActivationError            : {code: 1113, message: "OP_newactivation used in method without NEED_ACTIVATION flag."},
	//  NoGlobalScopeError                   : {code: 1114, message: "OP_getglobalslot or OP_setglobalslot used with no global scope."},
	//  NotConstructorError                  : {code: 1115, message: "%1 is not a constructor."},
	//  ApplyError                           : {code: 1116, message: "second argument to Function.prototype.apply must be an array."},
	XMLInvalidName                       : { code: 1117, message: 'Invalid XML name: %1.' },
	XMLIllegalCyclicalLoop               : { code: 1118, message: 'Illegal cyclical loop between nodes.' },
	//  DeleteTypeError                      : {code: 1119, message: "Delete operator is not supported with operand of type %1."},
	//  DeleteSealedError                    : {code: 1120, message: "Cannot delete property %1 on %2."},
	//  DuplicateMethodBodyError             : {code: 1121, message: "Method %1 has a duplicate method body."},
	//  IllegalInterfaceMethodBodyError      : {code: 1122, message: "Interface method %1 has illegal method body."},
	FilterError                          : { code: 1123, message: 'Filter operator not supported on type %1.' },
	//  InvalidHasNextError                  : {code: 1124, message: "OP_hasnext2 requires object and index to be distinct registers."},
	OutOfRangeError                      : { code: 1125, message: 'The index %1 is out of range %2.' },
	VectorFixedError                     : { code: 1126, message: 'Cannot change the length of a fixed Vector.' },
	TypeAppOfNonParamType                : { code: 1127, message: 'Type application attempted on a non-parameterized type.' },
	WrongTypeArgCountError               : { code: 1128, message: 'Incorrect number of type parameters for %1. Expected %2, got %3.' },
	JSONCyclicStructure                  : { code: 1129, message: 'Cyclic structure cannot be converted to JSON string.' },
	JSONInvalidReplacer                  : { code: 1131, message: 'Replacer argument to JSON stringifier must be an array or a two parameter function.' },
	JSONInvalidParseInput                : { code: 1132, message: 'Invalid JSON parse input.' },
	//  FileOpenError                        : {code: 1500, message: "Error occurred opening file %1."},
	//  FileWriteError                       : {code: 1501, message: "Error occurred writing to file %1."},
	//  ScriptTimeoutError                   : {code: 1502, message: "A script has executed for longer than the default timeout period of 15 seconds."},
	//  ScriptTerminatedError                : {code: 1503, message: "A script failed to exit after 30 seconds and was terminated."},
	//  EndOfFileError                       : {code: 1504, message: "End of file."},
	//  StringIndexOutOfBoundsError          : {code: 1505, message: "The string index %1 is out of bounds; must be in range %2 to %3."},
	InvalidRangeError                    : { code: 1506, message: 'The specified range is invalid.' },
	NullArgumentError                    : { code: 1507, message: 'Argument %1 cannot be null.' },
	InvalidArgumentError                 : { code: 1508, message: 'The value specified for argument %1 is invalid.' },
	ArrayFilterNonNullObjectError        : { code: 1510, message: 'When the callback argument is a method of a class, the optional this argument must be null.' },
	InvalidParamError                    : { code: 2004, message: 'One of the parameters is invalid.' },
	ParamRangeError                      : { code: 2006, message: 'The supplied index is out of bounds.' },
	NullPointerError                     : { code: 2007, message: 'Parameter %1 must be non-null.' },
	InvalidEnumError                     : { code: 2008, message: 'Parameter %1 must be one of the accepted values.' },
	CantInstantiateError                 : { code: 2012, message: '%1 class cannot be instantiated.' },
	InvalidBitmapData                    : { code: 2015, message: 'Invalid BitmapData.' },
	EOFError                             : { code: 2030, message: 'End of file was encountered.', fqn: 'flash.errors.EOFError' },
	CompressedDataError                  : { code: 2058, message: 'There was an error decompressing the data.', fqn: 'flash.errors.IOError' },
	EmptyStringError                     : { code: 2085, message: 'Parameter %1 must be non-empty string.' },
	ProxyGetPropertyError                : { code: 2088, message: 'The Proxy class does not implement getProperty. It must be overridden by a subclass.' },
	ProxySetPropertyError                : { code: 2089, message: 'The Proxy class does not implement setProperty. It must be overridden by a subclass.' },
	ProxyCallPropertyError               : { code: 2090, message: 'The Proxy class does not implement callProperty. It must be overridden by a subclass.' },
	ProxyHasPropertyError                : { code: 2091, message: 'The Proxy class does not implement hasProperty. It must be overridden by a subclass.' },
	ProxyDeletePropertyError             : { code: 2092, message: 'The Proxy class does not implement deleteProperty. It must be overridden by a subclass.' },
	ProxyGetDescendantsError             : { code: 2093, message: 'The Proxy class does not implement getDescendants. It must be overridden by a subclass.' },
	ProxyNextNameIndexError              : { code: 2105, message: 'The Proxy class does not implement nextNameIndex. It must be overridden by a subclass.' },
	ProxyNextNameError                   : { code: 2106, message: 'The Proxy class does not implement nextName. It must be overridden by a subclass.' },
	ProxyNextValueError                  : { code: 2107, message: 'The Proxy class does not implement nextValue. It must be overridden by a subclass.' },
	//  InvalidArrayLengthError              : {code: 2108, message: "The value %1 is not a valid Array length."},
	//  ReadExternalNotImplementedError      : {code: 2173, message: "Unable to read object in stream.  The class %1 does not implement flash.utils.IExternalizable but is aliased to an externalizable class."},

	/**
	 * Player Error Codes
	 */
	//  NoSecurityContextError                                    : { code: 2000, message: "No active security context."},
	TooFewArgumentsError                                      : { code: 2001, message: 'Too few arguments were specified; got %1, %2 expected.' },
	//  InvalidSocketError                                        : { code: 2002, message: "Operation attempted on invalid socket."},
	//  InvalidSocketPortError                                    : { code: 2003, message: "Invalid socket port number specified."},
	ParamTypeError                                            : { code: 2005, message: 'Parameter %1 is of the incorrect type. Should be type %2.' },
	//  HasStyleSheetError                                        : { code: 2009, message: "This method cannot be used on a text field with a style sheet."},
	//  SocketLocalFileSecurityError                              : { code: 2010, message: "Local-with-filesystem SWF files are not permitted to use sockets."},
	SocketConnectError                                        : { code: 2011, message: 'Socket connection failed to %1:%2.' },
	//  AuthoringOnlyFeatureError                                 : { code: 2013, message: "Feature can only be used in Flash Authoring."},
	//  FeatureNotAvailableError                                  : { code: 2014, message: "Feature is not available at this time."},
	//  InvalidBitmapDataError                                    : { code: 2015, message: "Invalid BitmapData."},
	//  SystemExitSecurityError                                   : { code: 2017, message: "Only trusted local files may cause the Flash Player to exit."},
	//  SystemExitUnsupportedError                                : { code: 2018, message: "System.exit is only available in the standalone Flash Player."},
	//  InvalidDepthError                                         : { code: 2019, message: "Depth specified is invalid."},
	//  MovieClipSwapError                                        : { code: 2020, message: "MovieClips objects with different parents cannot be swapped."},
	//  ObjectCreationError                                       : { code: 2021, message: "Object creation failed."},
	//  NotDisplayObjectError                                     : { code: 2022, message: "Class %1 must inherit from DisplayObject to link to a symbol."},
	//  NotSpriteError                                            : { code: 2023, message: "Class %1 must inherit from Sprite to link to the root."},
	CantAddSelfError                                          : { code: 2024, message: 'An object cannot be added as a child of itself.' },
	NotAChildError                                            : { code: 2025, message: 'The supplied DisplayObject must be a child of the caller.' },
	//  NavigateURLError                                          : { code: 2026, message: "An error occurred navigating to the URL %1."},
	//  MustBeNonNegativeError                                    : { code: 2027, message: "Parameter %1 must be a non-negative number; got %2."},
	//  LocalSecurityError                                        : { code: 2028, message: "Local-with-filesystem SWF file %1 cannot access Internet URL %2."},
	//  InvalidStreamError                                        : { code: 2029, message: "This URLStream object does not have a stream opened."},
	//  SocketError                                               : { code: 2031, message: "Socket Error."},
	//  StreamError                                               : { code: 2032, message: "Stream Error."},
	//  KeyGenerationError                                        : { code: 2033, message: "Key Generation Failed."},
	//  InvalidKeyError                                           : { code: 2034, message: "An invalid digest was supplied."},
	//  URLNotFoundError                                          : { code: 2035, message: "URL Not Found."},
	//  LoadNeverCompletedError                                   : { code: 2036, message: "Load Never Completed."},
	//  InvalidCallError                                          : { code: 2037, message: "Functions called in incorrect sequence, or earlier call was unsuccessful."},
	//  FileIOError                                               : { code: 2038, message: "File I/O Error."},
	//  RemoteURLError                                            : { code: 2039, message: "Invalid remote URL protocol. The remote URL protocol must be HTTP or HTTPS."},
	//  BrowseInProgressError                                     : { code: 2041, message: "Only one file browsing session may be performed at a time."},
	//  DigestNotSupportedError                                   : { code: 2042, message: "The digest property is not supported by this load operation."},
	UnhandledError                                            : { code: 2044, message: 'Unhandled %1:.' },
	//  FileVerificationError                                     : { code: 2046, message: "The loaded file did not have a valid signature."},
	//  DisplayListSecurityError                                  : { code: 2047, message: "Security sandbox violation: %1: %2 cannot access %3."},
	//  DownloadSecurityError                                     : { code: 2048, message: "Security sandbox violation: %1 cannot load data from %2."},
	//  UploadSecurityError                                       : { code: 2049, message: "Security sandbox violation: %1 cannot upload data to %2."},
	//  OutboundScriptingSecurityError                            : { code: 2051, message: "Security sandbox violation: %1 cannot evaluate scripting URLs within %2 (allowScriptAccess is %3). Attempted URL was %4."},
	AllowDomainArgumentError                                  : { code: 2052, message: 'Only String arguments are permitted for allowDomain and allowInsecureDomain.' },
	//  IntervalSecurityError                                     : { code: 2053, message: "Security sandbox violation: %1 cannot clear an interval timer set by %2."},
	//  ExactSettingsError                                        : { code: 2054, message: "The value of Security.exactSettings cannot be changed after it has been used."},
	//  PrintJobStartError                                        : { code: 2055, message: "The print job could not be started."},
	//  PrintJobSendError                                         : { code: 2056, message: "The print job could not be sent to the printer."},
	//  PrintJobAddPageError                                      : { code: 2057, message: "The page could not be added to the print job."},
	//  ExternalCallbackSecurityError                             : { code: 2059, message: "Security sandbox violation: %1 cannot overwrite an ExternalInterface callback added by %2."},
	//  ExternalInterfaceSecurityError                            : { code: 2060, message: "Security sandbox violation: ExternalInterface caller %1 cannot access %2."},
	//  ExternalInterfaceNoCallbackError                          : { code: 2061, message: "No ExternalInterface callback %1 registered."},
	//  NoCloneMethodError                                        : { code: 2062, message: "Children of Event must override clone() {return new MyEventClass (...);}."},
	//  IMEError                                                  : { code: 2063, message: "Error attempting to execute IME command."},
	//  FocusNotSetError                                          : { code: 2065, message: "The focus cannot be set for this target."},
	DelayRangeError                                           : { code: 2066, message: 'The Timer delay specified is out of range.' },
	ExternalInterfaceNotAvailableError                        : { code: 2067, message: 'The ExternalInterface is not available in this container. ExternalInterface requires Internet Explorer ActiveX, Firefox, Mozilla 1.7.5 and greater, or other browsers that support NPRuntime.' },
	//  InvalidSoundError                                         : { code: 2068, message: "Invalid sound."},
	InvalidLoaderMethodError                                  : { code: 2069, message: 'The Loader class does not implement this method.' },
	//  StageOwnerSecurityError                                   : { code: 2070, message: "Security sandbox violation: caller %1 cannot access Stage owned by %2."},
	InvalidStageMethodError                                   : { code: 2071, message: 'The Stage class does not implement this property or method.' },
	//  ProductManagerDiskError                                   : { code: 2073, message: "There was a problem saving the application to disk."},
	//  ProductManagerStageError                                  : { code: 2074, message: "The stage is too small to fit the download ui."},
	//  ProductManagerVerifyError                                 : { code: 2075, message: "The downloaded file is invalid."},
	//  FilterFailedError                                         : { code: 2077, message: "This filter operation cannot be performed with the specified input parameters."},
	TimelineObjectNameSealedError                             : { code: 2078, message: 'The name property of a Timeline-placed object cannot be modified.' },
	//  BitmapNotAssociatedWithBitsCharError                      : { code: 2079, message: "Classes derived from Bitmap can only be associated with defineBits characters (bitmaps)."},
	AlreadyConnectedError                                     : { code: 2082, message: 'Connect failed because the object is already connected.' },
	CloseNotConnectedError                                    : { code: 2083, message: 'Close failed because the object is not connected.' },
	ArgumentSizeError                                         : { code: 2084, message: 'The AMF encoding of the arguments cannot exceed 40K.' },
	//  FileReferenceProhibitedError                              : { code: 2086, message: "A setting in the mms.cfg file prohibits this FileReference request."},
	//  DownloadFileNameProhibitedError                           : { code: 2087, message: "The FileReference.download() file name contains prohibited characters."},
	//  EventDispatchRecursionError                               : { code: 2094, message: "Event dispatch recursion overflow."},
	AsyncError                                                : { code: 2095, message: '%1 was unable to invoke callback %2.' },
	//  DisallowedHTTPHeaderError                                 : { code: 2096, message: "The HTTP request header %1 cannot be set via ActionScript."},
	//  FileFilterError                                           : { code: 2097, message: "The FileFilter Array is not in the correct format."},
	LoadingObjectNotSWFError                                  : { code: 2098, message: 'The loading object is not a .swf file, you cannot request SWF properties from it.' },
	LoadingObjectNotInitializedError                          : { code: 2099, message: 'The loading object is not sufficiently loaded to provide this information.' },
	//  EmptyByteArrayError                                       : { code: 2100, message: "The ByteArray parameter in Loader.loadBytes() must have length greater than 0."},
	DecodeParamError                                          : { code: 2101, message: 'The String passed to URLVariables.decode() must be a URL-encoded query string containing name/value pairs.' },
	//  NotAnXMLChildError                                        : { code: 2102, message: "The before XMLNode parameter must be a child of the caller."},
	//  XMLRecursionError                                         : { code: 2103, message: "XML recursion failure: new child would create infinite loop."},
	SceneNotFoundError                                        : { code: 2108, message: 'Scene %1 was not found.' },
	FrameLabelNotFoundError                                   : { code: 2109, message: 'Frame label %1 not found in scene %2.' },
	//  DisableAVM1LoadingError                                   : { code: 2110, message: "The value of Security.disableAVM1Loading cannot be set unless the caller can access the stage and is in an ActionScript 3.0 SWF file."},
	//  AVM1LoadingError                                          : { code: 2111, message: "Security.disableAVM1Loading is true so the current load of the ActionScript 1.0/2.0 SWF file has been blocked."},
	//  ApplicationDomainSecurityError                            : { code: 2112, message: "Provided parameter LoaderContext.ApplicationDomain is from a disallowed domain."},
	//  SecurityDomainSecurityError                               : { code: 2113, message: "Provided parameter LoaderContext.SecurityDomain is from a disallowed domain."},
	//  NonNullPointerError                                       : { code: 2114, message: "Parameter %1 must be null."},
	//  TrueParamError                                            : { code: 2115, message: "Parameter %1 must be false."},
	//  FalseParamError                                           : { code: 2116, message: "Parameter %1 must be true."},
	InvalidLoaderInfoMethodError                              : { code: 2118, message: 'The LoaderInfo class does not implement this method.' },
	//  LoaderInfoAppDomainSecurityError                          : { code: 2119, message: "Security sandbox violation: caller %1 cannot access LoaderInfo.applicationDomain owned by %2."},
	SecuritySwfNotAllowedError                                : { code: 2121, message: 'Security sandbox violation: %1: %2 cannot access %3. This may be worked around by calling Security.allowDomain.' },
	//  SecurityNonSwfIncompletePolicyFilesError                  : { code: 2122, message: "Security sandbox violation: %1: %2 cannot access %3. A policy file is required, but the checkPolicyFile flag was not set when this media was loaded."},
	//  SecurityNonSwfNotAllowedError                             : { code: 2123, message: "Security sandbox violation: %1: %2 cannot access %3. No policy files granted access."},
	UnknownFileTypeError                                      : { code: 2124, message: 'Loaded file is an unknown type.' },
	//  SecurityCrossVMNotAllowedError                            : { code: 2125, message: "Security sandbox violation: %1 cannot use Runtime Shared Library %2 because crossing the boundary between ActionScript 3.0 and ActionScript 1.0/2.0 objects is not allowed."},
	//  NotConnectedError                                         : { code: 2126, message: "NetConnection object must be connected."},
	//  FileRefBadPostDataTypeError                               : { code: 2127, message: "FileReference POST data cannot be type ByteArray."},
	//  NetConnectionConnectError                                 : { code: 2129, message: "Connection to %1 failed."},
	//  SharedObjectFlushFailedError                              : { code: 2130, message: "Unable to flush SharedObject."},
	//  DefinitionNotFoundError                                   : { code: 2131, message: "Definition %1 cannot be found."},
	//  NetConnectionInvalidConnectFromNetStatusEventError        : { code: 2132, message: "NetConnection.connect cannot be called from a netStatus event handler."},
	//  CallbackNotRegisteredError                                : { code: 2133, message: "Callback %1 is not registered."},
	//  SharedObjectCreateError                                   : { code: 2134, message: "Cannot create SharedObject."},
	//  InvalidSWFError                                           : { code: 2136, message: "The SWF file %1 contains invalid data."},
	//  NavigationSecurityError                                   : { code: 2137, message: "Security sandbox violation: %1 cannot navigate window %2 within %3 (allowScriptAccess is %4). Attempted URL was %5."},
	//  NonParsableRichTextXMLError                               : { code: 2138, message: "Rich text XML could not be parsed."},
	//  SharedObjectConnectError                                  : { code: 2139, message: "SharedObject could not connect."},
	//  LocalSecurityLoadingError                                 : { code: 2140, message: "Security sandbox violation: %1 cannot load %2. Local-with-filesystem and local-with-networking SWF files cannot load each other."},
	//  MultiplePrintJobsError                                    : { code: 2141, message: "Only one PrintJob may be in use at a time."},
	//  LocalImportSecurityError                                  : { code: 2142, message: "Security sandbox violation: local SWF files cannot use the LoaderContext.sec property. %1 was attempting to load %2."},
	//  AccOverrideRole                                           : { code: 2143, message: "AccessibilityImplementation.get_accRole() must be overridden from its default."},
	//  AccOverrideState                                          : { code: 2144, message: "AccessibilityImplementation.get_accState() must be overridden from its default."},
	//  URLRequestHeaderInvalidLengthError                        : { code: 2145, message: "Cumulative length of requestHeaders must be less than 8192 characters."},
	//  AllowNetworkingSecurityError                              : { code: 2146, message: "Security sandbox violation: %1 cannot call %2 because the HTML/container parameter allowNetworking has the value %3."},
	//  ForbiddenProtocolError                                    : { code: 2147, message: "Forbidden protocol in URL %1."},
	//  RemoteToLocalSecurityError                                : { code: 2148, message: "SWF file %1 cannot access local resource %2. Only local-with-filesystem and trusted local SWF files may access local resources."},
	//  FsCommandSecurityError                                    : { code: 2149, message: "Security sandbox violation: %1 cannot make fscommand calls to %2 (allowScriptAccess is %3)."},
	CantAddParentError                                        : { code: 2150, message: 'An object cannot be added as a child to one of it\'s children (or children\'s children, etc.).' },
	//  FullScreenSecurityError                                   : { code: 2151, message: "You cannot enter full screen mode when the settings dialog is visible."},
	//  FullScreenNotAllowedError                                 : { code: 2152, message: "Full screen mode is not allowed."},
	//  URLRequestInvalidHeader                                   : { code: 2153, message: "The URLRequest.requestHeaders array must contain only non-NULL URLRequestHeader objects."},
	//  InvalidNetStreamObject                                    : { code: 2154, message: "The NetStream Object is invalid.  This may be due to a failed NetConnection."},
	//  InvalidFunctionName                                       : { code: 2155, message: "The ExternalInterface.call functionName parameter is invalid.  Only alphanumeric characters are supported."},
	//  ForbiddenPortForProtocolError                             : { code: 2156, message: "Port %1 may not be accessed using protocol %2. Calling SWF was %3."},
	//  NoAsfunctionErrror                                        : { code: 2157, message: "Rejecting URL %1 because the 'asfunction:' protocol may only be used for link targets, not for networking APIs."},
	//  InvalidNetConnectionObject                                : { code: 2158, message: "The NetConnection Object is invalid.  This may be due to a dropped NetConnection."},
	//  InvalidSharedObject                                       : { code: 2159, message: "The SharedObject Object is invalid."},
	//  InvalidTextLineError                                      : { code: 2160, message: "The TextLine is INVALID and cannot be used to access the current state of the TextBlock."},
	//  TextLayoutError                                           : { code: 2161, message: "An internal error occured while laying out the text."},
	//  FragmentOutputType                                        : { code: 2162, message: "The Shader output type is not compatible for this operation."},
	//  FragmentInputType                                         : { code: 2163, message: "The Shader input type %1 is not compatible for this operation."},
	//  FragmentInputMissing                                      : { code: 2164, message: "The Shader input %1 is missing or an unsupported type."},
	//  FragmentInputTooSmall                                     : { code: 2165, message: "The Shader input %1 does not have enough data."},
	//  FragmentInputNoDimension                                  : { code: 2166, message: "The Shader input %1 lacks valid dimensions."},
	//  FragmentNotEnoughInput                                    : { code: 2167, message: "The Shader does not have the required number of inputs for this operation."},
	//  StaticTextLineError                                       : { code: 2168, message: "Static text lines have no atoms and no reference to a text block."},
	//  SecurityQuestionableBrowserScriptingError                 : { code: 2169, message: "The method %1 may not be used for browser scripting.  The URL %2 requested by %3 is being ignored.  If you intend to call browser script, use navigateToURL instead."},
	//  HeaderSecurityError                                       : { code: 2170, message: "Security sandbox violation: %1 cannot send HTTP headers to %2."},
	//  FragmentMissing                                           : { code: 2171, message: "The Shader object contains no byte code to execute."},
	//  FragmentAlreadyRunning                                    : { code: 2172, message: "The ShaderJob is already running or finished."},
	//  FileReferenceBusyError                                    : { code: 2174, message: "Only one download, upload, load or save operation can be active at a time on each FileReference."},
	//  UnformattedElementError                                   : { code: 2175, message: "One or more elements of the content of the TextBlock has a null ElementFormat."},
	//  UserActionRequiredError                                   : { code: 2176, message: "Certain actions, such as those that display a pop-up window, may only be invoked upon user interaction, for example by a mouse click or button press."},
	//  FragmentInputTooLarge                                     : { code: 2177, message: "The Shader input %1 is too large."},
	//  ClipboardConstNotAllowed                                  : { code: 2178, message: "The Clipboard.generalClipboard object must be used instead of creating a new Clipboard."},
	//  ClipboardDisallowedRead                                   : { code: 2179, message: "The Clipboard.generalClipboard object may only be read while processing a flash.events.Event.PASTE event."},
	//  CantMoveAVM1ContentLoadedIntoAVM2                         : { code: 2180, message: "It is illegal to move AVM1 content (AS1 or AS2) to a different part of the displayList when it has been loaded into AVM2 (AS3) content."},
	//  InvalidTextLineMethodError                                : { code: 2181, message: "The TextLine class does not implement this property or method."},
	//  PerspectiveFieldOfViewValueInvalid                        : { code: 2182, message: "Invalid fieldOfView value.  The value must be greater than 0 and less than 180."},
	//  Invalid3DScale                                            : { code: 2183, message: "Scale values must not be zero."},
	//  LockedElementFormatError                                  : { code: 2184, message: "The ElementFormat object is locked and cannot be modified."},
	//  LockedFontDescriptionError                                : { code: 2185, message: "The FontDescription object is locked and cannot be modified."},
	//  PerspectiveFocalLengthInvalid                             : { code: 2186, message: "Invalid focalLength %1."},
	//  Matrix3DDecomposeTypeInvalid                              : { code: 2187, message: "Invalid orientation style %1.  Value must be one of 'Orientation3D.EULER_ANGLES', 'Orientation3D.AXIS_ANGLE', or 'Orientation3D.QUATERNION'."},
	//  MatrixNonInvertibleError                                  : { code: 2188, message: "Invalid raw matrix. Matrix must be invertible."},
	Matrix3DRefCannontBeShared                                : { code: 2189, message: 'A Matrix3D can not be assigned to more than one DisplayObject.' },
	//  ForceDownloadSecurityError                                : { code: 2190, message: "The attempted load of %1 failed as it had a Content-Disposition of attachment set."},
	//  ClipboardDisallowedWrite                                  : { code: 2191, message: "The Clipboard.generalClipboard object may only be written to as the result of user interaction, for example by a mouse click or button press."},
	//  MalformedUnicodeError                                     : { code: 2192, message: "An unpaired Unicode surrogate was encountered in the input."},
	//  SecurityContentAccessDeniedError                          : { code: 2193, message: "Security sandbox violation: %1: %2 cannot access %3."},
	//  LoaderParamError                                          : { code: 2194, message: "Parameter %1 cannot be a Loader."},
	//  LoaderAsyncError                                          : { code: 2195, message: "Error thrown as Loader called %1."},
	ObjectWithStringsParamError                               : { code: 2196, message: 'Parameter %1 must be an Object with only String values.' },
	//  SystemUpdaterPlayerNotSupportedError                      : { code: 2200, message: "The SystemUpdater class is not supported by this player."},
	//  SystemUpdaterOSNotSupportedError                          : { code: 2201, message: "The requested update type is not supported on this operating system."},
	//  SystemUpdaterBusy                                         : { code: 2202, message: "Only one SystemUpdater action is allowed at a time."},
	//  SystemUpdaterFailed                                       : { code: 2203, message: "The requested SystemUpdater action cannot be completed."},
	//  SystemUpdaterCannotCancel                                 : { code: 2204, message: "This operation cannot be canceled because it is waiting for user interaction."},
	//  SystemUpdaterUnknownTarget                                : { code: 2205, message: "Invalid update type %1."},
	//  SignedSWfLoadingError                                     : { code: 2500, message: "An error occurred decrypting the signed swf file. The swf will not be loaded."},
	//  NotScreenSharingError                                     : { code: 2501, message: "This property can only be accessed during screen sharing."},
	//  NotSharingMonitorError                                    : { code: 2502, message: "This property can only be accessed if sharing the entire screen."},
	//  FileBadPathName                                           : { code: 3000, message: "Illegal path name."},
	//  FileAccessDenied                                          : { code: 3001, message: "File or directory access denied."},
	//  FileExists                                                : { code: 3002, message: "File or directory exists."},
	//  FileDoesNotExist                                          : { code: 3003, message: "File or directory does not exist."},
	//  FileInsufficientSpace                                     : { code: 3004, message: "Insufficient file space."},
	//  FileSystemResources                                       : { code: 3005, message: "Insufficient system resources."},
	//  FileNotAFile                                              : { code: 3006, message: "Not a file."},
	//  FileNotADir                                               : { code: 3007, message: "Not a directory."},
	//  FileReadOnlyFileSys                                       : { code: 3008, message: "Read-only or write-protected media."},
	//  FileNotSameDevice                                         : { code: 3009, message: "Cannot move file or directory to a different device."},
	//  DirNotEmpty                                               : { code: 3010, message: "Directory is not empty."},
	//  FileDestinationExists                                     : { code: 3011, message: "Move or copy destination already exists."},
	//  FileCantDelete                                            : { code: 3012, message: "Cannot delete file or directory."},
	//  FileInUse                                                 : { code: 3013, message: "File or directory is in use."},
	//  FileCopyMoveAncestor                                      : { code: 3014, message: "Cannot copy or move a file or directory to overwrite a containing directory."},
	//  LoadBytesCodeExecutionSecurityError                       : { code: 3015, message: "Loader.loadBytes() is not permitted to load content with executable code."},
	//  FileApplicationNotFound                                   : { code: 3016, message: "No application was found that can open this file."},
	//  SQLConnectionCannotClose                                  : { code: 3100, message: "A SQLConnection cannot be closed while statements are still executing."},
	//  SQLConnectionAlreadyOpen                                  : { code: 3101, message: "Database connection is already open."},
	//  SQLConnectionInvalidName                                  : { code: 3102, message: "Name argument specified was invalid. It must not be null or empty."},
	//  SQLConnectionInTransaction                                : { code: 3103, message: "Operation cannot be performed while there is an open transaction on this connection."},
	//  SQLConnectionNotOpen                                      : { code: 3104, message: "A SQLConnection must be open to perform this operation."},
	//  SQLConnectionNoOpenTransaction                            : { code: 3105, message: "Operation is only allowed if a connection has an open transaction."},
	//  SQLStatementIsExecutingProperty                           : { code: 3106, message: "Property cannot be changed while SQLStatement.executing is true."},
	//  SQLStatementIvalidCall                                    : { code: 3107, message: "%1 may not be called unless SQLResult.complete is false."},
	//  SQLStatementInvalidText                                   : { code: 3108, message: "Operation is not permitted when the SQLStatement.text property is not set."},
	//  SQLStatementInvalidConnection                             : { code: 3109, message: "Operation is not permitted when the SQLStatement.sqlConnection property is not set."},
	//  SQLStatementIsExecutingCall                               : { code: 3110, message: "Operation cannot be performed while SQLStatement.executing is true."},
	//  SQLStatementInvalidSchemaType                             : { code: 3111, message: "An invalid schema type was specified."},
	//  SQLConnectionInvalidLockType                              : { code: 3112, message: "An invalid transaction lock type was specified."},
	//  SQLConnectionNotFileReference                             : { code: 3113, message: "Reference specified is not of type File."},
	//  SQLConnectionInvalidModeSpecified                         : { code: 3114, message: "An invalid open mode was specified."},
	//  SQLGeneralEngineError                                     : { code: 3115, message: "SQL Error."},
	//  SQLInternalEngineError                                    : { code: 3116, message: "An internal logic error occurred."},
	//  SQLPermissionError                                        : { code: 3117, message: "Access permission denied."},
	//  SQLOperationAbortedError                                  : { code: 3118, message: "Operation aborted."},
	//  SQLDatabaseLockedError                                    : { code: 3119, message: "Database file is currently locked."},
	//  SQLTableLockedError                                       : { code: 3120, message: "Table is locked."},
	//  SQLOutOfMemoryError                                       : { code: 3121, message: "Out of memory."},
	//  SQLDatabaseIsReadonlyError                                : { code: 3122, message: "Attempt to write a readonly database."},
	//  SQLDatabaseCorruptError                                   : { code: 3123, message: "Database disk image is malformed."},
	//  SQLDatabaseFullError                                      : { code: 3124, message: "Insertion failed because database is full."},
	//  SQLCannotOpenDatabaseError                                : { code: 3125, message: "Unable to open the database file."},
	//  SQLLockingProtocolError                                   : { code: 3126, message: "Database lock protocol error."},
	//  SQLDatabaseEmptyError                                     : { code: 3127, message: "Database is empty."},
	//  SQLDiskIOError                                            : { code: 3128, message: "Disk I/O error occurred."},
	//  SQLSchemaChangedError                                     : { code: 3129, message: "The database schema changed."},
	//  SQLTooMuchDataError                                       : { code: 3130, message: "Too much data for one row of a table."},
	//  SQLConstraintError                                        : { code: 3131, message: "Abort due to constraint violation."},
	//  SQLDataTypeMismatchError                                  : { code: 3132, message: "Data type mismatch."},
	//  SQLConcurrencyError                                       : { code: 3133, message: "An internal error occurred."},
	//  SQLNotSupportedOnOSError                                  : { code: 3134, message: "Feature not supported on this operating system."},
	//  SQLAuthorizationDeniedError                               : { code: 3135, message: "Authorization denied."},
	//  SQLAuxDatabaseFormatError                                 : { code: 3136, message: "Auxiliary database format error."},
	//  SQLBindingRangeError                                      : { code: 3137, message: "An index specified for a parameter was out of range."},
	//  SQLInvalidDatabaseFileError                               : { code: 3138, message: "File opened is not a database file."},
	//  SQLInvalidPageSizeError                                   : { code: 3139, message: "The page size specified was not valid for this operation."},
	//  SQLInvalidKeySizeError                                    : { code: 3140, message: "The encryption key size specified was not valid for this operation. Keys must be exactly 16 bytes in length"},
	//  SQLInvalidConfigurationError                              : { code: 3141, message: "The requested database configuration is not supported."},
	//  SQLCannotRekeyNonKeyedDatabase                            : { code: 3143, message: "Unencrypted databases may not be reencrypted."},
	//  NativeWindowClosedError                                   : { code: 3200, message: "Cannot perform operation on closed window."},
	//  PDFNoReaderInstalled                                      : { code: 3201, message: "Adobe Reader cannot be found."},
	//  PDFOldReaderInstalled                                     : { code: 3202, message: "Adobe Reader 8.1 or later cannot be found."},
	//  PDFOldDefaultText                                         : { code: 3203, message: "Default Adobe Reader must be version 8.1 or later."},
	//  PDFCannotLoadReader                                       : { code: 3204, message: "An error ocurred trying to load Adobe Reader."},
	//  ApplicationFeatureSecurityError                           : { code: 3205, message: "Only application-sandbox content can access this feature."},
	//  LoaderInfoDoorSecurityError                               : { code: 3206, message: "Caller %1 cannot set LoaderInfo property %2."},
	//  ApplicationNonFeatureSecurityError                        : { code: 3207, message: "Application-sandbox content cannot access this feature."},
	//  InvalidClipboardAccess                                    : { code: 3208, message: "Attempt to access invalid clipboard."},
	//  DeadClipboardAccess                                       : { code: 3209, message: "Attempt to access dead clipboard."},
	//  DeadJavaScriptObjectAccess                                : { code: 3210, message: "The application attempted to reference a JavaScript object in a HTML page that is no longer loaded."},
	//  FilePromiseIOError                                        : { code: 3211, message: "Drag and Drop File Promise error: %1"},
	//  NativeProcessNotRunning                                   : { code: 3212, message: "Cannot perform operation on a NativeProcess that is not running."},
	//  NativeProcessAlreadyRunning                               : { code: 3213, message: "Cannot perform operation on a NativeProcess that is already running."},
	//  NativeProcessBadExecutable                                : { code: 3214, message: "NativeProcessStartupInfo.executable does not specify a valid executable file."},
	//  NativeProcessBadWorkingDirectory                          : { code: 3215, message: "NativeProcessStartupInfo.workingDirectory does not specify a valid directory."},
	//  NativeProcessStdOutReadError                              : { code: 3216, message: "Error while reading data from NativeProcess.standardOutput."},
	//  NativeProcessStdErrReadError                              : { code: 3217, message: "Error while reading data from NativeProcess.standardError."},
	//  NativeProcessStdInWriteError                              : { code: 3218, message: "Error while writing data to NativeProcess.standardInput."},
	//  NativeProcessNotStarted                                   : { code: 3219, message: "The NativeProcess could not be started. '%1'"},
	//  ActionNotAllowedSecurityError                             : { code: 3220, message: "Action '%1' not allowed in current security context '%2'."},
	//  SWFNoPlayerInstalled                                      : { code: 3221, message: "Adobe Flash Player cannot be found."},
	//  SWFOldPlayerInstalled                                     : { code: 3222, message: "The installed version of Adobe Flash Player is too old."},
	//  DNSResolverLookupError                                    : { code: 3223, message: "DNS lookup error: platform error %1"},
	//  SocketMessageTooLongError                                 : { code: 3224, message: "Socket message too long"},
	//  SocketCannotSendDataToAddressAfterConnect                 : { code: 3225, message: "Cannot send data to a location when connected."},
	AllowCodeImportError                                      : { code: 3226, message: 'Cannot import a SWF file when LoaderContext.allowCodeImport is false.' },
	//  BackgroundLaunchError                                     : { code: 3227, message: "Cannot launch another application from background."},
	//  StageWebViewLoadError                                     : { code: 3228, message: "StageWebView encountered an error during the load operation."},
	//  StageWebViewProtocolNotSupported                          : { code: 3229, message: "The protocol is not supported.:"},
	//  BrowseOperationUnsupported                                : { code: 3230, message: "The browse operation is unsupported."},
	//  InvalidVoucher                                            : { code: 3300, message: "Voucher is invalid."},
	//  AuthenticationFailed                                      : { code: 3301, message: "User authentication failed."},
	//  RequireSSLError                                           : { code: 3302, message: "Flash Access server does not support SSL."},
	//  ContentExpiredError                                       : { code: 3303, message: "Content expired."},
	//  AuthorizationFailed                                       : { code: 3304, message: "User authorization failed (for example, the user has not purchased the content)."},
	//  ServerConnectionFailed                                    : { code: 3305, message: "Can't connect to the server."},
	//  ClientUpdateRequired                                      : { code: 3306, message: "Client update required (Flash Access server requires new client)."},
	//  InternalError                                             : { code: 3307, message: "Generic internal Flash Access failure."},
	//  WrongVoucherKey                                           : { code: 3308, message: "Wrong voucher key."},
	//  CorruptedFLV                                              : { code: 3309, message: "Video content is corrupted."},
	//  AppIDMismatch                                             : { code: 3310, message: "The AIR application or Flash Player SWF does not match the one specified in the DRM policy."},
	//  AppVersionMismatch                                        : { code: 3311, message: "The version of the application does not match the one specified in the DRM policy."},
	//  VoucherIntegrityError                                     : { code: 3312, message: "Verification of voucher failed."},
	//  WriteFileSystemFailed                                     : { code: 3313, message: "Write to the file system failed."},
	//  FLVHeaderIntegrityFailed                                  : { code: 3314, message: "Verification of FLV/F4V header file failed."},
	PermissionDenied                                          : { code: 3315, message: 'The current security context does not allow this operation.' },
	//  LocalConnectionUserScopedLocked                           : { code: 3316, message: "The value of LocalConnection.isPerUser cannot be changed because it has already been locked by a call to LocalConnection.connect, .send, or .close."},
	//  LoadAdobeCPFailed                                         : { code: 3317, message: "Failed to load Flash Access module."},
	//  IncompatibleAdobeCPVersion                                : { code: 3318, message: "Incompatible version of Flash Access module found."},
	//  MissingAdobeCPEntryPoint                                  : { code: 3319, message: "Missing Flash Access module API entry point."},
	//  InternalErrorHA                                           : { code: 3320, message: "Generic internal Flash Access failure."},
	//  IndividualizationFailed                                   : { code: 3321, message: "Individualization failed."},
	//  DeviceBindingFailed                                       : { code: 3322, message: "Device binding failed."},
	//  CorruptStore                                              : { code: 3323, message: "The internal stores are corrupted."},
	//  MachineTokenInvalid                                       : { code: 3324, message: "Reset license files and the client will fetch a new machine token."},
	//  CorruptServerStateStore                                   : { code: 3325, message: "Internal stores are corrupt."},
	//  TamperingDetected                                         : { code: 3326, message: "Call customer support."},
	//  ClockTamperingDetected                                    : { code: 3327, message: "Clock tampering detected."},
	//  ServerErrorTryAgain                                       : { code: 3328, message: "Server error; retry the request."},
	//  ApplicationSpecificError                                  : { code: 3329, message: "Error in application-specific namespace."},
	//  NeedAuthentication                                        : { code: 3330, message: "Need to authenticate the user and reacquire the voucher."},
	//  ContentNotYetValid                                        : { code: 3331, message: "Content is not yet valid."},
	//  CachedVoucherExpired                                      : { code: 3332, message: "Cached voucher has expired. Reacquire the voucher from the server."},
	//  PlaybackWindowExpired                                     : { code: 3333, message: "The playback window for this policy has expired."},
	//  InvalidDRMPlatform                                        : { code: 3334, message: "This platform is not allowed to play this content."},
	//  InvalidDRMVersion                                         : { code: 3335, message: "Invalid version of Flash Access module. Upgrade AIR or Flash Access module for the Flash Player."},
	//  InvalidRuntimePlatform                                    : { code: 3336, message: "This platform is not allowed to play this content."},
	//  InvalidRuntimeVersion                                     : { code: 3337, message: "Upgrade Flash Player or AIR  and retry playback."},
	//  UnknownConnectionType                                     : { code: 3338, message: "Unknown connection type."},
	//  NoAnalogPlaybackAllowed                                   : { code: 3339, message: "Can't play back on analog device. Connect to a digital device."},
	//  NoAnalogProtectionAvail                                   : { code: 3340, message: "Can't play back because connected analog device doesn't have the correct capabilities."},
	//  NoDigitalPlaybackAllowed                                  : { code: 3341, message: "Can't play back on digital device."},
	//  NoDigitalProtectionAvail                                  : { code: 3342, message: "The connected digital device doesn't have the correct capabilities."},
	InternalErrorIV                                           : { code: 3343, message: 'Internal Error.' }
	//  MissingAdobeCPModule                                      : { code: 3344, message: "Missing Flash Access module."},
	//  DRMNoAccessError                                          : { code: 3345, message: "This operation is not permitted with content protected using Flash Access."},
	//  DRMDataMigrationFailed                                    : { code: 3346, message: "Failed migrating local DRM data, all locally cached DRM vouchers are lost."},
	//  DRMInsufficientDeviceCapabilites                          : { code: 3347, message: "The device does not meet the Flash Access server's playback device constraints."},
	//  DRMHardStopIntervalExpired                                : { code: 3348, message: "This protected content is expired."},
	//  DRMServerVersionTooHigh                                   : { code: 3349, message: "The Flash Access server is running at a version that's higher than the max supported by this runtime."},
	//  DRMServerVersionTooLow                                    : { code: 3350, message: "The Flash Access server is running at a version that's lower than the min supported by this runtime."},
	//  DRMDeviceGroupTokenInvalid                                : { code: 3351, message: "Device Group registration token is corrupted, please refresh the token by registering again to the DRMDeviceGroup."},
	//  DRMDeviceGroupTokenTooOld                                 : { code: 3352, message: "The server is using a newer version of the registration token for this Device Group. Please refresh the token by registering again to the DRMDeviceGroup."},
	//  DRMDeviceGroupTokenTooNew                                 : { code: 3353, message: "the server is using an older version of the registration token for this Device Group."},
	//  DRMDeviceGroupTokenExpired                                : { code: 3354, message: "Device Group registration is expired, please refresh the token by registering again to the DRMDeviceGroup."},
	//  JoinDRMDeviceGroupFailed                                  : { code: 3355, message: "The server denied this Device Group registration request."},
	//  DRMVoucherHasNoCorrespondingRoot                          : { code: 3356, message: "The root voucher for this content's DRMVoucher was not found."},
	//  NoValidEmbeddedDRMVoucher                                 : { code: 3357, message: "The DRMContentData provides no valid embedded voucher and no Flash Access server url to acquire the voucher from."},
	//  NoACPProtectionAvailable                                  : { code: 3358, message: "ACP protection is not available on the device but required to playback the content."},
	//  NoCGMSAProtectionAvailable                                : { code: 3359, message: "CGMSA protection is not available on the device but required to playback the content."},
	//  DRMDeviceGroupRegistrationRequired                        : { code: 3360, message: "Device Group registration is required before doing this operation."},
	//  DeviceIsNotRegisteredToDRMDeviceGroup                     : { code: 3361, message: "The device is not registered to this Device Group."},
	//  ScriptBridgeError                                         : { code: 3400, message: "An error occured while executing JavaScript code."},
	//  ScriptBridgeNameAccessSecurityError                       : { code: 3401, message: "Security sandbox violation: An object with this name has already been registered from another security domain."},
	//  ScriptBridgeBrowserAccessSecurityError                    : { code: 3402, message: "Security sandbox violation: Bridge caller %1 cannot access %2."},
	//  ExtensionContextNoSuchMethod                              : { code: 3500, message: "The extension context does not have a method with the name %1."},
	//  ExtensionContextAlreadyDisposed                           : { code: 3501, message: "The extension context has already been disposed."},
	//  ExtensionContextInvalidReturnValue                        : { code: 3502, message: "The extension returned an invalid value."},
	//  ExtensionContextInvalidState                              : { code: 3503, message: "The extension was left in an invalid state."},
	//  NoValidProgramSet                                         : { code: 3600, message: "No valid program set."},
	//  NoValidIndexBufferSet                                     : { code: 3601, message: "No valid index buffer set."},
	//  SanityCheckOnParametersFailed                             : { code: 3602, message: "Sanity check on parameters failed, %1 triangles and %2 index offset."},
	//  NotEnoughIndicesInThisBuffer                              : { code: 3603, message: "Not enough indices in this buffer. %1 triangles at offset %2, but there are only %3 indices in buffer."},
	//  SampleBindsTextureAlsoBoundToRender                       : { code: 3604, message: "Sampler %1 binds a texture that is also bound for render to texture."},
	//  SampleBindsInvalidTexture                                 : { code: 3605, message: "Sampler %1 binds an invalid texture."},
	//  SamplerFormatDoesNotMatchTextureFormat                    : { code: 3606, message: "Sampler %1 format does not match texture format."},
	//  StreamIsNotUsed                                           : { code: 3607, message: "Stream %1 is set but not used by the current vertex program."},
	//  StreamIsInvalid                                           : { code: 3608, message: "Stream %1 is invalid."},
	//  StreamDoesNotHaveEnoughVertices                           : { code: 3609, message: "Stream %1 does not have enough vertices."},
	//  StreamVertexOffsetOutOfBounds                             : { code: 3610, message: "Stream %1 vertex offset is out of bounds"},
	//  StreamReadButNotSet                                       : { code: 3611, message: "Stream %1 is read by the current vertex program but not set."},
	//  ProgramMustBeLittleEndian                                 : { code: 3612, message: "Programs must be in little endian format."},
	//  NativeShaderCompilationFailed                             : { code: 3613, message: "The native shader compilation failed."},
	//  NativeShaderCompilationFailedOpenGL                       : { code: 3614, message: "The native shader compilation failed.enGL specific: %1"},
	//  AgalProgramTooSmall                                       : { code: 3615, message: "AGAL validation failed: Program size below minimum length for %1 program."},
	//  NotAnAgalProgram                                          : { code: 3616, message: "AGAL validation failed: Not an AGAL program. Wrong magic byte for %1 program."},
	//  BadAgalVersion                                            : { code: 3617, message: "AGAL validation failed: Bad AGAL version for %1 program. Current version is %2."},
	//  BadAgalProgramType                                        : { code: 3618, message: "AGAL validation failed: Bad AGAL program type identifier for %1 program."},
	//  BadAgalShadertype                                         : { code: 3619, message: "AGAL validation failed: Shader type must be either fragment or vertex for %1 program."},
	//  InvalidAgalOpcodeOutOfRange                               : { code: 3620, message: "AGAL validation failed: Invalid opcode, value out of range: %2 at token %3 of %1 program."},
	//  InvalidAgalOpcodeNotImplemented                           : { code: 3621, message: "AGAL validation failed: Invalid opcode, %2 is not implemented in this version at token %3 of %1 program."},
	//  AgalOpcodeOnlyAllowedInFragmentProgram                    : { code: 3622, message: "AGAL validation failed: Opcode %2 only allowed in fragment programs at token %3 of %1 program."},
	//  OpenConditionNesting                                      : { code: 3623, message: "AGAL validation failed: Open condition nesting (close without open) at token %2 of %1 program."},
	//  ConditionNestingTooDeep                                   : { code: 3624, message: "AGAL validation failed: Condition nesting (%2) too deep at token %3 of %1 program."},
	//  BadAgalSourceOperands                                     : { code: 3625, message: "AGAL validation failed: Bad AGAL source operands. Both are constants (this must be precomputed) at token %2 of %1 program."},
	//  BothOperandsAreIndirectReads                              : { code: 3626, message: "AGAL validation failed: Opcode %2, both operands are indirect reads at token %3 of %1 program."},
	//  OpcodeDestinationMustBeAllZero                            : { code: 3627, message: "AGAL validation failed: Opcode %2 destination operand must be all zero at token %3 of %1 program."},
	//  OpcodeDestinationMustUseMask                              : { code: 3628, message: "AGAL validation failed: The destination operand for the %2 instruction must mask w (use .xyz or less) at token %3 of %1 program."},
	//  TooManyTokens                                             : { code: 3629, message: "AGAL validation failed: Too many tokens (%2) for %1 program."},
	//  FragmentShaderType                                        : { code: 3630, message: "Fragment shader type is not fragment."},
	//  VertexShaderType                                          : { code: 3631, message: "Vertex shader type is not vertex."},
	//  VaryingReadButNotWrittenTo                                : { code: 3632, message: "AGAL linkage: Varying %1 is read in the fragment shader but not written to by the vertex shader."},
	//  VaryingPartialWrite                                       : { code: 3633, message: "AGAL linkage: Varying %1 is only partially written to. Must write all four components."},
	//  FragmentWriteAllComponents                                : { code: 3634, message: "AGAL linkage: Fragment output needs to write to all components."},
	//  VertexWriteAllComponents                                  : { code: 3635, message: "AGAL linkage: Vertex output needs to write to all components."},
	//  UnusedOperand                                             : { code: 3636, message: "AGAL validation failed: Unused operand is not set to zero for %2 at token %3 of %1 program."},
	//  SamplerRegisterOnlyInFragment                             : { code: 3637, message: "AGAL validation failed: Sampler registers only allowed in fragment programs for %2 at token %3 of %1 program."},
	//  SamplerRegisterSecondOperand                              : { code: 3638, message: "AGAL validation failed: Sampler register only allowed as second operand in texture instructions for %2 at token %3 of %1 program."},
	//  IndirectOnlyAllowedInVertex                               : { code: 3639, message: "AGAL validation failed: Indirect addressing only allowed in vertex programs for %2 at token %3 of %1 program."},
	//  IndirectOnlyIntoConstantRegisters                         : { code: 3640, message: "AGAL validation failed: Indirect addressing only allowed into constant registers for %2 at token %3 of %1 program."},
	//  IndirectNotAllowed                                        : { code: 3641, message: "AGAL validation failed: Indirect addressing not allowed for this operand in this instruction for %2 at token %3 of %1 program."},
	//  IndirectSourceType                                        : { code: 3642, message: "AGAL validation failed: Indirect source type must be attribute, constant or temporary for %2 at token %3 of %1 program."},
	//  IndirectAddressingFieldsMustBeZero                        : { code: 3643, message: "AGAL validation failed: Indirect addressing fields must be zero for direct adressing for %2 at token %3 of %1 program."},
	//  VaryingRegistersOnlyReadInFragment                        : { code: 3644, message: "AGAL validation failed: Varying registers can only be read in fragment programs for %2 at token %3 of %1 program."},
	//  AttributeRegistersOnlyReadInVertex                        : { code: 3645, message: "AGAL validation failed: Attribute registers can only be read in vertex programs for %2 at token %3 of %1 program."},
	//  CanNotReadOutputRegister                                  : { code: 3646, message: "AGAL validation failed: Can not read from output register for %2 at token %3 of %1 program."},
	//  TempRegisterReadWithoutWrite                              : { code: 3647, message: "AGAL validation failed: Temporary register read without being written to for %2 at token %3 of %1 program."},
	//  TempRegisterComponentReadWithoutWrite                     : { code: 3648, message: "AGAL validation failed: Temporary register component read without being written to for %2 at token %3 of %1 program."},
	//  SamplerRegisterCannotBeWrittenTo                          : { code: 3649, message: "AGAL validation failed: Sampler registers can not be written to for %2 at token %3 of %1 program."},
	//  VaryingRegistersWrite                                     : { code: 3650, message: "AGAL validation failed: Varying registers can only be written in vertex programs for %2 at token %3 of %1 program."},
	//  AttributeRegisterCannotBeWrittenTo                        : { code: 3651, message: "AGAL validation failed: Attribute registers can not be written to for %2 at token %3 of %1 program."},
	//  ConstantRegisterCannotBeWrittenTo                         : { code: 3652, message: "AGAL validation failed: Constant registers can not be written to for %2 at token %3 of %1 program."},
	//  DestinationWritemaskIsZero                                : { code: 3653, message: "AGAL validation failed: Destination writemask is zero for %2 at token %3 of %1 program."},
	//  AGALReservedBitsShouldBeZero                              : { code: 3654, message: "AGAL validation failed: Reserve bits should be zero for %2 at token %3 of %1 program."},
	//  UnknownRegisterType                                       : { code: 3655, message: "AGAL validation failed: Unknown register type for %2 at token %3 of %1 program."},
	//  SamplerRegisterOutOfBounds                                : { code: 3656, message: "AGAL validation failed: Sampler register index out of bounds for %2 at token %3 of %1 program."},
	//  VaryingRegisterOutOfBounds                                : { code: 3657, message: "AGAL validation failed: Varying register index out of bounds for %2 at token %3 of %1 program."},
	//  AttributeRegisterOutOfBounds                              : { code: 3658, message: "AGAL validation failed: Attribute register index out of bounds for %2 at token %3 of %1 program."},
	//  ConstantRegisterOutOfBounds                               : { code: 3659, message: "AGAL validation failed: Constant register index out of bounds for %2 at token %3 of %1 program."},
	//  OutputRegisterOutOfBounds                                 : { code: 3660, message: "AGAL validation failed: Output register index out of bounds for %2 at token %3 of %1 program."},
	//  TemporaryRegisterOutOfBounds                              : { code: 3661, message: "AGAL validation failed: Temporary register index out of bounds for %2 at token %3 of %1 program."},
	//  CubeMapSamplerMustUseClamp                                : { code: 3662, message: "AGAL validation failed: Cube map samplers must set wrapping to clamp mode for %2 at token %3 of %1 program."},
	//  SampleBindsUndefinedTexture                               : { code: 3663, message: "Sampler %1 binds an undefined texture."},
	//  UnknownSamplerDimension                                   : { code: 3664, message: "AGAL validation failed: Unknown sampler dimension %4 for %2 at token %3 of %1 program."},
	//  UnknownFilterMode                                         : { code: 3665, message: "AGAL validation failed: Unknown filter mode in sampler: %4 for %2 at token %3 of %1 program."},
	//  UnknownMipmapMode                                         : { code: 3666, message: "AGAL validation failed: Unknown mipmap mode in sampler: %4 for %2 at token %3 of %1 program."},
	//  UnknownWrappingMode                                       : { code: 3667, message: "AGAL validation failed: Unknown wrapping mode in sampler: %4 for %2 at token %3 of %1 program."},
	//  UnknownSpecialFlag                                        : { code: 3668, message: "AGAL validation failed: Unknown special flag used in sampler: %4 for %2 at token %3 of %1 program."},
	//  BadInputSize                                              : { code: 3669, message: "Bad input size."},
	//  BufferTooBig                                              : { code: 3670, message: "Buffer too big."},
	//  BufferHasZeroSize                                         : { code: 3671, message: "Buffer has zero size."},
	//  BufferCreationFailed                                      : { code: 3672, message: "Buffer creation failed. Internal error."},
	//  InvalidCubeSide                                           : { code: 3673, message: "Cube side must be [0..5]."},
	//  MiplevelTooLarge                                          : { code: 3674, message: "Miplevel too large."},
	//  TextureFormatMismatch                                     : { code: 3675, message: "Texture format mismatch."},
	//  PlatformDoesNotSupportTextureFormat                       : { code: 3676, message: "Platform does not support desired texture format."},
	//  TextureDecodingFailed                                     : { code: 3677, message: "Texture decoding failed. Internal error."},
	//  TextureNeedsToBeSquare                                    : { code: 3678, message: "Texture needs to be square."},
	//  TextureSizeDoesNotMatch                                   : { code: 3679, message: "Texture size does not match."},
	//  DepthTextureNotImplemented                                : { code: 3680, message: "Depth texture not implemented yet."},
	//  TextureSizeIsZero                                         : { code: 3681, message: "Texture size is zero."},
	//  TextureNotPowerOfTwo                                      : { code: 3682, message: "Texture size not a power of two."},
	//  TextureTooBig                                             : { code: 3683, message: "Texture too big (max is 2048x2048)."},
	//  TextureCreationFailed                                     : { code: 3684, message: "Texture creation failed. Internal error."},
	//  CouldNotCreateRenderer                                    : { code: 3685, message: "Could not create renderer."},
	//  DisabledFormatNeedsNullVertexBuffer                       : { code: 3686, message: "'disabled' format only valid with a null vertex buffer."},
	//  NullVertexBufferNeedsDisabledFormat                       : { code: 3687, message: "Null vertex buffers require the 'disabled' format."},
	//  NeedListenerToRequestContext                              : { code: 3688, message: "You must add an event listener for the context3DCreate event before requesting a new Context3D."},
	//  CantSwizzle2ndSource                                      : { code: 3689, message: "You can not swizzle second operand for %2 at token %3 of %1 program."},
	//  TooManyDrawCalls                                          : { code: 3690, message: "Too many draw calls before calling present."},
	//  ResourceLimitExceeded                                     : { code: 3691, message: "Resource limit for this resource type exceeded."},
	//  NeedToClearBeforeDraw                                     : { code: 3692, message: "All buffers need to be cleared every frame before drawing."},
	//  SecondOperandMustBeSamplerRegister                        : { code: 3693, message: "AGAL validation failed: Sampler register must be used for second operand in texture instructions for %2 at token %3 of %1 program."},
	//  ObjectDisposed                                            : { code: 3694, message: "The object was disposed by an earlier call of dispose() on it."},
	//  SameTextureNeedsSameSamplerParams                         : { code: 3695, message: "A texture can only be bound to multiple samplers if the samplers also have the exact same properties. Mismatch at samplers %1 and %2."},
	//  SecondUseOfSamplerMustHaveSameParams                      : { code: 3696, message: "AGAL validation failed: Second use of sampler register needs to specify the exact same properties. At token %3 of %1 program."},
	//  TextureBoundButNotUsed                                    : { code: 3697, message: "A texture is bound on sampler %1 but not used by the fragment program."},
	//  BackBufferNotConfigured                                   : { code: 3698, message: "The back buffer is not configured."},
	//  OperationFailed                                           : { code: 3699, message: "Requested Operation failed to complete"},
	//  TextureMipchainIsNotComplete                              : { code: 3700, message: "A texture sampler binds an incomplete texture. Make sure to upload(). All miplevels are required when mipmapping is enabled."},
	//  OutputColorNotMaskable                                    : { code: 3701, message: "The output color register can not use a write mask. All components must be written."},
	//  Context3DNotAvailable                                     : { code: 3702, message: "Context3D not available."},
	//  SwizzleMustBeScalar                                       : { code: 3703, message: "AGAL validation failed: Source swizzle must be scalar (one of: xxxx, yyyy, zzzz, wwww) for %2 at token %3 of %1 program."},
	//  CubeMapSamplerMustUseMipmap                               : { code: 3704, message: "AGAL validation failed: Cube map samplers must enable mipmapping for %2 at token %3 of %1 program."}
};
