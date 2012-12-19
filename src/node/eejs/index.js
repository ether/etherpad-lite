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
 * require("./index").require("./examples/foo.ejs")
 */

var ejs = require("ejs");
var fs = require("fs");
var path = require("path");
var hooks = require("ep_etherpad-lite/static/js/pluginfw/hooks.js");
var resolve = require("resolve");

exports.info = {
  buf_stack: [],
  block_stack: [],
  file_stack: [],
  args: []
};

function getCurrentFile() {
  return exports.info.file_stack[exports.info.file_stack.length-1];
}

function createBlockId(name) {
  return getCurrentFile().path + '|' + name;
}

exports._init = function (b, recursive) {
  exports.info.buf_stack.push(exports.info.buf);
  exports.info.buf = b;
}

exports._exit = function (b, recursive) {
  getCurrentFile().inherit.forEach(function (item) {
    exports._require(item.name, item.args);
  });
  exports.info.buf = exports.info.buf_stack.pop();
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
  exports.info.block_stack.push(name);
  exports.begin_capture();
}

exports.end_define_block = function () {
  content = exports.end_capture();
  return content;
}

exports.end_block = function () {
  var name = exports.info.block_stack.pop();
  var renderContext = exports.info.args[exports.info.args.length-1];
  var args = {content: exports.end_define_block(), renderContext: renderContext};
  hooks.callAll("eejsBlock_" + name, args);
  exports.info.buf.push(args.content);
}

exports.begin_block = exports.begin_define_block;

exports.inherit = function (name, args) {
    getCurrentFile().inherit.push({name:name, args:args});
}

exports.require = function (name, args, mod) {
  if (args == undefined) args = {};

  var basedir = __dirname;
  var paths = [];

  if (exports.info.file_stack.length) {
    basedir = path.dirname(getCurrentFile().path);
  }
  if (mod) {
    basedir = path.dirname(mod.filename);
    paths = mod.paths;
  }

  var ejspath = resolve.sync(
    name,
    {
      paths : paths,
      basedir : basedir,
      extensions : [ '.html', '.ejs' ],
    }
  )

  args.e = exports;
  args.require = require;
  var template = '<% e._init(buf); %>' + fs.readFileSync(ejspath).toString() + '<% e._exit(); %>';
  
  exports.info.args.push(args);
  exports.info.file_stack.push({path: ejspath, inherit: []});

  var res = ejs.render(template, args);
  exports.info.file_stack.pop();
  exports.info.args.pop();

  return res;
}

exports._require = function (name, args) {
  exports.info.buf.push(exports.require(name, args));
}
