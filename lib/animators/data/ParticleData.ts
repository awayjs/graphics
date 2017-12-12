import {TriangleElements} from "../../elements/TriangleElements";

export class ParticleData
{
    public particleIndex: number /*uint*/;
    public numVertices: number /*uint*/;
    public startVertexIndex: number /*uint*/;
    public elements: TriangleElements;
}