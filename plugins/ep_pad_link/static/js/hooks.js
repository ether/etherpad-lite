exports.aceEditorCSS = function(hookName, context, cb) {
	return cb(['ep_pad_link/static/css/ace.css']);
};

exports.postAceInit = function(hookName, context) {
	context.ace.callWithAce(function(ace) {
		var $inner = $(ace.ace_getDocument()).find('#innerdocbody');

		$inner.on('click', '.padLink', function() {
			var padName = this.getAttribute('data-pad');

			window.top.openPad(padName);
		});
	});
};

exports.postToolbarInit = function(hookName, context, cb) {
	context.toolbar.registerDropdownCommand('padLinkModal:open', 'pad_link_modal');
	return cb();
};

exports.aceAttribsToClasses = function(hookName, context, cb) {
	if (context.key == 'padLink' && context.value != '') {
		return cb(['padLink:' + context.value]);
	}
};

exports.aceCreateDomLine = function(hookName, context, cb) {
	if (context.cls.indexOf('padLink:') >= 0) {
		var clss = [];
		var argClss = context.cls.split(' ');
		var value;
		var title = 'To go to this pad click this link with pressed CTRL key';

		for (var i = 0; i < argClss.length; i++) {
			var cls = argClss[i];

			if (cls.indexOf('padLink:') !== -1) {
				value = cls.substr(cls.indexOf(':') + 1);
			} else {
				clss.push(cls);
			}
		}

		return cb([{
			cls: clss.join(' '),
			extraOpenTags: '<span class="padLink" data-pad="' + value + '" alt="' + title + '">',
			extraCloseTags: '</span>'
		}]);
	}

	return cb();
};