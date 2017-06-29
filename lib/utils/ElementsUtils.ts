import {AttributesBuffer, AttributesView, Short2Attributes, Short3Attributes, Float2Attributes, Float3Attributes, Float4Attributes, Byte4Attributes, Matrix3D, Vector3D, Box, Sphere, Rectangle, Point} from "@awayjs/core";

import {TriangleElements} from "../elements/TriangleElements";

import {HitTestCache} from "./HitTestCache";

export class ElementsUtils
{
	private static tempFloat32x4:Float32Array = new Float32Array(4);

	private static LIMIT_VERTS:number = 0xffff;

	private static LIMIT_INDICES:number = 0xffffff;

	private static _indexSwap:Array<number> = new Array<number>();

	public static generateFaceNormals(indexAttributes:Short3Attributes, positionAttributes:AttributesView, faceNormalAttributes:Float4Attributes, count:number, offset:number = 0):Float4Attributes
	{
		var indices:Uint16Array = indexAttributes.get(count, offset);
		var positions:ArrayBufferView = positionAttributes.get(positionAttributes.count);

		if (faceNormalAttributes == null)
			faceNormalAttributes = new Float4Attributes(count + offset);
		else if (faceNormalAttributes.count < count + offset)
			faceNormalAttributes.count = count + offset;

		var indexDim:number = indexAttributes.stride;
		var posDim:number = positionAttributes.dimensions;
		var posStride:number = positionAttributes.stride;

		var faceNormals:Float32Array = faceNormalAttributes.get(count, offset);

		var len:number = count*indexDim;
		var i:number = 0;
		var j:number = 0;
		var index:number;

		var x1:number, x2:number, x3:number;
		var y1:number, y2:number, y3:number;
		var z1:number, z2:number, z3:number;
		var dx1:number, dy1:number, dz1:number;
		var dx2:number, dy2:number, dz2:number;
		var cx:number, cy:number, cz:number;
		var d:number;

		if (posDim == 3) {
			for (i = 0; i < len; i += indexDim) {
				index = indices[i]*posStride;
				x1 = positions[index];
				y1 = positions[index + 1];
				z1 = positions[index + 2];
				index = indices[i + 1]*posStride;
				x2 = positions[index];
				y2 = positions[index + 1];
				z2 = positions[index + 2];
				index = indices[i + 2]*posStride;
				x3 = positions[index];
				y3 = positions[index + 1];
				z3 = positions[index + 2];
				dx1 = x3 - x1;
				dy1 = y3 - y1;
				dz1 = z3 - z1;
				dx2 = x2 - x1;
				dy2 = y2 - y1;
				dz2 = z2 - z1;
				cx = dz1*dy2 - dy1*dz2;
				cy = dx1*dz2 - dz1*dx2;
				cz = dy1*dx2 - dx1*dy2;
				d = Math.sqrt(cx*cx + cy*cy + cz*cz);
				// length of cross product = 2*triangle area

				faceNormals[j++] = cx;
				faceNormals[j++] = cy;
				faceNormals[j++] = cz;
				faceNormals[j++] = d;
			}
		} else if (posDim == 2) {
			for (i = 0; i < len; i += indexDim) {
				faceNormals[j++] = 0;
				faceNormals[j++] = 0;
				faceNormals[j++] = 1;
				faceNormals[j++] = 1;
			}
		}

		return faceNormalAttributes;
	}

