// @ts-check

"use strict";

/* eslint-disable n/no-unpublished-require */

const webpack = require("webpack");
const TerserPlugin = require("terser-webpack-plugin");

const nodeModulePrefixRe = /^node:/u;
const baseConfig = {
	"target": "node",
	"entry": "./extension.mjs",
	"output": {
		"asyncChunks": false,
		"path": __dirname,
		"filename": "bundle.js",
		"libraryTarget": "commonjs2"
	},
	"optimization": {
		// "minimize": false,
		// "moduleIds": "named",
		"minimizer": [ new TerserPlugin({ "extractComments": false }) ]
	},
	"externals": {
		"vscode": "commonjs vscode"
	},
	"plugins": [
		// Rewrite requires to remove "node:" prefix
		new webpack.NormalModuleReplacementPlugin(
			nodeModulePrefixRe,
			(resource) => {
				const module = resource.request.replace(nodeModulePrefixRe, "");
				resource.request = module;
			}
		)
	],
	"ignoreWarnings": [
		{
			"message": /(asset|entrypoint) size limit/
		},
		{
			"message": /dependencies cannot be statically extracted/
		},
		{
			"message": /lazy load some parts of your application/
		}
	]
};
const config = [
	baseConfig,
	{
		...baseConfig,
		"target": "webworker",
		"output": {
			...baseConfig.output,
			"filename": "bundle.web.js",
			"libraryTarget": "commonjs"
		},
		"plugins": [
			...baseConfig.plugins,
			// Intercept "markdown-it" to provide empty implementation
			new webpack.NormalModuleReplacementPlugin(
				/^markdown-it$/u,
				(resource) => {
					resource.request = require.resolve("./webworker/module-empty.js");
				}
			),
			// Intercept "node:stream/consumers" and "node:stream/promises" lacking a browserify entry
			new webpack.NormalModuleReplacementPlugin(
				/^stream\/(?:consumers|promises)$/u,
				(resource) => {
					resource.request = require.resolve("./webworker/module-empty.js");
				}
			),
			// Intercept existing "unicorn-magic" package to provide missing import
			new webpack.NormalModuleReplacementPlugin(
				/^unicorn-magic$/u,
				(resource) => {
					resource.request = require.resolve("./webworker/unicorn-magic-stub.js");
				}
			),
			// Intercept use of "process" to provide implementation
			new webpack.ProvidePlugin({
				"process": "process-wrapper"
			})
		],
		"resolve": {
			"conditionNames": [ "markdownlint-imports-node", "..." ],
			"fallback": {
				"fs": false,
				"os": require.resolve("./webworker/os-stub.js"),
				"path": require.resolve("path-browserify"),
				"process": require.resolve("./webworker/process-stub.js"),
				"process-wrapper": require.resolve("./webworker/process-stub.js"),
				"stream": require.resolve("stream-browserify"),
				"url": require.resolve("./webworker/module-empty.js"),
				"util": require.resolve("util")
			}
		}
	}
];
module.exports = config;
