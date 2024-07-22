'use strict';

/**
 * This code is mostly from the old Etherpad. Please help us to comment this code.
 * This helps other people to understand this code better and helps them to improve it.
 * TL;DR COMMENTS ON THIS FILE ARE HIGHLY APPRECIATED
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

export class Cssmanager {
  private browserSheet: CSSStyleSheet
  private selectorList:string[] = [];
  constructor(browserSheet: CSSStyleSheet) {
    this.browserSheet = browserSheet
  }

  browserRules = () => (this.browserSheet.cssRules || this.browserSheet.rules);
  browserDeleteRule = (i: number) => {
    if (this.browserSheet.deleteRule) this.browserSheet.deleteRule(i);
    else this.browserSheet.removeRule(i);
  }
  browserInsertRule = (i: number, selector: string) => {
    if (this.browserSheet.insertRule) this.browserSheet.insertRule(`${selector} {}`, i);
    else { // @ts-ignore
      this.browserSheet.addRule(selector, null, i);
    }
  }
  indexOfSelector = (selector: string) => {
    for (let i = 0; i < this.selectorList.length; i++) {
      if (this.selectorList[i] === selector) {
        return i;
      }
    }
    return -1;
  }

  selectorStyle = (selector: string) => {
    let i = this.indexOfSelector(selector);
    if (i < 0) {
      // add selector
      this.browserInsertRule(0, selector);
      this.selectorList.splice(0, 0, selector);
      i = 0;
    }
    // @ts-ignore
    return this.browserRules().item(i)!.style;
  }

  removeSelectorStyle = (selector: string) => {
    const i = this.indexOfSelector(selector);
    if (i >= 0) {
      this.browserDeleteRule(i);
      this.selectorList.splice(i, 1);
    }
  }
  info= () => `${this.selectorList.length}:${this.browserRules().length}`
}
