'use strict';

window.customStart = () => {
  $('#pad_title').show();
  $('.buttonicon').mousedown(function () { $(this).parent().addClass('pressed'); });
  $('.buttonicon').mouseup(function () { $(this).parent().removeClass('pressed'); });
};
