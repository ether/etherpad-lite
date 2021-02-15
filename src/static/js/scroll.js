'use strict';

/*
  This file handles scroll on edition or when user presses arrow keys.
  In this file we have two representations of line (browser and rep line).
  Rep Line = a line in the way is represented by Etherpad(rep) (each <div> is a line)
  Browser Line = each vertical line. A <div> can be break into more than one
  browser line.
*/
const caretPosition = require('./caretPosition');

function Scroll(outerWin) {
  // scroll settings
  this.scrollSettings = parent.parent.clientVars.scrollWhenFocusLineIsOutOfViewport;

  // DOM reference
  this.outerWin = outerWin;
  this.doc = this.outerWin.document;
  this.rootDocument = parent.parent.document;
}

Scroll.prototype.scrollWhenCaretIsInTheLastLineOfViewportWhenNecessary =
  function (rep, isScrollableEvent, innerHeight) {
  // are we placing the caret on the line at the bottom of viewport?
  // And if so, do we need to scroll the editor, as defined on the settings.json?
    const shouldScrollWhenCaretIsAtBottomOfViewport =
      this.scrollSettings.scrollWhenCaretIsInTheLastLineOfViewport;
    if (shouldScrollWhenCaretIsAtBottomOfViewport) {
      // avoid scrolling when selection includes multiple lines --
      // user can potentially be selecting more lines
      // than it fits on viewport
      const multipleLinesSelected = rep.selStart[0] !== rep.selEnd[0];

      // avoid scrolling when pad loads
      if (isScrollableEvent && !multipleLinesSelected && this._isCaretAtTheBottomOfViewport(rep)) {
        // when scrollWhenFocusLineIsOutOfViewport.percentage is 0, pixelsToScroll is 0
        const pixelsToScroll = this._getPixelsRelativeToPercentageOfViewport(innerHeight);
        this._scrollYPage(pixelsToScroll);
      }
    }
  };

Scroll.prototype.scrollWhenPressArrowKeys = function (arrowUp, rep, innerHeight) {
  // if percentageScrollArrowUp is 0, let the scroll to be handled as default, put the previous
  // rep line on the top of the viewport
  if (this._arrowUpWasPressedInTheFirstLineOfTheViewport(arrowUp, rep)) {
    const pixelsToScroll = this._getPixelsToScrollWhenUserPressesArrowUp(innerHeight);

    // by default, the browser scrolls to the middle of the viewport. To avoid the twist made
    // when we apply a second scroll, we made it immediately (without animation)
    this._scrollYPageWithoutAnimation(-pixelsToScroll);
  } else {
    this.scrollNodeVerticallyIntoView(rep, innerHeight);
  }
};

// Some plugins might set a minimum height to the editor (ex: ep_page_view), so checking
// if (caretLine() === rep.lines.length() - 1) is not enough. We need to check if there are
// other lines after caretLine(), and all of them are out of viewport.
Scroll.prototype._isCaretAtTheBottomOfViewport = function (rep) {
  // computing a line position using getBoundingClientRect() is expensive.
  // (obs: getBoundingClientRect() is called on caretPosition.getPosition())
  // To avoid that, we only call this function when it is possible that the
  // caret is in the bottom of viewport
  const caretLine = rep.selStart[0];
  const lineAfterCaretLine = caretLine + 1;
  const firstLineVisibleAfterCaretLine = caretPosition.getNextVisibleLine(lineAfterCaretLine, rep);
  const caretLineIsPartiallyVisibleOnViewport =
    this._isLinePartiallyVisibleOnViewport(caretLine, rep);
  const lineAfterCaretLineIsPartiallyVisibleOnViewport =
    this._isLinePartiallyVisibleOnViewport(firstLineVisibleAfterCaretLine, rep);
  if (caretLineIsPartiallyVisibleOnViewport || lineAfterCaretLineIsPartiallyVisibleOnViewport) {
    // check if the caret is in the bottom of the viewport
    const caretLinePosition = caretPosition.getPosition();
    const viewportBottom = this._getViewPortTopBottom().bottom;
    const nextLineBottom = caretPosition.getBottomOfNextBrowserLine(caretLinePosition, rep);
    const nextLineIsBelowViewportBottom = nextLineBottom > viewportBottom;
    return nextLineIsBelowViewportBottom;
  }
  return false;
};

