import {Transform, Box, ColorTransform, Sphere, Matrix3D, Vector3D, IAsset} from "@awayjs/core";

import {IMaterial} from "../base/IMaterial";
import {Style} from "../base/Style";
import {IAnimator} from "../animators/IAnimator";
import {PickingCollision} from "../pick/PickingCollision";

import {TraverserBase} from "./TraverserBase";

export interface IEntity extends IAsset
{
	/**
	 * The animation used by the material owner to assemble the vertex code.
	 */
	animator:IAnimator;

	style:Style;
	
	material:IMaterial;
	
	parent:IEntity;

	_depthID:number;
	
	isEntity:boolean;
	
	isContainer:boolean;
	
	isPartition:boolean;
	
	traverseName:string;

	_iInternalUpdate():void;
	
	_iMasksConfig():Array<Array<number>>;

	_iAssignedMaskId():number;

	_iAssignedColorTransform():ColorTransform;

	_iAssignedMasks():Array<Array<IEntity>>;

	_iPickingCollision:PickingCollision;
	
	maskMode:boolean;

	getBox():Box;

	getSphere():Sphere;

	transform:Transform;

	partition:IEntity;

	/**
	 *
	 */
	debugVisible:boolean;

	/**
	 *
	 */
	boundsType:string;

	/**
	 *
	 */
	castsShadows:boolean;

	/**
	 *
	 */
	scenePosition:Vector3D;

	/**
	 *
	 */
	zOffset:number;

	/**
	 * @internal
	 */
	_iIsMouseEnabled():boolean;

	/**
	 * @internal
	 */
	_iIsVisible():boolean;

	/**
	 * The transformation matrix that transforms from model to world space, adapted with any special operations needed to render.
	 * For example, assuring certain alignedness which is not inherent in the scene transform. By default, this would
	 * return the scene transform.
	 */
	getRenderSceneTransform(cameraTransform:Matrix3D):Matrix3D;

	/**
	 *
	 * @param renderer
	 * @private
	 */
	_acceptTraverser(traverser:TraverserBase);

	hitTestPoint(x:number, y:number, shapeFlag?:boolean, masksFlag?:boolean):boolean;

	invalidateMaterial();

	invalidateElements();
}