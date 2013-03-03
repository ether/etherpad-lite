/**
 * The Toolbar Module creates and renders the toolbars and buttons
 */

var _ = require("underscore")
  , defaultButtons
  , Button
  , ButtonsGroup
  , Separator
  , defaultButtonAttributes
  , buttonTemplate;

buttonTemplate = _.template(
  '<li class="acl-write" id="<%= attributes.id %>" data-key="<%= attributes.key %>"><a class="<%= grouping %>" data-l10n-id="<%= attributes.localizationId %>"><span class="buttonicon <%= attributes.icon %>"></span></a></li>'
);

defaultButtonAttributes = function (name, overrides) {
  return {
    id: name,
    key: name,
    localizationId: "pad.toolbar." + name + ".title",
    icon: "buttonicon-" + name
  };
};

defaultButtons = {
  bold: defaultButtonAttributes("bold"),
  italic: defaultButtonAttributes("italic"),
  underline: defaultButtonAttributes("underline"),
  strikethrough: defaultButtonAttributes("strikethrough"),

  orderedlist: {
    id: "orderedlist",
    key: "insertorderedlist",
    localizationId: "pad.toolbar.ol.title",
    icon: "buttonicon-insertorderedlist"
  },

  unorderedlist: {
    id: "unorderedlist",
    key: "insertunorderedlist",
    localizationId: "pad.toolbar.ul.title",
    icon: "buttonicon-insertunorderedlist"
  },

  indent: defaultButtonAttributes("indent"),
  outdent: {
    id: "outdent",
    key: "outdent",
    localizationId: "pad.toolbar.unindent.title",
    icon: "buttonicon-outdent"
  },

  undo: defaultButtonAttributes("undo"),
  redo: defaultButtonAttributes("redo"),

  clearauthorship: {
    id: "clearAuthorship",
    key: "clearauthorship",
    localizationId: "pad.toolbar.clearAuthorship.title",
    icon: "buttonicon-clearauthorship"
  }

};

ButtonsGroup = function () {
  this.buttons = [];
};

ButtonsGroup.fromArray = function (array) {
  var btnGroup = new ButtonsGroup();
  _.each(array, function (btnName) {
    var b = new Button(defaultButtons[btnName]);
    btnGroup.addButton(b);
  });
  return btnGroup;
};

ButtonsGroup.prototype.addButton = function (button) {
  this.buttons.push(button);
  return this;
};

ButtonsGroup.prototype.render = function () {
  if (this.buttons.length == 1) {
    this.buttons[0].grouping = "";
  }
  else {
    _.first(this.buttons).grouping = "grouped-left";
    _.last(this.buttons).grouping = "grouped-right";
    _.each(this.buttons.slice(1, -1), function (btn) {
      btn.grouping = "grouped-middle"
    });
  }

  return _.map(this.buttons, function (btn) {
    return btn.render();
  }).join("\n");
};

Button = function (attributes) {
  this.attributes = attributes;
};

Button.prototype.grouping = "";
Button.prototype.render = function () {
  return buttonTemplate(this);
};

Separator = function () {};
Separator.prototype.render = function () {
  return '<li class="acl-write separator"></li>';
};

module.exports = {
  menu: function (buttons) {
    var groups = _.map(buttons, function (group) {
      return ButtonsGroup.fromArray(group).render();
    });
    return groups.join(new Separator().render());
  }
};
