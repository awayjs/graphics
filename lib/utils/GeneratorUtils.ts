import { Rectangle, Vector3D,  } from '@awayjs/core';
import { AttributesView } from '@awayjs/stage';

type TGenCallback = (source: PolygonView<any>, result: PolygonView, back: boolean) => void;

export class Vertice3DView  {
	private _data: Float32Array[] = [];

	public get length() {
		return this._data.length;
	}

	public toVec(vect: Vector3D = new Vector3D(), index = 0): Vector3D {
		const s = this._data[index];
		const l = s.length;

		for (let i = 0; i < 4; i++) {
			vect._rawData[i] = i < l ? s[i] : 0;
		}

		return vect;
	}

	public fromVec(vect: Vector3D, index = 0): this {
		const s = this._data[index];
		const l = s.length;

		for (let i = 0; i < l; i++) {
			s[i] = vect._rawData[i];
		}

		return this;
	}

	public setData(data: Float32Array, index: number, clone = false): this {
		this._data[index] = clone ?  data.slice() : data;

		return this;
	}

	public getData(index: number): Float32Array {
		return this._data[index];
	}

	public lerpTo (target: Vertice3DView, alpha: number): this {
		if (alpha === 0) {
			return this;
		}

		if (alpha === 1) {
			return this.copyFrom(target);
		}

		// interpolate all values
		for (let i = 0; i < this._data.length; i++) {
			const to = target._data[i];
			const from = this._data[i];

			for (let k = 0; k < this._data[i].length; k++) {
				from[k] = (1 - alpha) * from[k] + alpha * to[k];
			}
		}

		return this;
	}

	public copyFrom (from: Vertice3DView): this {
		const to = this._data;

		for (let i = 0; i < to.length; i++) {
			if (to[i]) {
				to[i].set(from._data[i]);
			} else {
				to[i] = from._data[i].slice();
			}
		}

		return this;
	}

	public clone(): Vertice3DView {
		return new Vertice3DView().copyFrom(this);
	}
}

export class PolygonView<T extends {clone?(): T} = any> {
	public vertices: Array<Vertice3DView> = [];
	public userData: T;

	public clone(): PolygonView<T> {
		const p = new PolygonView<T>();
		const l = this.vertices.length;

		for (let i = 0; i < l; i++) {
			p.vertices[i] = this.vertices[i].clone();
		}

		if (this.userData) {
			p.userData = this.userData.clone
				? this.userData.clone()
				: Object.assign({}, this.userData);
		}

		return p;
	}

	public add(view: Vertice3DView, clone: boolean = false): this {
		this.vertices.push(clone ? view.clone() : view);

		return this;
	}

	public get length() {
		return this.vertices.length;
	}
}

export class MeshView<T extends {} = never> {
	public poly: PolygonView<T>[] = [];
	public rect: Rectangle = new Rectangle();

	/**
	 * Unroll all n-gone convex polys to 3-gone polygons
	 */
	public normalise(): this {
		const normalised = [];

		for (const p of this.poly) {
			if (p.length === 3) {
				normalised.push(p);
				continue;
			}

			for (let i = 1; i < p.length - 1; i++) {
				const n = new PolygonView();
				// shared user data;
				n.userData = p.userData;

				// construct poly in direct order with shared 1 vert (CCW or CW? i don't know ;)
				// fan triangulation
				// we sure that this a convex polygon
				n.add(p.vertices[0].clone());
				n.add(p.vertices[(i) % p.length].clone());
				n.add(p.vertices[(i + 1) % p.length].clone());

				normalised.push(n);
			}
		}

		this.poly = normalised;
		return this;
	}

	/**
	 * Construct buffer from poly data
	 * @param index Index of vertices attribute 0 - pos, 1 - uv etc
	 */
	public toFloatArray(index: number = 0): Float32Array {
		const count = this.poly.length;

		if (this.poly.length === 0) return null;

		// check a dimension for calc a output size
		const test = this.poly[0].vertices[0].getData(index);
		const dim = test.length;

		// polygon should has 3 vertices
		const data = new Float32Array(count * dim * 3);

		for (let i = 0; i < count * 3; i++) {
			const vert = this.poly[i / 3 | 0].vertices[i % 3];

			data.set(vert.getData(index), 3 * i * dim);
		}

		return data;
	}

