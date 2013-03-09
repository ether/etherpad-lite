/**
 * The Toolbar Module creates and renders the toolbars and buttons
 */

var _ = require("underscore")
  , tagAttributes
  , tag
  , defaultButtons
  , Button
  , ButtonsGroup
  , Separator
  , defaultButtonAttributes;

defaultButtonAttributes = function (name, overrides) {
  return {
    key: name,
    localizationId: "pad.toolbar." + name + ".title",
    icon: "buttonicon-" + name
  };
};

tag = function (name, attributes, contents) {
  var aStr = tagAttributes(attributes);

  if (contents) {
    return '<' + name + aStr + '>' + contents + '</' + name + '>';
  }
  else {
    return '<' + name + aStr + '/>';
  }
};

tagAttributes = function (attributes) {
  attributes = attributes || {};
  attributes = _.reduce(attributes, function (o, val, name) {
    if (!_.isUndefined(val)) {
      o[name] = val;
    }
    return o;
  }, {});

  return " " + _.map(attributes, function (val, name) {
    return "" + name + '="' + _.escape(val) + '"';
  }, " ");
};

defaultButtons = {
  bold: defaultButtonAttributes("bold"),
  italic: defaultButtonAttributes("italic"),
  underline: defaultButtonAttributes("underline"),
  strikethrough: defaultButtonAttributes("strikethrough"),

  orderedlist: {
    key: "insertorderedlist",
    localizationId: "pad.toolbar.ol.title",
    icon: "buttonicon-insertorderedlist"
  },

  unorderedlist: {
    key: "insertunorderedlist",
    localizationId: "pad.toolbar.ul.title",
    icon: "buttonicon-insertunorderedlist"
  },

  indent: defaultButtonAttributes("indent"),
  outdent: {
    key: "outdent",
    localizationId: "pad.toolbar.unindent.title",
    icon: "buttonicon-outdent"
  },

  undo: defaultButtonAttributes("undo"),
  redo: defaultButtonAttributes("redo"),

  clearauthorship: {
    key: "clearauthorship",
    localizationId: "pad.toolbar.clearAuthorship.title",
    icon: "buttonicon-clearauthorship"
  },

  importexport: {
    key: "import_export",
    localizationId: "pad.toolbar.import_export.title",
    icon: "buttonicon-import_export"
  },

  timeslider: {
    onclick: "document.location = document.location.pathname + '/timeslider'",
    localizationId: "pad.toolbar.timeslider.title",
    icon: "buttonicon-history"
  },

  savedrevision: defaultButtonAttributes("savedRevision"),
  settings: defaultButtonAttributes("settings"),
  embed: defaultButtonAttributes("embed"),
  showusers: defaultButtonAttributes("showusers")
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

_.extend(Button.prototype, {
  grouping: "",

  render: function () {
    var liAttributes = {
      "data-key": this.attributes.key,
      "onclick": this.attributes.onclick
    };
    return tag("li", liAttributes,
      tag("a", { "class": this.grouping, "data-l10n-id": this.attributes.localizationId },
        tag("span", { "class": "buttonicon " + this.attributes.icon })
      )
    );
  }
});

Separator = function () {};
Separator.prototype.render = function () {
  return tag("li", { "class": "separator"});
};

module.exports = {
  separator: function () {
    return (new Separator).render();
  },
  menu: function (buttons) {
    var groups = _.map(buttons, function (group) {
      return ButtonsGroup.fromArray(group).render();
    });
    return groups.join(this.separator());
  }
};
