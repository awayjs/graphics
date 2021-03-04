import { Matrix3D, Vector3D, Box, Sphere, Rectangle } from '@awayjs/core';

import { AttributesBuffer, AttributesView, Short2Attributes, Float2Attributes } from '@awayjs/stage';

import { TriangleElements } from '../elements/TriangleElements';

import { HitTestCache } from './HitTestCache';

export class TriangleElementsUtils {
	//TODO - generate this dyanamically based on num tris

	public static hitTest(
		x: number,
		y: number,
		z: number,
		box: Box,
		triangleElements: TriangleElements,
		count: number,
		offset: number = 0,
	): boolean {
		const positionAttributes: AttributesView = triangleElements.positions;
		const curveAttributes: AttributesView = triangleElements.getCustomAtributes('curves');

		const posStride: number = positionAttributes.stride;
		const curveStride: number = curveAttributes ? curveAttributes.stride : null;

		let positions: ArrayBufferView = positionAttributes.get(count, offset);
		let curves: ArrayBufferView = curveAttributes ? curveAttributes.get(count, offset) : null;

		let indices: Uint16Array;
		let len: number;
		if (triangleElements.indices) {
			indices = triangleElements.indices.get(count, offset);
			positions = positionAttributes.get(positionAttributes.count);
			curves = curveAttributes ? curveAttributes.get(curveAttributes.count) : null;
			len = count * triangleElements.indices.dimensions;
		} else {
			positions = positionAttributes.get(count, offset);
			curves = curveAttributes ? curveAttributes.get(count, offset) : null;
			len = count;
		}
		let id0: number;
		let id1: number;
		let id2: number;

		let ax: number;
		let ay: number;
		let bx: number;
		let by: number;
		let cx: number;
		let cy: number;

		const hitTestCache: HitTestCache =
			triangleElements.hitTestCache[offset] || (triangleElements.hitTestCache[offset] = new HitTestCache());
		const index: number = hitTestCache.lastCollisionIndex;

		if (index != -1 && index < len) {
			precheck: {
				if (indices) {
					id0 = indices[index + 2];
					id1 = indices[index + 1];
					id2 = indices[index];
				} else {
					id0 = index + 2;
					id1 = index + 1;
					id2 = index;
				}

				ax = positions[id0 * posStride];
				ay = positions[id0 * posStride + 1];
				bx = positions[id1 * posStride];
				by = positions[id1 * posStride + 1];
				cx = positions[id2 * posStride];
				cy = positions[id2 * posStride + 1];

				//from a to p
				let dx = ax - x;
				let dy = ay - y;

				//edge normal (a-b)
				let nx = by - ay;
				let ny = -(bx - ax);

				let dot = dx * nx + dy * ny;

				if (dot > 0) break precheck;

				dx = bx - x;
				dy = by - y;
				nx = cy - by;
				ny = -(cx - bx);

				dot = dx * nx + dy * ny;

				if (dot > 0) break precheck;

				dx = cx - x;
				dy = cy - y;
				nx = ay - cy;
				ny = -(ax - cx);

				dot = dx * nx + dy * ny;

				if (dot > 0) break precheck;

				if (curves) {
					//check if not solid
					if (curves[id0 * curveStride + 2] != -128) {
						const v0x = bx - ax;
						const v0y = by - ay;
						const v1x = cx - ax;
						const v1y = cy - ay;
						const v2x = x - ax;
						const v2y = y - ay;

						const den = v0x * v1y - v1x * v0y;
						const v = (v2x * v1y - v1x * v2y) / den;
						const w = (v0x * v2y - v2x * v0y) / den;
						//var u:number = 1 - v - w;	//commented out as inlined away

						//here be dragons
						const uu = 0.5 * v + w;
						const vv = w;
						const d = uu * uu - vv;
						const az = curves[id0 * curveStride];

						if (d > 0 && az == -128) {
							break precheck;
						} else if (d < 0 && az == 127) {
							break precheck;
						}
					}
				}

				return true;
			}
		}

		//hard coded min vertex count to bother using a grid for
		if (len > 150) {
			const cells: Array<Array<number>> = hitTestCache.cells;
			const divisions: number = cells.length
				? hitTestCache.divisions
				: (hitTestCache.divisions = Math.min(Math.ceil(Math.sqrt(len)), 32));
			const conversionX: number = divisions / box.width;
			const conversionY: number = divisions / box.height;
			const minx: number = box.x;
			const miny: number = box.y;

			if (!cells.length) {
				//build grid

				//now we have bounds start creating grid cells and filling
				cells.length = divisions * divisions;

				for (let k = 0; k < len; k += 3) {
					if (indices) {
						id0 = indices[k + 2];
						id1 = indices[k + 1];
						id2 = indices[k];
					} else {
						id0 = k + 2;
						id1 = k + 1;
						id2 = k;
					}

					ax = positions[id0 * posStride];
					ay = positions[id0 * posStride + 1];
					bx = positions[id1 * posStride];
					by = positions[id1 * posStride + 1];
					cx = positions[id2 * posStride];
					cy = positions[id2 * posStride + 1];

					//subtractions to push into positive space
					const min_index_x: number = Math.floor((Math.min(ax, bx, cx) - minx) * conversionX);
					const min_index_y: number = Math.floor((Math.min(ay, by, cy) - miny) * conversionY);

					const max_index_x: number = Math.floor((Math.max(ax, bx, cx) - minx) * conversionX);
					const max_index_y: number = Math.floor((Math.max(ay, by, cy) - miny) * conversionY);

					for (let i: number = min_index_x; i <= max_index_x; i++) {
						for (let j: number = min_index_y; j <= max_index_y; j++) {
							const c: number = i + j * divisions;
							const nodes: Array<number> = cells[c] || (cells[c] = new Array<number>());

							//push in the triangle ids
							nodes.push(k);
						}
					}
				}
			}

			const index_x: number = Math.floor((x - minx) * conversionX);
			const index_y: number = Math.floor((y - miny) * conversionY);
			const nodes: Array<number> = cells[index_x + index_y * divisions];

			if (nodes == null) {
				hitTestCache.lastCollisionIndex = -1;
				return false;
			}

			const nodeCount = nodes.length;
			for (let n = 0; n < nodeCount; n++) {
				const k = nodes[n];

				if (indices) {
					id2 = indices[k];
				} else {
					id2 = k;
				}

				if (id2 == index) continue;

				if (indices) {
					id0 = indices[k + 2];
					id1 = indices[k + 1];
				} else {
					id0 = k + 2;
					id1 = k + 1;
				}

				ax = positions[id0 * posStride];
				ay = positions[id0 * posStride + 1];
				bx = positions[id1 * posStride];
				by = positions[id1 * posStride + 1];
				cx = positions[id2 * posStride];
				cy = positions[id2 * posStride + 1];

				//from a to p
				let dx = ax - x;
				let dy = ay - y;

				//edge normal (a-b)
				let nx = by - ay;
				let ny = -(bx - ax);
				let dot = dx * nx + dy * ny;

				if (dot > 0) continue;

				dx = bx - x;
				dy = by - y;
				nx = cy - by;
				ny = -(cx - bx);

				dot = dx * nx + dy * ny;

				if (dot > 0) continue;

				dx = cx - x;
				dy = cy - y;
				nx = ay - cy;
				ny = -(ax - cx);

				dot = dx * nx + dy * ny;

				if (dot > 0) continue;

				if (curves) {
					//check if not solid
					if (curves[id0 * curveStride + 2] != -128) {
						const v0x = bx - ax;
						const v0y = by - ay;
						const v1x = cx - ax;
						const v1y = cy - ay;
						const v2x = x - ax;
						const v2y = y - ay;

						const den = v0x * v1y - v1x * v0y;
						const  v = (v2x * v1y - v1x * v2y) / den;
						const w = (v0x * v2y - v2x * v0y) / den;
						//var u:number = 1 - v - w;	//commented out as inlined away

						//here be dragons
						const uu = 0.5 * v + w;
						const vv = w;

						const d = uu * uu - vv;

						const az = curves[id0 * curveStride];

						if (d > 0 && az == -128) {
							continue;
						} else if (d < 0 && az == 127) {
							continue;
						}
					}
				}
				hitTestCache.lastCollisionIndex = k;
				return true;
			}
			hitTestCache.lastCollisionIndex = -1;
			return false;
		}

		//brute force
		for (let k = 0; k < len; k += 3) {
			if (indices) {
				id2 = indices[k];
			} else {
				id2 = k;
			}

			if (id2 == index) continue;

			if (indices) {
				id0 = indices[k + 2];
				id1 = indices[k + 1];
			} else {
				id0 = k + 2;
				id1 = k + 1;
			}

			ax = positions[id0 * posStride];
			ay = positions[id0 * posStride + 1];
			bx = positions[id1 * posStride];
			by = positions[id1 * posStride + 1];
			cx = positions[id2 * posStride];
			cy = positions[id2 * posStride + 1];

			//from a to p
			let dx = ax - x;
			let dy = ay - y;

			//edge normal (a-b)
			let nx = by - ay;
			let ny = -(bx - ax);

			let dot = dx * nx + dy * ny;

			if (dot > 0) continue;

			dx = bx - x;
			dy = by - y;
			nx = cy - by;
			ny = -(cx - bx);

			dot = dx * nx + dy * ny;

			if (dot > 0) continue;

			dx = cx - x;
			dy = cy - y;
			nx = ay - cy;
			ny = -(ax - cx);

			dot = dx * nx + dy * ny;

			if (dot > 0) continue;

			if (curves) {
				//check if not solid
				if (curves[id0 * curveStride + 2] != -128) {
					const v0x = bx - ax;
					const v0y = by - ay;
					const v1x = cx - ax;
					const v1y = cy - ay;
					const v2x = x - ax;
					const v2y = y - ay;

					const den = v0x * v1y - v1x * v0y;
					const v = (v2x * v1y - v1x * v2y) / den;
					const w = (v0x * v2y - v2x * v0y) / den;
					//var u:number = 1 - v - w;	//commented out as inlined away

					//here be dragons
					const uu = 0.5 * v + w;
					const vv = w;
					const d = uu * uu - vv;
					const az = curves[id0 * curveStride];

					if (d > 0 && az == -128) {
						continue;
					} else if (d < 0 && az == 127) {
						continue;
					}
				}
			}
			hitTestCache.lastCollisionIndex = k;
			return true;
		}
		hitTestCache.lastCollisionIndex = -1;
		return false;
	}

