'use strict';

$(document).ready(() => {
  const pad_root_path = new RegExp(/.*\/p\/[^/]+/).exec(document.location.pathname);
  $('#exportstatsa').attr('href', `${pad_root_path}/export/stats`);
});
