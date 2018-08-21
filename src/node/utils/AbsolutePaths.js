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
var _ = require('underscore');

var absPathLogger = log4js.getLogger('AbsolutePaths');

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
