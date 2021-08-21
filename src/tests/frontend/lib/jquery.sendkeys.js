// insert characters in a textarea or text input field
// special characters are enclosed in {}; use {{} for the { character itself
// documentation: http://bililite.com/blog/2008/08/20/the-fnsendkeys-plugin/
// Version: 2.2
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

(function($){

$.fn.sendkeys = function (x, opts){
	return this.each( function(){
		var localkeys = $.extend({}, opts, $(this).data('sendkeys')); // allow for element-specific key functions
		// most elements to not keep track of their selection when they lose focus, so we have to do it for them
		var rng = $(this).selectionTracker();
		$(this).trigger({type: 'beforesendkeys', which: x});
		this.focus();
		$.data(this, 'sendkeys.originalText', rng.text());
		// turn line feeds into explicit break insertions, but not if escaped
		x.replace(/{[^}]*}|[^{]+/g, (s) => s.startsWith('{') ? s : s.replace(/\n/g, '{enter}')).
		  replace(/{[^}]*}|[^{]+/g, function(s){
				(localkeys[s] || $.fn.sendkeys.defaults[s] || $.fn.sendkeys.defaults.simplechar)(rng, s);
				rng.select();
		  });
		$(this).trigger({type: 'sendkeys', which: x});
	});
}; // sendkeys

// add the functions publicly so they can be overridden
$.fn.sendkeys.defaults = {
	simplechar: function (rng, s){
		// deal with unknown {key}s
		if (/^{[^}]*}$/.test(s)) s = s.slice(1,-1);
		for (var i =0; i < s.length; ++i){
			var x = s.charCodeAt(i);
			$(rng.element()).trigger({type: 'keypress', keyCode: x, which: x, charCode: x});
		}
		rng.text(s, 'end');
	},
	'{enter}': function (rng){
		$(rng._el).trigger({type: 'keypress', keyCode: 13, which: 13, charCode: 13, code: 'Enter', key: 'Enter'});
		rng.insertEOL();
	},
	'{backspace}': function (rng){
		var b = rng.bounds();
		if (b[0] == b[1]) rng.bounds([b[0]-1, b[0]]); // no characters selected; it's just an insertion point. Remove the previous character
		rng.text('', 'end'); // delete the characters and update the selection
	},
	'{del}': function (rng){
		var b = rng.bounds();
		if (b[0] == b[1]) rng.bounds([b[0], b[0]+1]); // no characters selected; it's just an insertion point. Remove the next character
		rng.text('', 'end'); // delete the characters and update the selection
	},
	'{rightarrow}':  function (rng){
		var b = rng.bounds();
		if (b[0] == b[1]) ++b[1]; // no characters selected; it's just an insertion point. Move to the right
		rng.bounds([b[1], b[1]]);
	},
	'{leftarrow}': function (rng){
		var b = rng.bounds();
		if (b[0] == b[1]) --b[0]; // no characters selected; it's just an insertion point. Move to the left
		rng.bounds([b[0], b[0]]);
	},
	'{selectall}' : function (rng){
		rng.bounds('all');
	},
	'{selection}': function (rng){
		// insert the characters without the sendkeys processing
		var s = $.data(rng.element(), 'sendkeys.originalText');
		for (var i =0; i < s.length; ++i){
			var x = s.charCodeAt(i);
			$(rng.element()).trigger({type: 'keypress', keyCode: x, which: x, charCode: x});
		}
		rng.selection(s);
	},
	'{mark}' : function (rng){
		var bounds = rng.bounds();
		$(rng.element()).one('sendkeys', function(){
			// set up the event listener to change the selection after the sendkeys is done
			rng.bounds(bounds).select();
		});
	}
};

// Most ranges do not keep track of what was selected when they lose focus. 
// We have to do that for them
$.fn.selectionTracker = function(bounds){
	var rng = this.data('selectionTracker');
	if (!rng){
		rng = bililiteRange(this[0]).bounds('selection');
		this.data('selectionTracker', rng);
		$(this).on('mouseup.selectionTracker', function(evt){
			// we have to update the saved range. 
			rng.bounds('selection');
		}).on('keyup.selectionTracker', function(evt){
			// restore the selection if we got here with a tab (a click should select what was clicked on)
			if (evt.which == 9){
				// there's a flash of selection when we restore the focus, but I don't know how to avoid that.
				rng.select();
			}else{
				rng.bounds('selection');
			}	
		});
	}
	if (arguments.length > 0) rng.bounds(bounds); // change the saved selection without actually selecting
	if (document.activeElement == this[0]) rng.select(); // explicitly select it if already active
	return rng;
}

// monkey patch bililiteRange to reflect the saved range
var oldselect = bililiteRange.fn.select;
bililiteRange.fn.select = function(){
	var $el = $(this.element());
	if (
		$el.data('selectionTracker') && 
		document.activeElement != $el[0]
	){
		$el.selectionTracker(this.bounds());
	}
	return oldselect.apply(this, arguments);
};
var oldbounds = bililiteRange.fn.bounds;
bililiteRange.fn.bounds = function(bounds){
	var $el = $(this.element());
	if (
		$el.data('selectionTracker') && // if we are tracking the selection
		document.activeElement != $el[0] && // and the real selection isn't here
		bounds == 'selection' // and we want the selection anyway
	){
		bounds = $el.selectionTracker().bounds(); // use the saved selection
	}
	return oldbounds.call(this, bounds);
}

// monkey patch focus to actually focus the element, on the saved range
var focus = $.fn.focus;
$.fn.focus = function(){
	if (this.length > 0){
		this[0].focus();
		this.selectionTracker();
	}
	focus.apply(this, arguments);
}

})(jQuery)
