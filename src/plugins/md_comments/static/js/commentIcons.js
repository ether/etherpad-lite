'use strict';

const commentBoxes = require('ep_comments/static/js/commentBoxes');

// Indicates if MuDoc is configured to display icons
const displayIcons = () => clientVars.displayCommentAsIcon;

// Easier access to outer pad
let padOuter;
const getPadOuter = () => {
  padOuter = padOuter || $('iframe[name="ace_outer"]').contents();
  return padOuter;
};

// Easier access to inner pad
let padInner;
const getPadInner = () => {
  padInner = padInner || getPadOuter().find('iframe[name="ace_inner"]').contents();
  return padInner;
};

const getOrCreateIconsContainerAt = (top) => {
  const iconContainer = getPadOuter().find('#commentIcons');
  const iconClass = `icon-at-${top}`;

  // is this the 1st comment on that line?
  let iconsAtLine = iconContainer.find(`.${iconClass}`);
  const isFirstIconAtLine = iconsAtLine.length === 0;

  // create container for icons at target line, if it does not exist yet
  if (isFirstIconAtLine) {
    iconContainer.append(`<div class="comment-icon-line ${iconClass}"></div>`);
    iconsAtLine = iconContainer.find(`.${iconClass}`);
    iconsAtLine.css('top', `${top}px`);
  }

  return iconsAtLine;
};

const targetCommentIdOf = (e) => e.currentTarget.getAttribute('data-commentid');

const highlightTargetTextOf = (commentId) => {
  getPadInner().find('head').append(
      `<style class='comment-style'>.${commentId}{ color: #a7680c !important }</style>`);
};

const removeHighlightTargetText = () => {
  getPadInner().find('head .comment-style').remove();
};

const toggleActiveCommentIcon = (target) => {
  target.toggleClass('active').toggleClass('inactive');
};

const addListenersToCommentIcons = () => {
  getPadOuter().find('#commentIcons').on('mouseover', '.comment-icon', (e) => {
    removeHighlightTargetText();
    const commentId = targetCommentIdOf(e);
    highlightTargetTextOf(commentId);
  }).on('mouseout', '.comment-icon', (e) => {
    removeHighlightTargetText();
  }).on('click', '.comment-icon.active', function (e) {
    toggleActiveCommentIcon($(this));

    const commentId = targetCommentIdOf(e);
    commentBoxes.hideComment(commentId, true);
  }).on('click', '.comment-icon.inactive', function (e) {
    // deactivate/hide other comment boxes that are opened, so we have only
    // one comment box opened at a time
    commentBoxes.hideAllComments();
    const allActiveIcons = getPadOuter().find('#commentIcons').find('.comment-icon.active');
    toggleActiveCommentIcon(allActiveIcons);

    // activate/show only target comment
    toggleActiveCommentIcon($(this));
    const commentId = targetCommentIdOf(e);
    commentBoxes.highlightComment(commentId, e);
  });
};

// Listen to clicks on the page to be able to close comment when clicking
// outside of it
const addListenersToCloseOpenedComment = () => {
  // we need to add listeners to the different iframes of the page
  $(document).on('touchstart click', (e) => {
    closeOpenedCommentIfNotOnSelectedElements(e);
  });
  getPadOuter().find('html').on('touchstart click', (e) => {
    closeOpenedCommentIfNotOnSelectedElements(e);
  });
  getPadInner().find('html').on('touchstart click', (e) => {
    closeOpenedCommentIfNotOnSelectedElements(e);
  });
};

// Close comment if event target was outside of comment or on a comment icon
const closeOpenedCommentIfNotOnSelectedElements = (e) => {
  // Don't do anything if clicked on the following elements:
  // any of the comment icons
  if (shouldNotCloseComment(e) || commentBoxes.shouldNotCloseComment(e)) {
    // a comment box or the comment modal
    return;
  }

  // All clear, can close the comment
  const openedComment = findOpenedComment();
  if (openedComment) {
    toggleActiveCommentIcon($(openedComment));

    const commentId = openedComment.getAttribute('data-commentid');
    commentBoxes.hideComment(commentId, true);
  }
};

