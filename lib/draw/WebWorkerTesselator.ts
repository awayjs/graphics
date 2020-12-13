import { GraphicsFactoryFills } from './GraphicsFactoryFills';
import { GraphicsPath } from './GraphicsPath';
import {
	WORKER_BODY,
	TesselatorTaskError,
	TesselatorTaskResult,
	TesselatorMessage,
	TesselatorTaskInput
} from './WorkerTesselatorBody';

export interface TesselatorTask {
	resolve: ResultCallback;
	reject: ErrorCallback;
	id: number;
}

type ResultCallback = (data: TesselatorTaskResult) => void;
type ErrorCallback = (reason: TesselatorTaskError) => void;

type NamedWorker = Worker & {name?: string};
export class WebWorkerTessealtor {
	public static TESS_URL = 'https://cdn.jsdelivr.net/npm/tess2-ts@1.0.5/dist/tess2.min.js';

	private static TASK_ID = 0;
	private static MAX_TASK = 8;
	private static tasks: NumberMap<TesselatorTask> = {};
	private static workers: NamedWorker[] = [];
	private static freeWorkers: NamedWorker[] = [];
	private static anyCallback: (w: NamedWorker) => void;
	private static busyWaiter: Promise<any>;

	public static prefarmWorkers(): Promise<void> {
		for (let i = 0; i < this.MAX_TASK; i++) {
			this.workers.push(this.generateWorker('' + i));
		}

		return this.waitFreeWorker().then(() => void 0);
	}

	private static onError(error: ErrorEvent) {
		console.error(error.target, error.message);
	}

	private static onData(result: Omit<MessageEvent, 'data'> & {data: TesselatorMessage }) {

		switch (result.data.status) {
			case 'ready': {
				//console.debug('[WorkerTesselator] Runed succesfylly! ', result.target);
				break;
			}

			case 'done': {
				this.tasks[result.data.id].resolve(result.data);
				this.tasks[result.data.id] = null;
				//console.debug('[WorkerTesselator] Task reached back succesfylly! ', result.target);
				break;
			}

			case 'error': {
				this.tasks[result.data.id].reject(result.data);
				this.tasks[result.data.id] = null;
				//console.error('[WorkerTesselator] Task reached with error! ', result.data);

				break;
			}

			default: {
				throw 'Unknown worker answer:' + result.data;
			}
		}

		this.freeWorkers.push(<NamedWorker>result.target);
		this.anyCallback && this.anyCallback(<NamedWorker>result.target);
		this.anyCallback = null;
		this.busyWaiter = null;
	}

	private static waitFreeWorker(): Promise<NamedWorker> {
		if (this.freeWorkers.length > 0) {
			return Promise.resolve(this.freeWorkers[0]);
		}

		if (this.busyWaiter) {
			return this.busyWaiter;
		}

		return this.busyWaiter = new Promise((res: (w: NamedWorker) => void)=>{
			this.anyCallback = res;
		});
	}

	private static generateWorker(id: string = ''): Worker {
		let source = WORKER_BODY.toString();
		const b0 = source.indexOf('{');
		const b1 = source.lastIndexOf('}');

		source = source.substring(b0 + 1, b1);
		source = source.replace('__TESS__LIB__', this.TESS_URL);

		const url = URL.createObjectURL(new Blob([source]));
		const worker = <NamedWorker> new Worker(url, { name: 'Tesselator_worker_' + id });

		worker.name = 'Tesselator_worker_' + id;
		worker.onmessage = this.onData.bind(this);
		worker.onerror = this.onError.bind(this);

		URL.revokeObjectURL(url);

		return worker;
	}

	public static tesselatedWorker(path: GraphicsPath): Promise<TesselatorTaskResult | TesselatorTaskError> {
		const id = this.TASK_ID++;
		const contours = GraphicsFactoryFills.prepareContours(
			path,
			GraphicsFactoryFills.USE_TESS_FIX);

		const scaleRatio = GraphicsFactoryFills.USE_TESS_FIX
			? GraphicsFactoryFills.TESS_SCALE
			: 1;

		let size = 0;

		contours.forEach((e) => size += e.length);

		if (size < 6) {
			return Promise.reject(
				{
					status: 'error',
					error: 'Invalid shape',
					id,
				});
		}

		return this.waitFreeWorker().then((w: NamedWorker) => {
			const store = new Float32Array(size);
			const bufferContours: Array<Float32Array> = [];

			let next = 0;

			for (const c of contours) {
				const buffer = store.subarray(next, c.length + next);

				buffer.set(c);
				bufferContours.push(buffer);

				next += c.length;
			}

			return new Promise((resolve: ResultCallback, reject: ErrorCallback) => {
				this.tasks[id] = {
					resolve, reject, id
				};

				w.postMessage(<TesselatorTaskInput> {
					scaleRatio,
					contours: bufferContours,
					vertexSize: 2,
					polySize: 3,
					elementType: 0, // POLYGONS
					windingRule: 0, //ODD
					id
				});

				this.freeWorkers.splice(this.freeWorkers.indexOf(w), 1);
			});
		});
	}
}