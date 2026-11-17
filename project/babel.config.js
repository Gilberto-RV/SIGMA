module.exports = {
  presets: ['babel-preset-expo'],
  plugins: [
    function importMetaTransformPlugin() {
      return {
        visitor: {
          MetaProperty(path) {
            if (path.node.meta.name === 'import' && path.node.property.name === 'meta') {
              path.replaceWithSourceString(
                '(typeof document !== "undefined" && document.currentScript && document.currentScript.src ? { url: document.currentScript.src } : (typeof location !== "undefined" ? { url: location.href } : { url: "" }))'
              );
            }
          },
        },
      };
    },
  ],
};