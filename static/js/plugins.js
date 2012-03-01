/**
 * This code is mostly from the old Etherpad. Please help us to comment this code. 
 * This helps other people to understand this code better and helps them to improve it.
 * TL;DR COMMENTS ON THIS FILE ARE HIGHLY APPRECIATED
 */

var plugins = {
  callHook: function(hookName, args)
  {
    var global = (function () {return this}());
    var hook = ((global.clientVars || {}).hooks || {})[hookName];
    if (hook === undefined) return [];
    var res = [];
    for (var i = 0, N = hook.length; i < N; i++)
    {
      var plugin = hook[i];
      var pluginRes = eval(plugin.plugin)[plugin.original || hookName](args);
      if (pluginRes != undefined && pluginRes != null) res = res.concat(pluginRes);
    }
    return res;
  },

  callHookStr: function(hookName, args, sep, pre, post)
  {
    if (sep == undefined) sep = '';
    if (pre == undefined) pre = '';
    if (post == undefined) post = '';
    var newCallhooks = [];
    var callhooks = plugins.callHook(hookName, args);
    for (var i = 0, ii = callhooks.length; i < ii; i++) {
      newCallhooks[i] = pre + callhooks[i] + post;
    }
    return newCallhooks.join(sep || "");
  }
};

exports.plugins = plugins;
