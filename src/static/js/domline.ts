'use strict';

// THIS FILE IS ALSO AN APPJET MODULE: etherpad.collab.ace.domline
// %APPJET%: import("etherpad.admin.plugins");

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

// requires: top
// requires: plugins
// requires: undefined

const Security = require('security');
const hooks = require('./pluginfw/hooks');
const _ = require('underscore');
import {lineAttributeMarker} from "./linestylefilter";

const noop = () => {};




class Domline {
  private node?: HTMLElement| {
    innerHTML: '',
    className: '',
  }
  html:string[] = [];
  preHtml = '';
  postHtml = '';
  curHTML: string|null = null;
  private lineMarker: number
  private readonly doesWrap: boolean;
  private optBrowser: string | undefined;
  private optDocument: Document | undefined;
  private lineClass = 'ace-line';
  private nonEmpty: boolean;

  constructor(nonEmpty: boolean, doesWrap: boolean, optBrowser?: string, optDocument?: Document) {
    this.lineMarker = 0
    this.doesWrap = doesWrap
    this.nonEmpty = nonEmpty
    this.optBrowser = optBrowser
    this.optDocument = optDocument
  }
  addToLineClass = (lineClass: string, cls: string) => {
    // an "empty span" at any point can be used to add classes to
    // the line, using line:className.  otherwise, we ignore
    // the span.
    cls.replace(/\S+/g, (c) => {
      if (c.indexOf('line:') === 0) {
        // add class to line
        lineClass = (lineClass ? `${lineClass} ` : '') + c.substring(5);
        return lineClass
      }
      return c
    });
    return lineClass;
  }

  ProcessSpaces = (s: string) => this.processSpaces(s, this.doesWrap);
  perTextNodeProcess = (s: string):string=>{
    if (this.doesWrap){
      return  _.identity()
    } else {
      return this.processSpaces(s)
    }
  }
  perHtmlLineProcess = (s:string)=>{
    if (this.doesWrap) {
      return this.processSpaces(s)
    } else {
      return _.identity()
    }
  }

  appendSpan = (txt: string, cls: string) => {
    let processedMarker = false;
    // Handle lineAttributeMarker, if present
    if (cls.indexOf(lineAttributeMarker) >= 0) {
      let listType = /(?:^| )list:(\S+)/.exec(cls);
      const start = /(?:^| )start:(\S+)/.exec(cls);

      _.map(hooks.callAll('aceDomLinePreProcessLineAttributes', {
        domline: this,
        cls,
      }), (modifier: { preHtml: any; postHtml: any; processedMarker: boolean; }) => {
        this.preHtml += modifier.preHtml;
        this.postHtml += modifier.postHtml;
        processedMarker ||= modifier.processedMarker;
      });
      if (listType) {
        let listTypeExtracted = listType[1];
        if (listTypeExtracted) {
          if (listTypeExtracted.indexOf('number') < 0) {
            this.preHtml += `<ul class="list-${Security.escapeHTMLAttribute(listTypeExtracted)}"><li>`;
            this.postHtml = `</li></ul>${this.postHtml}`;
          } else {
            if (start) { // is it a start of a list with more than one item in?
              if (Number.parseInt(start[1]) === 1) { // if its the first one at this level?
                // Add start class to DIV node
                this.lineClass = `${this.lineClass} ` + `list-start-${listTypeExtracted}`;
              }
              this.preHtml +=
                `<ol start=${start[1]} class="list-${Security.escapeHTMLAttribute(listTypeExtracted)}"><li>`;
            } else {
              // Handles pasted contents into existing lists
              this.preHtml += `<ol class="list-${Security.escapeHTMLAttribute(listTypeExtracted)}"><li>`;
            }
            this.postHtml += '</li></ol>';
          }
        }
        processedMarker = true;
      }
      _.map(hooks.callAll('aceDomLineProcessLineAttributes', {
        domline: this,
        cls,
      }), (modifier: { preHtml: string; postHtml: string; processedMarker: boolean; }) => {
        this.preHtml += modifier.preHtml;
        this.postHtml += modifier.postHtml;
        processedMarker ||= modifier.processedMarker;
      });
      if (processedMarker) {
        this.lineMarker += txt.length;
        return; // don't append any text
      }
    }
    let href: null|string = null;
    let simpleTags: null|string[] = null;
    if (cls.indexOf('url') >= 0) {
      cls = cls.replace(/(^| )url:(\S+)/g, (x0, space, url: string) => {
        href = url;
        return `${space}url`;
      });
    }
    if (cls.indexOf('tag') >= 0) {
      cls = cls.replace(/(^| )tag:(\S+)/g, (x0, space, tag) => {
        if (!simpleTags) simpleTags = [];
        simpleTags.push(tag.toLowerCase());
        return space + tag;
      });
    }

    let extraOpenTags = '';
    let extraCloseTags = '';

    _.map(hooks.callAll('aceCreateDomLine', {
      domline: this,
      cls,
    }), (modifier: { cls: string; extraOpenTags: string; extraCloseTags: string; }) => {
      cls = modifier.cls;
      extraOpenTags += modifier.extraOpenTags;
      extraCloseTags = modifier.extraCloseTags + extraCloseTags;
    });

    if ((!txt) && cls) {
      this.lineClass = this.addToLineClass(this.lineClass, cls);
    } else if (txt) {
      if (href) {
        const urn_schemes = new RegExp('^(about|geo|mailto|tel):');
        // if the url doesn't include a protocol prefix, assume http
        // @ts-ignore
        if (!~href.indexOf('://') && !urn_schemes.test(href)) {
          href = `http://${href}`;
        }
        // Using rel="noreferrer" stops leaking the URL/location of the pad when
        // clicking links in the document.
        // Not all browsers understand this attribute, but it's part of the HTML5 standard.
        // https://html.spec.whatwg.org/multipage/links.html#link-type-noreferrer
        // Additionally, we do rel="noopener" to ensure a higher level of referrer security.
        // https://html.spec.whatwg.org/multipage/links.html#link-type-noopener
        // https://mathiasbynens.github.io/rel-noopener/
        // https://github.com/ether/etherpad-lite/pull/3636
        const escapedHref = Security.escapeHTMLAttribute(href);
        extraOpenTags = `${extraOpenTags}<a href="${escapedHref}" rel="noreferrer noopener">`;
        extraCloseTags = `</a>${extraCloseTags}`;
      }
      if (simpleTags) {
        // @ts-ignore
        simpleTags.sort();
        // @ts-ignore
        extraOpenTags = `${extraOpenTags}<${simpleTags.join('><')}>`;
        // @ts-ignore
        simpleTags.reverse();
        // @ts-ignore
        extraCloseTags = `</${simpleTags.join('></')}>${extraCloseTags}`;
      }
      this.html.push(
        '<span class="', Security.escapeHTMLAttribute(cls || ''),
        '">',
        extraOpenTags,
        this.perTextNodeProcess(Security.escapeHTML(txt)),
        extraCloseTags,
        '</span>');
    }
  }

