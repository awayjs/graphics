import { IDataDecoder } from './utilities';

interface DecompressionStream extends ReadableStream<any> {
	writable: WritableStream;
	readable: ReadableStream;

	new(type: 'deflate'): DecompressionStream
}

declare global {
	interface Window {
		DecompressionStream: DecompressionStream;
	}
}

export class NativeDeflate implements IDataDecoder {
	public isDone = false;

	private _reader: ReadableStreamDefaultReader<Uint8Array>;
	private _writer: WritableStreamDefaultWriter;
	private _buffer: Uint8Array;
	private _isRunned = false;
	private _blockPosition: number = 0;

	public get closed() {
		return !this._isRunned && this.isDone;
	}

	constructor(
		private _verHeader: boolean,
		private _size: number) {

		if (_verHeader) {
			this._size -= 8;
		} else {
			//throw 'Native not support deflate without header';
		}

		if (!NativeDeflate.isSupported) {
			throw 'DecompressionStream is not supported!';
		}

		const decoder = new self.DecompressionStream('deflate');

		this._writer = decoder.writable.getWriter();
		this._reader = decoder.readable.getReader();
		this._buffer = new Uint8Array(_size);

		this._processBlocks = this._processBlocks.bind(this);
	}

	// check that decoding stream is supported
	public static get isSupported() {
		return ('DecompressionStream' in self);
	}

	private _processBlocks ({ done, value }: ReadableStreamReadResult<Uint8Array>) {
		const reader = this._reader;

		if (value) {
			if (value.length >= this._size) {
				this._buffer = value;
				this._blockPosition = this._size;
			} else {
				this._buffer.set(value, this._blockPosition);
				this._blockPosition += value.length;
			}
		}

		if (done || this._blockPosition >= this._size) {
			this.isDone = true;
			this.onData && this.onData(this._buffer);
			return this._buffer;
		}

		return reader.read().then(this._processBlocks);
	}

	onData: (data: Uint8Array) => void;
	onError: (e: any) => void = (_e: any) => {};

	push(data: Uint8Array) {
		// header
		if (data.length === 8) {
			// header
			this.onData && this.onData(data);
			return;
		}

		this._writer.write(data);

		if (!this._isRunned) {
			this._isRunned = true;
			this._reader.read()
				.then(this._processBlocks)
				.catch(this.onError);
		}
	}

	close() {
		if (this._isRunned && this.isDone) {
			this._writer.close();
			this._isRunned = false;
		}
	}

}