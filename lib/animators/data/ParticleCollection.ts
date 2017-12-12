import {IElements} from "@awayjs/renderer";

import {ParticleData} from "./ParticleData";

export class ParticleCollection
{
	public elements:Array<IElements>;
	public numElements:number;
	public particles:Array<ParticleData>;
	public numParticles:number;
}