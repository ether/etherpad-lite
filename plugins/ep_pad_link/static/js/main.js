$(document).ready(function () {
	var pads = {};
	var padsPath;
	var currentPad;

	$('#pad_link_insert_btn').click(toggleDropDown);

	$('#pad_link_modal_new').on('click', function() {
		insertPadLink(randomPadName());
		toggleDropDown();
	});

	$('#pad_link_modal_form').on('submit', function() {
		var padName = this.elements.padname.value;

		if (padName.length > 0) {
			insertPadLink(padName);

			toggleDropDown();
		} else {
			alert('Please enter a name');
		}

		return false;
	});

	function toggleDropDown() {
		var padeditor = require('ep_etherpad-lite/static/js/pad_editor').padeditor;

		padeditbar.toggleDropDown('pad_link_modal');
	}

	function insertPadLink(padName) {
		var padeditor = require('ep_etherpad-lite/static/js/pad_editor').padeditor;

		padeditor.ace.callWithAce(function(ace) {
			rep = ace.ace_getRep();

			// If there is no selection, insert pad name
			if (rep.selEnd[1] - rep.selStart[1] === 0) {
				ace.ace_replaceRange(rep.selStart, rep.selEnd, padName);
				ace.ace_performSelectionChange([rep.selStart[0], rep.selStart[1] - padName.length], rep.selStart, false);
			}

			ace.ace_performDocumentApplyAttributesToRange(rep.selStart, rep.selEnd, [['padLink', padName]]);
		}, 'padLink');
	}

	function randomPadName() {
		var chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
		var string_length = 10;
		var randomstring = '';

		for (var i = 0; i < string_length; i++) {
			var rnum = Math.floor(Math.random() * chars.length);

			randomstring += chars.substring(rnum, rnum + 1);
		}

		return randomstring;
	}

	window.openPad = function(padName) {
		var newPadsPath = [];

		if (padName === padsPath[padsPath.length - 1]) {
			return alert('This pad is already opened');
		}

		if (padName === pad.getPadId()) {
			newPadsPath = [];
		} else {
			// If there is such pad in browsing path, then push it to end
			if (padsPath.indexOf(padName) === -1) {
				newPadsPath = padsPath.concat(padName);
			} else {
				// If it exist, then go back in path to this pad
				newPadsPath = padsPath.slice(0, padsPath.indexOf(padName) + 1);
			}
		}

		window.location.hash = newPadsPath.join('/');
	};

	function hashChangeHandler(event) {
		var hash = window.location.hash.substr(1);

		padsPath = hash.split('/').filter(function(padName) { return !!padName; });
		currentPad = padsPath.length ? padsPath[padsPath.length - 1] : pad.getPadId();
		document.title = currentPad + ' | Open Companies';

		Object.keys(pads).forEach(function(padName) {
			$element = pads[padName];
			$element
				.removeClass('pad_window--active')
				.addClass('pad_window--hidden');
		});

		padsPath.forEach(function(padName, index) {
			var $element = pads[padName];

			if (!$element) {
				$element = $(
					'<div class="pad_window" data-pad="' + padName + '">' +
						'<div class="pad_window__screen"></div>' +
						'<iframe src="/p/' + padName + '?showControls=true&showChat=true&showLineNumbers=true&useMonospaceFont=false" width="100%" height="100%">' +
					'</div>'
				);

				$element
					.appendTo('body')
					.find('.pad_window__screen')
					.on('click', function() {
						if (padsPath.length !== 0) {
							var previousPad = padsPath[padsPath.length - 2] || pad.getPadId();

							padsPath = padsPath.slice(0, padsPath.length - 2);

							openPad(previousPad);
						}
					});

				pads[padName] = $element;
			}

			$element
				.css('left', 80 * (index + 1) + 'px')
				.removeClass('pad_window--hidden')
				.addClass(padName === currentPad ? 'pad_window--active' : '');
		});
	}

	window.onhashchange = hashChangeHandler;
	hashChangeHandler();
});