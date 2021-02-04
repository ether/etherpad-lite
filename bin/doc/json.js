'use strict';
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

module.exports = doJSON;

// Take the lexed input, and return a JSON-encoded object
// A module looks like this: https://gist.github.com/1777387

const marked = require('marked');

const doJSON = (input, filename, cb) => {
  const root = {source: filename};
  const stack = [root];
  let depth = 0;
  let current = root;
  let state = null;
  const lexed = marked.lexer(input);
  lexed.forEach((tok) => {
    const type = tok.type;
    let text = tok.text;

    // <!-- type = module -->
    // This is for cases where the markdown semantic structure is lacking.
    if (type === 'paragraph' || type === 'html') {
      const metaExpr = /<!--([^=]+)=([^-]+)-->\n*/g;
      text = text.replace(metaExpr, (_0, k, v) => {
        current[k.trim()] = v.trim();
        return '';
      });
      text = text.trim();
      if (!text) return;
    }

    if (type === 'heading' &&
        !text.trim().match(/^example/i)) {
      if (tok.depth - depth > 1) {
        return cb(new Error(`Inappropriate heading level\n${
          JSON.stringify(tok)}`));
      }

      // Sometimes we have two headings with a single
      // blob of description.  Treat as a clone.
      if (current &&
          state === 'AFTERHEADING' &&
          depth === tok.depth) {
        const clone = current;
        current = newSection(tok);
        current.clone = clone;
        // don't keep it around on the stack.
        stack.pop();
      } else {
        // if the level is greater than the current depth,
        // then it's a child, so we should just leave the stack
        // as it is.
        // However, if it's a sibling or higher, then it implies
        // the closure of the other sections that came before.
        // root is always considered the level=0 section,
        // and the lowest heading is 1, so this should always
        // result in having a valid parent node.
        let d = tok.depth;
        while (d <= depth) {
          finishSection(stack.pop(), stack[stack.length - 1]);
          d++;
        }
        current = newSection(tok);
      }

      depth = tok.depth;
      stack.push(current);
      state = 'AFTERHEADING';
      return;
    } // heading

    // Immediately after a heading, we can expect the following
    //
    // { type: 'code', text: 'Stability: ...' },
    //
    // a list: starting with list_start, ending with list_end,
    // maybe containing other nested lists in each item.
    //
    // If one of these isn't found, then anything that comes between
    // here and the next heading should be parsed as the desc.
    let stability;
    if (state === 'AFTERHEADING') {
      if (type === 'code' &&
          (stability = text.match(/^Stability: ([0-5])(?:\s*-\s*)?(.*)$/))) {
        current.stability = parseInt(stability[1], 10);
        current.stabilityText = stability[2].trim();
        return;
      } else if (type === 'list_start' && !tok.ordered) {
        state = 'AFTERHEADING_LIST';
        current.list = current.list || [];
        current.list.push(tok);
        current.list.level = 1;
      } else {
        current.desc = current.desc || [];
        if (!Array.isArray(current.desc)) {
          current.shortDesc = current.desc;
          current.desc = [];
        }
        current.desc.push(tok);
        state = 'DESC';
      }
      return;
    }

    if (state === 'AFTERHEADING_LIST') {
      current.list.push(tok);
      if (type === 'list_start') {
        current.list.level++;
      } else if (type === 'list_end') {
        current.list.level--;
      }
      if (current.list.level === 0) {
        state = 'AFTERHEADING';
        processList(current);
      }
      return;
    }

    current.desc = current.desc || [];
    current.desc.push(tok);
  });

  // finish any sections left open
  while (root !== (current = stack.pop())) {
    finishSection(current, stack[stack.length - 1]);
  }

  return cb(null, root);
};


