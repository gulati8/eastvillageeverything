const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

const sharedTypesPath = path.resolve(__dirname, '../../packages/shared-types');

config.watchFolders = [sharedTypesPath];

config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),
  path.resolve(__dirname, '../../node_modules'),
];

config.resolver.disableHierarchicalLookup = false;

config.resolver.extraNodeModules = {
  '@eve/shared-types': sharedTypesPath,
};

module.exports = config;
