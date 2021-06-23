import { GradientFillStyle } from '../draw/fills/GradientFillStyle';
import { TextureAtlas, ITextureAtlasEntry } from './TextureAtlas';
import { IMaterial } from '@awayjs/renderer';
import { BitmapImage2D } from '@awayjs/stage';

type ISpecialMaterial = IMaterial & {
	alphaBlending: boolean;
	useColorTransform: boolean;
	ambientMethod?: any;
}

type IMaterialCtr = { new(...args: any[]): ISpecialMaterial};

export class MaterialManager {

	private static _colorMaterials: any = {};
	private static _textureMaterials: any = {};
	private static _useTextureAtlasForColors: boolean = true;

	public static specialBitmapMaterialClass: IMaterialCtr;
	public static materialClass: IMaterialCtr;
	public static textureClass: any;

	public static getMaterialForColor (color: number, alpha: number = 1): ITextureAtlasEntry {
		if (color == 0) {
			color = 0x000001;
		}
		if (color == 0xFF8100) {
			alpha = 1;
		}
		//alpha=0.5;
		let texObj: ITextureAtlasEntry;
		if (!MaterialManager.materialClass) {
			throw ('no materialClass registered on MaterialManager!');
		}

		if (MaterialManager._useTextureAtlasForColors) {
			texObj = TextureAtlas.getTextureForColor(color, alpha);
			if (MaterialManager._colorMaterials[texObj.bitmap.id]) {
				texObj.material = MaterialManager._colorMaterials[texObj.bitmap.id];
				return texObj;
			}
			const newmat = new MaterialManager.materialClass(texObj.bitmap);
			newmat.alphaBlending = true;
			newmat.useColorTransform = true;
			newmat.bothSides = true;
			MaterialManager._colorMaterials[texObj.bitmap.id] = newmat;
			texObj.material = newmat;
			return texObj;
		}

		texObj = {};
		const colorstr: string = color + '_' + Math.round(alpha * 100).toString();
		if (MaterialManager._colorMaterials[colorstr]) {
			texObj.material = MaterialManager._colorMaterials[colorstr];
			return texObj;
		}
		const newmat = new MaterialManager.materialClass(color, alpha);
		newmat.alphaBlending = true;
		newmat.useColorTransform = true;
		newmat.bothSides = true;
		texObj.material = newmat;
		MaterialManager._colorMaterials[colorstr] = newmat;
		return texObj;
	}

	public static getMaterialForGradient (gradient: GradientFillStyle): ITextureAtlasEntry {
		if (!MaterialManager.materialClass) {
			throw ('no materialClass registered on MaterialManager!');
		}
		const texObj: ITextureAtlasEntry = TextureAtlas.getTextureForGradient(gradient);
		// alpha=0.5;
		const lookupstr: string = texObj.bitmap.id.toString() + gradient.type.toString();
		if (MaterialManager._textureMaterials[lookupstr]) {
			texObj.material = MaterialManager._textureMaterials[lookupstr];
			return texObj;
		}
		const newmat = new MaterialManager.materialClass(texObj.bitmap);
		newmat.useColorTransform = true;
		newmat.alphaBlending = true;
		newmat.bothSides = true;
		MaterialManager._textureMaterials[lookupstr] = newmat;
		texObj.material = newmat;
		return texObj;
	}

	public static getMaterialForBitmap (bitmap: BitmapImage2D, useSpecialMaterial = false): IMaterial {
		useSpecialMaterial = useSpecialMaterial && !!this.specialBitmapMaterialClass;
		const Class = (useSpecialMaterial)
			? this.specialBitmapMaterialClass
			: this.materialClass;

		const newmat = new Class(bitmap);

		if (!useSpecialMaterial) {
			newmat.ambientMethod.texture = new MaterialManager.textureClass(bitmap);
		}

		newmat.alphaBlending = true;
		newmat.useColorTransform = true;
		newmat.bothSides = true;

		return newmat;
	}

	/**
	 * @deprecated Use `getMaterialForColor` instead
	 */
	public static get_material_for_color = MaterialManager.getMaterialForColor;

	/**
	 * @deprecated Use `getMaterialForGradient` instead
	 */
	public static get_material_for_gradient = MaterialManager.getMaterialForGradient;

	/**
	 * @deprecated Use `getMaterialForBitmap` instead
	 */
	public static get_material_for_BitmapImage2D = MaterialManager.getMaterialForBitmap;
}