// go from something like this:
// [ { type: 'list_item_start' },
//   { type: 'text',
//     text: '`settings` Object, Optional' },
//   { type: 'list_start', ordered: false },
//   { type: 'list_item_start' },
//   { type: 'text',
//     text: 'exec: String, file path to worker file.  Default: `__filename`' },
//   { type: 'list_item_end' },
//   { type: 'list_item_start' },
//   { type: 'text',
//     text: 'args: Array, string arguments passed to worker.' },
//   { type: 'text',
//     text: 'Default: `process.argv.slice(2)`' },
//   { type: 'list_item_end' },
//   { type: 'list_item_start' },
//   { type: 'text',
//     text: 'silent: Boolean, whether or not to send output to parent\'s stdio.' },
//   { type: 'text', text: 'Default: `false`' },
//   { type: 'space' },
//   { type: 'list_item_end' },
//   { type: 'list_end' },
//   { type: 'list_item_end' },
//   { type: 'list_end' } ]
// to something like:
// [ { name: 'settings',
//     type: 'object',
//     optional: true,
//     settings:
//      [ { name: 'exec',
//          type: 'string',
//          desc: 'file path to worker file',
//          default: '__filename' },
//        { name: 'args',
//          type: 'array',
//          default: 'process.argv.slice(2)',
//          desc: 'string arguments passed to worker.' },
//        { name: 'silent',
//          type: 'boolean',
//          desc: 'whether or not to send output to parent\'s stdio.',
//          default: 'false' } ] } ]

const processList = (section) => {
  const list = section.list;
  const values = [];
  let current;
  const stack = [];

  // for now, *just* build the hierarchical list
  list.forEach((tok) => {
    const type = tok.type;
    if (type === 'space') return;
    if (type === 'list_item_start') {
      if (!current) {
        const n = {};
        values.push(n);
        current = n;
      } else {
        current.options = current.options || [];
        stack.push(current);
        const n = {};
        current.options.push(n);
        current = n;
      }
      return;
    } else if (type === 'list_item_end') {
      if (!current) {
        throw new Error(`invalid list - end without current item\n${
          JSON.stringify(tok)}\n${
          JSON.stringify(list)}`);
      }
      current = stack.pop();
    } else if (type === 'text') {
      if (!current) {
        throw new Error(`invalid list - text without current item\n${
          JSON.stringify(tok)}\n${
          JSON.stringify(list)}`);
      }
      current.textRaw = current.textRaw || '';
      current.textRaw += `${tok.text} `;
    }
  });

  // shove the name in there for properties, since they are always
  // just going to be the value etc.
  if (section.type === 'property' && values[0]) {
    values[0].textRaw = `\`${section.name}\` ${values[0].textRaw}`;
  }

  // now pull the actual values out of the text bits.
  values.forEach(parseListItem);

  // Now figure out what this list actually means.
  // depending on the section type, the list could be different things.

  switch (section.type) {
    case 'ctor':
    case 'classMethod':
    case 'method': {
      // each item is an argument, unless the name is 'return',
      // in which case it's the return value.
      section.signatures = section.signatures || [];
      const sig = {};
      section.signatures.push(sig);
      sig.params = values.filter((v) => {
        if (v.name === 'return') {
          sig.return = v;
          return false;
        }
        return true;
      });
      parseSignature(section.textRaw, sig);
      break;
    }
    case 'property': {
      // there should be only one item, which is the value.
      // copy the data up to the section.
      const value = values[0] || {};
      delete value.name;
      section.typeof = value.type;
      delete value.type;
      Object.keys(value).forEach((k) => {
        section[k] = value[k];
      });
      break;
    }

    case 'event': {
      // event: each item is an argument.
      section.params = values;
      break;
    }
  }

  delete section.list;
};


