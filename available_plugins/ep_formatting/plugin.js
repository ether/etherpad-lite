var eejs = require('ep_etherpad-lite/node/eejs/')
  , _ = require('ep_etherpad-lite/static/js/underscore')._
  , defaultButtons = []
  , registeredButtons = {}
  , helpers;

helpers = {
  mapButtons: function (buttonGroups, registeredButtons) {
    var self = this;
    return _.map(buttonGroups, function (group) {
      return _.map(group, function (buttonName) {
        return registeredButtons[buttonName];
      });
    });
  },
  renderToolbar: function (toolbar) {
    var self = this;
    return _.map(toolbar, function (buttonGroup, index) {
      var str = (index == 0)
        ? ""
        : self.renderSeparator();
      return str + self.renderGroup(buttonGroup);
    }).join("");
  },
  renderGroup: function (buttons) {
    if (buttons.length === 1) {
      return this.renderSingleButton(buttons[0]);
    }
    else {
      return this.renderFirstButton(buttons[0]) +
        this.renderMiddleGroup(buttons.slice(1, -1)) +
        this.renderLastButton(buttons[buttons.length - 1]);
    }
  },
  renderSingleButton: function (button) {
    return this.renderButton(button);
  },
  renderFirstButton: function (button) {
    return this.renderButton(button, "left");
  },
  renderMiddleButton: function (button) {
    return this.renderButton(button, "middle");
  },
  renderMiddleGroup: function (buttons) {
    var self = this;
    return _.map(buttons, function (button) {
      return self.renderMiddleButton(button);
    }).join("");
  },
  renderLastButton: function (button) {
    return this.renderButton(button, "right");
  },
  renderButton: function (button, position) {
    var template = "ep_formatting/templates/button.ejs"
    return eejs.require(template, {
      button: button,
      groupPosition: position
    });
  },
  renderSeparator: function () {
    return '<li class="acl-write separator"></li>'
  }
};

var registerButtonObject = function (id, key, title, cssClass) {
  var button = {
    "id": id,
    "key": key,
    "title": title,
    "cssClass": cssClass
  };
  registeredButtons[id] = button;
  return button;
};

registerButtonObject("bold", "bold", "Bold (ctrl-B)", "buttonicon-bold");
registerButtonObject("italic", "italic", "Italics (ctrl-I)", "buttonicon-italic");
registerButtonObject("underline", "underline", "Underline (ctrl-U)", "buttonicon-underline");
registerButtonObject("strikethrough", "strikethrough", "Strikethrough", "buttonicon-strikethrough");

registerButtonObject("orderedlist", "insertorderedlist", "Toggle Ordered List", "buttonicon-insertorderedlist");
registerButtonObject("unorderedlist", "insertunorderedlist", "Toggle Bullet List", "buttonicon-insertunorderedlist");
registerButtonObject("indent", "indent", "Indent", "buttonicon-indent");
registerButtonObject("outdent", "outdent", "Unindent", "buttonicon-outdent");

registerButtonObject("undo", "undo", "Undo (ctrl-Z)", "buttonicon-undo");
registerButtonObject("redo", "redo", "Redo (ctrl-Y)", "buttonicon-redo");

registerButtonObject("clearauthorship", "clearauthorship", "Clear Authorship Colors", "buttonicon-clearauthorship");

defaultButtons = [
  ["bold", "italic", "underline", "strikethrough"],
  ["orderedlist", "unorderedlist", "indent", "outdent"],
  ["undo", "redo"],
  ["clearauthorship"]
];

exports.eejsBlock_editbarMenuLeft = function (hook_name, args, cb) {
  var buttons = helpers.mapButtons(defaultButtons, registeredButtons);
  args.content = args.content + helpers.renderToolbar(buttons);
  return cb();
}
