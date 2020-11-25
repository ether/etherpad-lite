// @license magnet:?xt=urn:btih:8e4f440f4c65981c5bf93c76d35135ba5064d8b7&dn=apache-2.0.txt Apache-2.0
/**
 * Copyright 2011 Peter Martischka, Primary Technology.
 * Copyright 2020 Richard Hansen
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/* global $, customStart */

function randomPadName() {
  // the number of distinct chars (64) is chosen to ensure that the selection will be uniform when
  // using the PRNG below
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_';
  // the length of the pad name is chosen to get 120-bit security: log2(64^20) = 120
  const string_length = 20;
  // make room for 8-bit integer values that span from 0 to 255.
  const randomarray = new Uint8Array(string_length);
  // use browser's PRNG to generate a "unique" sequence
  const cryptoObj = window.crypto || window.msCrypto; // for IE 11
  cryptoObj.getRandomValues(randomarray);
  let randomstring = '';
  for (let i = 0; i < string_length; i++) {
    // instead of writing "Math.floor(randomarray[i]/256*64)"
    // we can save some cycles.
    const rnum = Math.floor(randomarray[i] / 4);
    randomstring += chars.substring(rnum, rnum + 1);
  }
  return randomstring;
}

$(() => {
  $('#go2Name').submit(() => {
    const padname = $('#padname').val();
    if (padname.length > 0) {
      window.location = `p/${encodeURIComponent(padname.trim())}`;
    } else {
      alert('Please enter a name');
    }
    return false;
  });

  $('#button').click(() => {
    window.location = `p/${randomPadName()}`;
  });

  // start the custom js
  if (typeof customStart === 'function') customStart();
});

// @license-end
