/**
 * The Toolbar Module creates and renders the toolbars and buttons
 */
var _ = require("underscore")
  , tagAttributes
  , tag
  , Button
  , ButtonsGroup
  , Separator
  , defaultButtonAttributes
  , removeItem;

removeItem = function(array,what) {
  var ax;
  while ((ax = array.indexOf(what)) !== -1) {
    array.splice(ax, 1);
  }
 return array;
};

defaultButtonAttributes = function (name, overrides) {
  return {
    command: name,
    localizationId: "pad.toolbar." + name + ".title",
    class: "buttonicon buttonicon-" + name
  };
};

tag = function (name, attributes, contents) {
  var aStr = tagAttributes(attributes);

  if (_.isString(contents) && contents.length > 0) {
    return '<' + name + aStr + '>' + contents + '</' + name + '>';
  }
  else {
    return '<' + name + aStr + '></' + name + '>';
  }
};

tagAttributes = function (attributes) {
  attributes = _.reduce(attributes || {}, function (o, val, name) {
    if (!_.isUndefined(val)) {
      o[name] = val;
    }
    return o;
  }, {});

  return " " + _.map(attributes, function (val, name) {
    return "" + name + '="' + _.escape(val) + '"';
  }).join(" ");
};

ButtonsGroup = function () {
  this.buttons = [];
};

ButtonsGroup.fromArray = function (array) {
  var btnGroup = new this;
  _.each(array, function (btnName) {
    btnGroup.addButton(Button.load(btnName));
  });
  return btnGroup;
};

ButtonsGroup.prototype.addButton = function (button) {
  this.buttons.push(button);
  return this;
};

ButtonsGroup.prototype.render = function () {
  if (this.buttons && this.buttons.length == 1) {
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
    if(btn) return btn.render();
  }).join("\n");
};

Button = function (attributes) {
  this.attributes = attributes;
};

Button.load = function (btnName) {
  var button = module.exports.availableButtons[btnName];
  try{
    if (button.constructor === Button || button.constructor === SelectButton) {
      return button;
    }
    else {
      return new Button(button);
    }
  }catch(e){
    console.warn("Error loading button", btnName);
    return false;
  }
};

_.extend(Button.prototype, {
  grouping: "",

  render: function () {
    var liAttributes = {
      "data-type": "button",
      "data-key": this.attributes.command,
    };
    return tag("li", liAttributes,
      tag("a", { "class": this.grouping, "data-l10n-id": this.attributes.localizationId },
        tag("button", { "class": " "+ this.attributes.class, "data-l10n-id": this.attributes.localizationId })
      )
    );
  }
});



var SelectButton = function (attributes) {
  this.attributes = attributes;
  this.options = [];
};

_.extend(SelectButton.prototype, Button.prototype, {
  addOption: function (value, text, attributes) {
    this.options.push({
      value: value,
      text: text,
      attributes: attributes
    });
    return this;
  },

  select: function (attributes) {
      var options = [];

    _.each(this.options, function (opt) {
      var a = _.extend({
        value: opt.value
      }, opt.attributes);

      options.push( tag("option", a, opt.text) );
    });
    return tag("select", attributes, options.join(""));
  },

  render: function () {
    var attributes = {
      id: this.attributes.id,
      "data-key": this.attributes.command,
      "data-type": "select"
    };
    return tag("li", attributes,
      this.select({ id: this.attributes.selectId })
    );
  }
});

Separator = function () {};
Separator.prototype.render = function () {
  return tag("li", { "class": "separator" });
};

module.exports = {
  availableButtons: {
    bold: defaultButtonAttributes("bold"),
    italic: defaultButtonAttributes("italic"),
    underline: defaultButtonAttributes("underline"),
    strikethrough: defaultButtonAttributes("strikethrough"),

    orderedlist: {
      command: "insertorderedlist",
      localizationId: "pad.toolbar.ol.title",
      class: "buttonicon buttonicon-insertorderedlist"
    },

    unorderedlist: {
      command: "insertunorderedlist",
      localizationId: "pad.toolbar.ul.title",
      class: "buttonicon buttonicon-insertunorderedlist"
    },

    indent: defaultButtonAttributes("indent"),
    outdent: {
      command: "outdent",
      localizationId: "pad.toolbar.unindent.title",
      class: "buttonicon buttonicon-outdent"
    },

    undo: defaultButtonAttributes("undo"),
    redo: defaultButtonAttributes("redo"),

    clearauthorship: {
      command: "clearauthorship",
      localizationId: "pad.toolbar.clearAuthorship.title",
      class: "buttonicon buttonicon-clearauthorship"
    },

    importexport: {
      command: "import_export",
      localizationId: "pad.toolbar.import_export.title",
      class: "buttonicon buttonicon-import_export"
    },

    timeslider: {
      command: "showTimeSlider",
      localizationId: "pad.toolbar.timeslider.title",
      class: "buttonicon buttonicon-history"
    },

    savedrevision: defaultButtonAttributes("savedRevision"),
    settings: defaultButtonAttributes("settings"),
    embed: defaultButtonAttributes("embed"),
    showusers: defaultButtonAttributes("showusers"),

    timeslider_export: {
      command: "import_export",
      localizationId: "timeslider.toolbar.exportlink.title",
      class: "buttonicon buttonicon-import_export"
    },

    timeslider_settings: {
      command: "settings",
      localizationId: "pad.toolbar.settings.title",
      class: "buttonicon buttonicon-settings"
    },

    timeslider_returnToPad: {
      command: "timeslider_returnToPad",
      localizationId: "timeslider.toolbar.returnbutton",
      class: "buttontext"
    }
  },

  registerButton: function (buttonName, buttonInfo) {
    this.availableButtons[buttonName] = buttonInfo;
  },

  button: function (attributes) {
    return new Button(attributes);
  },
  separator: function () {
    return (new Separator).render();
  },
  selectButton: function (attributes) {
    return new SelectButton(attributes);
  },

  /*
   * Valid values for whichMenu: 'left' | 'right' | 'timeslider-right'
   * Valid values for page:      'pad'  | 'timeslider'
   */
  menu: function (buttons, isReadOnly, whichMenu, page) {
    if (isReadOnly) {
      // The best way to detect if it's the left editbar is to check for a bold button
      if (buttons[0].indexOf("bold") !== -1) {
        // Clear all formatting buttons
        buttons = [];
      } else {
        // Remove Save Revision from the right menu
        removeItem(buttons[0],"savedrevision");
      }
    } else {
      /*
       * This pad is not read only
       *
       * Add back the savedrevision button (the "star") if is not already there,
       * but only on the right toolbar, and only if we are showing a pad (dont't
       * do it in the timeslider).
       *
       * This is a quick fix for #3702 (and subsequent issue #3767): it was
       * sufficient to visit a single read only pad to cause the disappearence
       * of the star button from all the pads.
       */
      if ((buttons[0].indexOf("savedrevision") === -1) && (whichMenu === "right") && (page === "pad")) {
        buttons[0].push("savedrevision");
      }
    }

    var groups = _.map(buttons, function (group) {
      return ButtonsGroup.fromArray(group).render();
    });
    return groups.join(this.separator());
  }
};