	public static getBoxBounds(
		positionAttributes: AttributesView,
		indexAttributes: Short2Attributes,
		matrix3D: Matrix3D,
		cache: Box,
		target: Box,
		count: number,
		offset: number = 0,
	): Box {
		let positions: ArrayBufferView;
		const posDim: number = positionAttributes.dimensions;
		const posStride: number = positionAttributes.stride;

		let minX: number = 0,
			minY: number = 0,
			minZ: number = 0;
		let maxX: number = 0,
			maxY: number = 0,
			maxZ: number = 0;

		let indices: Uint16Array;
		let len: number;
		if (indexAttributes) {
			len = count * indexAttributes.dimensions;
			indices = indexAttributes.get(count, offset);
			positions = positionAttributes.get(positionAttributes.count);
		} else {
			len = count;
			positions = positionAttributes.get(count, offset);
		}

		if (len == 0) return target;

		let i: number = 0;
		let index: number;
		let pos1: number, pos2: number, pos3: number, rawData: Float32Array;

		if (matrix3D) rawData = matrix3D._rawData;

		if (target == null) {
			target = cache || new Box();
			index = indices ? indices[i] * posStride : i * posStride;
			if (matrix3D) {
				if (posDim == 3) {
					pos1 =
						positions[index] * rawData[0] +
						positions[index + 1] * rawData[4] +
						positions[index + 2] * rawData[8] +
						rawData[12];
					pos2 =
						positions[index] * rawData[1] +
						positions[index + 1] * rawData[5] +
						positions[index + 2] * rawData[9] +
						rawData[13];
					pos3 =
						positions[index] * rawData[2] +
						positions[index + 1] * rawData[6] +
						positions[index + 2] * rawData[10] +
						rawData[14];
				} else {
					pos1 = positions[index] * rawData[0] + positions[index + 1] * rawData[4] + rawData[12];
					pos2 = positions[index] * rawData[1] + positions[index + 1] * rawData[5] + rawData[13];
				}
			} else {
				pos1 = positions[index];
				pos2 = positions[index + 1];
				pos3 = posDim == 3 ? positions[index + 2] : 0;
			}

			maxX = minX = pos1;
			maxY = minY = pos2;
			maxZ = minZ = posDim == 3 ? pos3 : 0;
			i++;
		} else {
			maxX = (minX = target.x) + target.width;
			maxY = (minY = target.y) + target.height;
			maxZ = (minZ = target.z) + target.depth;
		}

		for (; i < len; i++) {
			index = indices ? indices[i] * posStride : i * posStride;

			if (matrix3D) {
				if (posDim == 3) {
					pos1 =
						positions[index] * rawData[0] +
						positions[index + 1] * rawData[4] +
						positions[index + 2] * rawData[8] +
						rawData[12];
					pos2 =
						positions[index] * rawData[1] +
						positions[index + 1] * rawData[5] +
						positions[index + 2] * rawData[9] +
						rawData[13];
					pos3 =
						positions[index] * rawData[2] +
						positions[index + 1] * rawData[6] +
						positions[index + 2] * rawData[10] +
						rawData[14];
				} else {
					pos1 = positions[index] * rawData[0] + positions[index + 1] * rawData[4] + rawData[12];
					pos2 = positions[index] * rawData[1] + positions[index + 1] * rawData[5] + rawData[13];
				}
			} else {
				pos1 = positions[index];
				pos2 = positions[index + 1];
				pos3 = posDim == 3 ? positions[index + 2] : 0;
			}

			if (pos1 < minX) minX = pos1;
			else if (pos1 > maxX) maxX = pos1;

			if (pos2 < minY) minY = pos2;
			else if (pos2 > maxY) maxY = pos2;

			if (posDim == 3) {
				if (pos3 < minZ) minZ = pos3;
				else if (pos3 > maxZ) maxZ = pos3;
			}
		}

		target.width = maxX - (target.x = minX);
		target.height = maxY - (target.y = minY);
		target.depth = maxZ - (target.z = minZ);

		return target;
	}

