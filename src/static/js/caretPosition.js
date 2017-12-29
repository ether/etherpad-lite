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
      var clonedRange = createSelectionRange(range);
      line = getPositionOfElementOrSelection(clonedRange);
      clonedRange.detach()
    }

    // when there's a <br> or any element that has no height, we can't get
    // the dimension of the element where the caret is
    if(!rect || rect.height === 0){
      var clonedRange = createSelectionRange(range);

      // as we can't get the element height, we create a text node to get the dimensions
      // on the position
      var shadowCaret = $(document.createTextNode("|"));
      clonedRange.insertNode(shadowCaret[0]);
      clonedRange.selectNode(shadowCaret[0]);

      line = getPositionOfElementOrSelection(clonedRange);
      clonedRange.detach()
      shadowCaret.remove();
    }
  }
  return line;
}

var createSelectionRange = function (range) {
  clonedRange = range.cloneRange();

  // we set the selection start and end to avoid error when user selects a text bigger than
  // the viewport height and uses the arrow keys to expand the selection. In this particular
  // case is necessary to know where the selections ends because both edges of the selection
  // is out of the viewport but we only use the end of it to calculate if it needs to scroll
  clonedRange.setStart(range.endContainer, range.endOffset);
  clonedRange.setEnd(range.endContainer, range.endOffset);
  return clonedRange;
}

var getPositionOfRepLineAtOffset = function (node, offset) {
  // it is not a text node, so we cannot make a selection
  if (node.tagName === 'BR' || node.tagName === 'EMPTY') {
    return getPositionOfElementOrSelection(node);
  }

  while (node.length === 0 && node.nextSibling) {
    node = node.nextSibling;
  }

  var newRange = new Range();
  newRange.setStart(node, offset);
  newRange.setEnd(node, offset);
  var linePosition = getPositionOfElementOrSelection(newRange);
  newRange.detach(); // performance sake
  return linePosition;
}

function getPositionOfElementOrSelection(element) {
  var rect = element.getBoundingClientRect();
  var linePosition = {
    bottom: rect.bottom,
    height: rect.height,
    top: rect.top
  }
  return linePosition;
}

// here we have two possibilities:
// [1] the line before the caret line has the same type, so both of them has the same margin, padding
// height, etc. So, we can use the caret line to make calculation necessary to know where is the top
// of the previous line
// [2] the line before is part of another rep line. It's possible this line has different margins
// height. So we have to get the exactly position of the line
exports.getPositionTopOfPreviousBrowserLine = function(caretLinePosition, rep) {
  var previousLineTop = caretLinePosition.top - caretLinePosition.height; // [1]
  var isCaretLineFirstBrowserLine = caretLineIsFirstBrowserLine(caretLinePosition.top, rep);

  // the caret is in the beginning of a rep line, so the previous browser line
  // is the last line browser line of the a rep line
  if (isCaretLineFirstBrowserLine) { //[2]
    var lineBeforeCaretLine = rep.selStart[0] - 1;
    var firstLineVisibleBeforeCaretLine = getPreviousVisibleLine(lineBeforeCaretLine, rep);
    var linePosition = getDimensionOfLastBrowserLineOfRepLine(firstLineVisibleBeforeCaretLine, rep);
    previousLineTop = linePosition.top;
  }
  return previousLineTop;
}

function caretLineIsFirstBrowserLine(caretLineTop, rep)
{
  var caretRepLine = rep.selStart[0];
  var lineNode = rep.lines.atIndex(caretRepLine).lineNode;
  var firstRootNode = getFirstRootChildNode(lineNode);

  // to get the position of the node we get the position of the first char
  var positionOfFirstRootNode = getPositionOfRepLineAtOffset(firstRootNode, 1);
  return positionOfFirstRootNode.top === caretLineTop;
}

// find the first root node, usually it is a text node
function getFirstRootChildNode(node)
{
  if(!node.firstChild){
    return node;
  }else{
    return getFirstRootChildNode(node.firstChild);
  }

}

