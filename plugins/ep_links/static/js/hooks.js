exports.aceEditorCSS = function(hookName, context, cb) {
	return cb(['ep_links/static/css/ace.css']);
};

exports.aceEditEvent = function(hookName, context) {
	if (context.callstack.type === 'handleClick') {
		window.top.pm.send('toggleLinkModal', false);
	}
};

exports.postAceInit = function(hookName, context) {
	context.ace.callWithAce(function(ace) {
		var $inner = $(ace.ace_getDocument()).find('#innerdocbody');

		$inner.on('click', '.link', function() {
			var linkPath = this.getAttribute('data-link-path');

			if (linkPath.search(/(http|s):/) >= 0) {
				window.open(linkPath, '_blank');
			} else {
				window.top.pm.send('openPad', linkPath);
			}
		});
	});
};

exports.postToolbarInit = function(hookName, context, cb) {
	context.toolbar.registerDropdownCommand('padLinkModal:open', 'pad_link_modal');
	return cb();
};

exports.aceAttribsToClasses = function(hookName, context, cb) {
	if (context.key == 'link' && context.value != '') {
		return cb(['link:' + context.value]);
	}
};

exports.aceCreateDomLine = function(hookName, context, cb) {
	if (context.cls.indexOf('link:') >= 0) {
		var clss = [];
		var argClss = context.cls.split(' ');
		var value;
		var title = 'To go to this pad click this link with pressed CTRL key';

		for (var i = 0; i < argClss.length; i++) {
			var cls = argClss[i];

			if (cls.indexOf('link:') !== -1) {
				value = cls.substr(cls.indexOf(':') + 1);
			} else {
				clss.push(cls);
			}
		}

		return cb([{
			cls: clss.join(' '),
			extraOpenTags: '<span class="link" data-link-path="' + value + '" alt="' + title + '">',
			extraCloseTags: '</span>'
		}]);
	}

	return cb();
};