	public static generateNormals(indexAttributes:Short3Attributes, faceNormalAttributes:Float4Attributes, normalAttributes:Float3Attributes, concatenatedBuffer:AttributesBuffer):Float3Attributes
	{
		var indices:Uint16Array = indexAttributes.get(indexAttributes.count);
		var faceNormals:Float32Array = faceNormalAttributes.get(faceNormalAttributes.count);

		if (normalAttributes == null)
			normalAttributes = new Float3Attributes(concatenatedBuffer);

		var indexDim:number = indexAttributes.dimensions;
		var normalStride:number = normalAttributes.stride;

		var normals:Float32Array = normalAttributes.get(normalAttributes.count);

		var i:number;
		var len:number = normalAttributes.count*normalStride;

		//clear normal values
		for (i = 0; i < len; i += normalStride) {
			normals[i] = 0;
			normals[i + 1] = 0;
			normals[i + 2] = 0;
		}

		len = indexAttributes.count*indexDim;
		var index:number;
		var f1:number = 0;
		var f2:number = 1;
		var f3:number = 2;

		//collect face normals
		for (i = 0; i < len; i += indexDim) {
			index = indices[i]*normalStride;
			normals[index] += faceNormals[f1];
			normals[index + 1] += faceNormals[f2];
			normals[index + 2] += faceNormals[f3];
			index = indices[i + 1]*normalStride;
			normals[index] += faceNormals[f1];
			normals[index + 1] += faceNormals[f2];
			normals[index + 2] += faceNormals[f3];
			index = indices[i + 2]*normalStride;
			normals[index] += faceNormals[f1];
			normals[index + 1] += faceNormals[f2];
			normals[index + 2] += faceNormals[f3];
			f1 += 4;
			f2 += 4;
			f3 += 4;
		}

		len = normalAttributes.count*normalStride;
		var vx:number;
		var vy:number;
		var vz:number;
		var d:number;

		//normalise normals collections
		for (i = 0; i < len; i += normalStride) {
			vx = normals[i];
			vy = normals[i + 1];
			vz = normals[i + 2];
			d = 1.0/Math.sqrt(vx*vx + vy*vy + vz*vz);

			normals[i] = vx*d;
			normals[i + 1] = vy*d;
			normals[i + 2] = vz*d;
		}

		return normalAttributes;
	}

	public static generateFaceTangents(indexAttributes:Short3Attributes, positionAttributes:AttributesView, uvAttributes:AttributesView, faceTangentAttributes:Float4Attributes, count:number, offset:number = 0, useFaceWeights:boolean = false):Float4Attributes
	{
		var indices:Uint16Array = indexAttributes.get(count, offset);
		var positions:ArrayBufferView = positionAttributes.get(positionAttributes.count);
		var uvs:Float32Array = <Float32Array> uvAttributes.get(uvAttributes.count);

		if (faceTangentAttributes == null)
			faceTangentAttributes = new Float4Attributes(count + offset);
		else if (faceTangentAttributes.count < count + offset)
			faceTangentAttributes.count = count + offset;

		var indexDim:number = indexAttributes.dimensions;
		var posDim:number = positionAttributes.dimensions;
		var posStride:number = positionAttributes.stride;
		var uvStride:number = uvAttributes.stride;

		var faceTangents:Float32Array = faceTangentAttributes.get(count, offset);

		var i:number = 0;
		var index1:number;
		var index2:number;
		var index3:number;
		var v0:number;
		var v1:number;
		var v2:number;
		var dv1:number;
		var dv2:number;
		var denom:number;
		var x0:number, y0:number, z0:number;
		var dx1:number, dy1:number, dz1:number;
		var dx2:number, dy2:number, dz2:number;
		var cx:number, cy:number, cz:number;

		//multiply by dimension to get index length
		var len:number = count*indexDim;
		for (i = 0; i < len; i += indexDim) {
			index1 = indices[i];
			index2 = indices[i + 1];
			index3 = indices[i + 2];

			v0 = uvs[index1*uvStride + 1];
			dv1 = uvs[index2*uvStride + 1] - v0;
			dv2 = uvs[index3*uvStride + 1] - v0;

			v0 = index1*posStride;
			v1 = index2*posStride;
			v2 = index3*posStride;

			x0 = positions[v0];
			dx1 = positions[v1] - x0;
			dx2 = positions[v2] - x0;
			cx = dv2*dx1 - dv1*dx2;

			y0 = positions[v0 + 1];
			dy1 = positions[v1 + 1] - y0;
			dy2 = positions[v2 + 1] - y0;
			cy = dv2*dy1 - dv1*dy2;

			if (posDim == 3) {
				z0 = positions[v0 + 2];
				dz1 = positions[v1 + 2] - z0;
				dz2 = positions[v2 + 2] - z0;
				cz = dv2*dz1 - dv1*dz2;
			} else {
				cz = 0;
			}

			denom = 1/Math.sqrt(cx*cx + cy*cy + cz*cz);

			faceTangents[i] = denom*cx;
			faceTangents[i + 1] = denom*cy;
			faceTangents[i + 2] = denom*cz;
		}

		return faceTangentAttributes;
	}

