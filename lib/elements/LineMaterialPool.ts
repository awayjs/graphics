import {ShaderRegisterCache, ShaderRegisterData, ShaderRegisterElement} from "@awayjs/stage";

import {ShaderBase, MaterialStatePool} from "@awayjs/renderer";

/**
 * @class away.pool.LineMaterialPool
 */
export class LineMaterialPool extends MaterialStatePool
{
    public _includeDependencies(shader:ShaderBase):void
    {
        shader.colorDependencies++;
    }

    public _getVertexCode(shader:ShaderBase, registerCache:ShaderRegisterCache, sharedRegisters:ShaderRegisterData):string
    {
        //get the projection coordinates
        var position0:ShaderRegisterElement = (shader.globalPosDependencies > 0)? sharedRegisters.globalPositionVertex : sharedRegisters.animatedPosition;
        var position1:ShaderRegisterElement = registerCache.getFreeVertexAttribute();
        var thickness:ShaderRegisterElement = registerCache.getFreeVertexAttribute();

        //reserving vertex constants for projection matrix
        var viewMatrixReg:ShaderRegisterElement = registerCache.getFreeVertexConstant();
        registerCache.getFreeVertexConstant();
        registerCache.getFreeVertexConstant();
        registerCache.getFreeVertexConstant();
        shader.viewMatrixIndex = viewMatrixReg.index*4;

        registerCache.getFreeVertexConstant(); // not used
        var constOne:ShaderRegisterElement = registerCache.getFreeVertexConstant();
        var constNegOne:ShaderRegisterElement = registerCache.getFreeVertexConstant();
        var misc:ShaderRegisterElement = registerCache.getFreeVertexConstant();

        var sceneMatrixReg:ShaderRegisterElement = registerCache.getFreeVertexConstant();
        registerCache.getFreeVertexConstant();
        registerCache.getFreeVertexConstant();
        registerCache.getFreeVertexConstant();
        shader.sceneMatrixIndex = sceneMatrixReg.index*4;

        var q0:ShaderRegisterElement = registerCache.getFreeVertexVectorTemp();
        registerCache.addVertexTempUsages(q0, 1);
        var q1:ShaderRegisterElement = registerCache.getFreeVertexVectorTemp();
        registerCache.addVertexTempUsages(q1, 1);

        var l:ShaderRegisterElement = registerCache.getFreeVertexVectorTemp();
        registerCache.addVertexTempUsages(l, 1);
        var behind:ShaderRegisterElement = registerCache.getFreeVertexVectorTemp();
        registerCache.addVertexTempUsages(behind, 1);
        var qclipped:ShaderRegisterElement = registerCache.getFreeVertexVectorTemp();
        registerCache.addVertexTempUsages(qclipped, 1);
        var offset:ShaderRegisterElement = registerCache.getFreeVertexVectorTemp();
        registerCache.addVertexTempUsages(offset, 1);

        return "m44 " + q0 + ", " + position0 + ", " + sceneMatrixReg + "			\n" + // transform Q0 to eye space
            "m44 " + q1 + ", " + position1 + ", " + sceneMatrixReg + "			\n" + // transform Q1 to eye space
            "sub " + l + ", " + q1 + ", " + q0 + " 			\n" + // L = Q1 - Q0

            // test if behind camera near plane
            // if 0 - Q0.z < Camera.near then the point needs to be clipped
            "slt " + behind + ".x, " + q0 + ".z, " + misc + ".z			\n" + // behind = ( 0 - Q0.z < -Camera.near ) ? 1 : 0
            "sub " + behind + ".y, " + constOne + ".x, " + behind + ".x			\n" + // !behind = 1 - behind

            // p = point on the plane (0,0,-near)
            // n = plane normal (0,0,-1)
            // D = Q1 - Q0
            // t = ( dot( n, ( p - Q0 ) ) / ( dot( n, d )

            // solve for t where line crosses Camera.near
            "add " + offset + ".x, " + q0 + ".z, " + misc + ".z			\n" + // Q0.z + ( -Camera.near )
            "sub " + offset + ".y, " + q0 + ".z, " + q1 + ".z			\n" + // Q0.z - Q1.z

            // fix divide by zero for horizontal lines
            "seq " + offset + ".z, " + offset + ".y " + constNegOne + ".x			\n" + // offset = (Q0.z - Q1.z)==0 ? 1 : 0
            "add " + offset + ".y, " + offset + ".y, " + offset + ".z			\n" + // ( Q0.z - Q1.z ) + offset

            "div " + offset + ".z, " + offset + ".x, " + offset + ".y			\n" + // t = ( Q0.z - near ) / ( Q0.z - Q1.z )

            "mul " + offset + ".xyz, " + offset + ".zzz, " + l + ".xyz	\n" + // t(L)
            "add " + qclipped + ".xyz, " + q0 + ".xyz, " + offset + ".xyz	\n" + // Qclipped = Q0 + t(L)
            "mov " + qclipped + ".w, " + constOne + ".x			\n" + // Qclipped.w = 1

            // If necessary, replace Q0 with new Qclipped
            "mul " + q0 + ", " + q0 + ", " + behind + ".yyyy			\n" + // !behind * Q0
            "mul " + qclipped + ", " + qclipped + ", " + behind + ".xxxx			\n" + // behind * Qclipped
            "add " + q0 + ", " + q0 + ", " + qclipped + "				\n" + // newQ0 = Q0 + Qclipped

            // calculate side vector for line
            "nrm " + l + ".xyz, " + l + ".xyz			\n" + // normalize( L )
            "nrm " + behind + ".xyz, " + q0 + ".xyz			\n" + // D = normalize( Q1 )
            "mov " + behind + ".w, " + constOne + ".x				\n" + // D.w = 1
            "crs " + qclipped + ".xyz, " + l + ", " + behind + "			\n" + // S = L x D
            "nrm " + qclipped + ".xyz, " + qclipped + ".xyz			\n" + // normalize( S )

            // face the side vector properly for the given point
            "mul " + qclipped + ".xyz, " + qclipped + ".xyz, " + thickness + ".xxx	\n" + // S *= weight
            "mov " + qclipped + ".w, " + constOne + ".x			\n" + // S.w = 1

            // calculate the amount required to move at the point's distance to correspond to the line's pixel width
            // scale the side vector by that amount
            "dp3 " + offset + ".x, " + q0 + ", " + constNegOne + "			\n" + // distance = dot( view )
            "mul " + offset + ".x, " + offset + ".x, " + misc + ".x			\n" + // distance *= vpsod
            "mul " + qclipped + ".xyz, " + qclipped + ".xyz, " + offset + ".xxx	\n" + // S.xyz *= pixelScaleFactor

            // add scaled side vector to Q0 and transform to clip space
            "add " + q0 + ".xyz, " + q0 + ".xyz, " + qclipped + ".xyz	\n" + // Q0 + S

            "m44 op, " + q0 + ", " + viewMatrixReg + "			\n"  // transform Q0 to clip space
    }

    public _getFragmentCode(shader:ShaderBase, registerCache:ShaderRegisterCache, sharedRegisters:ShaderRegisterData):string
    {
        return "";
    }
}