'use strict';

// Starts at b, ends just before e, skipping s each time.
const range = (b, e, s = 1) => [...Array(Math.ceil((e - b) / s)).keys()].map((x) => (x * s) + b);

exports.collectContentPre = (hookName, context) => {
  const size = /(?:^| )font-size:([A-Za-z0-9]*)/.exec(context.cls);
  if (size && size[1]) {
    context.cc.doAttrib(context.state, `font-size:${size[1]}`);
  }
};

exports.sizes = []
    .concat(range(8, 20))
    .concat(range(20, 30, 2))
    .concat(range(30, 50, 5))
    .concat(range(50, 70, 10));
