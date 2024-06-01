'use strict';


import {strict as assert} from "assert";
import {cleanComments, minify} from "../../../../admin/src/utils/utils.js";

const fs = require('fs');
const fsp = fs.promises;
let template:string;

describe(__filename, function () {
  before(async function () {
    template = await fsp.readFile('../settings.json.template', 'utf8')
  });
  describe('adminUtils', function () {
    it('cleanComments function empty', async function () {
      assert.equal(cleanComments(""), "");
    });
    it('cleanComments function HelloWorld no comment', async function () {
      assert.equal(cleanComments("HelloWorld"), "HelloWorld");
    });
    it('cleanComments function HelloWorld with comment', async function () {
      assert.equal(cleanComments("Hello/*abc*/World/*def*/"), "HelloWorld");
    });
    it('cleanComments function HelloWorld with comment and multiline', async function () {
      assert.equal(cleanComments("Hello \n/*abc\nxyz*/World/*def*/"), "Hello\nWorld");
    });
    it('cleanComments function HelloWorld with multiple line breaks', async function () {
      assert.equal(cleanComments("  \nHello \n  \n  \nWorld/*def*/"), "Hello\nWorld");
    });
    it('cleanComments function same after minified', async function () {
      assert.equal(minify(template), minify(cleanComments(template)!));
    });
    it('minified results are smaller', async function () {
      assert.equal(minify(template).length < template.length, true);
    });
  });
});
