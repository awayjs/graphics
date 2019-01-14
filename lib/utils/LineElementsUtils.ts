import {Matrix3D, Vector3D, Box, Sphere} from "@awayjs/core";

import {AttributesView, Short2Attributes} from "@awayjs/stage";

import {HitTestCache} from "./HitTestCache";
import { LineElements } from '../elements/LineElements';

export class LineElementsUtils
{
	//TODO - generate this dyanamically based on num tris

	public static hitTest(x:number, y:number, z:number, thickness:number, box:Box, lineElements:LineElements, count:number, offset:number = 0):boolean
	{
		var positionAttributes:AttributesView = lineElements.positions;

		var posStride:number = positionAttributes.stride;

		var positions:ArrayBufferView = positionAttributes.get(count, offset);

		var indices:Uint16Array;

		var len:number;
		if (lineElements.indices) {
			indices = lineElements.indices.get(count, offset);
			positions = positionAttributes.get(positionAttributes.count);
			len = count*lineElements.indices.dimensions;
		} else {
			positions = positionAttributes.get(count, offset);
			len = count;
		}

		var id0:number;
		var id1:number;

		var ax:number;
		var ay:number;
		var bx:number;
		var by:number;

		var hitTestCache:HitTestCache = lineElements.hitTestCache[offset] || (lineElements.hitTestCache[offset] = new HitTestCache());
		var index:number = hitTestCache.lastCollisionIndex;

		if (index != -1 && index < len) {
			precheck:
			{
				if (indices) {
					id0 = indices[index]*posStride;
					id1 = indices[index + 1]*posStride;
				} else {
					id0 = index*posStride;
					id1 = (index + 1)*posStride;
				}

				ax = positions[id0];
				ay = positions[id0 + 1];
				bx = positions[id1];
				by = positions[id1 + 1];

				//from a to p
				var dx:number = ax - x;
				var dy:number = ay - y;

				//edge normal (a-b)
				var nx:number = by - ay;
				var ny:number = -(bx - ax);
				var D:number = Math.sqrt(nx*nx + ny*ny);

				//TODO: should strictly speaking be an elliptical calculation, use circle to approx temp
				if (Math.abs((dx*nx) + (dy*ny)) > thickness*D)
					break precheck;

				//edge vector
				var dot:number = (dx*ny) - (dy*nx);

				if (dot > D*D || dot < 0)
					break precheck;

				return true;
			}
		}

		//hard coded min vertex count to bother using a grid for
		if (len > 150) {
			var cells:Array<Array<number>> = hitTestCache.cells;
			var divisions:number = cells.length? hitTestCache.divisions : (hitTestCache.divisions = Math.min(Math.ceil(Math.sqrt(len)), 32));
			var conversionX:number = divisions/box.width;
			var conversionY:number = divisions/box.height;
			var minx:number = box.x;
			var miny:number = box.y;

			if (!cells.length) { //build grid

				//now we have bounds start creating grid cells and filling
				cells.length = divisions*divisions;

				for (var k:number = 0; k < len; k += 3) {
					if (indices) {
						id0 = indices[k]*posStride;
						id1 = indices[k + 1]*posStride;
					} else {
						id0 = k*posStride;
						id1 = (k + 1)*posStride;
					}

					ax = positions[id0];
					ay = positions[id0 + 1];
					bx = positions[id1];
					by = positions[id1 + 1];

					//subtractions to push into positive space
					var min_index_x:number = Math.floor((Math.min(ax, bx) - minx)*conversionX);
					var min_index_y:number = Math.floor((Math.min(ay, by) - miny)*conversionY);

					var max_index_x:number = Math.floor((Math.max(ax, bx) - minx)*conversionX);
					var max_index_y:number = Math.floor((Math.max(ay, by) - miny)*conversionY);


					for (var i:number = min_index_x; i <= max_index_x; i++) {
						for (var j:number = min_index_y; j <= max_index_y; j++) {
							var c:number = i + j*divisions;
							var nodes:Array<number> = cells[c] || (cells[c] = new Array<number>());

							//push in the triangle ids
							nodes.push(k);
						}
					}
				}
			}

			var index_x:number = Math.floor((x - minx)*conversionX);
			var index_y:number = Math.floor((y - miny)*conversionY);
			var nodes:Array<number> = cells[index_x + index_y*divisions];

			if (nodes == null) {
				hitTestCache.lastCollisionIndex = -1;
				return false;
			}

			var nodeCount:number = nodes.length;
			for (var n:number = 0; n < nodeCount; n++) {
				var k:number = nodes[n];

				if (indices) {
					id0 = indices[k]*posStride;
					id1 = indices[k + 1]*posStride;
				} else {
					id0 = k*posStride;
					id1 = (k + 1)*posStride;
				}

				ax = positions[id0];
				ay = positions[id0 + 1];
				bx = positions[id1];
				by = positions[id1 + 1];

				//from a to p
				var dx:number = ax - x;
				var dy:number = ay - y;

				//edge normal (a-b)
				var nx:number = by - ay;
				var ny:number = -(bx - ax);
				var D:number = Math.sqrt(nx*nx + ny*ny);

				//TODO: should strictly speaking be an elliptical calculation, use circle to approx temp
				if (Math.abs((dx*nx) + (dy*ny)) > thickness*D)
					continue;

				//edge vector
				var dot:number = (dx*ny) - (dy*nx);

				if (dot > D*D || dot < 0)
					continue;

				hitTestCache.lastCollisionIndex = k;
				return true;
			}
			hitTestCache.lastCollisionIndex = -1;
			return false;
		}

		//brute force
		for (var k:number = 0; k < len; k += 6) {
			if (indices) {
				id0 = indices[k]*posStride;
				id1 = indices[k + 1]*posStride;
			} else {
				id0 = k*posStride;
				id1 = (k + 1)*posStride;
			}

			ax = positions[id0];
			ay = positions[id0 + 1];
			bx = positions[id1];
			by = positions[id1 + 1];

			//from a to p
			var dx:number = ax - x;
			var dy:number = ay - y;

			//edge normal (a-b)
			var nx:number = by - ay;
			var ny:number = -(bx - ax);
			var D:number = Math.sqrt(nx*nx + ny*ny);

			//TODO: should strictly speaking be an elliptical calculation, use circle to approx temp
			if (Math.abs((dx*nx) + (dy*ny)) > thickness*D)
				continue;

			//edge vector
			var dot:number = (dx*ny) - (dy*nx);

			if (dot > D*D || dot < 0)
				continue;

			hitTestCache.lastCollisionIndex = k;
			return true;
		}
		hitTestCache.lastCollisionIndex = -1;
		return false;
	}