	public static fromAttributes<T> (
		attrs: AttributesView[],
		length: number,
		polySize: number = 0,
		userDataCtor?: { new(): T}): MeshView<T> {

		const mesh = new MeshView<T>();

		let poly: PolygonView<T>;

		const views: Float32Array[] = <any>attrs.map((e) => e.get(length, 0));

		for (let i = 0; i < length; i++) {
			if (i % polySize === 0) {
				poly = new PolygonView<T>();
				poly.userData = userDataCtor ? new userDataCtor() : null;
			}

			mesh.poly.push(poly);

			const v = new Vertice3DView();
			poly.add(v);

			for (let i = 0; i < attrs.length; i++) {
				const o = attrs[i].offset;
				const s = attrs[i].stride;
				const d = attrs[i].dimensions;

				v.setData(views[i].slice(o + s * i, o + s * i + d), i);
			}
		}

		return mesh;
	}
}

export class GeneratorUtils {
	private static EPS = 0.0001;

	private static InFront (n: Vector3D, d: number, p: Vector3D): boolean {
		return n.dotProduct(p) - d > this.EPS;
	}

	private static Behind (n: Vector3D, d: number, p: Vector3D): boolean {
		return n.dotProduct(p) - d < -this.EPS;
	}

	private static OnPlane (n: Vector3D, d: number, p: Vector3D): boolean {
		return !this.InFront(n, d, p) && !this.Behind(n, d, p);
	}

	private static Intersect(a: Vertice3DView ,b: Vertice3DView ,d1: number , d2: number): Vertice3DView {
		const alpha = d1 / (d1 - d2);

		return new Vertice3DView().copyFrom(a).lerpTo(b, alpha);
	}

	// Splits a polygon in half along a splitting plane using a clipping algorithm
	// call Sutherland-Hodgman clipping
	// Resource: Page 367 of Ericson (Real-Time Collision Detection)
	public static SutherlandHodgman<T> (
		poly: PolygonView<T>,
		normal: Vector3D,
		d: number,
		out: MeshView<T>, callback?: TGenCallback
	): MeshView<T> {
		const frontPoly = new PolygonView<T>();
		const backPoly = new PolygonView<T>();

		const s = poly.length;
		const verts = poly.vertices;

		const tmpA = new Vector3D();
		const tmpB = new Vector3D();

		let vA = verts[s - 1];
		let vecA = vA.toVec(tmpA, 0);

		let da = normal.dotProduct(vecA) - d;

		for (let i = 0; i < s; ++i) {
			const vB = verts[i];
			const vecB = vB.toVec(tmpB, 0);
			const db = normal.dotProduct(vecB) - d;

			if (this.InFront(normal, d, vecB)) {
				if (this.Behind(normal, d, vecA)) {
					const itr = this.Intersect(vB, vA, db, da);

					frontPoly.add(itr);
					backPoly.add(itr, true);
				}

				frontPoly.add(vB, true);

			} else if (this.Behind(normal, d, vecB)) {
				if (this.InFront(normal, d, vecA)) {
					const itr = this.Intersect(vA, vB, da, db);

					frontPoly.add(itr, false);
					backPoly.add(itr, true);

				} else if (this.OnPlane(normal, d, vecA)) {
					backPoly.add(vA, true);
				}

				backPoly.add(vA, true);
			} else {
				frontPoly.add(vB, true);

				if (this.OnPlane(normal, d, vecA)) {
					backPoly.add(vB, true);
				}
			}

			vA = vB.clone();
			vecA = vA.toVec(vecA, 0);
			da = db;
		}

		if (frontPoly.length) {
			callback && callback(poly, frontPoly, false);
			out.poly.push(frontPoly);
		}

		if (backPoly.length) {
			callback && callback(poly, backPoly, true);
			out.poly.push(backPoly);
		}

		return out;
	}

	public static SliceHodgman<T>(mesh: MeshView<T>, n: Vector3D, d: number, callback?: TGenCallback): MeshView<T> {
		const out = new MeshView<T>();

		for (const p of mesh.poly) {
			this.SutherlandHodgman(p, n, d, out, callback);
		}

		return out;
	}
}