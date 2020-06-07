/*
  This file handles scroll on edition or when user presses arrow keys.
  In this file we have two representations of line (browser and rep line).
  Rep Line = a line in the way is represented by Etherpad(rep) (each <div> is a line)
  Browser Line = each vertical line. A <div> can be break into more than one
  browser line.
*/
var caretPosition = require('./caretPosition');

function Scroll(outerWin) {
  // scroll settings
  this.scrollSettings = parent.parent.clientVars.scrollWhenFocusLineIsOutOfViewport;

  // DOM reference
  this.outerWin = outerWin;
  this.doc = this.outerWin.document;
  this.rootDocument = parent.parent.document;
}

Scroll.prototype.scrollWhenCaretIsInTheLastLineOfViewportWhenNecessary = function (rep, isScrollableEvent, innerHeight)
{
  // are we placing the caret on the line at the bottom of viewport?
  // And if so, do we need to scroll the editor, as defined on the settings.json?
  var shouldScrollWhenCaretIsAtBottomOfViewport =  this.scrollSettings.scrollWhenCaretIsInTheLastLineOfViewport;
  if (shouldScrollWhenCaretIsAtBottomOfViewport) {
    // avoid scrolling when selection includes multiple lines -- user can potentially be selecting more lines
    // than it fits on viewport
    var multipleLinesSelected = rep.selStart[0] !== rep.selEnd[0];

    // avoid scrolling when pad loads
    if (isScrollableEvent && !multipleLinesSelected && this._isCaretAtTheBottomOfViewport(rep)) {
      // when scrollWhenFocusLineIsOutOfViewport.percentage is 0, pixelsToScroll is 0
      var pixelsToScroll = this._getPixelsRelativeToPercentageOfViewport(innerHeight);
      this._scrollYPage(pixelsToScroll);
    }
  }
}

Scroll.prototype.scrollWhenPressArrowKeys = function(arrowUp, rep, innerHeight)
{
  // if percentageScrollArrowUp is 0, let the scroll to be handled as default, put the previous
  // rep line on the top of the viewport
  if(this._arrowUpWasPressedInTheFirstLineOfTheViewport(arrowUp, rep)){
    var pixelsToScroll = this._getPixelsToScrollWhenUserPressesArrowUp(innerHeight);

    // by default, the browser scrolls to the middle of the viewport. To avoid the twist made
    // when we apply a second scroll, we made it immediately (without animation)
    this._scrollYPageWithoutAnimation(-pixelsToScroll);
  }else{
    this.scrollNodeVerticallyIntoView(rep, innerHeight);
  }
}

// Some plugins might set a minimum height to the editor (ex: ep_page_view), so checking
// if (caretLine() === rep.lines.length() - 1) is not enough. We need to check if there are
// other lines after caretLine(), and all of them are out of viewport.
Scroll.prototype._isCaretAtTheBottomOfViewport = function(rep)
{
  // computing a line position using getBoundingClientRect() is expensive.
  // (obs: getBoundingClientRect() is called on caretPosition.getPosition())
  // To avoid that, we only call this function when it is possible that the
  // caret is in the bottom of viewport
  var caretLine = rep.selStart[0];
  var lineAfterCaretLine = caretLine + 1;
  var firstLineVisibleAfterCaretLine = caretPosition.getNextVisibleLine(lineAfterCaretLine, rep);
  var caretLineIsPartiallyVisibleOnViewport = this._isLinePartiallyVisibleOnViewport(caretLine, rep);
  var lineAfterCaretLineIsPartiallyVisibleOnViewport = this._isLinePartiallyVisibleOnViewport(firstLineVisibleAfterCaretLine, rep);
  if (caretLineIsPartiallyVisibleOnViewport || lineAfterCaretLineIsPartiallyVisibleOnViewport) {
    // check if the caret is in the bottom of the viewport
    var caretLinePosition = caretPosition.getPosition();
    var viewportBottom = this._getViewPortTopBottom().bottom;
    var nextLineBottom = caretPosition.getBottomOfNextBrowserLine(caretLinePosition, rep);
    var nextLineIsBelowViewportBottom = nextLineBottom > viewportBottom;
    return nextLineIsBelowViewportBottom;
  }
  return false;
}

