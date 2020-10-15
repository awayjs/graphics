import { Matrix, Matrix3D, Point, Vector3D } from '@awayjs/core';

import { AttributesBuffer } from '@awayjs/stage';

import { Shape } from '../renderables/Shape';
import { TriangleElements } from '../elements/TriangleElements';
import { ParticleCollection } from '../animators/data/ParticleCollection';
import { ParticleData } from '../animators/data/ParticleData';

import { Graphics } from '../Graphics';

import { ParticleGraphicsTransform } from './ParticleGraphicsTransform';

/**
 * ...
 */
export class ParticleGraphicsHelper {
	public static MAX_VERTEX: number = 65535;

	public static generateGraphics(output: Graphics, graphicsArray: Array<Graphics>, transforms: Array<ParticleGraphicsTransform> = null): void {
		const indicesVector: Array<Array<number>> = new Array<Array<number>>();
		const positionsVector: Array<Array<number>> = new Array<Array<number>>();
		const normalsVector: Array<Array<number>> = new Array<Array<number>>();
		const tangentsVector: Array<Array<number>> = new Array<Array<number>>();
		const uvsVector: Array<Array<number>> = new Array<Array<number>>();
		const vertexCounters: Array<number> = new Array<number>();
		const particles: Array<ParticleData> = new Array<ParticleData>();
		const elementsArray: Array<TriangleElements> = new Array<TriangleElements>();
		const numParticles: number = graphicsArray.length;

		let sourceGraphics: Graphics;
		let sourceElements: TriangleElements;
		let numGraphics: number;
		let indices: Array<number>;
		let positions: Array<number>;
		let normals: Array<number>;
		let tangents: Array<number>;
		let uvs: Array<number>;
		let vertexCounter: number;
		let elements: TriangleElements;
		let i: number;
		let j: number;
		const sub2SubMap: Array<number> = new Array<number>();

		let tempVertex: Vector3D = new Vector3D;
		let tempNormal: Vector3D = new Vector3D;
		let tempTangents: Vector3D = new Vector3D;
		let tempUV: Point = new Point;

		for (i = 0; i < numParticles; i++) {
			sourceGraphics = graphicsArray[i];
			numGraphics = sourceGraphics.count;
			for (let srcIndex: number = 0; srcIndex < numGraphics; srcIndex++) {
				//create a different particle subgeometry group for each source subgeometry in a particle.
				if (sub2SubMap.length <= srcIndex) {
					sub2SubMap.push(elementsArray.length);
					indicesVector.push(new Array<number>());
					positionsVector.push(new Array<number>());
					normalsVector.push(new Array<number>());
					tangentsVector.push(new Array<number>());
					uvsVector.push(new Array<number>());
					elementsArray.push(new TriangleElements(new AttributesBuffer()));
					vertexCounters.push(0);
				}

				sourceElements = <TriangleElements> sourceGraphics.getShapeAt(srcIndex).elements;

				//add a new particle subgeometry if this source subgeometry will take us over the maxvertex limit
				if (sourceElements.numVertices + vertexCounters[sub2SubMap[srcIndex]] > ParticleGraphicsHelper.MAX_VERTEX) {
					//update submap and add new subgeom vectors
					sub2SubMap[srcIndex] = elementsArray.length;
					indicesVector.push(new Array<number>());
					positionsVector.push(new Array<number>());
					normalsVector.push(new Array<number>());
					tangentsVector.push(new Array<number>());
					uvsVector.push(new Array<number>());
					elementsArray.push(new TriangleElements(new AttributesBuffer()));
					vertexCounters.push(0);
				}

				j = sub2SubMap[srcIndex];

				//select the correct vector
				indices = indicesVector[j];
				positions = positionsVector[j];
				normals = normalsVector[j];
				tangents = tangentsVector[j];
				uvs = uvsVector[j];
				vertexCounter = vertexCounters[j];
				elements = elementsArray[j];

				const particleData: ParticleData = new ParticleData();
				particleData.numVertices = sourceElements.numVertices;
				particleData.startVertexIndex = vertexCounter;
				particleData.particleIndex = i;
				particleData.elements = elements;
				particles.push(particleData);

				vertexCounters[j] += sourceElements.numVertices;

				var k: number;
				var index: number;
				var posIndex: number;
				var normalIndex: number;
				var tangentIndex: number;
				var uvIndex: number;

				var tempLen: number;
				const compact: TriangleElements = sourceElements;
				var sourcePositions: ArrayBufferView;
				var posStride: number;
				var sourceNormals: Float32Array;
				var normalStride: number;
				var sourceTangents: Float32Array;
				var tangentStride: number;
				var sourceUVs: ArrayBufferView;
				var uvStride: number;

				if (compact) {
					tempLen = compact.numVertices;
					sourcePositions = compact.positions.get(tempLen);
					posStride = compact.positions.stride;
					sourceNormals = compact.normals.get(tempLen);
					normalStride = compact.normals.stride;
					sourceTangents = compact.tangents.get(tempLen);
					tangentStride = compact.tangents.stride;
					sourceUVs = compact.uvs.get(tempLen);
					uvStride = compact.uvs.stride;

					if (transforms) {
						const particleGraphicsTransform: ParticleGraphicsTransform = transforms[i];
						const vertexTransform: Matrix3D = particleGraphicsTransform.vertexTransform;
						const invVertexTransform: Matrix3D = particleGraphicsTransform.invVertexTransform;
						const UVTransform: Matrix = particleGraphicsTransform.UVTransform;

						for (k = 0; k < tempLen; k++) {
							/*
							 * 0 - 2: vertex position X, Y, Z
							 * 3 - 5: normal X, Y, Z
							 * 6 - 8: tangent X, Y, Z
							 * 9 - 10: U V
							 * 11 - 12: Secondary U V*/
							posIndex = k * posStride;
							tempVertex.x = sourcePositions[posIndex];
							tempVertex.y = sourcePositions[posIndex + 1];
							tempVertex.z = sourcePositions[posIndex + 2];
							normalIndex = k * normalStride;
							tempNormal.x = sourceNormals[normalIndex];
							tempNormal.y = sourceNormals[normalIndex + 1];
							tempNormal.z = sourceNormals[normalIndex + 2];
							tangentIndex = k * tangentStride;
							tempTangents.x = sourceTangents[tangentIndex];
							tempTangents.y = sourceTangents[tangentIndex + 1];
							tempTangents.z = sourceTangents[tangentIndex + 2];
							uvIndex = k * uvStride;
							tempUV.x = sourceUVs[uvIndex];
							tempUV.y = sourceUVs[uvIndex + 1];
							if (vertexTransform) {
								tempVertex = vertexTransform.transformVector(tempVertex);
								tempNormal = invVertexTransform.deltaTransformVector(tempNormal);
								tempTangents = invVertexTransform.deltaTransformVector(tempNormal);
							}
							if (UVTransform)
								tempUV = UVTransform.transformPoint(tempUV);
							//this is faster than that only push one data
							positions.push(tempVertex.x, tempVertex.y, tempVertex.z);
							normals.push(tempNormal.x, tempNormal.y, tempNormal.z);
							tangents.push(tempTangents.x, tempTangents.y, tempTangents.z);
							uvs.push(tempUV.x, tempUV.y);
						}
					} else {
						for (k = 0; k < tempLen; k++) {
							posIndex = k * posStride;
							normalIndex = k * normalStride;
							tangentIndex = k * tangentStride;
							uvIndex = k * uvStride;
							//this is faster than that only push one data
							positions.push(sourcePositions[posIndex], sourcePositions[posIndex + 1], sourcePositions[posIndex + 2]);
							normals.push(sourceNormals[normalIndex], sourceNormals[normalIndex + 1], sourceNormals[normalIndex + 2]);
							tangents.push(sourceTangents[tangentIndex], sourceTangents[tangentIndex + 1], sourceTangents[tangentIndex + 2]);
							uvs.push(sourceUVs[uvIndex], sourceUVs[uvIndex + 1]);
						}
					}
				} else {
					//Todo
				}

				tempLen = sourceElements.numElements;
				const sourceIndices: Uint16Array = sourceElements.indices.get(tempLen);
				for (k = 0; k < tempLen; k++) {
					index = k * 3;
					indices.push(sourceIndices[index] + vertexCounter, sourceIndices[index + 1] + vertexCounter, sourceIndices[index + 2] + vertexCounter);
				}
			}
		}

		let shape: Shape;
		const particleCollection: ParticleCollection = new ParticleCollection();
		particleCollection.elements = elementsArray;
		particleCollection.numElements = elementsArray.length;
		particleCollection.particles = particles;
		particleCollection.numParticles = numParticles;

		for (i = 0; i < particleCollection.numElements; i++) {
			elements = elementsArray[i];
			elements.autoDeriveNormals = false;
			elements.autoDeriveTangents = false;
			elements.setIndices(indicesVector[i]);
			elements.setPositions(positionsVector[i]);
			elements.setNormals(normalsVector[i]);
			elements.setTangents(tangentsVector[i]);
			elements.setUVs(uvsVector[i]);
			shape = Shape.getShape(elements);
			shape.particleCollection = particleCollection;
			output.addShape(shape);
		}
	}
}