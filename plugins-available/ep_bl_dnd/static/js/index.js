var _, $, jQuery;
var $ = require("ep_etherpad-lite/static/js/rjquery").$;
var _ = require("ep_etherpad-lite/static/js/underscore");
var padeditor = require("ep_etherpad-lite/static/js/pad_editor").padeditor;

function doHandleDnD(start, end, attrs) {
  console.log("In doHandleDnD");
  var documentAttributeManager = this.documentAttributeManager;
  documentAttributeManager.setAttributesOnRange(start, end, attrs);
}

// Once ace is initialized, we set ace_doInsertHeading and bind it to the context
exports.aceInitialized = function(hook, context) {
  console.log(" -- aceInitialized --");
  var editorInfo = context.editorInfo;
  console.log("\t- Binded ace_doHandleDnD -");
  editorInfo.ace_doHandleDnD = _(doHandleDnD).bind(context);
};

exports.postAceInit = function(hook_name, context) {
  console.log(" -- postAceInit --");

  // Enable spell check
  $('iframe[name="ace_outer"]')
    .contents()
    .find("iframe")
    .contents()
    .find("#innerdocbody")
    .attr("spellcheck", "true");

  window.addEventListener("message", function(event) {
    if (event.data.name == "ep_blameless_drag_and_drop") {
      console.log(" -- postAceInit - message event handler --");
      context.ace.callWithAce(
        function(ace) {
          console.log(" -- postAceInit - callWithAce --");
          handleDropEvent(event, ace);
        },
        "insertdnd",
        true
      );
    }
  });
};

function handleDropEvent(event, ace) {
  console.log(" -- handleDropEvent - event --");
  var msg = event.data;
  console.log("\t- msg.name: " + msg.name);
  console.log("\t- msg.data: " + msg.data);

  var caret_line_num = ace.ace_caretLine();
  var caret_col_num = ace.ace_caretColumn();
  var link_len = 1;

  console.log(
    "\t- ace line: " +
      caret_line_num +
      " col: " +
      caret_col_num +
      " link len: " +
      link_len
  );

  ace.ace_replaceRange(
    [caret_line_num, caret_col_num],
    [caret_line_num, caret_col_num],
    " "
  );

  console.log("- Calling ace_doHandleDnD..");
  ace.ace_doHandleDnD(
    [caret_line_num, caret_col_num],
    [caret_line_num, caret_col_num + link_len],
    [["bl-event-link-img", msg.data]]
  );
}

exports.aceAttribsToClasses = function(hook, context) {
  console.log(" -- aceAttribsToClasses - context.key: " + context.key + " --");
  var classes = [];

  if (context.key == "bl-event-link-img") {
    // We store the citations as a lookup with the id as a key
    var id = context.value;
    classes.push("bl-event-link-img|" + id);
  }
  return classes;
};

// // Block elements - Prevents character walking
// exports.aceRegisterBlockElements = function() {
//   return ["bl-event-link-img"];
// };

// Here we convert the class heading:h1 into a tag
exports.aceCreateDomLine = function(name, context) {
  console.log(" -- aceCreateDomLine --");
  var cls = context.cls;
  var domline = context.domline;

  console.log(" -- domline: " + domline);
  console.log(" -- cls: " + cls);

  var img_url = "";
  var domline_classes = cls.split(" ");
  for (var i = 0; i < domline_classes.length; i++) {
    domline_class = domline_classes[i];
    if (domline_class.indexOf("bl-event-link-img|") != -1) {
      img_url = domline_class.substr(domline_class.indexOf("|") + 1);
    }
  }

  console.log(" -- img_url: " + img_url);
  if (img_url) {
    var content_style =
      "display:block;width:100%;border:1px solid #e5e5e5;background-color:#fcfcfc;padding:6px 10px ! important;text-align: center;";
    var description_style =
      "display:block;width:100%;border:1px solid #e5e5e5;background-color:#e5e5e5;padding:6px 10px ! important;text-align: center;font-size: 11px;";

    var figure_span =
      '<span style="display:block;width:95%;padding:0px ! important;"><span style="' +
      content_style +
      '"><img src="' +
      img_url +
      '"></img></span>' +
      '<span style="' +
      description_style +
      '"><b>Figure 1:</b> Some description.</span></span>';

    var modifier = {
      extraOpenTags: figure_span,
      extraCloseTags: "",
      cls: cls
    };
    return [modifier];
  }

  return [];
};
