'use strict';
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
 * require("./index").require("./path/to/template.ejs")
 */

import ejs from 'ejs';
import fs from 'fs';
import {callAll} from '../../static/js/pluginfw/hooks.js';
import path from 'path';
import resolve from 'resolve';
const settings = require('../utils/Settings');
import {pluginInstallPath} from '../../static/js/pluginfw/installer'

const templateCache = new Map();

export const info: {
  __output_stack: any[],
  block_stack: string[],
  file_stack: {path: string}[],
  args: any[],
  __output: any
} = {
  __output_stack: [],
  block_stack: [],
  file_stack: [],
  args: [],
  __output: null
};

const getCurrentFile = () => info.file_stack[info.file_stack.length - 1];

export const _init = (b: any, recursive: boolean) => {
  info.__output_stack.push(info.__output);
  info.__output = b;
};

export const _exit = (b:any, recursive:boolean) => {
  info.__output = info.__output_stack.pop();
};

export const begin_block = (name:string) => {
  info.block_stack.push(name);
  info.__output_stack.push(info.__output.get());
  info.__output.set('');
};

export const end_block = () => {
  const name = info.block_stack.pop();
  const renderContext = info.args[info.args.length - 1];
  const content = info.__output.get();
  info.__output.set(info.__output_stack.pop());
  const args = {content, renderContext};
  callAll(`eejsBlock_${name}`, args);
  info.__output.set(info.__output.get().concat(args.content));
};

export const requireP = (name:string, args:{
  e?: Function,
  require?: string,
}, mod?:{
  filename:string,
    paths:string[],
}) => {
  if (args == null) args = {};

  let basedir = __dirname;
  let paths:string[] = [];

  if (info.file_stack.length) {
    basedir = path.dirname(getCurrentFile().path);
  }
  if (mod) {
    basedir = path.dirname(mod.filename);
    paths = mod.paths;
  }

  /**
   * Add the plugin install path to the paths array
   */
  if (!paths.includes(pluginInstallPath)) {
    paths.push(pluginInstallPath)
  }

  const ejspath = resolve.sync(name, {paths, basedir, extensions: ['.html', '.ejs']});

  args.e = exports;
  // @ts-ignore
  args.require = requireP;

  const cache: boolean = settings.maxAge !== 0;
  const template = cache && templateCache.get(ejspath) || ejs.compile(
      '<% e._init({get: () => __output, set: (s) => { __output = s; }}); %>' +
        `${fs.readFileSync(ejspath).toString()}<% e._exit(); %>`,
      {filename: ejspath});
  if (cache) templateCache.set(ejspath, template);

  info.args.push(args);
  info.file_stack.push({path: ejspath});
  const res = template(args);
  info.file_stack.pop();
  info.args.pop();

  return res;
};
