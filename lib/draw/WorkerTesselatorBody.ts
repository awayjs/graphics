interface WorkerScope extends WindowOrWorkerGlobalScope {
	importScripts(...urls: string[]): void;
	onmessage: (e: Omit<MessageEvent, 'data'> & {data: TesselatorTaskInput}) => void;
	postMessage(data: TesselatorMessage, transferable?: Transferable[]): void;
	readonly name: string;
}

interface IOptions {
	windingRule?: number;
	elementType?: number;
	polySize?: number;
	vertexSize?: 2 | 3;
	contours: Array<Array<number>>;
	strict?: boolean;
	debug?: boolean;
}

export interface IResult {
	vertices: ArrayLike<number>;
	vertexIndices: ArrayLike<number>;
	vertexCount: number;
	elements: ArrayLike<number>;
	elementCount: number;
	mesh: any;
}

export interface ITess2 {
	// eslint-disable-next-line max-len
	tesselate({ windingRule, elementType, polySize, vertexSize, contours, strict, debug, }: IOptions): IResult | undefined;
}

declare let Tess2: ITess2;

const enum WINDING {
	ABS_GEQ_TWO = 4,
	NEGATIVE = 3,
	NONZERO = 1,
	ODD = 0,
	POSITIVE = 2,
}

const enum ELEMENT {
	BOUNDARY_CONTOURS = 2,
	CONNECTED_POLYGONS = 1,
	POLYGONS = 0,
}

export interface TesselatorTaskInput {
	id: number;
	contours: Float32Array[];
	polySize: 2 | 3;
	vertexSize: 2;
	windingRule: WINDING;
	elementType: ELEMENT;
	scaleRatio: number;
}

export interface TesselatorTaskError {
	status: 'error',
	reason: string;
	id: number;
}

export interface TesselatorTaskResult {
	executionTime: number;
	status: 'done';
	id: number;
	buffer?: Float32Array;
}

export interface TesselatorTaskReady {
	status: 'ready';
}

export type TesselatorMessage = TesselatorTaskResult | TesselatorTaskError | TesselatorTaskReady;

export const WORKER_BODY = function() {
	const s: WorkerScope = <any> self;

	s.importScripts('__TESS__LIB__');

	debug('Tess lib', Tess2);

	s.onmessage = function ({ data }) {
		const {
			contours,
			id,
			polySize,
			vertexSize,
			elementType,
			windingRule,
			scaleRatio
		} = data;

		debug('Task qued:',id);
		if (!contours || !contours.length) {
			return sendError('Contours invald', id);
		}

		try {
			const start = performance.now();
			const result = Tess2.tesselate({
				windingRule,
				elementType,
				polySize,
				vertexSize,
				contours: <any> contours,
			});

			if (!result) {
				return sendError('Result is empty!', id);
			}

			const buffer = buildBuffer(result, scaleRatio);
			const time = performance.now() - start;

			debug('Task ended:', id, time);

			return sendResult(buffer, time, id);

		} catch (e) {
			sendError(e.message, id);
		}
	};

	function sendResult(buffer: Float32Array, time: number,  id: number): void {
		s.postMessage({
			status: 'done',
			buffer,
			id,
			executionTime: time
		}, [buffer.buffer]);
	}

	function sendError(reason: string, id: number) {
		s.postMessage({
			status: 'error',
			id,
			reason
		});
	}

	function isClockWiseXY(
		point1x: number, point1y: number,
		point2x: number, point2y: number,
		point3x: number, point3y: number): boolean {

		return (point1x - point2x) * (point3y - point2y) - (point1y - point2y) * (point3x - point2x) >= 0;
	}

	function buildBuffer(res: IResult, scale: number): Float32Array {
		const numElems = res.elements.length;
		const finalVerts = new Float32Array(res.elements.length * 2);

		scale = 1 / scale;

		let vindex = 0;
		let p1x = 0;
		let p1y = 0;
		let p2x = 0;
		let p2y = 0;
		let p3x = 0;
		let p3y = 0;

		for (let i = 0; i < numElems; i += 3) {
			p1x = scale * res.vertices[res.elements[i + 0] * 2 + 0];
			p1y = scale * res.vertices[res.elements[i + 0] * 2 + 1];
			p2x = scale * res.vertices[res.elements[i + 1] * 2 + 0];
			p2y = scale * res.vertices[res.elements[i + 1] * 2 + 1];
			p3x = scale * res.vertices[res.elements[i + 2] * 2 + 0];
			p3y = scale * res.vertices[res.elements[i + 2] * 2 + 1];

			if (isClockWiseXY(p1x, p1y, p2x, p2y, p3x, p3y)) {
				finalVerts[vindex++] = p3x;
				finalVerts[vindex++] = p3y;
				finalVerts[vindex++] = p2x;
				finalVerts[vindex++] = p2y;
				finalVerts[vindex++] = p1x;
				finalVerts[vindex++] = p1y;
			} else {
				finalVerts[vindex++] = p1x;
				finalVerts[vindex++] = p1y;
				finalVerts[vindex++] = p2x;
				finalVerts[vindex++] = p2y;
				finalVerts[vindex++] = p3x;
				finalVerts[vindex++] = p3y;
			}
		}

		return finalVerts;
	}

	function debug (...data: any[]) {
		// eslint-disable-next-line prefer-rest-params
		const args: any[] = Array.prototype.slice.call(arguments);

		args.unshift(`[WORKER: ${s.name}]`);
		console.debug.apply(s, args);
	}

	s.postMessage({
		status: 'ready'
	});
};