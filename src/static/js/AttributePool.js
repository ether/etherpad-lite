/**
 * This code represents the Attribute Pool Object of the original Etherpad.
 * 90% of the code is still like in the original Etherpad
 * Look at https://github.com/ether/pad/blob/master/infrastructure/ace/www/easysync2.js
 * You can find a explanation what a attribute pool is here:
 * https://github.com/ether/etherpad-lite/blob/master/doc/easysync/easysync-notes.txt
 */

/*
 * Copyright 2009 Google Inc., 2011 Peter 'Pita' Martischka (Primary Technology Ltd)
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

/*
  An AttributePool maintains a mapping from [key,value] Pairs called
  Attributes to Numbers (unsigened integers) and vice versa. These numbers are
  used to reference Attributes in Changesets.
*/

var AttributePool = function () {
  this.numToAttrib = {}; // e.g. {0: ['foo','bar']}
  this.attribToNum = {}; // e.g. {'foo,bar': 0}
  this.nextNum = 0;
};

AttributePool.prototype.putAttrib = function (attrib, dontAddIfAbsent) {
  var str = String(attrib);
  if (str in this.attribToNum) {
    return this.attribToNum[str];
  }
  if (dontAddIfAbsent) {
    return -1;
  }
  var num = this.nextNum++;
  this.attribToNum[str] = num;
  this.numToAttrib[num] = [String(attrib[0] || ''), String(attrib[1] || '')];
  return num;
};

AttributePool.prototype.getAttrib = function (num) {
  var pair = this.numToAttrib[num];
  if (!pair) {
    return pair;
  }
  return [pair[0], pair[1]]; // return a mutable copy
};

AttributePool.prototype.getAttribKey = function (num) {
  var pair = this.numToAttrib[num];
  if (!pair) return '';
  return pair[0];
};

AttributePool.prototype.getAttribValue = function (num) {
  var pair = this.numToAttrib[num];
  if (!pair) return '';
  return pair[1];
};

AttributePool.prototype.eachAttrib = function (func) {
  for (var n in this.numToAttrib) {
    var pair = this.numToAttrib[n];
    func(pair[0], pair[1]);
  }
};

AttributePool.prototype.toJsonable = function () {
  return {
    numToAttrib: this.numToAttrib,
    nextNum: this.nextNum
  };
};

AttributePool.prototype.fromJsonable = function (obj) {
  this.numToAttrib = obj.numToAttrib;
  this.nextNum = obj.nextNum;
  this.attribToNum = {};
  for (var n in this.numToAttrib) {
    this.attribToNum[String(this.numToAttrib[n])] = Number(n);
  }
  return this;
};
  

module.exports = AttributePool;