	public static generateTangents(indexAttributes:Short3Attributes, faceTangentAttributes:Float3Attributes, faceNormalAttributes:Float4Attributes, tangentAttributes:Float3Attributes, concatenatedBuffer:AttributesBuffer):Float3Attributes
	{
		var indices:Uint16Array = indexAttributes.get(indexAttributes.count);
		var faceTangents:Float32Array = faceTangentAttributes.get(faceTangentAttributes.count);
		var faceNormals:Float32Array = faceNormalAttributes.get(faceNormalAttributes.count);

		if (tangentAttributes == null)
			tangentAttributes = new Float3Attributes(concatenatedBuffer);

		var indexDim:number = indexAttributes.dimensions;
		var tangentStride:number = tangentAttributes.stride;

		var tangents:Float32Array = tangentAttributes.get(tangentAttributes.count);

		var i:number;
		var len:number = tangentAttributes.count*tangentStride;

		//clear tangent values
		for (i = 0; i < len; i += tangentStride) {
			tangents[i] = 0;
			tangents[i + 1] = 0;
			tangents[i + 2] = 0;
		}

		var weight:number;
		var index:number;
		var f1:number = 0;
		var f2:number = 1;
		var f3:number = 2;
		var f4:number = 3;

		len = indexAttributes.count*indexDim;

		//collect face tangents
		for (i = 0; i < len; i += indexDim) {
			weight = faceNormals[f4];
			index = indices[i]*tangentStride;
			tangents[index++] += faceTangents[f1]*weight;
			tangents[index++] += faceTangents[f2]*weight;
			tangents[index] += faceTangents[f3]*weight;
			index = indices[i + 1]*tangentStride;
			tangents[index++] += faceTangents[f1]*weight;
			tangents[index++] += faceTangents[f2]*weight;
			tangents[index] += faceTangents[f3]*weight;
			index = indices[i + 2]*tangentStride;
			tangents[index++] += faceTangents[f1]*weight;
			tangents[index++] += faceTangents[f2]*weight;
			tangents[index] += faceTangents[f3]*weight;
			f1 += 3;
			f2 += 3;
			f3 += 3;
			f4 += 4;
		}

		var vx:number;
		var vy:number;
		var vz:number;
		var d:number;

		//normalise tangents collections
		for (i = 0; i < len; i += tangentStride) {
			vx = tangents[i];
			vy = tangents[i + 1];
			vz = tangents[i + 2];
			d = 1.0/Math.sqrt(vx*vx + vy*vy + vz*vz);

			tangents[i] = vx*d;
			tangents[i + 1] = vy*d;
			tangents[i + 2] = vz*d;
		}

		return tangentAttributes;
	}

	public static generateColors(indexAttributes:Short3Attributes, colorAttributes:Byte4Attributes, concatenatedBuffer:AttributesBuffer, count:number, offset:number = 0):Byte4Attributes
	{
		if (colorAttributes == null)
			colorAttributes = new Byte4Attributes(concatenatedBuffer);

		if (colorAttributes.count < count + offset)
			colorAttributes.count = count + offset;

		var colors:Uint8Array = colorAttributes.get(count, offset);
		var colorStride:number = colorAttributes.stride;

		var len:number = colorAttributes.count*colorStride;
		for (var i:number = 0; i < len; i += colorStride) {
			colors[i] = 0xFF;
			colors[i + 1] = 0xFF;
			colors[i + 2] = 0xFF;
			colors[i + 3] = 0xFF;
		}

		return colorAttributes;
	}

	public static scale(scaleA:number, scaleB:number, scaleC:number, output:AttributesView, count:number, offset:number = 0):void
	{
		if (output.count < count + offset)
			output.count = count + offset;

		var scaleArray:Float32Array = new Float32Array([scaleA, scaleB, scaleC]);
		var values:ArrayBufferView = output.get(count, offset);
		var outputStride:number = output.stride;
		var outputDim:number = output.dimensions;

		var i:number;
		var j:number;
		var len:number = count*outputStride;

		for (i = 0; i < len; i += outputStride)
			for (j = 0; j < outputDim; j++)
				values[i+j] *= scaleArray[j];

		output.invalidate();
	}