Scroll.prototype._isLinePartiallyVisibleOnViewport = function(lineNumber, rep)
{
  var lineNode = rep.lines.atIndex(lineNumber);
  var linePosition = this._getLineEntryTopBottom(lineNode);
  var lineTop = linePosition.top;
  var lineBottom = linePosition.bottom;
  var viewport = this._getViewPortTopBottom();
  var viewportBottom = viewport.bottom;
  var viewportTop = viewport.top;

  var topOfLineIsAboveOfViewportBottom = lineTop < viewportBottom;
  var bottomOfLineIsOnOrBelowOfViewportBottom = lineBottom >= viewportBottom;
  var topOfLineIsBelowViewportTop = lineTop >= viewportTop;
  var topOfLineIsAboveViewportBottom = lineTop <= viewportBottom;
  var bottomOfLineIsAboveViewportBottom = lineBottom <= viewportBottom;
  var bottomOfLineIsBelowViewportTop = lineBottom >= viewportTop;

  return (topOfLineIsAboveOfViewportBottom && bottomOfLineIsOnOrBelowOfViewportBottom) ||
    (topOfLineIsBelowViewportTop && topOfLineIsAboveViewportBottom) ||
    (bottomOfLineIsAboveViewportBottom && bottomOfLineIsBelowViewportTop);
}

Scroll.prototype._getViewPortTopBottom = function()
{
  var theTop = this.getScrollY();
  var doc = this.doc;
  var height = doc.documentElement.clientHeight; // includes padding

  // we have to get the exactly height of the viewport. So it has to subtract all the values which changes
  // the viewport height (E.g. padding, position top)
  var viewportExtraSpacesAndPosition = this._getEditorPositionTop() + this._getPaddingTopAddedWhenPageViewIsEnable();
  return {
    top: theTop,
    bottom: (theTop + height - viewportExtraSpacesAndPosition)
  };
}

Scroll.prototype._getEditorPositionTop = function()
{
  var editor = parent.document.getElementsByTagName('iframe');
  var editorPositionTop = editor[0].offsetTop;
  return editorPositionTop;
}

// ep_page_view adds padding-top, which makes the viewport smaller
Scroll.prototype._getPaddingTopAddedWhenPageViewIsEnable = function()
{
  var aceOuter = this.rootDocument.getElementsByName("ace_outer");
  var aceOuterPaddingTop = parseInt($(aceOuter).css("padding-top"));
  return aceOuterPaddingTop;
}

Scroll.prototype._getScrollXY = function()
{
  var win = this.outerWin;
  var odoc = this.doc;
  if (typeof(win.pageYOffset) == "number")
  {
    return {
      x: win.pageXOffset,
      y: win.pageYOffset
    };
  }
  var docel = odoc.documentElement;
  if (docel && typeof(docel.scrollTop) == "number")
  {
    return {
      x: docel.scrollLeft,
      y: docel.scrollTop
    };
  }
}

Scroll.prototype.getScrollX = function()
{
  return this._getScrollXY().x;
}

Scroll.prototype.getScrollY = function()
{
  return this._getScrollXY().y;
}

Scroll.prototype.setScrollX = function(x)
{
  this.outerWin.scrollTo(x, this.getScrollY());
}

Scroll.prototype.setScrollY = function(y)
{
  this.outerWin.scrollTo(this.getScrollX(), y);
}

Scroll.prototype.setScrollXY = function(x, y)
{
  this.outerWin.scrollTo(x, y);
}

