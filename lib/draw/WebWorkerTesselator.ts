import { GraphicsFactoryFills } from './GraphicsFactoryFills';
import { GraphicsPath } from './GraphicsPath';
import {
	WORKER_BODY,
	TesselatorTaskError,
	TesselatorTaskResult,
	TesselatorMessage
} from './WorkerTesselatorBody';

export interface TesselatorTask {
	resolve: ResultCallback;
	reject: ErrorCallback;
	id: number;
}

type ResultCallback = (data: TesselatorTaskResult) => void;
type ErrorCallback = (reason: TesselatorTaskError) => void;

export class WebWorkerTessealtor {
	private static TASK_ID = 0;
	private static MAX_TASK = 8;
	private static tasks = [];
	private static workers: Worker[] = [];
	private static anyCallback: (data: any) => void;
	private static busyWaiter: Promise<any>;

	private static onError(error: any) {

	}

	private static onData(result: Omit<MessageEvent, 'data'> & {data: TesselatorMessage }) {

	}

	private static waitFreeWorker(): Promise<void> {
		if (this.tasks.length < this.MAX_TASK)
			Promise.resolve();

		if (this.busyWaiter) {
			return this.busyWaiter;
		}

		return this.busyWaiter = new Promise((res)=>{
			this.anyCallback = res;
			this.busyWaiter = null;
		});
	}

	private static generateWorker(id: number = 0): Worker {
		let source = WORKER_BODY.toString();
		const b0 = source.indexOf('{');
		const b1 = source.lastIndexOf('}');

		source = source.substring(b0 + 1, b1) + `\nconst ID = ${id};\n`;

		const url = URL.createObjectURL(new Blob([source]));
		const worker = new Worker(url);

		URL.revokeObjectURL(url);

		return worker;
	}

	public static runTask(path: GraphicsPath): Promise<TesselatorTaskResult | TesselatorTaskError> {
		const id = this.TASK_ID++;
		const contours = GraphicsFactoryFills.prepareContours(
			path,
			GraphicsFactoryFills.USE_TESS_FIX);

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

		return this.waitFreeWorker().then(() => {
			const store = new Float32Array(size);
			const bufferContours = [];

			let next = 0;

			for (const c of contours) {
				const buffer = store.subarray(next, c.length);

				buffer.set(c);
				bufferContours.push(buffer);

				next += c.length;
			}

			return new Promise((resolve: ResultCallback, reject: ErrorCallback) => {

				this.tasks.push({
					resolve, reject, id
				});
			});
		});
	}
}