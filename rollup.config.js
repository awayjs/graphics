var includePaths = require('rollup-plugin-includepaths');

module.exports = {
	entry: './dist/index.js',
	sourceMap: true,
	format: 'umd',
	moduleName: 'AwayjsGraphics',
	external: [
		'@awayjs/core'
	],
	globals: {
		'@awayjs/core': 'AwayjsCore'
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