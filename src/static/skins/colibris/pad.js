'use strict';

window.customStart = () => {
  $('#pad_title').show();
  $('.buttonicon').on('mousedown', function () { $(this).parent().addClass('pressed'); });
  $('.buttonicon').on('mouseup', function () { $(this).parent().removeClass('pressed'); });

  const pathSegments = window.location.pathname.split('/').filter(Boolean);
  const padName = pathSegments[pathSegments.length - 1];
  const recentPads = localStorage.getItem('recentPads');
  if (recentPads == null) {
    localStorage.setItem('recentPads', JSON.stringify([]));
  }
  const recentPadsList = JSON.parse(localStorage.getItem('recentPads'));
  if (!recentPadsList.includes(padName)) {
    if (recentPadsList.length >= 10) {
      recentPadsList.shift(); // Remove the oldest pad if we have more than 10
    }
    recentPadsList.push(padName);
    localStorage.setItem('recentPads', JSON.stringify(recentPadsList));
  }
};
