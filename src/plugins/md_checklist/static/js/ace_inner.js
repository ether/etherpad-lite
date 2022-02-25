// This is a hack to get around ACEs brain-dead limit on onClick on
// links inside the ACE domlines...
// Borrowed from: https://github.com/redhog/ep_sketchspace/blob/master/static/js/ace_inner.js

$(document).ready(function () {
  $("body").mousedown(function (event) {
    parent.parent.exports.checklist.doUpdatechecklist(1);
  });
});

