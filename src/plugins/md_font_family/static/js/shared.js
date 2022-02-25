'use strict';

const fonts = [
  'fontarial',
  'fontavant-garde',
  'fontbookman',
  'fontcalibri',
  'fontcourier',
  'fontgaramond',
  'fonthelvetica',
  'fontmonospace',
  'fontpalatino',
  'fonttimes-new-roman',
];

exports.collectContentPre = (hook, context) => {
  const tname = context.tname;
  const state = context.state;
  if (fonts.indexOf(tname) !== -1) {
    context.cc.doAttrib(state, tname);
  }
};

// never seems to be run
exports.collectContentPost = (hook, context) => {
  const tname = context.tname;
  const state = context.state;
  const lineAttributes = state.lineAttributes;
  const tagIndex = tname;

  if (tagIndex >= 0) {
    delete lineAttributes.sub;
  }
};
