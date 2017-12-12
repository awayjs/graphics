var includePaths = require('rollup-plugin-includepaths');

module.exports = {
	entry: './dist/index.js',
	sourceMap: true,
	format: 'umd',
	moduleName: 'AwayjsGraphics',
	external: [
		'@awayjs/core',
        '@awayjs/stage',
        '@awayjs/renderer',
        '@awayjs/materials'
	],
	globals: {
		'@awayjs/core': 'AwayjsCore',
        '@awayjs/stage': 'AwayjsStage',
        '@awayjs/renderer': 'AwayjsRenderer'
	},
	targets: [
		{ dest: './bundle/awayjs-graphics.umd.js'}
	],
	plugins: [
		includePaths({
			include : {
				"tslib": "./node_modules/tslib/tslib.es6.js"
			}
		}) ]
};