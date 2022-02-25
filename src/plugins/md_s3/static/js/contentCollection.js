'use strict';

// When an image is detected give it a lineAttribute
// of Image with the URL to the image
exports.collectContentImage = (hookName, {node, state: {lineAttributes}, tname}) => {
  if (tname === 'div' || tname === 'p') delete lineAttributes.img;
  if (tname !== 'img') return;
  lineAttributes.img =
      // Client-side. This will also be used for server-side HTML imports once jsdom adds support
      // for HTMLImageElement.currentSrc.
      node.currentSrc ||
      node.src ||
      (node.attribs && node.attribs.src);
};

exports.collectContentPre = (name, context) => {
};

exports.collectContentPost = (name, context) => {
  const tname = context.tname;
  const state = context.state;
  const lineAttributes = state.lineAttributes;
  if (tname === 'img') {
    delete lineAttributes.img;
  }
};

exports.ccRegisterBlockElements = (name, context) => ['img'];