	public static applyTransformation(transform:Matrix3D, positionAttributes:AttributesView, normalAttributes:Float3Attributes, tangentAttributes:Float3Attributes, count:number, offset:number = 0):void
	{
		//todo: make this compatible with 2-dimensional positions
		var positions:ArrayBufferView = positionAttributes.get(count, offset);
		var positionStride:number = positionAttributes.stride;

		var normals:Float32Array;
		var normalStride:number;

		if (normalAttributes) {
			normals = normalAttributes.get(count, offset);
			normalStride = normalAttributes.stride;
		}

		var tangents:Float32Array;
		var tangentStride:number;

		if (tangentAttributes) {
			tangents = tangentAttributes.get(count, offset);
			tangentStride = tangentAttributes.stride;
		}

		var i:number;
		var i1:number;
		var i2:number;
		var vector:Vector3D = new Vector3D();
		var invTranspose:Matrix3D;

		if (normalAttributes || tangentAttributes) {
			invTranspose = transform.clone();
			invTranspose.invert();
			invTranspose.transpose();
		}

		var vi0:number = 0;
		var ni0:number = 0;
		var ti0:number = 0;

		for (i = 0; i < count; ++i) {
			// bake position
			i1 = vi0 + 1;
			i2 = vi0 + 2;
			vector.x = positions[vi0];
			vector.y = positions[i1];
			vector.z = positions[i2];
			vector = transform.transformVector(vector);
			positions[vi0] = vector.x;
			positions[i1] = vector.y;
			positions[i2] = vector.z;
			vi0 += positionStride;

			if	(normals) {
				// bake normal
				i1 = ni0 + 1;
				i2 = ni0 + 2;
				vector.x = normals[ni0];
				vector.y = normals[i1];
				vector.z = normals[i2];
				vector = invTranspose.deltaTransformVector(vector);
				vector.normalize();
				normals[ni0] = vector.x;
				normals[i1] = vector.y;
				normals[i2] = vector.z;
				ni0 += normalStride;
			}

			if (tangents) {
				// bake tangent
				i1 = ti0 + 1;
				i2 = ti0 + 2;
				vector.x = tangents[ti0];
				vector.y = tangents[i1];
				vector.z = tangents[i2];
				vector = invTranspose.deltaTransformVector(vector);
				vector.normalize();
				tangents[ti0] = vector.x;
				tangents[i1] = vector.y;
				tangents[i2] = vector.z;
				ti0 += tangentStride;
			}
		}

		positionAttributes.invalidate();

		if (normalAttributes)
			normalAttributes.invalidate();

		if (tangentAttributes)
			tangentAttributes.invalidate();
	}

	public static getSubIndices(indexAttributes:Short2Attributes, numVertices:number, indexMappings:Array<number>, indexOffset?:number):AttributesBuffer;
	public static getSubIndices(indexAttributes:Short3Attributes, numVertices:number, indexMappings:Array<number>, indexOffset?:number):AttributesBuffer;
	public static getSubIndices(indexAttributes:AttributesView, numVertices:number, indexMappings:Array<number>, indexOffset:number = 0):AttributesBuffer
	{
		var buffer:AttributesBuffer = indexAttributes.attributesBuffer;
		var numIndices:number = indexAttributes.length;

		//reset mappings
		indexMappings.length = 0;

		//shortcut for those buffers that fit into the maximum buffer sizes
		if (numIndices < ElementsUtils.LIMIT_INDICES && numVertices < ElementsUtils.LIMIT_VERTS)
			return buffer;

		var i:number;
		var indices:Uint16Array = <Uint16Array> indexAttributes.get(indexAttributes.count, indexOffset);
		var splitIndices:Array<number> = new Array<number>();
		var indexSwap:Array<number> = ElementsUtils._indexSwap;


		indexSwap.length = numIndices;
		for (i = 0; i < numIndices; i++)
			indexSwap[i] = -1;

		var originalIndex:number;
		var splitIndex:number;
		var index:number = 0;
		var offsetLength:number = indexOffset*indexAttributes.dimensions;

		// Loop over all triangles

		i = 0;
		while (i < numIndices + offsetLength && i + 1 < ElementsUtils.LIMIT_INDICES && index + 1 < ElementsUtils.LIMIT_VERTS) {
			originalIndex = indices[i];

			if (indexSwap[originalIndex] >= 0) {
				splitIndex = indexSwap[originalIndex];
			} else {
				// This vertex does not yet exist in the split list and
				// needs to be copied from the long list.
				splitIndex = index++;
				indexSwap[originalIndex] = splitIndex;
				indexMappings[splitIndex] = originalIndex;
			}

			// Store new index, which may have come from the swap look-up,
			// or from copying a new set of vertex data from the original vector
			splitIndices[i++] = splitIndex;
		}

		buffer = new AttributesBuffer(indexAttributes.size*indexAttributes.dimensions, splitIndices.length/indexAttributes.dimensions);

		indexAttributes = indexAttributes.clone(buffer);
		indexAttributes.set(splitIndices);

		return buffer;
	}

