const cached: {[fonst: string]: Promise<boolean>} = {};

export function canUseCSSFont(fontName: string): Promise<boolean> {
  const doc = document;

  if (cached[fontName]?.then) {
    return cached[fontName];
  }

  if (
    !doc.fonts?.check ||
    !doc.fonts.ready?.then ||
    !doc.fonts.status ||
    !doc.fonts.values
  ) {
    // Feature is not supported, install the CSS anyway
    // https://developer.mozilla.org/en-US/docs/Web/API/FontFaceSet/check#Browser_compatibility
    console.log('FontFaceSet is not supported');
    return Promise.resolve(false);
  }

  cached[fontName] = new Promise((resolve) => {
    // https://stackoverflow.com/questions/5680013/how-to-be-notified-once-a-web-font-has-loaded
    // All fonts in use by visible text have loaded.
    doc.fonts.ready.then(() => {
      // Do not use `doc.fonts.check()` because it may return falsey result.
      const fontFaces = Array.from(doc.fonts.values());
      const matched = fontFaces.find((ff) => ff['family'] === fontName);
      const result = !!matched;
      resolve(result);
    });
  });

  return cached[fontName];
}