  writeHTML = () => {
    let newHTML = this.perHtmlLineProcess(this.html.join(''));
    if (!newHTML) {
      if ((!document) || (!this.optBrowser)) {
        newHTML += '&nbsp;';
      } else {
        newHTML += '<br/>';
      }
    }
    if (this.nonEmpty) {
      newHTML = (this.preHtml || '') + newHTML + (this.postHtml || '');
    }
    this.html! = []
    this.preHtml = this.postHtml = ''; // free memory
    if (newHTML !== this.curHTML) {
      this.curHTML = newHTML;
      this.node!.innerHTML! = this.curHTML as string;
    }
    if (this.lineClass != null) this.node!.className = this.lineClass;

    hooks.callAll('acePostWriteDomLineHTML', {
      node: this.node,
    });
  };

  clearSpans = () => {
    this.html = [];
    this.lineClass = 'ace-line';
    this.lineMarker = 0;
  }

  prepareForAdd = this.writeHTML
  finishUpdate = this.writeHTML

  private processSpaces = (s: string, doesWrap?: boolean) => {
    if (s.indexOf('<') < 0 && !doesWrap) {
      // short-cut
      return s.replace(/ /g, '&nbsp;');
    }
    const parts = [];
    s.replace(/<[^>]*>?| |[^ <]+/g, (m) => {
      parts.push(m);
      return m
    });
    if (doesWrap) {
      let endOfLine = true;
      let beforeSpace = false;
      // last space in a run is normal, others are nbsp,
      // end of line is nbsp
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        if (p === ' ') {
          if (endOfLine || beforeSpace) parts[i] = '&nbsp;';
          endOfLine = false;
          beforeSpace = true;
        } else if (p.charAt(0) !== '<') {
          endOfLine = false;
          beforeSpace = false;
        }
      }
      // beginning of line is nbsp
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        if (p === ' ') {
          parts[i] = '&nbsp;';
          break;
        } else if (p.charAt(0) !== '<') {
          break;
        }
      }
    } else {
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        if (p === ' ') {
          parts[i] = '&nbsp;';
        }
      }
    }
    return parts.join('');
  }
}




// if "document" is falsy we don't create a DOM node, just
// an object with innerHTML and className

export default Domline