	public static getSphereBounds(
		positionAttributes: AttributesView,
		center: Vector3D,
		matrix3D: Matrix3D,
		cache: Sphere,
		output: Sphere,
		count: number,
		offset: number = 0,
	): Sphere {
		const positions: ArrayBufferView = positionAttributes.get(count, offset);
		const posDim: number = positionAttributes.dimensions;
		const posStride: number = positionAttributes.stride;

		let maxRadiusSquared: number = 0;
		let radiusSquared: number;
		const len = count * posStride;
		let distanceX: number;
		let distanceY: number;
		let distanceZ: number;

		for (let i: number = 0; i < len; i += posStride) {
			distanceX = positions[i] - center.x;
			distanceY = positions[i + 1] - center.y;
			distanceZ = posDim == 3 ? positions[i + 2] - center.z : -center.z;
			radiusSquared = distanceX * distanceX + distanceY * distanceY + distanceZ * distanceZ;

			if (maxRadiusSquared < radiusSquared) maxRadiusSquared = radiusSquared;
		}

		if (output == null) output = new Sphere();

		output.x = center.x;
		output.y = center.y;
		output.z = center.z;
		output.radius = Math.sqrt(maxRadiusSquared);

		return output;
	}

	public static prepareTriangleGraphicsSlice9 (
		elem: TriangleElements,
		offsets: Rectangle,
		bounds: Rectangle,
		copy: boolean
	): TriangleElements {

		if (elem._numElements !== 0) {
			throw 'Indices not support yet';
		}

		const target = !copy ? elem : elem.clone();

		const attr = target.positions;
		const pos = target.positions.get(elem._numVertices, 0);
		const pStride = attr.stride;
		const pOffset = attr.offset;
		const pDim = attr.dimensions;

		const uvs = target.uvs ? target.uvs.get(elem._numVertices, 0) : null;
		const uStride = target.uvs ? target.uvs.stride : 0;
		const uOffset = target.uvs ? target.uvs.offset : 0;
		const uDim = target.uvs ? target.uvs.dimensions : 0

		elem.slice9offsets = offsets;
		const left = offsets[0];
		const right = offsets[1];
		const top = offsets[2];
		const bottom = offsets[3];

		const sliceIndices = [];
		const newPos = [];
		const newUV = [];

		// processed positions for triangle
		const pPos = [];
		// and it UV
		const pUv = [];

		// iterate over triangle
		for (let t = 0; t < elem._numVertices; t += 3) {

			// fill temporary buffers first
			// k - index for vertices in triangle
			// p - index in processed buffer, because dimension maybe 2 or 3
			for (let k = 0; k < 3; k++) {

				for (let p = 0; p < pDim; p++) {
					pPos[k * pDim + p] = pos[(t + k) * pStride + pOffset + p];
				}

				for (let p = 0; uvs && p < uDim; p++) {
					pUv[k * uDim + p] = uvs[(t + k) * uStride + uOffset + p];
				}
			}
		}

		return target;
	}

