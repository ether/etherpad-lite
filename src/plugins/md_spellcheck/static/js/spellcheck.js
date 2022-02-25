'use strict';

const padcookie = require('ep_etherpad-lite/static/js/pad_cookie').padcookie;

const postAceInit = (hook, context) => {
  const $outer = $('iframe[name="ace_outer"]').contents().find('iframe');
  const $inner = $outer.contents().find('#innerdocbody');
  const spellcheck = {
    enable: () => {
      $inner.attr('spellcheck', 'true');
      $inner.find('div').each(function () {
        $(this).attr('spellcheck', 'true');
        $(this)
          .find('div')
          .each(function () {
            $(this).attr('spellcheck', 'true');
          });
      });
    },
    disable: () => {
      $inner.attr('spellcheck', 'false');
      $inner.find('div').each(function () {
        $(this).attr('spellcheck', 'false');
        $(this)
          .find('span')
          .each(function () {
            $(this).attr('spellcheck', 'false');
          });
      });
    },
  };
  /* init */
  if (padcookie.getPref('spellcheck') === false) {
    $('#options-spellcheck').val();
    $('#options-spellcheck').attr('checked', 'unchecked');
    $('#options-spellcheck').attr('checked', false);
  } else {
    $('#options-spellcheck').attr('checked', 'checked');
  }

  if ($('#options-spellcheck').is(':checked')) {
    spellcheck.enable();
  } else {
    spellcheck.disable();
  }

  /* on click */
  $('#options-spellcheck').on('click', () => {
    if ($('#options-spellcheck').is(':checked')) {
      padcookie.setPref('spellcheck', true);
      spellcheck.enable();
    } else {
      padcookie.setPref('spellcheck', false);
      spellcheck.disable();
    }
    if (window.browser.chrome) window.location.reload();
  });
};
exports.postAceInit = postAceInit;
