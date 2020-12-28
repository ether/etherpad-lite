'use strict';

(function($){

$.fn.sendkeys = function (x){
	return this.each( function(){
		bililiteRange(this).bounds('selection').sendkeys(x).select();
		this.focus();
	});
}; // sendkeys

// add a default handler for keydowns so that we can send keystrokes, even though code-generated events 
// are untrusted (http://www.w3.org/TR/DOM-Level-3-Events/#trusted-events)
// documentation of special event handlers is at http://learn.jquery.com/events/event-extensions/
$.event.special.keydown = $.event.special.keydown || {};
$.event.special.keydown._default = function (evt){
	if (evt.isTrusted) return false;
	if (evt.key == null) return false; // nothing to print. Use the keymap plugin to set this 
	if (evt.ctrlKey || evt.altKey || evt.metaKey) return false; // only deal with printable characters.
	var target = evt.target;
	if (target.isContentEditable || target.nodeName == 'INPUT' || target.nodeName == 'TEXTAREA') {
		// only insert into editable elements
		var key = evt.key;
		if (key.length > 1 && key.charAt(0) != '{') key = '{'+key+'}'; // sendkeys notation
		$(target).sendkeys(key);
		return true;
	}
	return false;
}
})(jQuery)
