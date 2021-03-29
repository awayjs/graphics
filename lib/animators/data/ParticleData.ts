import { TriangleElements } from '@awayjs/renderer';

export class ParticleData {
	public particleIndex: number /*uint*/;
	public numVertices: number /*uint*/;
	public startVertexIndex: number /*uint*/;
	public elements: TriangleElements;
}