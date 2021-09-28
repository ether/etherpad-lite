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

const fs = require('fs');
const marked = require('marked');
const path = require('path');


const toHTML = (input, filename, template, cb) => {
  const lexed = marked.lexer(input);
  fs.readFile(template, 'utf8', (er, template) => {
    if (er) return cb(er);
    render(lexed, filename, template, cb);
  });
};
module.exports = toHTML;

const render = (lexed, filename, template, cb) => {
  // get the section
  const section = getSection(lexed);

  filename = path.basename(filename, '.md');

  lexed = parseLists(lexed);

  // generate the table of contents.
  // this mutates the lexed contents in-place.
  buildToc(lexed, filename, (er, toc) => {
    if (er) return cb(er);

    template = template.replace(/__FILENAME__/g, filename);
    template = template.replace(/__SECTION__/g, section);
    template = template.replace(/__TOC__/g, toc);

    // content has to be the last thing we do with
    // the lexed tokens, because it's destructive.
    const content = marked.parser(lexed);
    template = template.replace(/__CONTENT__/g, content);

    cb(null, template);
  });
};


// just update the list item text in-place.
// lists that come right after a heading are what we're after.
const parseLists = (input) => {
  let state = null;
  let depth = 0;
  const output = [];
  output.links = input.links;
  input.forEach((tok) => {
    if (state == null) {
      if (tok.type === 'heading') {
        state = 'AFTERHEADING';
      }
      output.push(tok);
      return;
    }
    if (state === 'AFTERHEADING') {
      if (tok.type === 'list_start') {
        state = 'LIST';
        if (depth === 0) {
          output.push({type: 'html', text: '<div class="signature">'});
        }
        depth++;
        output.push(tok);
        return;
      }
      state = null;
      output.push(tok);
      return;
    }
    if (state === 'LIST') {
      if (tok.type === 'list_start') {
        depth++;
        output.push(tok);
        return;
      }
      if (tok.type === 'list_end') {
        depth--;
        if (depth === 0) {
          state = null;
          output.push({type: 'html', text: '</div>'});
        }
        output.push(tok);
        return;
      }
      if (tok.text) {
        tok.text = parseListItem(tok.text);
      }
    }
    output.push(tok);
  });

  return output;
};


const parseListItem = (text) => {
  text = text.replace(/\{([^}]+)\}/, '<span class="type">$1</span>');
  // XXX maybe put more stuff here?
  return text;
};


// section is just the first heading
const getSection = (lexed) => {
  for (let i = 0, l = lexed.length; i < l; i++) {
    const tok = lexed[i];
    if (tok.type === 'heading') return tok.text;
  }
  return '';
};


const buildToc = (lexed, filename, cb) => {
  let toc = [];
  let depth = 0;

  marked.setOptions({
    headerIds: true,
    headerPrefix: `${filename}_`,
  });

  lexed.forEach((tok) => {
    if (tok.type !== 'heading') return;
    if (tok.depth - depth > 1) {
      return cb(new Error(`Inappropriate heading level\n${JSON.stringify(tok)}`));
    }

    depth = tok.depth;

    const slugger = new marked.Slugger();
    const id = slugger.slug(`${filename}_${tok.text.trim()}`);

    toc.push(`${new Array((depth - 1) * 2 + 1).join(' ')}* <a href="#${id}">${tok.text}</a>`);

    tok.text += `<span><a class="mark" href="#${id}" ` +
                `id="${id}">#</a></span>`;
  });

  toc = marked.parse(toc.join('\n'));
  cb(null, toc);
};