	public static updateTriangleGraphicsSlice9(
		elem: TriangleElements,
		originalRect: Rectangle,
		scaleX: number,
		scaleY: number,
		init: boolean = false,
		copy: boolean = false,
	): TriangleElements {
		// todo: for now this only works for Float2Attributes.

		if (elem.slice9Indices.length != 9) {
			throw 'ElementUtils: Error - triangleElement does not provide valid slice9Indices!';
		}

		/**
		 * this is not rectangle.
		 * it store a top, left, right, bottom offsets relative a original top, left, right, bottom
		 * */
		const offsets = elem.slice9offsets._rawData;
		const left = offsets[0];
		const right = offsets[1];
		const top = offsets[2];
		const bottom = offsets[3];

		const s_len = elem.slice9Indices.length;

		let innerWidth = originalRect.width - (left + right) / scaleX;
		let innerHeight = originalRect.height - (top + bottom) / scaleY;

		// reduce a overflow, when scale to small
		if (innerWidth < 0) {
			innerWidth = 0;

			scaleX = (left + right) / originalRect.width;
		}

		if (innerHeight < 0) {
			innerHeight = 0;

			scaleY = (top + bottom) / originalRect.height;
		}

		const stride = elem.positions.stride;
		const attrOffset = elem.positions.offset;

		let newElem: TriangleElements;
		let positions: ArrayBufferView;

		if (copy) {

			// there are not garaties that a buffer is 2 and not has stride
			// and a element may has UV
			// should working
			newElem = elem.clone();

			newElem.slice9offsets = elem.slice9offsets;
			newElem.initialSlice9Positions = elem.initialSlice9Positions;
			newElem.slice9Indices = elem.slice9Indices;

			positions = newElem.positions.get(newElem._numVertices);
		} else {
			positions = elem.positions.get(elem._numVertices);
		}

		// todo: i had trouble when just cloning the positions
		//	for now i just create the initialSlice9Positions by iterating the positions

		let initPos: number[];

		if (init && !elem.initialSlice9Positions) {
			initPos = [];
			// we store only XY, but buffer can be XYZ
			initPos.length = elem._numVertices * 2;

			let vindex = 0;
			const len = elem.positions.length;

			for (let i = 0; i < len; i += stride) {
				initPos[vindex + 0] = positions[attrOffset + i + 0];
				initPos[vindex + 1] = positions[attrOffset + i + 1];
				vindex += 2;
			}

			elem.initialSlice9Positions = initPos;
		} else {
			initPos = elem.initialSlice9Positions;
		}

		const slice9Indices: number[] = elem.slice9Indices;

		const slice9Offsets_x = [
			originalRect.x,
			originalRect.x + left / scaleX,
			originalRect.x + left / scaleX + innerWidth
		];

		const slice9Offsets_y = [
			originalRect.y,
			originalRect.y + top / scaleY,
			originalRect.y + right / scaleY + innerHeight
		];

		//console.log("slice9Offsets_x",slice9Offsets_x);
		//console.log("slice9Offsets_y",slice9Offsets_x);

		let row_cnt: number = -1;
		let col_cnt: number = 0;
		let scalex: number = 0;
		let scaley: number = 0;
		let offsetx: number = 0;
		let offsety: number = 0;
		let vindex = 0;

		// iterating over the 9 chunks - keep in mind that we are constructing a 3x3 grid:
		for (let s = 0; s < s_len; s++) {
			// keep track of column and row index
			if (row_cnt === 2) {
				col_cnt++;
				row_cnt = -1;
			}
			row_cnt++;

			// only need to x-scale if this is the middle column
			// if the innerWidth<=0 we can skip this complete column
			if (col_cnt === 1) {
				scalex = innerWidth;
			} else {
				scalex = 1 / scaleX;
			}

			// only need to y-scale if this is the middle row
			// if the innerHeight<=0 we can skip this complete row
			if (row_cnt === 1) {
				scaley = innerHeight;
			} else {
				scaley = 1 / scaleY;
			}

			// offsetx is different for each column
			offsetx = slice9Offsets_x[col_cnt];

			// offsety is different for each row
			offsety = slice9Offsets_y[row_cnt];

			// internal buffer iterator
			let attrindex = attrOffset;

			// iterate the verts and apply the translation / scale
			while (vindex < slice9Indices[s]) {
				positions[attrindex + 0] = offsetx + initPos[vindex + 0] * scalex;
				positions[attrindex + 1] = offsety + initPos[vindex + 1] * scaley;
				// we should include a stride, because buffer maybe be contecated
				// or XYZ instead of XY
				attrindex += stride;
				vindex += 2;
			}
		}

		//console.log("positions",positions);
		if (copy) {
			newElem.positions.invalidate();
			return newElem;
		}

		elem.positions.invalidate();

		return elem;
	}
}
