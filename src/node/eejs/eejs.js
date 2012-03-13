/*
 * Copyright (c) 2011 RedHog (Egil Möller) <egil.moller@freecode.no>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/* Basic usage:
 *
 * require("./eejs").require("./examples/foo.ejs")
 */

var ejs = require("ejs");
var fs = require("fs");
var path = require("path");

exports.info = {
  buf_stack: [],
  block_stack: [],
  blocks: {},
  file_stack: [],
};

exports.init = function (b, recursive) {
  exports.info.buf = b;
}

exports.begin_capture = function() {
  exports.info.buf_stack.push(exports.info.buf.concat());
  exports.info.buf.splice(0, exports.info.buf.length);
}

exports.end_capture = function () {
  var res = exports.info.buf.join("");
  exports.info.buf.splice.apply(
    exports.info.buf,
    [0, exports.info.buf.length].concat(exports.info.buf_stack.pop()));
  return res;
}

exports.begin_define_block = function (name) {
  if (typeof exports.info.blocks[name] == "undefined")
    exports.info.blocks[name] = {};
  exports.info.block_stack.push(name);
  exports.begin_capture();
}

exports.end_define_block = function () {
  content = exports.end_capture();
  var name = exports.info.block_stack.pop();
  if (typeof exports.info.blocks[name].content == "undefined")
    exports.info.blocks[name].content = content;
  return exports.info.blocks[name].content;
}

exports.end_block = function () {
  var res = exports.end_define_block();
  exports.info.buf.push(res);
}

exports.begin_block = exports.begin_define_block;

exports.require = function (name, args) {
  if (args == undefined) args = {};
  if (!exports.info)
    exports.init(null);
 
  if ((name.indexOf("./") == 0 || name.indexOf("../") == 0) && exports.info.file_stack.length) {
      name = path.join(path.dirname(exports.info.file_stack[exports.info.file_stack.length-1]), name);
  }
  var ejspath = require.resolve(name)

  args.e = exports;
  var template = '<%  e.init(buf); %>' + fs.readFileSync(ejspath).toString();

  exports.info.file_stack.push(ejspath);
  exports.info.buf_stack.push(exports.info.buf);
    var res = ejs.render(template, args);
  exports.info.buf = exports.info.buf_stack.pop();
  exports.info.file_stack.pop();

  if (exports.info.buf)
    exports.info.buf.push(res);
  return res;
}