Scroll.prototype._isLinePartiallyVisibleOnViewport = function (lineNumber, rep) {
  const lineNode = rep.lines.atIndex(lineNumber);
  const linePosition = this._getLineEntryTopBottom(lineNode);
  const lineTop = linePosition.top;
  const lineBottom = linePosition.bottom;
  const viewport = this._getViewPortTopBottom();
  const viewportBottom = viewport.bottom;
  const viewportTop = viewport.top;

  const topOfLineIsAboveOfViewportBottom = lineTop < viewportBottom;
  const bottomOfLineIsOnOrBelowOfViewportBottom = lineBottom >= viewportBottom;
  const topOfLineIsBelowViewportTop = lineTop >= viewportTop;
  const topOfLineIsAboveViewportBottom = lineTop <= viewportBottom;
  const bottomOfLineIsAboveViewportBottom = lineBottom <= viewportBottom;
  const bottomOfLineIsBelowViewportTop = lineBottom >= viewportTop;

  return (topOfLineIsAboveOfViewportBottom && bottomOfLineIsOnOrBelowOfViewportBottom) ||
    (topOfLineIsBelowViewportTop && topOfLineIsAboveViewportBottom) ||
    (bottomOfLineIsAboveViewportBottom && bottomOfLineIsBelowViewportTop);
};

Scroll.prototype._getViewPortTopBottom = function () {
  const theTop = this.getScrollY();
  const doc = this.doc;
  const height = doc.documentElement.clientHeight; // includes padding

  // we have to get the exactly height of the viewport.
  // So it has to subtract all the values which changes
  // the viewport height (E.g. padding, position top)
  const viewportExtraSpacesAndPosition =
    this._getEditorPositionTop() + this._getPaddingTopAddedWhenPageViewIsEnable();
  return {
    top: theTop,
    bottom: (theTop + height - viewportExtraSpacesAndPosition),
  };
};

Scroll.prototype._getEditorPositionTop = function () {
  const editor = parent.document.getElementsByTagName('iframe');
  const editorPositionTop = editor[0].offsetTop;
  return editorPositionTop;
};

// ep_page_view adds padding-top, which makes the viewport smaller
Scroll.prototype._getPaddingTopAddedWhenPageViewIsEnable = function () {
  const aceOuter = this.rootDocument.getElementsByName('ace_outer');
  const aceOuterPaddingTop = parseInt($(aceOuter).css('padding-top'));
  return aceOuterPaddingTop;
};

Scroll.prototype._getScrollXY = function () {
  const win = this.outerWin;
  const odoc = this.doc;
  if (typeof (win.pageYOffset) === 'number') {
    return {
      x: win.pageXOffset,
      y: win.pageYOffset,
    };
  }
  const docel = odoc.documentElement;
  if (docel && typeof (docel.scrollTop) === 'number') {
    return {
      x: docel.scrollLeft,
      y: docel.scrollTop,
    };
  }
};

Scroll.prototype.getScrollX = function () {
  return this._getScrollXY().x;
};

Scroll.prototype.getScrollY = function () {
  return this._getScrollXY().y;
};

Scroll.prototype.setScrollX = function (x) {
  this.outerWin.scrollTo(x, this.getScrollY());
};

Scroll.prototype.setScrollY = function (y) {
  this.outerWin.scrollTo(this.getScrollX(), y);
};

Scroll.prototype.setScrollXY = function (x, y) {
  this.outerWin.scrollTo(x, y);
};

