var includePaths = require('rollup-plugin-includepaths');
var commonjs = require('rollup-plugin-commonjs');
var nodeResolve = require('rollup-plugin-node-resolve');

module.exports = {
	input: './dist/index.js',
	output: {
		name: 'AwayjsGraphics',
		globals: {
			'@awayjs/core': 'AwayjsCore',
			'@awayjs/stage': 'AwayjsStage',
			'@awayjs/renderer': 'AwayjsRenderer'
		},
		sourceMap: true,
		format: 'umd',
		file: './bundle/awayjs-graphics.umd.js'
	},
	external: [
		'@awayjs/core',
        '@awayjs/stage',
        '@awayjs/renderer'
	],
	plugins: [
		nodeResolve({
			jsnext: true,
			main: true,
			module: true
		}),
		commonjs({
			include: /node_modules/
		}) ]
};