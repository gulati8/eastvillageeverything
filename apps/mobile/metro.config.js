const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

const sharedTypesPath = path.resolve(__dirname, '../../packages/shared-types');

config.watchFolders = Array.from(new Set([...(config.watchFolders ?? []), sharedTypesPath]));

config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),
  path.resolve(__dirname, '../../node_modules'),
];

config.resolver.disableHierarchicalLookup = false;

config.resolver.extraNodeModules = {
  '@eve/shared-types': sharedTypesPath,
};

// shared-types is Node ESM and imports its own files with `.js` extensions
// (e.g. `./place.js`), which TypeScript maps onto `.ts` sources. Metro does
// not, so rewrite those relative imports to `.ts` when they originate inside
// the shared-types source tree.
const sharedTypesSrc = path.join(sharedTypesPath, 'src') + path.sep;
const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    context.originModulePath.startsWith(sharedTypesSrc) &&
    moduleName.startsWith('.') &&
    moduleName.endsWith('.js')
  ) {
    moduleName = moduleName.slice(0, -3) + '.ts';
  }
  const resolve = defaultResolveRequest ?? context.resolveRequest;
  return resolve(context, moduleName, platform);
};

module.exports = config;
