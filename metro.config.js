const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Firebase uses browser module exports by default, which breaks in React Native.
// Disabling package exports resolution forces Metro to use the correct RN-compatible modules.
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
