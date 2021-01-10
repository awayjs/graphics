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
	private _reader: ReadableStreamDefaultReader;
	private _writer: WritableStreamDefaultWriter;
	private _buffer: Uint8Array;
	public isDone = false;
	private _isRunned = false;

	public get closed() {
		return !this._isRunned && this.isDone;
	}

	constructor(
		private verHeader: boolean,
		private _size: number) {

		const decoder = new self.DecompressionStream('deflate');
		this._writer = decoder.writable.getWriter();
		this._reader = decoder.readable.getReader();
		this._buffer = new Uint8Array(_size);
	}

	// check that decoding stream is supported
	public static get isSupported() {
		return ('DecompressionStream' in self);
	}

	private _run(): Promise<Uint8Array> {
		let offset = 0;
		const that = this;

		return new Promise((res, rej) => {
			this._reader.read()
				.then(function next({ done, value }) {

					if (value) {
						that._buffer.set(value, offset);
						//console.debug('[NativeDeflate] Decoded chunk:', offset);

						offset += value.length;
					}

					if (done || offset >= that._size) {
						that.isDone = true;
						res(that._buffer);

						//console.debug('[NativeDeflate] Decoder closed:', offset);
						return;
					}

					return that._reader.read().then(next);
				})
				.catch(rej);
		});
	}

	onData: (data: Uint8Array) => void;
	onError: (e: any) => void;

	push(data: Uint8Array) {
		if (data.length === 8) {
			// header
			this.onData && this.onData(data);
			return;
		}

		this._writer.ready.then(()=>{
			return this._writer.write(data);
		}).catch((e) =>  {
			this.onError && this.onError(e);
		});

		if (!this._isRunned) {
			this._isRunned = true;
			this._run()
				.then((buff) => {
					this.onData && this.onData(buff);
					this.close();
				})
				.catch(e => this.onError && this.onError(e));
		}
	}

	close() {
		if (this._isRunned && this.isDone) {
			this._writer.close();
			this._isRunned = false;
		}
	}

}