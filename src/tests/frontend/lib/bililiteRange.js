// Cross-broswer implementation of text ranges and selections
// documentation: http://bililite.com/blog/2011/01/17/cross-browser-text-ranges-and-selections/
// Version: 2.0
// Copyright (c) 2013 Daniel Wachsstock
// MIT license:
// Permission is hereby granted, free of charge, to any person
// obtaining a copy of this software and associated documentation
// files (the "Software"), to deal in the Software without
// restriction, including without limitation the rights to use,
// copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the
// Software is furnished to do so, subject to the following
// conditions:

// The above copyright notice and this permission notice shall be
// included in all copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
// EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
// OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
// NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
// HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
// WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
// FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
// OTHER DEALINGS IN THE SOFTWARE.

(function(){

bililiteRange = function(el, debug){
	var ret;
	if (debug){
		ret = new NothingRange(); // Easier to force it to use the no-selection type than to try to find an old browser
	}else if (document.selection && !document.addEventListener){
		// Internet Explorer 8 and lower
		ret = new IERange();
	}else if (window.getSelection && el.setSelectionRange){
		// Standards. Element is an input or textarea 
		ret = new InputRange();
	}else if (window.getSelection){
		// Standards, with any other kind of element
		ret = new W3CRange()
	}else{
		// doesn't support selection
		ret = new NothingRange();
	}
	ret._el = el;
	// determine parent document, as implemented by John McLear <john@mclear.co.uk>
	ret._doc = el.ownerDocument;
	ret._win = 'defaultView' in ret._doc ? ret._doc.defaultView : ret._doc.parentWindow;
	ret._textProp = textProp(el);
	ret._bounds = [0, ret.length()];
	if (!('oninput' in el)){
		// give IE8 a chance
		var inputhack = function() {ret.dispatch({type: 'input'}) };
		ret.listen('keyup', inputhack);
		ret.listen('cut', inputhack);
		ret.listen('paste', inputhack);
		ret.listen('drop', inputhack);
		el.oninput = 'patched';
	}
	return ret;
}

function textProp(el){
	// returns the property that contains the text of the element
	// note that for <body> elements the text attribute represents the obsolete text color, not the textContent.
	// we document that these routines do not work for <body> elements so that should not be relevant
	if (typeof el.value != 'undefined') return 'value';
	if (typeof el.text != 'undefined') return 'text';
	if (typeof el.textContent != 'undefined') return 'textContent';
	return 'innerText';
}

// base class
function Range(){}
Range.prototype = {
	length: function() {
		return this._el[this._textProp].replace(/\r/g, '').length; // need to correct for IE's CrLf weirdness
	},
	bounds: function(s){
		if (s === 'all'){
			this._bounds = [0, this.length()];
		}else if (s === 'start'){
			this._bounds = [0, 0];
		}else if (s === 'end'){
			this._bounds = [this.length(), this.length()];
		}else if (s === 'selection'){
			this.bounds ('all'); // first select the whole thing for constraining
			this._bounds = this._nativeSelection();
		}else if (s){
			this._bounds = s; // don't do error checking now; things may change at a moment's notice
		}else{
			var b = [
				Math.max(0, Math.min (this.length(), this._bounds[0])),
				Math.max(0, Math.min (this.length(), this._bounds[1]))
			];
			b[1] = Math.max(b[0], b[1]);
			return b; // need to constrain it to fit
		}
		return this; // allow for chaining
	},
	select: function(){
		this._nativeSelect(this._nativeRange(this.bounds()));
		this.dispatch({type: 'select'});
		return this; // allow for chaining
	},
	text: function(text, select){
		if (arguments.length){
			var bounds = this.bounds(), el = this._el;
			// signal the input per DOM 3 input events, http://www.w3.org/TR/DOM-Level-3-Events/#h4_events-inputevents
			// we add another field, bounds, which are the bounds of the original text before being changed.
			this.dispatch({type: 'beforeinput', data: text, bounds: bounds});
			this._nativeSetText(text, this._nativeRange(bounds));
			if (select == 'start'){
				this.bounds ([bounds[0], bounds[0]]);
			}else if (select == 'end'){
				this.bounds ([bounds[0]+text.length, bounds[0]+text.length]);
			}else if (select == 'all'){
				this.bounds ([bounds[0], bounds[0]+text.length]);
			}
			this.dispatch({type: 'input', data: text, bounds: bounds});
			return this; // allow for chaining
		}else{
			return this._nativeGetText(this._nativeRange(this.bounds()));
		}
	},
	insertEOL: function (){
		this._nativeEOL();
		this._bounds = [this._bounds[0]+1, this._bounds[0]+1]; // move past the EOL marker
		return this;
	},
	scrollIntoView: function(){
		this._nativeScrollIntoView(this._nativeRange(this.bounds()));
		return this;
	},
	wrap: function (n){
		this._nativeWrap(n, this._nativeRange(this.bounds()));
		return this;
	},
	selection: function(text){
		if (arguments.length){
			return this.bounds('selection').text(text, 'end').select();
		}else{
			return this.bounds('selection').text();
		}
	},
	clone: function(){
		return bililiteRange(this._el).bounds(this.bounds());
	},
	all: function(text){
		if (arguments.length){
			this.dispatch ({type: 'beforeinput', data: text});
			this._el[this._textProp] = text;
			this.dispatch ({type: 'input', data: text});
			return this;
		}else{
			return this._el[this._textProp].replace(/\r/g, ''); // need to correct for IE's CrLf weirdness;
		}
	},
	element: function() { return this._el },
	// includes a quickie polyfill for CustomEvent for IE that isn't perfect but works for me
	// IE10 allows custom events but not "new CustomEvent"; have to do it the old-fashioned way
	dispatch: function(opts){
		opts = opts || {};
		var event = document.createEvent ? document.createEvent('CustomEvent') : this._doc.createEventObject();
		event.initCustomEvent && event.initCustomEvent(opts.type, !!opts.bubbles, !!opts.cancelable, opts.detail);

		for (var key in opts) event[key] = opts[key];
		// dispatch event asynchronously (in the sense of on the next turn of the event loop; still should be fired in order of dispatch
		var el = this._el;
		setTimeout(function(){
			try {
				el.dispatchEvent ? el.dispatchEvent(event) : el.fireEvent("on" + opts.type, document.createEventObject());
				}catch(e){
					// IE8 will not let me fire custom events at all. Call them directly
					if (jQuery) {
						jQuery(el).trigger(event);
					}else{
						var listeners = el['listen'+opts.type];
						if (listeners) for (var i = 0; i < listeners.length; ++i){
							listeners[i].call(el, event);
						}
					}
				}
		}, 0);
		return this;
	},
	listen: function (type, func){
		var el = this._el;
		if (el.addEventListener){
			el.addEventListener(type, func);
		}else if (jQuery){
			jQuery(el).on(type, func);
		}else{
			el.attachEvent("on" + type, func);
			// IE8 can't even handle custom events created with createEventObject  (though it permits attachEvent), so we have to make our own
			var listeners = el['listen'+type] = el['listen'+type] || [];
			listeners.push(func);
		}
		return this;
	},
	dontlisten: function (type, func){
		var el = this._el;
		if (el.removeEventListener){
			el.removeEventListener(type, func);
		}else if (jQuery){
			jQuery(el).off(type, func);
		}else try{
			el.detachEvent("on" + type, func);
		}catch(e){
			var listeners = el['listen'+type];
			if (listeners) for (var i = 0; i < listeners.length; ++i){
				if (listeners[i] === func) listeners[i] = function(){}; // replace with a noop
			}
		}
		return this;
	}
};

// allow extensions ala jQuery
bililiteRange.fn = Range.prototype; // to allow monkey patching
bililiteRange.extend = function(fns){
	for (fn in fns) Range.prototype[fn] = fns[fn];
};

function IERange(){}
IERange.prototype = new Range();
IERange.prototype._nativeRange = function (bounds){
	var rng;
	if (this._el.tagName == 'INPUT'){
		// IE 8 is very inconsistent; textareas have createTextRange but it doesn't work
		rng = this._el.createTextRange();
	}else{
		rng = this._doc.body.createTextRange ();
		rng.moveToElementText(this._el);
	}
	if (bounds){
		if (bounds[1] < 0) bounds[1] = 0; // IE tends to run elements out of bounds
		if (bounds[0] > this.length()) bounds[0] = this.length();
		if (bounds[1] < rng.text.replace(/\r/g, '').length){ // correct for IE's CrLf wierdness
			// block-display elements have an invisible, uncounted end of element marker, so we move an extra one and use the current length of the range
			rng.moveEnd ('character', -1);
			rng.moveEnd ('character', bounds[1]-rng.text.replace(/\r/g, '').length);
		}
		if (bounds[0] > 0) rng.moveStart('character', bounds[0]);
	}
	return rng;					
};
IERange.prototype._nativeSelect = function (rng){
	rng.select();
};
IERange.prototype._nativeSelection = function (){
	// returns [start, end] for the selection constrained to be in element
	// this fails for an empty selection! selection.createRange() if in a text area does not create a text selection, so I can't compare it.
	var rng = this._nativeRange(); // range of the element to constrain to
	var len = this.length();
	// this._el.focus(); This solves the problem of text areas not having a real selection , but sucks the focus from everything else, so I can't use it
	var sel = this._doc.selection.createRange();
	try{
		return [
			iestart(sel, rng),
			ieend (sel, rng)
		];
	}catch (e){
		// IE gets upset sometimes about comparing text to input elements, but the selections cannot overlap, so make a best guess
		return (sel.parentElement().sourceIndex < this._el.sourceIndex) ? [0,0] : [len, len];
	}
};
IERange.prototype._nativeGetText = function (rng){
	return rng.text.replace(/\r/g, ''); // correct for IE's CrLf weirdness
};
IERange.prototype._nativeSetText = function (text, rng){
	rng.text = text;
};
IERange.prototype._nativeEOL = function(){
	if ('value' in this._el){
		this.text('\n'); // for input and textarea, insert it straight
	}else{
		this._nativeRange(this.bounds()).pasteHTML('\n<br/>');
	}
};
IERange.prototype._nativeScrollIntoView = function(rng){
	rng.scrollIntoView();
}
IERange.prototype._nativeWrap = function(n, rng) {
	// hacky to use string manipulation but I don't see another way to do it.
	var div = document.createElement('div');
	div.appendChild(n);
	// insert the existing range HTML after the first tag
	var html = div.innerHTML.replace('><', '>'+rng.htmlText+'<');
	rng.pasteHTML(html);
};

// IE internals
function iestart(rng, constraint){
	// returns the position (in character) of the start of rng within constraint. If it's not in constraint, returns 0 if it's before, length if it's after
	var len = constraint.text.replace(/\r/g, '').length; // correct for IE's CrLf wierdness
	if (rng.compareEndPoints ('StartToStart', constraint) <= 0) return 0; // at or before the beginning
	if (rng.compareEndPoints ('StartToEnd', constraint) >= 0) return len;
	for (var i = 0; rng.compareEndPoints ('StartToStart', constraint) > 0; ++i, rng.moveStart('character', -1));
	return i;
}
function ieend (rng, constraint){
	// returns the position (in character) of the end of rng within constraint. If it's not in constraint, returns 0 if it's before, length if it's after
	var len = constraint.text.replace(/\r/g, '').length; // correct for IE's CrLf wierdness
	if (rng.compareEndPoints ('EndToEnd', constraint) >= 0) return len; // at or after the end
	if (rng.compareEndPoints ('EndToStart', constraint) <= 0) return 0;
	for (var i = 0; rng.compareEndPoints ('EndToStart', constraint) > 0; ++i, rng.moveEnd('character', -1));
	return i;
}

// an input element in a standards document. "Native Range" is just the bounds array
function InputRange(){}
InputRange.prototype = new Range();
InputRange.prototype._nativeRange = function(bounds) {
	return bounds || [0, this.length()];
};
InputRange.prototype._nativeSelect = function (rng){
	this._el.setSelectionRange(rng[0], rng[1]);
};
InputRange.prototype._nativeSelection = function(){
	return [this._el.selectionStart, this._el.selectionEnd];
};
InputRange.prototype._nativeGetText = function(rng){
	return this._el.value.substring(rng[0], rng[1]);
};
InputRange.prototype._nativeSetText = function(text, rng){
	var val = this._el.value;
	this._el.value = val.substring(0, rng[0]) + text + val.substring(rng[1]);
};
InputRange.prototype._nativeEOL = function(){
	this.text('\n');
};
InputRange.prototype._nativeScrollIntoView = function(rng){
	// I can't remember where I found this clever hack to find the location of text in a text area
	var clone = this._el.cloneNode(true);
	clone.style.visibility = 'hidden';
	clone.style.position = 'absolute';
	this._el.parentNode.insertBefore(clone, this._el);
	clone.style.height = '1px';
	clone.value = this._el.value.slice(0, rng[0]);
	var top = clone.scrollHeight;
	// this gives the bottom of the text, so we have to subtract the height of a single line
	clone.value = 'X';
	top -= 2*clone.scrollHeight; // show at least a line above
	clone.parentNode.removeChild(clone);
	// scroll into position if necessary
	if (this._el.scrollTop > top || this._el.scrollTop+this._el.clientHeight < top){
		this._el.scrollTop = top;
	}
	// now scroll the element into view; get its position as in jQuery.offset
	var rect = this._el.getBoundingClientRect();
	rect.top += this._win.pageYOffset - this._doc.documentElement.clientTop;
	rect.left += this._win.pageXOffset - this._doc.documentElement.clientLeft;
	// create an element to scroll to (can't just use the clone above, since scrollIntoView wants a visible element)
	var div = this._doc.createElement('div');
	div.style.position = 'absolute';
	div.style.top = (rect.top+top-this._el.scrollTop)+'px'; // adjust for how far in the range is; it may not have scrolled all the way to the top
	div.style.left = rect.left+'px';
	div.innerHTML = '&nbsp;';
	this._doc.body.appendChild(div);
	div.scrollIntoViewIfNeeded ? div.scrollIntoViewIfNeeded() : div.scrollIntoView();
	div.parentNode.removeChild(div);
}
InputRange.prototype._nativeWrap = function() {throw new Error("Cannot wrap in a text element")};

function W3CRange(){}
W3CRange.prototype = new Range();
W3CRange.prototype._nativeRange = function (bounds){
	var rng = this._doc.createRange();
	rng.selectNodeContents(this._el);
	if (bounds){
		w3cmoveBoundary (rng, bounds[0], true, this._el);
		rng.collapse (true);
		w3cmoveBoundary (rng, bounds[1]-bounds[0], false, this._el);
	}
	return rng;					
};
W3CRange.prototype._nativeSelect = function (rng){
	this._win.getSelection().removeAllRanges();
	this._win.getSelection().addRange (rng);
};
W3CRange.prototype._nativeSelection = function (){
		// returns [start, end] for the selection constrained to be in element
		var rng = this._nativeRange(); // range of the element to constrain to
		if (this._win.getSelection().rangeCount == 0) return [this.length(), this.length()]; // append to the end
		var sel = this._win.getSelection().getRangeAt(0);
		return [
			w3cstart(sel, rng),
			w3cend (sel, rng)
		];
	}
W3CRange.prototype._nativeGetText = function (rng){
	return rng.toString();
};
W3CRange.prototype._nativeSetText = function (text, rng){
	rng.deleteContents();
	rng.insertNode (this._doc.createTextNode(text));
	this._el.normalize(); // merge the text with the surrounding text
};
W3CRange.prototype._nativeEOL = function(){
	var rng = this._nativeRange(this.bounds());
	rng.deleteContents();
	var br = this._doc.createElement('br');
	br.setAttribute ('_moz_dirty', ''); // for Firefox
	rng.insertNode (br);
	rng.insertNode (this._doc.createTextNode('\n'));
	rng.collapse (false);
};
W3CRange.prototype._nativeScrollIntoView = function(rng){
	// can't scroll to a range; have to scroll to an element instead
	var span = this._doc.createElement('span');
	rng.insertNode(span);
	span.scrollIntoViewIfNeeded ? span.scrollIntoViewIfNeeded() : span.scrollIntoView();
	span.parentNode.removeChild(span);
}
W3CRange.prototype._nativeWrap = function(n, rng) {
	rng.surroundContents(n);
};

// W3C internals
function nextnode (node, root){
	//  in-order traversal
	// we've already visited node, so get kids then siblings
	if (node.firstChild) return node.firstChild;
	if (node.nextSibling) return node.nextSibling;
	if (node===root) return null;
	while (node.parentNode){
		// get uncles
		node = node.parentNode;
		if (node == root) return null;
		if (node.nextSibling) return node.nextSibling;
	}
	return null;
}
function w3cmoveBoundary (rng, n, bStart, el){
	// move the boundary (bStart == true ? start : end) n characters forward, up to the end of element el. Forward only!
	// if the start is moved after the end, then an exception is raised
	if (n <= 0) return;
	var node = rng[bStart ? 'startContainer' : 'endContainer'];
	if (node.nodeType === Node.TEXT_NODE) {
	  // we may be starting somewhere into the text
	  n += rng[bStart ? 'startOffset' : 'endOffset'];
	}
	for (; node; node = nextnode(node, el)) {
		if (node.nodeType === Node.TEXT_NODE) {
			if (n < node.nodeValue.length) {
				rng[bStart ? 'setStart' : 'setEnd'](node, n);
				return;
			}
			n -= node.nodeValue.length;
		}
		if (!node.firstChild) rng[bStart ? 'setStartAfter' : 'setEndAfter'](node);
	}
}
var     START_TO_START                 = 0; // from the w3c definitions
var     START_TO_END                   = 1;
var     END_TO_END                     = 2;
var     END_TO_START                   = 3;
// from the Mozilla documentation, for range.compareBoundaryPoints(how, sourceRange)
// -1, 0, or 1, indicating whether the corresponding boundary-point of range is respectively before, equal to, or after the corresponding boundary-point of sourceRange. 
    // * Range.END_TO_END compares the end boundary-point of sourceRange to the end boundary-point of range.
    // * Range.END_TO_START compares the end boundary-point of sourceRange to the start boundary-point of range.
    // * Range.START_TO_END compares the start boundary-point of sourceRange to the end boundary-point of range.
    // * Range.START_TO_START compares the start boundary-point of sourceRange to the start boundary-point of range. 
function w3cstart(rng, constraint){
	if (rng.compareBoundaryPoints (START_TO_START, constraint) <= 0) return 0; // at or before the beginning
	if (rng.compareBoundaryPoints (END_TO_START, constraint) >= 0) return constraint.toString().length;
	rng = rng.cloneRange(); // don't change the original
	rng.setEnd (constraint.endContainer, constraint.endOffset); // they now end at the same place
	return constraint.toString().length - rng.toString().length;
}
function w3cend (rng, constraint){
	if (rng.compareBoundaryPoints (END_TO_END, constraint) >= 0) return constraint.toString().length; // at or after the end
	if (rng.compareBoundaryPoints (START_TO_END, constraint) <= 0) return 0;
	rng = rng.cloneRange(); // don't change the original
	rng.setStart (constraint.startContainer, constraint.startOffset); // they now start at the same place
	return rng.toString().length;
}

function NothingRange(){}
NothingRange.prototype = new Range();
NothingRange.prototype._nativeRange = function(bounds) {
	return bounds || [0,this.length()];
};
NothingRange.prototype._nativeSelect = function (rng){ // do nothing
};
NothingRange.prototype._nativeSelection = function(){
	return [0,0];
};
NothingRange.prototype._nativeGetText = function (rng){
	return this._el[this._textProp].substring(rng[0], rng[1]);
};
NothingRange.prototype._nativeSetText = function (text, rng){
	var val = this._el[this._textProp];
	this._el[this._textProp] = val.substring(0, rng[0]) + text + val.substring(rng[1]);
};
NothingRange.prototype._nativeEOL = function(){
	this.text('\n');
};
NothingRange.prototype._nativeScrollIntoView = function(){
	this._el.scrollIntoView();
};
NothingRange.prototype._nativeWrap = function() {throw new Error("Wrapping not implemented")};

})();
