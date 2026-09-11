/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
	output: 'export',
	trailingSlash: true,
	typescript: {
		ignoreBuildErrors: true,
	},
	images: {
		unoptimized: true,
	},
	outputFileTracingRoot: path.join(__dirname),
};

module.exports = nextConfig;