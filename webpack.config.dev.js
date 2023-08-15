const path = require('path');

/** @typedef {import('webpack').Configuration} WebpackConfig **/

/** @type WebpackConfig */
module.exports = {
	entry: {
		"entry": "./src/Test/Index.ts"
	},
	mode: "development",
	module: {
		rules: [
			{
				test: /\.tsx?$/,
				use: 'ts-loader',
				exclude: /node_modules/,
			},
		],
	},
	resolve: {
		extensions: ['.tsx', '.ts', '.js'],
	},
	output: {
		// library: { name: "NES", type: "var", export: "NES" },
		filename: "[name].js",
		path: path.resolve(__dirname, 'dist'),
	},
	// devtool:"source-map"
};