// textRaw = "someobject.someMethod(a, [b=100], [c])"
const parseSignature = (text, sig) => {
  let params = text.match(paramExpr);
  if (!params) return;
  params = params[1];
  // the ] is irrelevant. [ indicates optionalness.
  params = params.replace(/\]/g, '');
  params = params.split(/,/);
  params.forEach((p, i, _) => {
    p = p.trim();
    if (!p) return;
    let param = sig.params[i];
    let optional = false;
    let def;
    // [foo] -> optional
    if (p.charAt(0) === '[') {
      optional = true;
      p = p.substr(1);
    }
    const eq = p.indexOf('=');
    if (eq !== -1) {
      def = p.substr(eq + 1);
      p = p.substr(0, eq);
    }
    if (!param) {
      param = sig.params[i] = {name: p};
    }
    // at this point, the name should match.
    if (p !== param.name) {
      console.error('Warning: invalid param "%s"', p);
      console.error(` > ${JSON.stringify(param)}`);
      console.error(` > ${text}`);
    }
    if (optional) param.optional = true;
    if (def !== undefined) param.default = def;
  });
};


const parseListItem = (item) => {
  if (item.options) item.options.forEach(parseListItem);
  if (!item.textRaw) return;

  // the goal here is to find the name, type, default, and optional.
  // anything left over is 'desc'
  let text = item.textRaw.trim();
  // text = text.replace(/^(Argument|Param)s?\s*:?\s*/i, '');

  text = text.replace(/^, /, '').trim();
  const retExpr = /^returns?\s*:?\s*/i;
  const ret = text.match(retExpr);
  if (ret) {
    item.name = 'return';
    text = text.replace(retExpr, '');
  } else {
    const nameExpr = /^['`"]?([^'`": {]+)['`"]?\s*:?\s*/;
    const name = text.match(nameExpr);
    if (name) {
      item.name = name[1];
      text = text.replace(nameExpr, '');
    }
  }

  text = text.trim();
  const defaultExpr = /\(default\s*[:=]?\s*['"`]?([^, '"`]*)['"`]?\)/i;
  const def = text.match(defaultExpr);
  if (def) {
    item.default = def[1];
    text = text.replace(defaultExpr, '');
  }

  text = text.trim();
  const typeExpr = /^\{([^}]+)\}/;
  const type = text.match(typeExpr);
  if (type) {
    item.type = type[1];
    text = text.replace(typeExpr, '');
  }

  text = text.trim();
  const optExpr = /^Optional\.|(?:, )?Optional$/;
  const optional = text.match(optExpr);
  if (optional) {
    item.optional = true;
    text = text.replace(optExpr, '');
  }

  text = text.replace(/^\s*-\s*/, '');
  text = text.trim();
  if (text) item.desc = text;
};


const finishSection = (section, parent) => {
  if (!section || !parent) {
    throw new Error(`Invalid finishSection call\n${
      JSON.stringify(section)}\n${
      JSON.stringify(parent)}`);
  }

  if (!section.type) {
    section.type = 'module';
    if (parent && (parent.type === 'misc')) {
      section.type = 'misc';
    }
    section.displayName = section.name;
    section.name = section.name.toLowerCase()
        .trim().replace(/\s+/g, '_');
  }

  if (section.desc && Array.isArray(section.desc)) {
    section.desc.links = section.desc.links || [];
    section.desc = marked.parser(section.desc);
  }

  if (!section.list) section.list = [];
  processList(section);

  // classes sometimes have various 'ctor' children
  // which are actually just descriptions of a constructor
  // class signature.
  // Merge them into the parent.
  if (section.type === 'class' && section.ctors) {
    section.signatures = section.signatures || [];
    const sigs = section.signatures;
    section.ctors.forEach((ctor) => {
      ctor.signatures = ctor.signatures || [{}];
      ctor.signatures.forEach((sig) => {
        sig.desc = ctor.desc;
      });
      sigs.push(...ctor.signatures);
    });
    delete section.ctors;
  }

  // properties are a bit special.
  // their "type" is the type of object, not "property"
  if (section.properties) {
    section.properties.forEach((p) => {
      if (p.typeof) p.type = p.typeof;
      else delete p.type;
      delete p.typeof;
    });
  }

  // handle clones
  if (section.clone) {
    const clone = section.clone;
    delete section.clone;
    delete clone.clone;
    deepCopy(section, clone);
    finishSection(clone, parent);
  }

  let plur;
  if (section.type.slice(-1) === 's') {
    plur = `${section.type}es`;
  } else if (section.type.slice(-1) === 'y') {
    plur = section.type.replace(/y$/, 'ies');
  } else {
    plur = `${section.type}s`;
  }

  // if the parent's type is 'misc', then it's just a random
  // collection of stuff, like the "globals" section.
  // Make the children top-level items.
  if (section.type === 'misc') {
    Object.keys(section).forEach((k) => {
      switch (k) {
        case 'textRaw':
        case 'name':
        case 'type':
        case 'desc':
        case 'miscs':
          return;
        default:
          if (parent.type === 'misc') {
            return;
          }
          if (Array.isArray(k) && parent[k]) {
            parent[k] = parent[k].concat(section[k]);
          } else if (!parent[k]) {
            parent[k] = section[k];
          } else {
            // parent already has, and it's not an array.
            return;
          }
      }
    });
  }

  parent[plur] = parent[plur] || [];
  parent[plur].push(section);
};


// Not a general purpose deep copy.
// But sufficient for these basic things.
const deepCopy = (src, dest) => {
  Object.keys(src).filter((k) => !Object.prototype.hasOwnProperty.call(dest, k)).forEach((k) => {
    dest[k] = deepCopy_(src[k]);
  });
};

const deepCopy_ = (src) => {
  if (!src) return src;
  if (Array.isArray(src)) {
    const c = new Array(src.length);
    src.forEach((v, i) => {
      c[i] = deepCopy_(v);
    });
    return c;
  }
  if (typeof src === 'object') {
    const c = {};
    Object.keys(src).forEach((k) => {
      c[k] = deepCopy_(src[k]);
    });
    return c;
  }
  return src;
};


// these parse out the contents of an H# tag
const eventExpr = /^Event(?::|\s)+['"]?([^"']+).*$/i;
const classExpr = /^Class:\s*([^ ]+).*?$/i;
const propExpr = /^(?:property:?\s*)?[^.]+\.([^ .()]+)\s*?$/i;
const braceExpr = /^(?:property:?\s*)?[^.[]+(\[[^\]]+\])\s*?$/i;
const classMethExpr =
  /^class\s*method\s*:?[^.]+\.([^ .()]+)\([^)]*\)\s*?$/i;
const methExpr =
  /^(?:method:?\s*)?(?:[^.]+\.)?([^ .()]+)\([^)]*\)\s*?$/i;
const newExpr = /^new ([A-Z][a-z]+)\([^)]*\)\s*?$/;
const paramExpr = /\((.*)\);?$/;

const newSection = (tok) => {
  const section = {};
  // infer the type from the text.
  const text = section.textRaw = tok.text;
  if (text.match(eventExpr)) {
    section.type = 'event';
    section.name = text.replace(eventExpr, '$1');
  } else if (text.match(classExpr)) {
    section.type = 'class';
    section.name = text.replace(classExpr, '$1');
  } else if (text.match(braceExpr)) {
    section.type = 'property';
    section.name = text.replace(braceExpr, '$1');
  } else if (text.match(propExpr)) {
    section.type = 'property';
    section.name = text.replace(propExpr, '$1');
  } else if (text.match(classMethExpr)) {
    section.type = 'classMethod';
    section.name = text.replace(classMethExpr, '$1');
  } else if (text.match(methExpr)) {
    section.type = 'method';
    section.name = text.replace(methExpr, '$1');
  } else if (text.match(newExpr)) {
    section.type = 'ctor';
    section.name = text.replace(newExpr, '$1');
  } else {
    section.name = text;
  }
  return section;
};