Scroll.prototype._isCaretAtTheTopOfViewport = function(rep)
{
  var caretLine = rep.selStart[0];
  var linePrevCaretLine = caretLine - 1;
  var firstLineVisibleBeforeCaretLine = caretPosition.getPreviousVisibleLine(linePrevCaretLine, rep);
  var caretLineIsPartiallyVisibleOnViewport = this._isLinePartiallyVisibleOnViewport(caretLine, rep);
  var lineBeforeCaretLineIsPartiallyVisibleOnViewport = this._isLinePartiallyVisibleOnViewport(firstLineVisibleBeforeCaretLine, rep);
  if (caretLineIsPartiallyVisibleOnViewport || lineBeforeCaretLineIsPartiallyVisibleOnViewport) {
    var caretLinePosition = caretPosition.getPosition(); // get the position of the browser line
    var viewportPosition = this._getViewPortTopBottom();
    var viewportTop = viewportPosition.top;
    var viewportBottom = viewportPosition.bottom;
    var caretLineIsBelowViewportTop = caretLinePosition.bottom >= viewportTop;
    var caretLineIsAboveViewportBottom = caretLinePosition.top < viewportBottom;
    var caretLineIsInsideOfViewport = caretLineIsBelowViewportTop && caretLineIsAboveViewportBottom;
    if (caretLineIsInsideOfViewport) {
      var prevLineTop = caretPosition.getPositionTopOfPreviousBrowserLine(caretLinePosition, rep);
      var previousLineIsAboveViewportTop = prevLineTop < viewportTop;
      return previousLineIsAboveViewportTop;
    }
  }
  return false;
}

// By default, when user makes an edition in a line out of viewport, this line goes
// to the edge of viewport. This function gets the extra pixels necessary to get the
// caret line in a position X relative to Y% viewport.
Scroll.prototype._getPixelsRelativeToPercentageOfViewport = function(innerHeight, aboveOfViewport)
{
  var pixels = 0;
  var scrollPercentageRelativeToViewport = this._getPercentageToScroll(aboveOfViewport);
  if(scrollPercentageRelativeToViewport > 0 && scrollPercentageRelativeToViewport <= 1){
    pixels = parseInt(innerHeight * scrollPercentageRelativeToViewport);
  }
  return pixels;
}

// we use different percentages when change selection. It depends on if it is
// either above the top or below the bottom of the page
Scroll.prototype._getPercentageToScroll = function(aboveOfViewport)
{
  var percentageToScroll = this.scrollSettings.percentage.editionBelowViewport;
  if(aboveOfViewport){
    percentageToScroll = this.scrollSettings.percentage.editionAboveViewport;
  }
  return percentageToScroll;
}

Scroll.prototype._getPixelsToScrollWhenUserPressesArrowUp = function(innerHeight)
{
  var pixels = 0;
  var percentageToScrollUp = this.scrollSettings.percentageToScrollWhenUserPressesArrowUp;
  if(percentageToScrollUp > 0 && percentageToScrollUp <= 1){
    pixels = parseInt(innerHeight * percentageToScrollUp);
  }
  return pixels;
}

Scroll.prototype._scrollYPage = function(pixelsToScroll)
{
  var durationOfAnimationToShowFocusline = this.scrollSettings.duration;
  if(durationOfAnimationToShowFocusline){
    this._scrollYPageWithAnimation(pixelsToScroll, durationOfAnimationToShowFocusline);
  }else{
    this._scrollYPageWithoutAnimation(pixelsToScroll);
  }
}

Scroll.prototype._scrollYPageWithoutAnimation = function(pixelsToScroll)
{
  this.outerWin.scrollBy(0, pixelsToScroll);
}

Scroll.prototype._scrollYPageWithAnimation = function(pixelsToScroll, durationOfAnimationToShowFocusline)
{
  var outerDocBody = this.doc.getElementById("outerdocbody");

  // it works on later versions of Chrome
  var $outerDocBody = $(outerDocBody);
  this._triggerScrollWithAnimation($outerDocBody, pixelsToScroll, durationOfAnimationToShowFocusline);

  // it works on Firefox and earlier versions of Chrome
  var $outerDocBodyParent = $outerDocBody.parent();
  this._triggerScrollWithAnimation($outerDocBodyParent, pixelsToScroll, durationOfAnimationToShowFocusline);
}

// using a custom queue and clearing it, we avoid creating a queue of scroll animations. So if this function
// is called twice quickly, only the last one runs.
Scroll.prototype._triggerScrollWithAnimation = function($elem, pixelsToScroll, durationOfAnimationToShowFocusline)
{
  // clear the queue of animation
  $elem.stop("scrollanimation");
  $elem.animate({
    scrollTop: '+=' + pixelsToScroll
  }, {
    duration: durationOfAnimationToShowFocusline,
    queue: "scrollanimation"
  }).dequeue("scrollanimation");
}

