$(document).ready(function () {
	$('#pad_link_insert_btn').click(function() {
		var padeditor = require('ep_etherpad-lite/static/js/pad_editor').padeditor;

		padeditbar.toggleDropDown('none');
		window.top.pm.send('toggleLinkModal');
	});

	window.top.pm.subscribe('newPadLink', function(data) {
		if (data.etherpadId === pad.getPadId()) {
			var padeditor = require('ep_etherpad-lite/static/js/pad_editor').padeditor;

			padeditor.ace.callWithAce(function(ace) {
				var rep = ace.ace_getRep();

				// If there is no selection, insert pad name
				if (rep.selEnd[1] - rep.selStart[1] <= 1) {
					ace.ace_replaceRange(rep.selEnd, rep.selEnd, data.title);
					ace.ace_performSelectionChange([rep.selEnd[0], rep.selEnd[1] - data.title.length], rep.selEnd, false);
				}

				ace.ace_performDocumentApplyAttributesToRange(rep.selStart, rep.selEnd, [['link', data.id]]);
			}, 'link');
		}
	});
});
