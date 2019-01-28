exports.postAceInit = function(hook_name, context) {
  context.ace.callWithAce(function(ace) {
    console.log(" Hook Name: " + hook_name);
    console.log(" Context: " + context);
    doMessage(ace);
  });
};

function doMessage(ace) {
  window.addEventListener("message", function(event) {
    var msg = event.data;
    console.log("msg.name: " + msg.name);
    console.log("msg.data: " + msg.data);
    if (msg.name == "ep_blameless_drag_and_drop") {
      console.log(" -- msg.data: " + msg.data);
      var line_and_char = ace.ace_getLineAndCharForPoint();
      console.log(" == ace.line_and_char: " + line_and_char);
      ace.ace_replaceRange(undefined, undefined, msg.data);
    }
  });
}