Scroll.prototype._isCaretAtTheTopOfViewport = function (rep) {
  const caretLine = rep.selStart[0];
  const linePrevCaretLine = caretLine - 1;
  const firstLineVisibleBeforeCaretLine =
    caretPosition.getPreviousVisibleLine(linePrevCaretLine, rep);
  const caretLineIsPartiallyVisibleOnViewport =
    this._isLinePartiallyVisibleOnViewport(caretLine, rep);
  const lineBeforeCaretLineIsPartiallyVisibleOnViewport =
    this._isLinePartiallyVisibleOnViewport(firstLineVisibleBeforeCaretLine, rep);
  if (caretLineIsPartiallyVisibleOnViewport || lineBeforeCaretLineIsPartiallyVisibleOnViewport) {
    const caretLinePosition = caretPosition.getPosition(); // get the position of the browser line
    const viewportPosition = this._getViewPortTopBottom();
    const viewportTop = viewportPosition.top;
    const viewportBottom = viewportPosition.bottom;
    const caretLineIsBelowViewportTop = caretLinePosition.bottom >= viewportTop;
    const caretLineIsAboveViewportBottom = caretLinePosition.top < viewportBottom;
    const caretLineIsInsideOfViewport =
      caretLineIsBelowViewportTop && caretLineIsAboveViewportBottom;
    if (caretLineIsInsideOfViewport) {
      const prevLineTop = caretPosition.getPositionTopOfPreviousBrowserLine(caretLinePosition, rep);
      const previousLineIsAboveViewportTop = prevLineTop < viewportTop;
      return previousLineIsAboveViewportTop;
    }
  }
  return false;
};

// By default, when user makes an edition in a line out of viewport, this line goes
// to the edge of viewport. This function gets the extra pixels necessary to get the
// caret line in a position X relative to Y% viewport.
Scroll.prototype._getPixelsRelativeToPercentageOfViewport =
  function (innerHeight, aboveOfViewport) {
    let pixels = 0;
    const scrollPercentageRelativeToViewport = this._getPercentageToScroll(aboveOfViewport);
    if (scrollPercentageRelativeToViewport > 0 && scrollPercentageRelativeToViewport <= 1) {
      pixels = parseInt(innerHeight * scrollPercentageRelativeToViewport);
    }
    return pixels;
  };

// we use different percentages when change selection. It depends on if it is
// either above the top or below the bottom of the page
Scroll.prototype._getPercentageToScroll = function (aboveOfViewport) {
  let percentageToScroll = this.scrollSettings.percentage.editionBelowViewport;
  if (aboveOfViewport) {
    percentageToScroll = this.scrollSettings.percentage.editionAboveViewport;
  }
  return percentageToScroll;
};

Scroll.prototype._getPixelsToScrollWhenUserPressesArrowUp = function (innerHeight) {
  let pixels = 0;
  const percentageToScrollUp = this.scrollSettings.percentageToScrollWhenUserPressesArrowUp;
  if (percentageToScrollUp > 0 && percentageToScrollUp <= 1) {
    pixels = parseInt(innerHeight * percentageToScrollUp);
  }
  return pixels;
};

Scroll.prototype._scrollYPage = function (pixelsToScroll) {
  const durationOfAnimationToShowFocusline = this.scrollSettings.duration;
  if (durationOfAnimationToShowFocusline) {
    this._scrollYPageWithAnimation(pixelsToScroll, durationOfAnimationToShowFocusline);
  } else {
    this._scrollYPageWithoutAnimation(pixelsToScroll);
  }
};

Scroll.prototype._scrollYPageWithoutAnimation = function (pixelsToScroll) {
  this.outerWin.scrollBy(0, pixelsToScroll);
};

Scroll.prototype._scrollYPageWithAnimation =
  function (pixelsToScroll, durationOfAnimationToShowFocusline) {
    const outerDocBody = this.doc.getElementById('outerdocbody');

    // it works on later versions of Chrome
    const $outerDocBody = $(outerDocBody);
    this._triggerScrollWithAnimation(
        $outerDocBody, pixelsToScroll, durationOfAnimationToShowFocusline);

    // it works on Firefox and earlier versions of Chrome
    const $outerDocBodyParent = $outerDocBody.parent();
    this._triggerScrollWithAnimation(
        $outerDocBodyParent, pixelsToScroll, durationOfAnimationToShowFocusline);
  };

// using a custom queue and clearing it, we avoid creating a queue of scroll animations.
// So if this function is called twice quickly, only the last one runs.
Scroll.prototype._triggerScrollWithAnimation =
  function ($elem, pixelsToScroll, durationOfAnimationToShowFocusline) {
    // clear the queue of animation
    $elem.stop('scrollanimation');
    $elem.animate({
      scrollTop: `+=${pixelsToScroll}`,
    }, {
      duration: durationOfAnimationToShowFocusline,
      queue: 'scrollanimation',
    }).dequeue('scrollanimation');
  };

