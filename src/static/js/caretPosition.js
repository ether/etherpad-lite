// TODO make it like etherpad default. No named functions, fix curly brackets
exports.getCaretLinePosition = function () {
  var editor = $('#innerdocbody')[0];
  var range = getSelectionRange();
  var rect, line;
  if(range){
    if (range.endOffset > 0 && (range.endContainer !== editor)) { // explain this first condition
      clonedRange = range.cloneRange();
      clonedRange.setStart(range.endContainer, range.endOffset);
      clonedRange.setEnd(range.endContainer, range.endOffset);
      rect = clonedRange.getBoundingClientRect();
      line = {
        bottom: rect.top + rect.height,
        height: rect.height,
        top: rect.top
      }
      clonedRange.detach();
    }
    // rect.height === 0, the element has no height so we have to create a element to
    // measure the height
    if(!rect || rect.height === 0){ // probably a <br> or one line char
      clonedRange = range.cloneRange();

      // avoid error with multiple lines selected and user presses shift
      // why? Explain it!
      clonedRange.setStart(range.endContainer, range.endOffset);
      clonedRange.setEnd(range.endContainer, range.endOffset);

      shadowCaret = $(document.createTextNode("|")); // create an element to have height

      clonedRange.insertNode(shadowCaret[0]);
      clonedRange.selectNode(shadowCaret[0]);

      rect = clonedRange.getBoundingClientRect();
      line = {
        bottom: rect.top + rect.height,
        height: rect.height,
        top: rect.top
      }
      shadowCaret.remove();
      clonedRange.detach();
    }
  }
  return line;
}

var getSelectionRange = function(){
  var selection;
  if (!window.getSelection) {
   return;
  }
  selection = window.getSelection();
  if (selection.rangeCount > 0) {
   return selection.getRangeAt(0);
  } else {
   return null;
   }
}