	public static getBoxBounds(positionAttributes:AttributesView, indexAttributes:Short2Attributes, matrix3D:Matrix3D, thicknessScale:Vector3D, cache:Box, target:Box, count:number, offset:number = 0):Box
	{
		var positions:ArrayBufferView;
		var posDim:number = positionAttributes.dimensions;
		var posStride:number = positionAttributes.stride;

		var minX:number = 0, minY:number = 0, minZ:number = 0;
		var maxX:number = 0, maxY:number = 0, maxZ:number = 0;

		var indices:Uint16Array;
		var len:number;
		if (indexAttributes) {
			len = count*indexAttributes.dimensions;
			indices = indexAttributes.get(count, offset);
			positions = positionAttributes.get(positionAttributes.count);
		} else {
			len = count;
			positions = positionAttributes.get(count, offset);
		}

		if (len == 0)
			return target;

		var i:number = 0;
		var index:number;
		var pos1:number, pos2:number, pos3:number, rawData:Float32Array;
		
		if (matrix3D)
			rawData = matrix3D._rawData;

		for (var i:number = 0; i < len; i+=3) {
			index = (indices)? indices[i]*posStride : i*posStride;

			if (matrix3D) {
				if (posDim == 6) {
					pos1 = positions[index]*rawData[0] + positions[index + 1]*rawData[4] + positions[index + 2]*rawData[8] + rawData[12];
					pos2 = positions[index]*rawData[1] + positions[index + 1]*rawData[5] + positions[index + 2]*rawData[9] + rawData[13];
					pos3 = positions[index]*rawData[2] + positions[index + 1]*rawData[6] + positions[index + 2]*rawData[10] + rawData[14];
				} else {
					pos1 = positions[index]*rawData[0] + positions[index + 1]*rawData[4] + rawData[12];
					pos2 = positions[index]*rawData[1] + positions[index + 1]*rawData[5] + rawData[13];
				}
			} else {
				pos1 = positions[index];
				pos2 = positions[index + 1];
				pos3 = (posDim == 6)? positions[index + 2] : 0;
			}

			if (i == 0) {
				maxX = minX = pos1;
				maxY = minY = pos2;
				maxZ = minZ = (posDim == 6)? pos3 : 0;
			} else {
				if (pos1 < minX)
					minX = pos1;
				else if (pos1 > maxX)
					maxX = pos1;

				if (pos2 < minY)
					minY = pos2;
				else if (pos2 > maxY)
					maxY = pos2;

				if (posDim == 6) {
					if (pos3 < minZ)
						minZ = pos3;
					else if (pos3 > maxZ)
						maxZ = pos3;
				}
			}
		}

		var thicknessX:number = matrix3D? thicknessScale.x*rawData[0] + thicknessScale.y*rawData[4] : thicknessScale.x;
		var thicknessY:number = matrix3D? thicknessScale.x*rawData[1] + thicknessScale.y*rawData[5] : thicknessScale.y;

		var box:Box = new Box(minX - thicknessX, minY - thicknessY);
		box.right = maxX + thicknessX;
		box.bottom = maxY + thicknessY;

		return box.union(target, target || cache);
	}

	public static getSphereBounds(positionAttributes:AttributesView, center:Vector3D, matrix3D:Matrix3D, cache:Sphere, output:Sphere, count:number, offset:number = 0):Sphere
	{
		var positions:ArrayBufferView = positionAttributes.get(count, offset);
		var posDim:number = positionAttributes.dimensions;
		var posStride:number = positionAttributes.stride;

		var maxRadiusSquared:number = 0;
		var radiusSquared:number;
		var len = count*posStride;
		var distanceX:number;
		var distanceY:number;
		var distanceZ:number;

		for (var i:number = 0; i < len; i += posStride) {
			distanceX = positions[i] - center.x;
			distanceY = positions[i + 1] - center.y;
			distanceZ = (posDim == 6)? positions[i + 2] - center.z : -center.z;
			radiusSquared = distanceX*distanceX + distanceY*distanceY + distanceZ*distanceZ;

			if (maxRadiusSquared < radiusSquared)
				maxRadiusSquared = radiusSquared;
		}

		if (output == null)
			output = new Sphere();

		output.x = center.x;
		output.y = center.y;
		output.z = center.z;
		output.radius = Math.sqrt(maxRadiusSquared);

		return output;
	}
}