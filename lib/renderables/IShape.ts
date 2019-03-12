import { IMaterial, IRenderable } from '@awayjs/renderer';
import { Matrix3D } from '@awayjs/core';
import { ElementsBase } from '../elements/ElementsBase';
import { ParticleCollection } from '../animators/data/ParticleCollection';

/**
 * 
 */
export interface IShape extends IRenderable
{
    offset:number;

    count:number;
    
    particleCollection:ParticleCollection;

    elements:ElementsBase;

    material:IMaterial;

    invalidateElements():void;

    invalidateMaterial():void;

    applyTransformation(transform:Matrix3D):void;

    scale(scale:number):void;

    scaleUV(scaleU?:number, scaleV?:number):void;

}