import {Box}				from "@awayjs/core/lib/geom/Box";
import {ColorTransform}				from "@awayjs/core/lib/geom/ColorTransform";
import {Sphere}				from "@awayjs/core/lib/geom/Sphere";
import {Matrix3D}						from "@awayjs/core/lib/geom/Matrix3D";
import {Vector3D}						from "@awayjs/core/lib/geom/Vector3D";
import {IAsset}						from "@awayjs/core/lib/library/IAsset";

import {PickingCollision}				from "../pick/PickingCollision";

import {TraverserBase}					from "./TraverserBase";

import {Transform} from "./Transform";

export interface IEntity extends IAsset
{
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
	inverseSceneTransform:Matrix3D;

	/**
	 *
	 */
	scenePosition:Vector3D;

	/**
	 *
	 */
	sceneTransform:Matrix3D;

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
}