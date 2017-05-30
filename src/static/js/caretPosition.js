// One rep.line(div) can be broken in more than one line in the browser.
// This function is useful to get the caret position of the line as
// is represented by the browser
exports.getPosition = function ()
{
  var rect, line;
  var editor = $('#innerdocbody')[0];
  var range = getSelectionRange();
  var isSelectionInsideTheEditor = range && $(range.endContainer).closest('body')[0].id === 'innerdocbody';

  if(isSelectionInsideTheEditor){
    // when we have the caret in an empty line, e.g. a line with only a <br>,
    // getBoundingClientRect() returns all dimensions value as 0
    var selectionIsInTheBeginningOfLine = range.endOffset > 0;
    if (selectionIsInTheBeginningOfLine) {
      clonedRange = range.cloneRange();

      // we set the selection start and end to avoid error when user selects a text bigger than
      // the viewport height and uses the arrow keys to expand the selection. In this particular
      // case is necessary to know where the selections ends because both edges of the selection
      // is out of the viewport but we only use the end of it to calculate if it needs to scroll
      clonedRange.setStart(range.endContainer, range.endOffset);
      clonedRange.setEnd(range.endContainer, range.endOffset);

      rect = clonedRange.getBoundingClientRect();
      line = {
        bottom: rect.bottom,
        height: rect.height,
        top: rect.top
      }
      clonedRange.detach();
    }
    // in this case, we can't get the dimension of the element where the caret is
    if(!rect || rect.height === 0){
      clonedRange = range.cloneRange();
      clonedRange.setStart(range.endContainer, range.endOffset);
      clonedRange.setEnd(range.endContainer, range.endOffset);

      // as we can't get the element height, we create a text node to get the dimensions
      // on the position
      shadowCaret = $(document.createTextNode("|"));
      clonedRange.insertNode(shadowCaret[0]);
      clonedRange.selectNode(shadowCaret[0]);

      rect = clonedRange.getBoundingClientRect();
      line = {
        bottom: rect.bottom,
        height: rect.height,
        top: rect.top
      }
      shadowCaret.remove();
      clonedRange.detach();
    }
  }
  return line;
}

function getSelectionRange()
{
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
