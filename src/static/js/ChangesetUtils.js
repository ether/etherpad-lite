'use strict';

/**
 * This module contains several helper Functions to build Changesets
 * based on a SkipList
 */

/**
 * Copyright 2009 Google Inc.
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
exports.buildRemoveRange = (rep, builder, start, end) => {
  const startLineOffset = rep.lines.offsetOfIndex(start[0]);
  const endLineOffset = rep.lines.offsetOfIndex(end[0]);

  if (end[0] > start[0]) {
    builder.remove(endLineOffset - startLineOffset - start[1], end[0] - start[0]);
    builder.remove(end[1]);
  } else {
    builder.remove(end[1] - start[1]);
  }
};

exports.buildKeepRange = (rep, builder, start, end, attribs, pool) => {
  const startLineOffset = rep.lines.offsetOfIndex(start[0]);
  const endLineOffset = rep.lines.offsetOfIndex(end[0]);

  if (end[0] > start[0]) {
    builder.keep(endLineOffset - startLineOffset - start[1], end[0] - start[0], attribs, pool);
    builder.keep(end[1], 0, attribs, pool);
  } else {
    builder.keep(end[1] - start[1], 0, attribs, pool);
  }
};

exports.buildKeepToStartOfRange = (rep, builder, start) => {
  const startLineOffset = rep.lines.offsetOfIndex(start[0]);

  builder.keep(startLineOffset, start[0]);
  builder.keep(start[1]);
};