// Search on the page for an opened comment
const findOpenedComment = () => getPadOuter().find('#commentIcons .comment-icon.active').get(0);

/* ***** Public methods: ***** */

// Create container to hold comment icons
const insertContainer = () => {
  // we're only doing something if icons will be displayed at all
  if (!displayIcons()) return;

  getPadOuter().find('#sidediv').after('<div id="commentIcons"></div>');
  getPadOuter().find('#comments').addClass('with-icons');
  addListenersToCommentIcons();
  addListenersToCloseOpenedComment();
};

// Create a new comment icon
const addIcon = (commentId, comment) => {
  // we're only doing something if icons will be displayed at all
  if (!displayIcons()) return;

  const inlineComment = getPadInner().find(`.comment.${commentId}`);
  const top = inlineComment.get(0).offsetTop;
  const iconsAtLine = getOrCreateIconsContainerAt(top);
  const icon = $('#commentIconTemplate').tmpl(comment);

  icon.appendTo(iconsAtLine);
};

// Hide comment icons from container
const hideIcons = () => {
  // we're only doing something if icons will be displayed at all
  if (!displayIcons()) return;

  getPadOuter().find('#commentIcons').children().children().each(function () {
    $(this).hide();
  });
};

// Adjust position of the comment icon on the container, to be on the same
// height of the pad text associated to the comment, and return the affected icon
const adjustTopOf = (commentId, baseTop) => {
  // we're only doing something if icons will be displayed at all
  if (!displayIcons()) return;

  const icon = getPadOuter().find(`#icon-${commentId}`);
  const targetTop = baseTop;
  const iconsAtLine = getOrCreateIconsContainerAt(targetTop);

  // move icon from one line to the other
  if (iconsAtLine !== icon.parent()) icon.appendTo(iconsAtLine);

  icon.show();

  return icon;
};

// Indicate if comment detail currently opened was shown by a click on
// comment icon.
const isCommentOpenedByClickOnIcon = () => {
  // we're only doing something if icons will be displayed at all
  if (!displayIcons()) return false;

  const iconClicked = getPadOuter().find('#commentIcons').find('.comment-icon.active');
  const commentOpenedByClickOnIcon = iconClicked.length !== 0;

  return commentOpenedByClickOnIcon;
};

// Mark comment as a comment-with-reply, so it can be displayed with a
// different icon
const commentHasReply = (commentId) => {
  // we're only doing something if icons will be displayed at all
  if (!displayIcons()) return;

  // change comment icon
  const iconForComment = getPadOuter().find('#commentIcons').find(`#icon-${commentId}`);
  iconForComment.addClass('with-reply');
};

// Indicate if sidebar comment should be shown, checking if it had the characteristics
// of a comment that was being displayed on the screen
const shouldShow = (sidebarComent) => {
  let shouldShowComment = false;

  if (!displayIcons()) {
    // if icons are not being displayed, we always show comments
    shouldShowComment = true;
  } else if (sidebarComent.hasClass('mouseover')) {
    // if icons are being displayed, we only show comments clicked by user
    shouldShowComment = true;
  }

  return shouldShowComment;
};

// Indicates if event was on one of the elements that does not close comment (any of the comment
// icons)
const shouldNotCloseComment = (e) => $(e.target).closest('.comment-icon').length !== 0;

exports.insertContainer = insertContainer;
exports.addIcon = addIcon;
exports.hideIcons = hideIcons;
exports.adjustTopOf = adjustTopOf;
exports.isCommentOpenedByClickOnIcon = isCommentOpenedByClickOnIcon;
exports.commentHasReply = commentHasReply;
exports.shouldShow = shouldShow;
exports.shouldNotCloseComment = shouldNotCloseComment;
