import * as Tess2TS from 'tess2-ts';
import createTess2Wasm, { ITess as ITessWasm, ITessOptions } from 'tess2-wasm';
import { IResult } from '../draw/WorkerTesselatorBody';

export class TessAsyncService {
	private static _instance: TessAsyncService;
	public static get instance() {
		return this._instance || (this._instance = new TessAsyncService());
	}

	public readonly name = 'tessWasm';
	public status:  'pending' | 'error' | 'done' = 'pending';
	public module: ITessWasm = null;
	private _process: ITessWasm;

	public tesselate (
		options: ITessOptions & { contours: ArrayLike<number> | ArrayLike<ArrayLike<number>> }
	): IResult {
		try {
			const proc = this._process = new this.module();
			proc.addContours(options.contours);
			return <any>proc.tesselate(options);
		} catch (e) {
			this.status = 'error';
			throw e;
		}
	}

	public dispose() {
		if (!this._process) {
			return;
		}

		this._process.dispose();
		this._process = null;
	}

	public init(): Promise<void> {
		if (this.module) {
			return Promise.resolve();
		}

		if (!self.WebAssembly) {
			console.warn('[Tess Wasm] Wasm not supported');
			return Promise.reject('[Tess Wasm] Wasm not supported');
		}

		return createTess2Wasm()
			.then(
				({ Tess }) =>{
					this.module = Tess;
					this.status = 'done';
				},
				(err) => {
					this.status = 'error';
					console.warn('[Tess Wasm] Error while spawn TessWasm', err);
				}
			);
	}
}

export class Tess2Provider {
	public static tesselate(
		options: ITessOptions & { contours: Array<number> | Array<Array<number>> }
	): IResult {

		if (TessAsyncService.instance.status === 'pending') {
			console.debug('[GraphicsFactoryFills] WASM Tess not loaded, JS will used.');
			return Tess2TS.tesselate(<any> options);
		}

		try {
			return TessAsyncService.instance.tesselate(options);
		} catch (e) {
			console.warn('[GraphicsFactoryFills] Tess2Wasm crash, downgrade to JS', e.message, options);
			return Tess2TS.tesselate(<any> options);
		}
	}

	public static dispose() {
		TessAsyncService.instance.dispose();
	}
}