// scrollAmountWhenFocusLineIsOutOfViewport is set to 0 (default), scroll it the minimum distance
// needed to be completely in view. If the value is greater than 0 and less than or equal to 1,
// besides of scrolling the minimum needed to be visible, it scrolls additionally
// (viewport height * scrollAmountWhenFocusLineIsOutOfViewport) pixels
Scroll.prototype.scrollNodeVerticallyIntoView = function(rep, innerHeight)
{
  var viewport = this._getViewPortTopBottom();
  var isPartOfRepLineOutOfViewport = this._partOfRepLineIsOutOfViewport(viewport, rep);

  // when the selection changes outside of the viewport the browser automatically scrolls the line
  // to inside of the viewport. Tested on IE, Firefox, Chrome in releases from 2015 until now
  // So, when the line scrolled gets outside of the viewport we let the browser handle it.
  var linePosition = caretPosition.getPosition();
  if(linePosition){
    var distanceOfTopOfViewport = linePosition.top - viewport.top;
    var distanceOfBottomOfViewport = viewport.bottom - linePosition.bottom;
    var caretIsAboveOfViewport = distanceOfTopOfViewport < 0;
    var caretIsBelowOfViewport = distanceOfBottomOfViewport < 0;
    if(caretIsAboveOfViewport){
      var pixelsToScroll = distanceOfTopOfViewport - this._getPixelsRelativeToPercentageOfViewport(innerHeight, true);
      this._scrollYPage(pixelsToScroll);
    }else if(caretIsBelowOfViewport){
      var pixelsToScroll = -distanceOfBottomOfViewport + this._getPixelsRelativeToPercentageOfViewport(innerHeight);
      this._scrollYPage(pixelsToScroll);
    }else{
      this.scrollWhenCaretIsInTheLastLineOfViewportWhenNecessary(rep, true, innerHeight);
    }
  }
}

Scroll.prototype._partOfRepLineIsOutOfViewport = function(viewportPosition, rep)
{
  var focusLine = (rep.selFocusAtStart ? rep.selStart[0] : rep.selEnd[0]);
  var line = rep.lines.atIndex(focusLine);
  var linePosition = this._getLineEntryTopBottom(line);
  var lineIsAboveOfViewport = linePosition.top < viewportPosition.top;
  var lineIsBelowOfViewport = linePosition.bottom > viewportPosition.bottom;

  return lineIsBelowOfViewport || lineIsAboveOfViewport;
}

Scroll.prototype._getLineEntryTopBottom = function(entry, destObj)
{
  var dom = entry.lineNode;
  var top = dom.offsetTop;
  var height = dom.offsetHeight;
  var obj = (destObj || {});
  obj.top = top;
  obj.bottom = (top + height);
  return obj;
}

Scroll.prototype._arrowUpWasPressedInTheFirstLineOfTheViewport = function(arrowUp, rep)
{
  var percentageScrollArrowUp = this.scrollSettings.percentageToScrollWhenUserPressesArrowUp;
  return percentageScrollArrowUp && arrowUp && this._isCaretAtTheTopOfViewport(rep);
}

Scroll.prototype.getVisibleLineRange = function(rep)
{
  var viewport = this._getViewPortTopBottom();
  //console.log("viewport top/bottom: %o", viewport);
  var obj = {};
  var self = this;
  var start = rep.lines.search(function(e)
  {
    return self._getLineEntryTopBottom(e, obj).bottom > viewport.top;
  });
  var end = rep.lines.search(function(e)
  {
    // return the first line that the top position is greater or equal than
    // the viewport. That is the first line that is below the viewport bottom.
    // So the line that is in the bottom of the viewport is the very previous one.
    return self._getLineEntryTopBottom(e, obj).top >= viewport.bottom;
  });
  if (end < start) end = start; // unlikely
  // top.console.log(start+","+(end -1));
  return [start, end - 1];
}

Scroll.prototype.getVisibleCharRange = function(rep)
{
  var lineRange = this.getVisibleLineRange(rep);
  return [rep.lines.offsetOfIndex(lineRange[0]), rep.lines.offsetOfIndex(lineRange[1])];
}

exports.init = function(outerWin)
{
  return new Scroll(outerWin);
}