	public static getSubVertices(vertexBuffer:AttributesBuffer, indexMappings:Array<number>):AttributesBuffer
	{
		if (!indexMappings.length)
			return vertexBuffer;

		var stride:number = vertexBuffer.stride;

		var vertices:Uint8Array = vertexBuffer.bufferView;

		var splitVerts:Uint8Array = new Uint8Array(indexMappings.length*stride);
		var splitIndex:number;
		var originalIndex:number;
		var i:number = 0;
		var j:number = 0;
		var len:number = indexMappings.length;
		for (i = 0; i < len; i++) {
			splitIndex = i*stride;
			originalIndex = indexMappings[i]*stride;

			for (j = 0; j < stride; j++)
				splitVerts[splitIndex + j] = vertices[originalIndex + j];
		}

		vertexBuffer = new AttributesBuffer(stride, len);
		vertexBuffer.bufferView = splitVerts;

		return vertexBuffer;
	}

	//TODO - generate this dyanamically based on num tris

	public static hitTestTriangleElements(x:number, y:number, z:number, box:Box, triangleElements:TriangleElements, count:number, offset:number = 0):boolean
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

				//console.log(ax, ay, bx, by, cx, cy);

				//from a to p
				var dx:number = ax - x;
				var dy:number = ay - y;

				//edge normal (a-b)
				var nx:number = by - ay;
				var ny:number = -(bx - ax);

				//console.log(ax,ay,bx,by,cx,cy);

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
						id2 = k + 0;
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
							var index:number = i + j*divisions;
							var nodes:Array<number> = cells[index] || (cells[index] = new Array<number>());

							//push in the triangle ids
							nodes.push(id0, id1, id2);
						}
					}
				}
			}

			var index_x:number = Math.floor((x - minx)*conversionX);
			var index_y:number = Math.floor((y - miny)*conversionY);

			if ((index_x < 0 || index_x > divisions || index_y < 0 || index_y > divisions))
				return false;

			var nodes:Array<number> = cells[index_x + index_y*divisions];

			if (nodes == null)
				return false;

			var nodeCount:number = nodes.length;
			for (var k:number = 0; k < nodeCount; k += 3) {
				id2 = nodes[k + 2];

				if (id2 == index) continue;

				id1 = nodes[k + 1];
				id0 = nodes[k];

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

						if (d > 0 && az == -128)
							continue; else if (d < 0 && az == 127)
							continue;
					}
				}
				hitTestCache.lastCollisionIndex = id2;
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

			//console.log(ax, ay, bx, by, cx, cy);

			//from a to p
			var dx:number = ax - x;
			var dy:number = ay - y;

			//edge normal (a-b)
			var nx:number = by - ay;
			var ny:number = -(bx - ax);

			//console.log(ax,ay,bx,by,cx,cy);

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

	public static getTriangleGraphicsBoxBounds(positionAttributes:AttributesView, indexAttributes:Short2Attributes, output:Box, count:number, offset:number = 0):Box
	{
		var positions:ArrayBufferView;
		var posDim:number = positionAttributes.dimensions;
		var posStride:number = positionAttributes.stride;

		var pos:number;
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

		var index:number;
		for (var i:number = 0; i < len; i++) {
			index = (indices)? indices[i]*posStride : i*posStride;

			if (i == 0) {
				maxX = minX = positions[index];
				maxY = minY = positions[index + 1];
				maxZ = minZ = (posDim == 3)? positions[index + 2] : 0;
			} else {
				pos = positions[index];
				if (pos < minX)
					minX = pos;
				else if (pos > maxX)
					maxX = pos;

				pos = positions[index + 1];

				if (pos < minY)
					minY = pos;
				else if (pos > maxY)
					maxY = pos;

				if (posDim == 3) {
					pos = positions[index + 2];

					if (pos < minZ)
						minZ = pos;
					else if (pos > maxZ)
						maxZ = pos;
				}
			}
		}

		if (output == null)
			output = new Box();

		output.x = minX;
		output.y = minY;
		output.z = minZ;
		output.right = maxX;
		output.bottom = maxY;
		output.back = maxZ;

		return output;
	}

	public static getTriangleGraphicsSphereBounds(positionAttributes:AttributesView, center:Vector3D, output:Sphere, count:number, offset:number = 0):Sphere
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

		var innerWidth:number=originalRect.width-triangleElements.slice9offsets.x/scaleX-triangleElements.slice9offsets.width/scaleX;

		var innerHeight:number=originalRect.height-triangleElements.slice9offsets.y/scaleY-triangleElements.slice9offsets.height/scaleY;

		if (innerWidth < 0)
			innerWidth = 0;

		if (innerHeight < 0)
			innerHeight = 0;

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