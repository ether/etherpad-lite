/**
 * This module allows passing require modules instances to
 * embedded iframes in a page. 
 * For example, if a page has the "plugins" module initialized,
 * it is important to use exactly the same "plugins" instance 
 * inside iframes as well. Otherwise, plugins cannot save any 
 * state.
 */


/**
 * Instructs the require object that when a reqModuleName module
 * needs to be loaded, that it iterates through the parents of the 
 * current window until it finds one who can execute "require" 
 * statements and asks it to perform require on reqModuleName.
 *
 * @params requireDefObj Require object which supports define 
 * statements. This object is accessible after loading require-kernel.
 * @params reqModuleName Module name e.g. (ep_etherpad-lite/static/js/plugins)
 */
exports.getRequirementFromParent = function(requireDefObj, reqModuleName) {
  // Force the 'undefinition' of the modules (if they already have been loaded).
  delete (requireDefObj._definitions)[reqModuleName];
  delete (requireDefObj._modules)[reqModuleName];
  requireDefObj.define(reqModuleName, function(require, exports, module) {
    var t = parent;
    var max = 0;  // make sure I don't go up more than 10 times
    while (typeof(t) != "undefined") {
      max++;
      if (max==10)
        break;
      if (typeof(t.require) != "undefined") {
        module.exports = t.require(reqModuleName);
        return;
      }
      t = t.parent;
    }
  });
}