// scrollAmountWhenFocusLineIsOutOfViewport is set to 0 (default), scroll it the minimum distance
// needed to be completely in view. If the value is greater than 0 and less than or equal to 1,
// besides of scrolling the minimum needed to be visible, it scrolls additionally
// (viewport height * scrollAmountWhenFocusLineIsOutOfViewport) pixels
Scroll.prototype.scrollNodeVerticallyIntoView = function (rep, innerHeight) {
  const viewport = this._getViewPortTopBottom();

  // when the selection changes outside of the viewport the browser automatically scrolls the line
  // to inside of the viewport. Tested on IE, Firefox, Chrome in releases from 2015 until now
  // So, when the line scrolled gets outside of the viewport we let the browser handle it.
  const linePosition = caretPosition.getPosition();
  if (linePosition) {
    const distanceOfTopOfViewport = linePosition.top - viewport.top;
    const distanceOfBottomOfViewport = viewport.bottom - linePosition.bottom - linePosition.height;
    const caretIsAboveOfViewport = distanceOfTopOfViewport < 0;
    const caretIsBelowOfViewport = distanceOfBottomOfViewport < 0;
    if (caretIsAboveOfViewport) {
      const pixelsToScroll =
        distanceOfTopOfViewport - this._getPixelsRelativeToPercentageOfViewport(innerHeight, true);
      this._scrollYPage(pixelsToScroll);
    } else if (caretIsBelowOfViewport) {
      // setTimeout is required here as line might not be fully rendered onto the pad
      setTimeout(() => {
        const outer = window.parent;
        // scroll to the very end of the pad outer
        outer.scrollTo(0, outer[0].innerHeight);
      }, 150);
      // if the above setTimeout and functionality is removed then hitting an enter
      // key while on the last line wont be an optimal user experience
      // Details at: https://github.com/ether/etherpad-lite/pull/4639/files
    }
  }
};

Scroll.prototype._partOfRepLineIsOutOfViewport = function (viewportPosition, rep) {
  const focusLine = (rep.selFocusAtStart ? rep.selStart[0] : rep.selEnd[0]);
  const line = rep.lines.atIndex(focusLine);
  const linePosition = this._getLineEntryTopBottom(line);
  const lineIsAboveOfViewport = linePosition.top < viewportPosition.top;
  const lineIsBelowOfViewport = linePosition.bottom > viewportPosition.bottom;

  return lineIsBelowOfViewport || lineIsAboveOfViewport;
};

Scroll.prototype._getLineEntryTopBottom = function (entry, destObj) {
  const dom = entry.lineNode;
  const top = dom.offsetTop;
  const height = dom.offsetHeight;
  const obj = (destObj || {});
  obj.top = top;
  obj.bottom = (top + height);
  return obj;
};

Scroll.prototype._arrowUpWasPressedInTheFirstLineOfTheViewport = function (arrowUp, rep) {
  const percentageScrollArrowUp = this.scrollSettings.percentageToScrollWhenUserPressesArrowUp;
  return percentageScrollArrowUp && arrowUp && this._isCaretAtTheTopOfViewport(rep);
};

Scroll.prototype.getVisibleLineRange = function (rep) {
  const viewport = this._getViewPortTopBottom();
  // console.log("viewport top/bottom: %o", viewport);
  const obj = {};
  const self = this;
  const start = rep.lines.search((e) => self._getLineEntryTopBottom(e, obj).bottom > viewport.top);
  // return the first line that the top position is greater or equal than
  // the viewport. That is the first line that is below the viewport bottom.
  // So the line that is in the bottom of the viewport is the very previous one.
  let end = rep.lines.search((e) => self._getLineEntryTopBottom(e, obj).top >= viewport.bottom);
  if (end < start) end = start; // unlikely
  // top.console.log(start+","+(end -1));
  return [start, end - 1];
};

Scroll.prototype.getVisibleCharRange = function (rep) {
  const lineRange = this.getVisibleLineRange(rep);
  return [rep.lines.offsetOfIndex(lineRange[0]), rep.lines.offsetOfIndex(lineRange[1])];
};

exports.init = (outerWin) => new Scroll(outerWin);
