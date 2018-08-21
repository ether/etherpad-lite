/**
 * Library for deterministic relative filename expansion for Etherpad.
 */

/*
 * 2018 - muxator
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

var log4js = require('log4js');
var path = require('path');
var _ = require('underscore');

var absPathLogger = log4js.getLogger('AbsolutePaths');

/*
 * findEtherpadRoot() computes its value only on first invocation.
 * Subsequent invocations are served from this variable.
 */
var etherpadRoot = null;

/**
 * If stringArray's last elements are exactly equal to lastDesiredElements,
 * returns a copy in which those last elements are popped, or false otherwise.
 *
 * @param {string[]} stringArray - The input array.
 * @param {string[]} lastDesiredElements - The elements to remove from the end
 *                   of the input array.
 * @return {string[]|boolean} The shortened array, or false if there was no
 *                            overlap.
 */
var popIfEndsWith = function(stringArray, lastDesiredElements) {
  if (stringArray.length <= lastDesiredElements.length) {
    absPathLogger.debug(`In order to pop "${lastDesiredElements.join(path.sep)}" from "${stringArray.join(path.sep)}", it should contain at least ${lastDesiredElements.length + 1 } elements`);

    return false;
  }

  const lastElementsFound = _.last(stringArray, lastDesiredElements.length);

  if (_.isEqual(lastElementsFound, lastDesiredElements)) {
    return _.initial(stringArray, lastDesiredElements.length);
  }

  absPathLogger.debug(`${stringArray.join(path.sep)} does not end with "${lastDesiredElements.join(path.sep)}"`);
  return false;
};

/**
 * Heuristically computes the directory in which Etherpad is installed.
 *
 * All the relative paths have to be interpreted against this absolute base
 * path. Since the Unix and Windows install have a different layout on disk,
 * they are treated as two special cases.
 *
 * The path is computed only on first invocation. Subsequent invocations return
 * a cached value.
 *
 * The cached value is stored in AbsolutePaths.etherpadRoot via a side effect.
 *
 * @return {string} The identified absolute base path. If such path cannot be
 *                  identified, prints a log and exits the application.
 */
exports.findEtherpadRoot = function() {
  if (etherpadRoot !== null) {
    return etherpadRoot;
  }

  const findRoot = require('find-root');
  const foundRoot = findRoot(__dirname);

  var directoriesToStrip;
  if (process.platform === 'win32') {
    /*
     * Given the structure of our Windows package, foundRoot's value
     * will be the following on win32:
     *
     *   <BASE_DIR>\node_modules\ep_etherpad-lite
     */
    directoriesToStrip = ['node_modules', 'ep_etherpad-lite'];
  } else {
    /*
     * On Unix platforms, foundRoot's value will be:
     *
     *   <BASE_DIR>\src
     */
    directoriesToStrip = ['src'];
  }

  const maybeEtherpadRoot = popIfEndsWith(foundRoot.split(path.sep), directoriesToStrip);
  if (maybeEtherpadRoot === false) {
    absPathLogger.error(`Could not identity Etherpad base path in this ${process.platform} installation in "${foundRoot}"`);
    process.exit(1);
  }

  //  SIDE EFFECT on this module-level variable
  etherpadRoot = maybeEtherpadRoot.join(path.sep);

  if (path.isAbsolute(etherpadRoot)) {
    return etherpadRoot;
  }

  absPathLogger.error(`To run, Etherpad has to identify an absolute base path. This is not: "${etherpadRoot}"`);
  process.exit(1);
};
