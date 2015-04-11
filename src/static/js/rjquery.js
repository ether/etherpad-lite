/* Proviedes a require'able version of jQuery without leaking $ and jQuery;
 * works around wierdnesses in jquerys own packaging that makes dummy be undefined in the call below
 */
define.amd.jQuery = true;
define(["ep_etherpad-lite/static/js/jquery"], function (dummy) {
  return window.$.noConflict(true);
});
