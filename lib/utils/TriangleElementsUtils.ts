import {Matrix3D, Vector3D, Box, Sphere, Rectangle} from "@awayjs/core";

import {AttributesBuffer, AttributesView, Short2Attributes, Float2Attributes} from "@awayjs/stage";

import {TriangleElements} from "../elements/TriangleElements";

import {HitTestCache} from "./HitTestCache";

export class TriangleElementsUtils
{
	//TODO - generate this dyanamically based on num tris

	public static hitTest(x:number, y:number, z:number, box:Box, triangleElements:TriangleElements, count:number, offset:number = 0):boolean
	{
		var positionAttributes:AttributesView = triangleElements.positions;
		var curveAttributes:AttributesView = triangleElements.getCustomAtributes("curves");

		var posStride:number = positionAttributes.stride;
		var curveStride:number = curveAttributes? curveAttributes.stride : null;

		var positions:ArrayBufferView = positionAttributes.get(count, offset);
		var curves:ArrayBufferView = curveAttributes? curveAttributes.get(count, offset) : null;

		var indices:Uint16Array;
		var len:number;
		if (triangleElements.indices) {
			indices = triangleElements.indices.get(count, offset);
			positions = positionAttributes.get(positionAttributes.count);
			curves = curveAttributes? curveAttributes.get(curveAttributes.count) : null;
			len = count*triangleElements.indices.dimensions;
		} else {
			positions = positionAttributes.get(count, offset);
			curves = curveAttributes? curveAttributes.get(count, offset) : null;
			len = count;
		}
		var id0:number;
		var id1:number;
		var id2:number;

		var ax:number;
		var ay:number;
		var bx:number;
		var by:number;
		var cx:number;
		var cy:number;

		var hitTestCache:HitTestCache = triangleElements.hitTestCache[offset] || (triangleElements.hitTestCache[offset] = new HitTestCache());
		var index:number = hitTestCache.lastCollisionIndex;

		if (index != -1 && index < len) {
			precheck:
			{
				if (indices) {
					id0 = indices[index + 2];
					id1 = indices[index + 1];
					id2 = indices[index];
				} else {
					id0 = index + 2;
					id1 = index + 1;
					id2 = index;
				}

				ax = positions[id0*posStride];
				ay = positions[id0*posStride + 1];
				bx = positions[id1*posStride];
				by = positions[id1*posStride + 1];
				cx = positions[id2*posStride];
				cy = positions[id2*posStride + 1];

				//from a to p
				var dx:number = ax - x;
				var dy:number = ay - y;

				//edge normal (a-b)
				var nx:number = by - ay;
				var ny:number = -(bx - ax);

				var dot:number = (dx*nx) + (dy*ny);

				if (dot > 0)
					break precheck;

				dx = bx - x;
				dy = by - y;
				nx = cy - by;
				ny = -(cx - bx);

				dot = (dx*nx) + (dy*ny);

				if (dot > 0)
					break precheck;

				dx = cx - x;
				dy = cy - y;
				nx = ay - cy;
				ny = -(ax - cx);

				dot = (dx*nx) + (dy*ny);

				if (dot > 0)
					break precheck;

				if (curves) {
					//check if not solid
					if (curves[id0*curveStride + 2] != -128) {

						var v0x:number = bx - ax;
						var v0y:number = by - ay;
						var v1x:number = cx - ax;
						var v1y:number = cy - ay;
						var v2x:number = x - ax;
						var v2y:number = y - ay;

						var den:number = v0x*v1y - v1x*v0y;
						var v:number = (v2x*v1y - v1x*v2y)/den;
						var w:number = (v0x*v2y - v2x*v0y)/den;
						//var u:number = 1 - v - w;	//commented out as inlined away

						//here be dragons
						var uu:number = 0.5*v + w;
						var vv:number = w;

						var d:number = uu*uu - vv;

						var az:number = curves[id0*curveStride];
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
						id0 = indices[k + 2];
						id1 = indices[k + 1];
						id2 = indices[k];
					} else {
						id0 = k + 2;
						id1 = k + 1;
						id2 = k;
					}

					ax = positions[id0*posStride];
					ay = positions[id0*posStride + 1];
					bx = positions[id1*posStride];
					by = positions[id1*posStride + 1];
					cx = positions[id2*posStride];
					cy = positions[id2*posStride + 1];

					//subtractions to push into positive space
					var min_index_x:number = Math.floor((Math.min(ax, bx, cx) - minx)*conversionX);
					var min_index_y:number = Math.floor((Math.min(ay, by, cy) - miny)*conversionY);

					var max_index_x:number = Math.floor((Math.max(ax, bx, cx) - minx)*conversionX);
					var max_index_y:number = Math.floor((Math.max(ay, by, cy) - miny)*conversionY);


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

				ax = positions[id0*posStride];
				ay = positions[id0*posStride + 1];
				bx = positions[id1*posStride];
				by = positions[id1*posStride + 1];
				cx = positions[id2*posStride];
				cy = positions[id2*posStride + 1];

				//from a to p
				var dx:number = ax - x;
				var dy:number = ay - y;

				//edge normal (a-b)
				var nx:number = by - ay;
				var ny:number = -(bx - ax);

				var dot:number = (dx*nx) + (dy*ny);

				if (dot > 0)
					continue;

				dx = bx - x;
				dy = by - y;
				nx = cy - by;
				ny = -(cx - bx);

				dot = (dx*nx) + (dy*ny);

				if (dot > 0)
					continue;

				dx = cx - x;
				dy = cy - y;
				nx = ay - cy;
				ny = -(ax - cx);

				dot = (dx*nx) + (dy*ny);

				if (dot > 0)
					continue;

				if (curves) {
					//check if not solid
					if (curves[id0*curveStride + 2] != -128) {

						var v0x:number = bx - ax;
						var v0y:number = by - ay;
						var v1x:number = cx - ax;
						var v1y:number = cy - ay;
						var v2x:number = x - ax;
						var v2y:number = y - ay;

						var den:number = v0x*v1y - v1x*v0y;
						var v:number = (v2x*v1y - v1x*v2y)/den;
						var w:number = (v0x*v2y - v2x*v0y)/den;
						//var u:number = 1 - v - w;	//commented out as inlined away

						//here be dragons
						var uu:number = 0.5*v + w;
						var vv:number = w;

						var d:number = uu*uu - vv;

						var az:number = curves[id0*curveStride];
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
		for (var k:number = 0; k < len; k += 3) {
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

			ax = positions[id0*posStride];
			ay = positions[id0*posStride + 1];
			bx = positions[id1*posStride];
			by = positions[id1*posStride + 1];
			cx = positions[id2*posStride];
			cy = positions[id2*posStride + 1];

			//from a to p
			var dx:number = ax - x;
			var dy:number = ay - y;

			//edge normal (a-b)
			var nx:number = by - ay;
			var ny:number = -(bx - ax);

			var dot:number = (dx*nx) + (dy*ny);

			if (dot > 0)
				continue;

			dx = bx - x;
			dy = by - y;
			nx = cy - by;
			ny = -(cx - bx);

			dot = (dx*nx) + (dy*ny);

			if (dot > 0)
				continue;

			dx = cx - x;
			dy = cy - y;
			nx = ay - cy;
			ny = -(ax - cx);

			dot = (dx*nx) + (dy*ny);

			if (dot > 0)
				continue;

			if (curves) {
				//check if not solid
				if (curves[id0*curveStride + 2] != -128) {

					var v0x:number = bx - ax;
					var v0y:number = by - ay;
					var v1x:number = cx - ax;
					var v1y:number = cy - ay;
					var v2x:number = x - ax;
					var v2y:number = y - ay;

					var den:number = v0x*v1y - v1x*v0y;
					var v:number = (v2x*v1y - v1x*v2y)/den;
					var w:number = (v0x*v2y - v2x*v0y)/den;
					//var u:number = 1 - v - w;	//commented out as inlined away

					//here be dragons
					var uu:number = 0.5*v + w;
					var vv:number = w;

					var d:number = uu*uu - vv;

					var az:number = curves[id0*curveStride];
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

	public static getBoxBounds(positionAttributes:AttributesView, indexAttributes:Short2Attributes, matrix3D:Matrix3D, cache:Box, target:Box, count:number, offset:number = 0):Box
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

		var i:number = 0
		var index:number;
		var pos1:number, pos2:number, pos3:number, rawData:Float32Array;
		
		if (matrix3D)
			rawData = matrix3D._rawData;

		if (target == null) {
			target = cache || new Box();
			index = (indices)? indices[i]*posStride : i*posStride;
			if (matrix3D) {
				if (posDim == 3) {
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
				pos3 = (posDim == 3)? positions[index + 2] : 0;
			}
			
			maxX = minX = pos1;
			maxY = minY = pos2;
			maxZ = minZ = (posDim == 3)? pos3 : 0;
			i++;
		} else {
			maxX = (minX = target.x) + target.width;
			maxY = (minY = target.y) + target.height;
			maxZ = (minZ = target.z) + target.depth;
		}

		for (; i < len; i++) {
			index = (indices)? indices[i]*posStride : i*posStride;

			if (matrix3D) {
				if (posDim == 3) {
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
				pos3 = (posDim == 3)? positions[index + 2] : 0;
			}

			if (pos1 < minX)
				minX = pos1;
			else if (pos1 > maxX)
				maxX = pos1;

			if (pos2 < minY)
				minY = pos2;
			else if (pos2 > maxY)
				maxY = pos2;

			if (posDim == 3) {
				if (pos3 < minZ)
					minZ = pos3;
				else if (pos3 > maxZ)
					maxZ = pos3;
			}
		}

		target.width = maxX - (target.x = minX);
		target.height = maxY - (target.y = minY);
		target.depth = maxZ - (target.z = minZ);

		return target;
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
			distanceZ = (posDim == 3)? positions[i + 2] - center.z : -center.z;
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

	public static updateTriangleGraphicsSlice9(triangleElements:TriangleElements, originalRect:Rectangle, scaleX, scaleY, init:boolean=false, copy:boolean=false):TriangleElements
	{
		// todo: for now this only works for Float2Attributes.

		if(triangleElements.slice9Indices.length!=9){
			throw("ElementUtils: Error - triangleElement does not provide valid slice9Indices!");
		}

		var s_len=triangleElements.slice9Indices.length;

		var innerWidth:number=originalRect.width - (triangleElements.slice9offsets.x + triangleElements.slice9offsets.width)/scaleX;

		var innerHeight:number=originalRect.height - (triangleElements.slice9offsets.y + triangleElements.slice9offsets.height)/scaleY;

		if (innerWidth < 0) {
			innerWidth = 0;

			scaleX = (triangleElements.slice9offsets.x + triangleElements.slice9offsets.width)/originalRect.width;
		}


		if (innerHeight < 0) {
			innerHeight = 0;

			scaleY = (triangleElements.slice9offsets.y + triangleElements.slice9offsets.height)/originalRect.height;
		}


		var newElem:TriangleElements;
		var positions:ArrayBufferView;
		if(copy){

			var newverts:Uint8Array = new Uint8Array(triangleElements.positions.count*8);
			while (v < triangleElements.positions.count*2) {
				newverts[v] = positions[v++];
				newverts[v] = positions[v++];
			}
			var vertexBuffer:AttributesBuffer = new AttributesBuffer(8, triangleElements.positions.count);
			vertexBuffer.bufferView = newverts;
			var newElem:TriangleElements=new TriangleElements(vertexBuffer);
			newElem.setPositions(new Float2Attributes(vertexBuffer));
			newElem.slice9offsets=triangleElements.slice9offsets;
			newElem.initialSlice9Positions=triangleElements.initialSlice9Positions;
			newElem.slice9Indices=triangleElements.slice9Indices;

			positions=newElem.positions.get(newElem.positions.count);

			v=0;
		}
		else{

			positions=triangleElements.positions.get(triangleElements.positions.count);

		}

		// todo: i had trouble when just cloning the positions 
		//	for now i just create the initialSlice9Positions by iterating the positions

		var v:number=0;

		var init_positions:number[];
		if(init){
			init_positions=[];
			init_positions.length=triangleElements.positions.count*2;
			while (v < triangleElements.positions.count*2) {
				init_positions[v] = positions[v++];
				init_positions[v] = positions[v++];
			}
			triangleElements.initialSlice9Positions=init_positions;
		}
		else{
			init_positions=triangleElements.initialSlice9Positions;
		}

		var slice9Indices:number[]=triangleElements.slice9Indices;

		var s:number=0;
		v=0;

		var slice9Offsets_x:number[]=[];
		slice9Offsets_x.length=3;
		var slice9Offsets_y:number[]=[];
		slice9Offsets_y.length=3;

		slice9Offsets_x[0]=originalRect.x;
		slice9Offsets_x[1]=originalRect.x+triangleElements.slice9offsets.x/scaleX;
		slice9Offsets_x[2]=originalRect.x+triangleElements.slice9offsets.x/scaleX+innerWidth;

		slice9Offsets_y[0]=originalRect.y;
		slice9Offsets_y[1]=originalRect.y+triangleElements.slice9offsets.y/scaleY;
		slice9Offsets_y[2]=originalRect.y+triangleElements.slice9offsets.y/scaleY+innerHeight;

		//console.log("slice9Offsets_x",slice9Offsets_x);
		//console.log("slice9Offsets_y",slice9Offsets_x);

		var row_cnt:number=-1;
		var col_cnt:number=0;
		var scalex:number=0;
		var scaley:number=0;
		var offsetx:number=0;
		var offsety:number=0;

		// iterating over the 9 chunks - keep in mind that we are constructing a 3x3 grid:
		for(s=0;s<s_len;s++){

			// keep track of column and row index
			if(row_cnt==2){
				col_cnt++;
				row_cnt=-1;
			}
			row_cnt++;

			// only need to x-scale if this is the middle column
			// if the innerWidth<=0 we can skip this complete column
			if(col_cnt==1){
				scalex=innerWidth;
			} else {
				scalex=1/scaleX;
			}

			// only need to y-scale if this is the middle row
			// if the innerHeight<=0 we can skip this complete row
			if(row_cnt==1){
				scaley=innerHeight;
			} else {
				scaley=1/scaleY;
			}

			// offsetx is different for each column
			offsetx=slice9Offsets_x[col_cnt];

			// offsety is different for each row
			offsety=slice9Offsets_y[row_cnt];


			// iterate the verts and apply the translation / scale
			while (v < slice9Indices[s]) {

				positions[v] = offsetx + (init_positions[v++] * scalex);
				positions[v] = offsety + (init_positions[v++] * scaley);

			}

		}
		//console.log("positions",positions);
		if(copy){
			newElem.positions.invalidate();
			return newElem;
		}
		triangleElements.positions.invalidate();
		return triangleElements;
	}
}