function getPreviousVisibleLine(line, rep)
{
  if (line < 0) {
    return 0;
  }else if (isLineVisible(line, rep)) {
    return line;
  }else{
    return getPreviousVisibleLine(line - 1, rep);
  }
}

function getDimensionOfLastBrowserLineOfRepLine(line, rep)
{
  var lineNode = rep.lines.atIndex(line).lineNode;
  var lastRootChildNode = getLastRootChildNode(lineNode);

  // we get the position of the line in the last char of it
  var lastRootChildNodePosition = getPositionOfRepLineAtOffset(lastRootChildNode.node, lastRootChildNode.length);
  return lastRootChildNodePosition;
}

function getLastRootChildNode(node)
{
  if(!node.lastChild){
    return {
      node: node,
      length: node.length
    };
  }else{
    return getLastRootChildNode(node.lastChild);
  }
}

// here we have two possibilities:
// [1] The next line is part of the same rep line of the caret line, so we have the same dimensions.
// So, we can use the caret line to calculate the bottom of the line.
// [2] the next line is part of another rep line. It's possible this line has different dimensions, so we
// have to get the exactly dimension of it
exports.getBottomOfNextBrowserLine = function(caretLinePosition, rep)
{
  var nextLineBottom = caretLinePosition.bottom + caretLinePosition.height; //[1]
  var isCaretLineLastBrowserLine = caretLineIsLastBrowserLineOfRepLine(caretLinePosition.top, rep);

  // the caret is at the end of a rep line, so we can get the next browser line dimension
  // using the position of the first char of the next rep line
  if(isCaretLineLastBrowserLine){ //[2]
    var nextLineAfterCaretLine = rep.selStart[0] + 1;
    var firstNextLineVisibleAfterCaretLine = getNextVisibleLine(nextLineAfterCaretLine, rep);
    var linePosition = getDimensionOfFirstBrowserLineOfRepLine(firstNextLineVisibleAfterCaretLine, rep);
    nextLineBottom = linePosition.bottom;
  }
  return nextLineBottom;
}

function caretLineIsLastBrowserLineOfRepLine(caretLineTop, rep)
{
  var caretRepLine = rep.selStart[0];
  var lineNode = rep.lines.atIndex(caretRepLine).lineNode;
  var lastRootChildNode = getLastRootChildNode(lineNode);

  // we take a rep line and get the position of the last char of it
  var lastRootChildNodePosition = getPositionOfRepLineAtOffset(lastRootChildNode.node, lastRootChildNode.length);
  return lastRootChildNodePosition.top === caretLineTop;
}

function getPreviousVisibleLine(line, rep)
{
  var firstLineOfPad = 0;
  if (line <= firstLineOfPad) {
    return firstLineOfPad;
  }else if (isLineVisible(line,rep)) {
    return line;
  }else{
    return getPreviousVisibleLine(line - 1, rep);
  }
}
exports.getPreviousVisibleLine = getPreviousVisibleLine;

function getNextVisibleLine(line, rep)
{
  var lastLineOfThePad = rep.lines.length() - 1;
  if (line >= lastLineOfThePad) {
    return lastLineOfThePad;
  }else if (isLineVisible(line,rep)) {
    return line;
  }else{
    return getNextVisibleLine(line + 1, rep);
  }
}
exports.getNextVisibleLine = getNextVisibleLine;

function isLineVisible(line, rep)
{
  return rep.lines.atIndex(line).lineNode.offsetHeight > 0;
}

function getDimensionOfFirstBrowserLineOfRepLine(line, rep)
{
  var lineNode = rep.lines.atIndex(line).lineNode;
  var firstRootChildNode = getFirstRootChildNode(lineNode);

  // we can get the position of the line, getting the position of the first char of the rep line
  var firstRootChildNodePosition = getPositionOfRepLineAtOffset(firstRootChildNode, 1);
  return firstRootChildNodePosition;
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
