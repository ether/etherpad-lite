'use strict';

/* TODO:
- lable reply textarea
- Make the chekbox appear above the suggested changes even when activated
*/


const _ = require('underscore');
const browser = require('ep_etherpad-lite/static/js/browser');
const commentBoxes = require('ep_comments/static/js/commentBoxes');
const commentIcons = require('ep_comments/static/js/commentIcons');
const commentL10n = require('ep_comments/static/js/commentL10n');
const events = require('ep_comments/static/js/copyPasteEvents');
const moment = require('ep_comments/static/js/moment-with-locales.min');
const newComment = require('ep_comments/static/js/newComment');
const padcookie = require('ep_etherpad-lite/static/js/pad_cookie').padcookie;
const preCommentMark = require('ep_comments/static/js/preCommentMark');
const getCommentIdOnFirstPositionSelected = events.getCommentIdOnFirstPositionSelected;
const hasCommentOnSelection = events.hasCommentOnSelection;
const Security = require('ep_etherpad-lite/static/js/security');

const cssFiles = [
  'ep_comments/static/css/comment.css',
  'ep_comments/static/css/commentIcon.css',
];

const UPDATE_COMMENT_LINE_POSITION_EVENT = 'updateCommentLinePosition';

const parseMultiline = (text) => {
  if (!text) return text;
  text = JSON.stringify(text);
  return text.substr(1, (text.length - 2));
};

/* ********************************************************************
 *                         ep_comments Plugin                         *
 ******************************************************************** */

// Container
const MdComments = function (context) {
  this.container = null;
  this.padOuter = null;
  this.padInner = null;
  this.ace = context.ace;

  // Required for instances running on weird ports
  // This probably needs some work for instances running on root or not on /p/
  const loc = document.location;
  const port = loc.port === '' ? (loc.protocol === 'https:' ? 443 : 80) : loc.port;
  const url = `${loc.protocol}//${loc.hostname}:${port}/comment`;

  this.padId = clientVars.padId;
  this.socket = io.connect(url, {
    query: `padId=${this.padId}`,
  });

  this.comments = [];
  this.commentReplies = {};
  this.mapFakeComments = [];
  this.mapOriginalCommentsId = [];
  this.shouldCollectComment = false;
  this.init();
  this.preCommentMarker = preCommentMark.init(this.ace);
};

// Init MuDoc plugin comment pads
MdComments.prototype.init = async function () {
  const self = this;
  moment.locale(html10n.getLanguage());

  // Init prerequisite
  this.findContainers();
  this.insertContainers(); // Insert comment containers in sidebar

  // Init icons container
  commentIcons.insertContainer();

  const [comments, replies] = await Promise.all([this.getComments(), this.getCommentReplies()]);
  if (!$.isEmptyObject(comments)) {
    this.setComments(comments);
    this.collectComments();
  }
  if (!$.isEmptyObject(replies)) {
    this.commentReplies = replies;
    this.collectCommentReplies();
  }
  this.commentRepliesListen();
  this.commentListen();

  // Init add push event
  this.pushComment('add', (commentId, comment) => {
    this.setComment(commentId, comment);
    this.collectCommentsAfterSomeIntervalsOfTime();
  });

  // When language is changed, we need to reload the comments to make sure
  // all templates are localized
  html10n.bind('localized', () => {
    // Fall back to 'en' if moment.js doesn't support the language.
    moment.locale([html10n.getLanguage(), 'en']);
    this.localizeExistingComments();
  });

  // Recalculate position when editor is resized
  $('#settings input, #skin-variant-full-width').on('change', (e) => {
    this.setYofComments();
  });
  this.padInner.contents().on(UPDATE_COMMENT_LINE_POSITION_EVENT, (e) => {
    this.setYofComments();
  });
  $(window).resize(_.debounce(() => { this.setYofComments(); }, 100));

  // On click comment icon toolbar
  $('.addComment').on('click', (e) => {
    e.preventDefault(); // stops focus from being lost
    this.displayNewCommentForm();
  });

  // Import for below listener : we are using this.container.parent() so we include
  // events on both comment-modal and sidebar

  // Listen for events to delete a comment
  // All this does is remove the comment attr on the selection
  this.container.parent().on('click', '.comment-delete', async function () {
    const commentId = $(this).closest('.comment-container')[0].id;
    try {
      await self._send('deleteComment', {
        padId: self.padId,
        commentId,
        authorId: clientVars.userId,
      });
    } catch (err) {
      if (err.message !== 'unauth') throw err; // Let the uncaught error handler handle it.
      $.gritter.add({
        title: html10n.translations['ep_comments.error'] || 'Error',
        text: html10n.translations['ep_comments.error.delete_unauth'] ||
          'You cannot delete other users comments!',
        class_name: 'error',
      });
      return;
    }
    self.deleteComment(commentId);
    const padOuter = $('iframe[name="ace_outer"]').contents();
    const padInner = padOuter.find('iframe[name="ace_inner"]');
    const selector = `.${commentId}`;
    const ace = self.ace;

    ace.callWithAce((aceTop) => {
      const repArr = aceTop.ace_getRepFromSelector(selector, padInner);
      // rep is an array of reps.. I will need to iterate over each to do something meaningful..
      $.each(repArr, (index, rep) => {
        // I don't think we need this nested call
        ace.callWithAce((ace) => {
          ace.ace_performSelectionChange(rep[0], rep[1], true);
          ace.ace_setAttributeOnSelection('comment', 'comment-deleted');
          // Note that this is the correct way of doing it, instead of there being
          // a commentId we now flag it as "comment-deleted"
        });
      });
    }, 'deleteCommentedSelection', true);
  });

  // Listen for events to edit a comment
  // Here, it adds a form to edit the comment text
  this.container.parent().on('click', '.comment-edit', function () {
    const $commentBox = $(this).closest('.comment-container');
    $commentBox.addClass('editing');

    const textBox = self.findCommentText($commentBox).last();

    // if edit form not already there
    if (textBox.siblings('.comment-edit-form').length === 0) {
      // add a form to edit the field
      const data = {};
      data.text = textBox.text();
      const content = $('#editCommentTemplate').tmpl(data);
      // localize the comment/reply edit form
      commentL10n.localize(content);
      // insert form
      textBox.before(content);
    }
  });

  // submit the edition on the text and update the comment text
  this.container.parent().on('click', '.comment-edit-submit', async function (e) {
    e.preventDefault();
    e.stopPropagation();
    const $commentBox = $(this).closest('.comment-container');
    const $commentForm = $(this).closest('.comment-edit-form');
    const commentId = $commentBox.data('commentid');
    const commentText = $commentForm.find('.comment-edit-text').val();
    const data = {};
    data.commentId = commentId;
    data.padId = clientVars.padId;
    data.commentText = commentText;
    data.authorId = clientVars.userId;

    try {
      await self._send('updateCommentText', data);
    } catch (err) {
      if (err.message !== 'unauth') throw err; // Let the uncaught error handler handle it.
      $.gritter.add({
        title: html10n.translations['ep_comments.error'] || 'Error',
        text: html10n.translations['ep_comments.error.edit_unauth'] ||
          'You cannot edit other users comments!',
        class_name: 'error',
      });
      return;
    }
    $commentForm.remove();
    $commentBox.removeClass('editing');
    self.updateCommentBoxText(commentId, commentText);

    // although the comment or reply was saved on the data base successfully, it needs
    // to update the comment or comment reply variable with the new text saved
    self.setCommentOrReplyNewText(commentId, commentText);
  });

  // hide the edit form and make the comment author and text visible again
  this.container.parent().on('click', '.comment-edit-cancel', function (e) {
    e.preventDefault();
    e.stopPropagation();
    const $commentBox = $(this).closest('.comment-container');
    const textBox = self.findCommentText($commentBox).last();
    textBox.siblings('.comment-edit-form').remove();
    $commentBox.removeClass('editing');
  });

  // Listen for include suggested change toggle
  this.container.parent().on('change', '.suggestion-checkbox', function () {
    const parentComment = $(this).closest('.comment-container');
    const parentSuggest = $(this).closest('.comment-reply');

    if ($(this).is(':checked')) {
      const commentId = parentComment.data('commentid');
      const padOuter = $('iframe[name="ace_outer"]').contents();
      const padInner = padOuter.find('iframe[name="ace_inner"]');

      const currentString = padInner.contents().find(`.${commentId}`).html();

      parentSuggest.find('.from-value').html(currentString);
      parentSuggest.find('.suggestion').show();
    } else {
      parentSuggest.find('.suggestion').hide();
    }
  });

  // User accepts or revert a change
  this.container.parent().on('submit', '.comment-changeTo-form', function (e) {
    e.preventDefault();
    const data = self.getCommentData();
    const commentEl = $(this).closest('.comment-container');
    data.commentId = commentEl.data('commentid');
    const padOuter = $('iframe[name="ace_outer"]').contents();
    const padInner = padOuter.find('iframe[name="ace_inner"]').contents();

    // Are we reverting a change?
    const isRevert = commentEl.hasClass('change-accepted');
    let newString =
      isRevert ? $(this).find('.from-value').html() : $(this).find('.to-value').html();

    // In case of suggested change is inside a reply, the parentId is different from the commentId
    // (=replyId)
    const parentId = $(this).closest('.sidebar-comment').data('commentid');
    // Nuke all that aren't first lines of this comment
    padInner.find(`.${parentId}:not(:first)`).html('');

    const padCommentSpan = padInner.find(`.${parentId}`).first();
    newString = newString.replace(/(?:\r\n|\r)/g, '<br />');

    // Write the new pad contents
    padCommentSpan.html(newString);

    if (isRevert) {
      // Tell all users this change was reverted
      self._send('revertChange', data);
      self.showChangeAsReverted(data.commentId);
    } else {
      // Tell all users this change was accepted
      self._send('acceptChange', data);
      // Update our own comments container with the accepted change
      self.showChangeAsAccepted(data.commentId);
    }

    // TODO: we need ace editor to commit the change so other people get it
    // currently after approving or reverting, you need to do other thing on the pad
    // for ace to commit
  });

  // When input reply is focused we display more option
  this.container.parent().on('focus', '.comment-content', function (e) {
    $(this).closest('.new-comment').addClass('editing');
  });
  // When we leave we reset the form option to its minimal (only input)
  this.container.parent().on('mouseleave', '.comment-container', function (e) {
    $(this).find('.suggestion-checkbox').prop('checked', false);
    $(this).find('.new-comment').removeClass('editing');
  });

  // When a reply get submitted
  this.container.parent().on('submit', '.new-comment', async function (e) {
    e.preventDefault();

    const data = self.getCommentData();
    data.commentId = $(this).closest('.comment-container').data('commentid');
    data.reply = $(this).find('.comment-content').val();
    data.changeTo = $(this).find('.to-value').val() || null;
    data.changeFrom = $(this).find('.from-value').text() || null;
    $(this).trigger('reset_reply');
    await self._send('addCommentReply', data);
    const replies = await self.getCommentReplies();
    self.commentReplies = replies;
    self.collectCommentReplies();
    // Once the new reply is displayed, we clear the form
    $('iframe[name="ace_outer"]').contents().find('.new-comment').removeClass('editing');
  });
  this.container.parent().on('reset_reply', '.new-comment', function (e) {
    // Reset the form
    $(this).find('.comment-content').val('');
    $(this).find(':focus').blur();
    $(this).find('.to-value').val('');
    $(this).find('.suggestion-checkbox').prop('checked', false);
    $(this).removeClass('editing');
  });
  // When click cancel reply
  this.container.parent().on('click', '.btn-cancel-reply', function (e) {
    $(this).closest('.new-comment').trigger('reset_reply');
  });


  // Enable and handle cookies
  if (padcookie.getPref('comments') === false) {
    this.padOuter.find('#comments, #commentIcons').removeClass('active');
    $('#options-comments').attr('checked', 'unchecked');
    $('#options-comments').attr('checked', false);
  } else {
    $('#options-comments').attr('checked', 'checked');
  }

  $('#options-comments').on('change', () => {
    const checked = $('#options-comments').is(':checked');
    padcookie.setPref('comments', checked);
    this.padOuter.find('#comments, #commentIcons').toggleClass('active', checked);
    $('body').toggleClass('comments-active', checked);
    $('iframe[name="ace_outer"]').contents().find('body').toggleClass('comments-active', checked);
  });

  // Check to see if we should show already..
  $('#options-comments').trigger('change');

  // TODO - Implement to others browser like, Microsoft Edge, Opera, IE
  // Override  copy, cut, paste events on Google chrome and Mozilla Firefox.
  // When an user copies a comment and selects only the span, or part of it, Google chrome
  // does not copy the classes only the styles, for example:
  // <comment class='comment'><span>text to be copied</span></comment>
  // As the comment classes are not only used for styling we have to add these classes when it
  // pastes the content
  // The same does not occur when the user selects more than the span, for example:
  // text<comment class='comment'><span>to be copied</span></comment>
  if (browser.chrome || browser.firefox) {
    this.padInner.contents().on('copy', (e) => {
      events.addTextOnClipboard(
          e, this.ace, this.padInner, false, this.comments, this.commentReplies);
    });

    this.padInner.contents().on('cut', (e) => {
      events.addTextOnClipboard(e, this.ace, this.padInner, true);
    });

    this.padInner.contents().on('paste', (e) => {
      events.saveCommentsAndReplies(e);
    });
  }
};

MdComments.prototype.findCommentText = function ($commentBox) {
  const isReply = $commentBox.hasClass('sidebar-comment-reply');
  if (isReply) return $commentBox.find('.comment-text');
  return $commentBox.find('.compact-display-content .comment-text, ' +
                          '.full-display-content .comment-title-wrapper .comment-text');
};
// This function is useful to collect new comments on the collaborators
MdComments.prototype.collectCommentsAfterSomeIntervalsOfTime = async function () {
  await new Promise((resolve) => window.setTimeout(resolve, 300));
  this.collectComments();

  let countComments = Object.keys(this.comments).length;
  const padOuter = $('iframe[name="ace_outer"]').contents();
  this.padOuter = padOuter;
  this.padInner = padOuter.find('iframe[name="ace_inner"]');
  let padComment = this.padInner.contents().find('.comment');
  if (countComments <= padComment.length) return;

  await new Promise((resolve) => window.setTimeout(resolve, 1000));
  this.collectComments();
  countComments = Object.keys(this.comments).length;
  padComment = this.padInner.contents().find('.comment');
  if (countComments <= padComment.length) return;

  await new Promise((resolve) => window.setTimeout(resolve, 3000));
  this.collectComments();
  countComments = Object.keys(this.comments).length;
  padComment = this.padInner.contents().find('.comment');
  if (countComments <= padComment.length) return;

  await new Promise((resolve) => window.setTimeout(resolve, 9000));
  this.collectComments();
};

// Insert comments container on element use for linenumbers
MdComments.prototype.findContainers = function () {
  const padOuter = $('iframe[name="ace_outer"]').contents();
  this.padOuter = padOuter;
  this.padInner = padOuter.find('iframe[name="ace_inner"]');
  this.outerBody = padOuter.find('#outerdocbody');
};

// Collect Comments and link text content to the comments div
MdComments.prototype.collectComments = function (callback) {
  const self = this;
  const container = this.container;
  const comments = this.comments;
  const padComment = this.padInner.contents().find('.comment');

  padComment.each(function (it) {
    const $this = $(this);
    const cls = $this.attr('class');
    const classCommentId = /(?:^| )(c-[A-Za-z0-9]*)/.exec(cls);
    const commentId = (classCommentId) ? classCommentId[1] : null;
    if (!commentId) return;

    self.padInner.contents().find('#innerdocbody').addClass('comments');

    const commentElm = container.find(`#${commentId}`);

    const comment = comments[commentId];
    if (comment) {
      comment.data.changeFrom = parseMultiline(comment.data.changeFrom);
      // If comment is not in sidebar insert it
      if (commentElm.length === 0) {
        self.insertComment(commentId, comment.data, it);
      }
      // localize comment element
      commentL10n.localize(commentElm);
    }
    const prevCommentElm = commentElm.prev();
    let commentPos = 0;

    if (prevCommentElm.length !== 0) {
      const prevCommentPos = prevCommentElm.css('top');
      const prevCommentHeight = prevCommentElm.innerHeight();

      commentPos = parseInt(prevCommentPos) + prevCommentHeight + 30;
    }

    commentElm.css({top: commentPos});
  });

  // HOVER SIDEBAR COMMENT
  let hideCommentTimer;
  this.container.on('mouseover', '.sidebar-comment', (e) => {
    // highlight comment
    clearTimeout(hideCommentTimer);
    commentBoxes.highlightComment(e.currentTarget.id, e);
  }).on('mouseout', '.sidebar-comment', (e) => {
    // do not hide directly the comment, because sometime the mouse get out accidently
    hideCommentTimer = setTimeout(() => {
      commentBoxes.hideComment(e.currentTarget.id);
    }, 1000);
  });

  // HOVER OR CLICK THE COMMENTED TEXT IN THE EDITOR
  // hover event
  this.padInner.contents().on('mouseover', '.comment', function (e) {
    if (container.is(':visible')) { // not on mobile
      clearTimeout(hideCommentTimer);
      const commentId = self.commentIdOf(e);
      commentBoxes.highlightComment(commentId, e, $(this));
    }
  });

  // click event
  this.padInner.contents().on('click', '.comment', function (e) {
    const commentId = self.commentIdOf(e);
    commentBoxes.highlightComment(commentId, e, $(this));
  });

  this.padInner.contents().on('mouseleave', '.comment', (e) => {
    const commentOpenedByClickOnIcon = commentIcons.isCommentOpenedByClickOnIcon();
    // only closes comment if it was not opened by a click on the icon
    if (!commentOpenedByClickOnIcon && container.is(':visible')) {
      hideCommentTimer = setTimeout(() => {
        self.closeOpenedComment(e);
      }, 1000);
    }
  });

  this.addListenersToCloseOpenedComment();

  this.setYofComments();
  if (callback) callback();
};

MdComments.prototype.addListenersToCloseOpenedComment = function () {
  // we need to add listeners to the different iframes of the page
  $(document).on('touchstart click', (e) => {
    this.closeOpenedCommentIfNotOnSelectedElements(e);
  });
  this.padOuter.find('html').on('touchstart click', (e) => {
    this.closeOpenedCommentIfNotOnSelectedElements(e);
  });
  this.padInner.contents().find('html').on('touchstart click', (e) => {
    this.closeOpenedCommentIfNotOnSelectedElements(e);
  });
};

// Close comment that is opened
MdComments.prototype.closeOpenedComment = function (e) {
  const commentId = this.commentIdOf(e);
  commentBoxes.hideComment(commentId);
};

// Close comment if event target was outside of comment or on a comment icon
MdComments.prototype.closeOpenedCommentIfNotOnSelectedElements = function (e) {
  // Don't do anything if clicked on the allowed elements:
  // any of the comment icons
  if (commentIcons.shouldNotCloseComment(e) || commentBoxes.shouldNotCloseComment(e)) return;
  // All clear, can close the comment
  this.closeOpenedComment(e);
};

// Collect Comments and link text content to the comments div
MdComments.prototype.collectCommentReplies = function (callback) {
  $.each(this.commentReplies, (replyId, reply) => {
    const commentId = reply.commentId;
    if (commentId) {
      // tell comment icon that this comment has 1+ replies
      commentIcons.commentHasReply(commentId);

      const existsAlready = $('iframe[name="ace_outer"]').contents().find(`#${replyId}`).length;
      if (existsAlready) return;

      reply.replyId = replyId;
      reply.text = reply.text || '';
      reply.date = moment(reply.timestamp).fromNow();
      reply.formattedDate = new Date(reply.timestamp).toISOString();

      const content = $('#replyTemplate').tmpl(reply);
      if (reply.author !== clientVars.userId) {
        $(content).find('.comment-edit').remove();
      }
      // localize comment reply
      commentL10n.localize(content);
      const repliesContainer =
        $('iframe[name="ace_outer"]').contents().find(`#${commentId} .comment-replies-container`);
      repliesContainer.append(content);
    }
  });
};

MdComments.prototype.commentIdOf = function (e) {
  const cls = e.currentTarget.classList;
  const classCommentId = /(?:^| )(c-[A-Za-z0-9]*)/.exec(cls);

  return (classCommentId) ? classCommentId[1] : null;
};

// Insert comment container in sidebar
MdComments.prototype.insertContainers = function () {
  const target = $('iframe[name="ace_outer"]').contents().find('#outerdocbody');

  // Create hover modal
  target.prepend(
      $('<div>').addClass('comment-modal popup').append(
          $('<div>').addClass('popup-content comment-modal-comment')));

  // Add comments side bar container
  target.prepend($('<div>').attr('id', 'comments'));

  this.container = this.padOuter.find('#comments');
};

// Insert a comment node
MdComments.prototype.insertComment = function (commentId, comment, index) {
  let content = null;
  const container = this.container;
  const commentAfterIndex = container.find('.sidebar-comment').eq(index);

  comment.commentId = commentId;
  comment.reply = true;
  content = $('#commentsTemplate').tmpl(comment);
  if (comment.author !== clientVars.userId) {
    $(content).find('.comment-actions-wrapper').addClass('hidden');
  }
  commentL10n.localize(content);

  // position doesn't seem to be relative to rep

  if (index === 0) {
    content.prependTo(container);
  } else if (commentAfterIndex.length === 0) {
    content.appendTo(container);
  } else {
    commentAfterIndex.before(content);
  }

  // insert icon
  commentIcons.addIcon(commentId, comment);
};

// Set all comments to be inline with their target REP
MdComments.prototype.setYofComments = function () {
  // for each comment in the pad
  const padOuter = $('iframe[name="ace_outer"]').contents();
  const padInner = padOuter.find('iframe[name="ace_inner"]');
  const inlineComments = this.getFirstOcurrenceOfCommentIds();
  const commentsToBeShown = [];

  $.each(inlineComments, function () {
    // classname is the ID of the comment
    const commentId = /(?:^| )(c-[A-Za-z0-9]*)/.exec(this.className);
    if (!commentId || !commentId[1]) return;
    const commentEle = padOuter.find(`#${commentId[1]}`);

    let topOffset = this.offsetTop;
    topOffset += parseInt(padInner.css('padding-top').split('px')[0]);
    topOffset += parseInt($(this).css('padding-top').split('px')[0]);

    if (commentId) {
      // adjust outer comment...
      commentBoxes.adjustTopOf(commentId[1], topOffset);
      // ... and adjust icons too
      commentIcons.adjustTopOf(commentId[1], topOffset);

      // mark this comment to be displayed if it was visible before we start adjusting its position
      if (commentIcons.shouldShow(commentEle)) commentsToBeShown.push(commentEle);
    }
  });

  // re-display comments that were visible before
  _.each(commentsToBeShown, (commentEle) => {
    commentEle.show();
  });
};

MdComments.prototype.getFirstOcurrenceOfCommentIds = function () {
  const padOuter = $('iframe[name="ace_outer"]').contents();
  const padInner = padOuter.find('iframe[name="ace_inner"]').contents();
  const commentsId = this.getUniqueCommentsId(padInner);
  const firstOcurrenceOfCommentIds =
    _.map(commentsId, (commentId) => padInner.find(`.${commentId}`).first().get(0));
  return firstOcurrenceOfCommentIds;
};

MdComments.prototype.getUniqueCommentsId = function (padInner) {
  const inlineComments = padInner.find('.comment');
  const commentsId = _.map(inlineComments, (inlineComment) => {
    const commentId = /(?:^| )(c-[A-Za-z0-9]*)/.exec(inlineComment.className);
    // avoid when it has a '.comment' that it has a fakeComment class 'fakecomment-123' yet.
    if (commentId && commentId[1]) return commentId[1];
  });
  const onlyUnique = (value, index, self) => self.indexOf(value) === index;
  return commentsId.filter(onlyUnique);
};

// Indicates if all comments are on the correct Y position, and don't need to
// be adjusted
MdComments.prototype.allCommentsOnCorrectYPosition = function () {
  // for each comment in the pad
  const padOuter = $('iframe[name="ace_outer"]').contents();
  const padInner = padOuter.find('iframe[name="ace_inner"]');
  const inlineComments = padInner.contents().find('.comment');
  let allCommentsAreCorrect = true;

  $.each(inlineComments, function () {
    const y = this.offsetTop;
    const commentId = /(?:^| )(c-[A-Za-z0-9]*)/.exec(this.className);
    if (commentId && commentId[1]) {
      if (!commentBoxes.isOnTop(commentId[1], y)) { // found one comment on the incorrect place
        allCommentsAreCorrect = false;
        return false; // to break loop
      }
    }
  });

  return allCommentsAreCorrect;
};

MdComments.prototype.localizeExistingComments = function () {
  const self = this;
  const padComments = this.padInner.contents().find('.comment');
  const comments = this.comments;

  padComments.each((key, it) => {
    const $this = $(it);
    const cls = $this.attr('class');
    const classCommentId = /(?:^| )(c-[A-Za-z0-9]*)/.exec(cls);
    const commentId = (classCommentId) ? classCommentId[1] : null;

    if (commentId != null) {
      const commentElm = self.container.find(`#${commentId}`);
      const comment = comments[commentId];

      // localize comment element...
      commentL10n.localize(commentElm);
      // ... and update its date
      comment.data.date = moment(comment.data.timestamp).fromNow();
      comment.data.formattedDate = new Date(comment.data.timestamp).toISOString();
      $(commentElm).find('.comment-created-at').html(comment.data.date);
    }
  });
};

// Set comments content data
MdComments.prototype.setComments = function (comments) {
  for (const [commentId, comment] of Object.entries(comments)) {
    this.setComment(commentId, comment);
  }
};

// Set comment data
MdComments.prototype.setComment = function (commentId, comment) {
  const comments = this.comments;
  comment.date = moment(comment.timestamp).fromNow();
  comment.formattedDate = new Date(comment.timestamp).toISOString();

  if (comments[commentId] == null) comments[commentId] = {};
  comments[commentId].data = comment;
};

// commentReply = ['c-reply-123', commentDataObject]
// commentDataObject = {author:..., name:..., text:..., ...}
MdComments.prototype.setCommentReply = function (commentReply) {
  const commentReplies = this.commentReplies;
  const replyId = commentReply[0];
  commentReplies[replyId] = commentReply[1];
};

// set the text of the comment or comment reply
MdComments.prototype.setCommentOrReplyNewText = function (commentOrReplyId, text) {
  if (this.comments[commentOrReplyId]) {
    this.comments[commentOrReplyId].data.text = text;
  } else if (this.commentReplies[commentOrReplyId]) {
    this.commentReplies[commentOrReplyId].text = text;
  }
};

MdComments.prototype._send = async function (type, ...args) {
  return await new Promise((resolve, reject) => {
    this.socket.emit(type, ...args, (errj, val) => {
      if (errj != null) return reject(Object.assign(new Error(errj.message), {name: errj.name}));
      resolve(val);
    });
  });
};

// Get all comments
MdComments.prototype.getComments = async function () {
  return (await this._send('getComments', {padId: this.padId})).comments;
};

// Get all comment replies
MdComments.prototype.getCommentReplies = async function () {
  return (await this._send('getCommentReplies', {padId: this.padId})).replies;
};

MdComments.prototype.getCommentData = function () {
  const data = {};

  // Insert comment data
  data.padId = this.padId;
  data.comment = {};
  data.comment.author = clientVars.userId;
  data.comment.name = pad.myUserInfo.name;
  data.comment.timestamp = new Date().getTime();

  // If client is anonymous
  if (data.comment.name === undefined) {
    data.comment.name = clientVars.userAgent;
  }

  return data;
};

// Delete a pad comment
MdComments.prototype.deleteComment = function (commentId) {
  $('iframe[name="ace_outer"]').contents().find(`#${commentId}`).remove();
};

const cloneLine = (line) => {
  const padOuter = $('iframe[name="ace_outer"]').contents();
  const padInner = padOuter.find('iframe[name="ace_inner"]');

  const lineElem = $(line.lineNode);
  const lineClone = lineElem.clone();
  const innerOffset = $(padInner).offset().left;
  const innerPadding = parseInt(padInner.css('padding-left') + lineElem.offset().left);
  const innerdocbodyMargin = innerOffset + innerPadding || 0;
  padInner.contents().find('body').append(lineClone);
  lineClone.css({position: 'absolute'});
  lineClone.css(lineElem.offset());
  lineClone.css({left: innerdocbodyMargin});
  lineClone.width(lineElem.width());

  return lineClone;
};

let isHeading = function (index) {
  const attribs = this.documentAttributeManager.getAttributesOnLine(index);
  for (let i = 0; i < attribs.length; i++) {
    if (attribs[i][0] === 'heading') {
      const value = attribs[i][1];
      i = attribs.length;
      return value;
    }
  }
  return false;
};

const getXYOffsetOfRep = (rep) => {
  let selStart = rep.selStart;
  let selEnd = rep.selEnd;
  // make sure end is after start
  if (selStart[0] > selEnd[0] || (selStart[0] === selEnd[0] && selStart[1] > selEnd[1])) {
    selEnd = selStart;
    selStart = _.clone(selStart);
  }

  let startIndex = 0;
  const endIndex = selEnd[1];
  const lineIndex = selEnd[0];
  if (selStart[0] === selEnd[0]) {
    startIndex = selStart[1];
  }

  const padInner = $('iframe[name="ace_outer"]').contents().find('iframe[name="ace_inner"]');

  // Get the target Line
  const startLine = rep.lines.atIndex(selStart[0]);
  const endLine = rep.lines.atIndex(selEnd[0]);
  const clone = cloneLine(endLine);
  let lineText = Security.escapeHTML($(endLine.lineNode).text()).split('');
  lineText.splice(endIndex, 0, '</span>');
  lineText.splice(startIndex, 0, '<span id="selectWorker">');
  lineText = lineText.join('');

  const heading = isHeading(lineIndex);
  if (heading) {
    lineText = `<${heading}>${lineText}</${heading}>`;
  }
  $(clone).html(lineText);

  // Is the line visible yet?
  if ($(startLine.lineNode).length !== 0) {
    const worker = $(clone).find('#selectWorker');
    // A standard generic offset'
    let top = worker.offset().top + padInner.offset().top + parseInt(padInner.css('padding-top'));
    let left = worker.offset().left;
    // adjust position
    top += worker[0].offsetHeight;

    if (left < 0) {
      left = 0;
    }
    // Remove the clone element
    $(clone).remove();
    return [left, top];
  }
};

MdComments.prototype.displayNewCommentForm = function () {
  const rep = {};
  const ace = this.ace;

  ace.callWithAce((ace) => {
    const saveRep = ace.ace_getRep();

    rep.lines = saveRep.lines;
    rep.selStart = saveRep.selStart;
    rep.selEnd = saveRep.selEnd;
  }, 'saveCommentedSelection', true);

  const selectedText = this.getSelectedText(rep);
  // we have nothing selected, do nothing
  const noTextSelected = (selectedText.length === 0);
  if (noTextSelected) {
    $.gritter.add({
      text: html10n.translations['ep_comments.add_comment.hint'] ||
          'Please first select the text to comment',
    });
    return;
  }

  this.createNewCommentFormIfDontExist(rep);

  // Write the text to the changeFrom form
  $('#newComment').find('.from-value').text(selectedText);

  // Display form
  setTimeout(() => {
    const position = getXYOffsetOfRep(rep);
    newComment.showNewCommentPopup(position);
  });

  // Check if the first element selected is visible in the viewport
  const $firstSelectedElement = this.getFirstElementSelected();
  const firstSelectedElementInViewport = this.isElementInViewport($firstSelectedElement);

  if (!firstSelectedElementInViewport) {
    this.scrollViewportIfSelectedTextIsNotVisible($firstSelectedElement);
  }

  // Adjust focus on the form
  $('#newComment').find('.comment-content').focus();
};

MdComments.prototype.scrollViewportIfSelectedTextIsNotVisible = function ($firstSelectedElement) {
  // Set the top of the form to be the same Y as the target Rep
  const y = $firstSelectedElement.offsetTop;
  const padOuter = $('iframe[name="ace_outer"]').contents();
  padOuter.find('#outerdocbody').scrollTop(y); // Works in Chrome
  padOuter.find('#outerdocbody').parent().scrollTop(y); // Works in Firefox
};

MdComments.prototype.isElementInViewport = function (element) {
  const elementPosition = element.getBoundingClientRect();
  const outerdocbody = $('iframe[name="ace_outer"]').contents().find('#outerdocbody');
  const scrolltop = (outerdocbody.scrollTop() ||
                     // Works only on Firefox:
                     outerdocbody.parent().scrollTop());
  // position relative to the current viewport
  const elementPositionTopOnViewport = elementPosition.top - scrolltop;
  const elementPositionBottomOnViewport = elementPosition.bottom - scrolltop;

  const $aceOuter = $('iframe[name="ace_outer"]');
  const aceOuterHeight = $aceOuter.height();
  const aceOuterPaddingTop = this.getIntValueOfCSSProperty($aceOuter, 'padding-top');

  const clientHeight = aceOuterHeight - aceOuterPaddingTop;

  const elementAboveViewportTop = elementPositionTopOnViewport < 0;
  const elementBelowViewportBottom = elementPositionBottomOnViewport > clientHeight;

  return !(elementAboveViewportTop || elementBelowViewportBottom);
};

MdComments.prototype.getIntValueOfCSSProperty = function ($element, property) {
  const valueString = $element.css(property);
  return parseInt(valueString) || 0;
};

MdComments.prototype.getFirstElementSelected = function () {
  let element;

  this.ace.callWithAce((ace) => {
    const rep = ace.ace_getRep();
    const line = rep.lines.atIndex(rep.selStart[0]);
    const key = `#${line.key}`;
    const padOuter = $('iframe[name="ace_outer"]').contents();
    const padInner = padOuter.find('iframe[name="ace_inner"]').contents();
    element = padInner.find(key);
  }, 'getFirstElementSelected', true);

  return element[0];
};

// Indicates if user selected some text on editor
MdComments.prototype.checkNoTextSelected = function (rep) {
  const noTextSelected = ((rep.selStart[0] === rep.selEnd[0]) &&
                          (rep.selStart[1] === rep.selEnd[1]));

  return noTextSelected;
};

// Create form to add comment
MdComments.prototype.createNewCommentFormIfDontExist = function (rep) {
  const data = this.getCommentData();

  // If a new comment box doesn't already exist, create one
  data.changeFrom = parseMultiline(this.getSelectedText(rep));
  newComment.insertNewCommentPopupIfDontExist(data, (comment, index) => {
    if (comment.changeTo) {
      data.comment.changeFrom = comment.changeFrom;
      data.comment.changeTo = comment.changeTo;
    }
    data.comment.text = comment.text;

    this.saveComment(data, rep);
  });
};

// Get a string representation of the text selected on the editor
MdComments.prototype.getSelectedText = function (rep) {
  // The selection representation looks like this if it starts with the fifth character in the
  // second line and ends at (but does not include) the third character in the eighth line:
  //     rep.selStart = [1, 4]; // 2nd line 5th char
  //     rep.selEnd = [7, 2]; // 8th line 3rd char
  const selectedTextLines = [];
  const lastLine = this.getLastLine(rep.selStart[0], rep);
  for (let lineNumber = rep.selStart[0]; lineNumber <= lastLine; ++lineNumber) {
    const line = rep.lines.atIndex(lineNumber);
    const selStartsAfterLine = rep.selStart[0] > lineNumber ||
      (rep.selStart[0] === lineNumber && rep.selStart[1] >= line.text.length);
    if (selStartsAfterLine) continue; // Nothing in this line is selected.
    const selEndsBeforeLine = rep.selEnd[0] < lineNumber ||
      (rep.selEnd[0] === lineNumber && rep.selEnd[1] <= 0);
    if (selEndsBeforeLine) continue; // Nothing in this line is selected.
    const selStartsBeforeLine = rep.selStart[0] < lineNumber || rep.selStart[1] < 0;
    const posStart = selStartsBeforeLine ? 0 : rep.selStart[1];
    const selEndsAfterLine = rep.selEnd[0] > lineNumber || rep.selEnd[1] > line.text.length;
    const posEnd = selEndsAfterLine ? line.text.length : rep.selEnd[1];
    // If the selection includes the very beginning of line, and the line has a line marker, it
    // means the line marker was selected as well. Exclude it from the selected text.
    selectedTextLines.push(
        line.text.substring((posStart === 0 && this.lineHasMarker(line)) ? 1 : posStart, posEnd));
  }
  return selectedTextLines.join('\n');
};

MdComments.prototype.getLastLine = function (firstLine, rep) {
  let lastLineSelected = rep.selEnd[0];

  if (lastLineSelected > firstLine) {
    // Ignore last line if the selected text of it it is empty
    if (this.lastLineSelectedIsEmpty(rep, lastLineSelected)) {
      lastLineSelected--;
    }
  }
  return lastLineSelected;
};

MdComments.prototype.lastLineSelectedIsEmpty = function (rep, lastLineSelected) {
  const line = rep.lines.atIndex(lastLineSelected);
  // when we've a line with line attribute, the first char line position
  // in a line is 1 because of the *, otherwise is 0
  const firstCharLinePosition = this.lineHasMarker(line) ? 1 : 0;
  const lastColumnSelected = rep.selEnd[1];

  return lastColumnSelected === firstCharLinePosition;
};

MdComments.prototype.lineHasMarker = function (line) {
  return line.lineMarker === 1;
};

// Save comment
MdComments.prototype.saveComment = async function (data, rep) {
  const res = await this._send('addComment', data);
  if (res == null) return;
  const [commentId, comment] = res;
  comment.commentId = commentId;

  this.ace.callWithAce((ace) => {
    // we should get rep again because the document might have changed..
    // details at https://github.com/akhil-naidu/ep_comments/issues/133
    rep = ace.ace_getRep();
    ace.ace_performSelectionChange(rep.selStart, rep.selEnd, true);
    ace.ace_setAttributeOnSelection('comment', commentId);
  }, 'insertComment', true);

  this.setComment(commentId, comment);
  this.collectComments();
};

// commentData = {c-newCommentId123: data:{author:..., date:..., ...},
//                c-newCommentId124: data:{...}}
MdComments.prototype.saveCommentWithoutSelection = async function (padId, commentData) {
  const data = this.buildComments(commentData);
  const comments = await this._send('bulkAddComment', padId, data);
  this.setComments(comments);
  this.shouldCollectComment = true;
};

MdComments.prototype.buildComments = function (commentsData) {
  const comments =
    _.map(commentsData, (commentData, commentId) => this.buildComment(commentId, commentData.data));
  return comments;
};

// commentData = {c-newCommentId123: data:{author:..., date:..., ...}, ...
MdComments.prototype.buildComment = function (commentId, commentData) {
  const data = {};
  data.padId = this.padId;
  data.commentId = commentId;
  data.text = commentData.text;
  data.changeTo = commentData.changeTo;
  data.changeFrom = commentData.changeFrom;
  data.name = commentData.name;
  data.timestamp = parseInt(commentData.timestamp);

  return data;
};

MdComments.prototype.getMapfakeComments = function () {
  return this.mapFakeComments;
};

// commentReplyData = {c-reply-123:{commentReplyData1}, c-reply-234:{commentReplyData1}, ...}
MdComments.prototype.saveCommentReplies = async function (padId, commentReplyData) {
  const data = this.buildCommentReplies(commentReplyData);
  const replies = await this._send('bulkAddCommentReplies', padId, data);
  _.each(replies, (reply) => {
    this.setCommentReply(reply);
  });
  this.shouldCollectComment = true; // force collect the comment replies saved
};

MdComments.prototype.buildCommentReplies = function (repliesData) {
  const replies = _.map(repliesData, (replyData) => this.buildCommentReply(replyData));
  return replies;
};

// take a replyData and add more fields necessary. E.g. 'padId'
MdComments.prototype.buildCommentReply = function (replyData) {
  const data = {};
  data.padId = this.padId;
  data.commentId = replyData.commentId;
  data.text = replyData.text;
  data.changeTo = replyData.changeTo;
  data.changeFrom = replyData.changeFrom;
  data.replyId = replyData.replyId;
  data.name = replyData.name;
  data.timestamp = parseInt(replyData.timestamp);

  return data;
};

// Listen for comment
MdComments.prototype.commentListen = function () {
  const socket = this.socket;
  socket.on('pushAddCommentInBulk', async () => {
    const allComments = await this.getComments();
    if (!$.isEmptyObject(allComments)) {
      // we get the comments in this format {c-123:{author:...}, c-124:{author:...}}
      // but it's expected to be {c-123: {data: {author:...}}, c-124:{data:{author:...}}}
      // in this.comments
      const commentsProcessed = {};
      _.map(allComments, (comment, commentId) => {
        commentsProcessed[commentId] = {};
        commentsProcessed[commentId].data = comment;
      });
      this.comments = commentsProcessed;
      this.collectCommentsAfterSomeIntervalsOfTime(); // here we collect on the collaborators
    }
  });
};

// Listen for comment replies
MdComments.prototype.commentRepliesListen = function () {
  this.socket.on('pushAddCommentReply', async (replyId, reply) => {
    const replies = await this.getCommentReplies();
    if (!$.isEmptyObject(replies)) {
      this.commentReplies = replies;
      this.collectCommentReplies();
    }
  });
};

MdComments.prototype.updateCommentBoxText = function (commentId, commentText) {
  const $comment = this.container.parent().find(`[data-commentid='${commentId}']`);
  const textBox = this.findCommentText($comment);
  textBox.text(commentText);
};

MdComments.prototype.showChangeAsAccepted = function (commentId) {
  const self = this;

  // Get the comment
  const comment = this.container.parent().find(`[data-commentid='${commentId}']`);
  // Revert other comment that have already been accepted
  comment.closest('.sidebar-comment')
      .find('.comment-container.change-accepted').addBack('.change-accepted')
      .each(function () {
        $(this).removeClass('change-accepted');
        const data = {commentId: $(this).attr('data-commentid'), padId: self.padId};
        self._send('revertChange', data);
      });

  // this comment get accepted
  comment.addClass('change-accepted');
};

MdComments.prototype.showChangeAsReverted = function (commentId) {
  // Get the comment
  const comment = this.container.parent().find(`[data-commentid='${commentId}']`);
  comment.removeClass('change-accepted');
};

// Push comment from collaborators
MdComments.prototype.pushComment = function (eventType, callback) {
  const socket = this.socket;

  socket.on('textCommentUpdated', (commentId, commentText) => {
    this.updateCommentBoxText(commentId, commentText);
  });

  socket.on('commentDeleted', (commentId) => {
    this.deleteComment(commentId);
  });

  socket.on('changeAccepted', (commentId) => {
    this.showChangeAsAccepted(commentId);
  });

  socket.on('changeReverted', (commentId) => {
    this.showChangeAsReverted(commentId);
  });

  // On collaborator add a comment in the current pad
  if (eventType === 'add') {
    socket.on('pushAddComment', (commentId, comment) => {
      callback(commentId, comment);
    });
  } else if (eventType === 'addCommentReply') {
    socket.on('pushAddCommentReply', (replyId, reply) => {
      callback(replyId, reply);
    });
  }
};

/* ********************************************************************
 *                           MuDoc Hooks                           *
 ******************************************************************** */

const hooks = {

  // Init pad comments
  postAceInit: (hookName, context, cb) => {
    if (!pad.plugins) pad.plugins = {};
    const Comments = new MdComments(context);
    pad.plugins.ep_comments = Comments;

    if (!$('#editorcontainerbox').hasClass('flex-layout')) {
      $.gritter.add({
        title: 'Error',
        text: 'ep_comments: Please upgrade to MuDoc 0.0.2 ' +
            'for this plugin to work correctly',
        sticky: true,
        class_name: 'error',
      });
    }
    return cb();
  },

  postToolbarInit: (hookName, args, cb) => {
    const editbar = args.toolbar;

    editbar.registerCommand('addComment', () => {
      pad.plugins.ep_comments.displayNewCommentForm();
    });
    return cb();
  },

  aceEditEvent: (hookName, context) => {
    if (!pad.plugins) pad.plugins = {};
    // first check if some text is being marked/unmarked to add comment to it
    const eventType = context.callstack.editEvent.eventType;
    if (eventType === 'unmarkPreSelectedTextToComment') {
      pad.plugins.ep_comments.preCommentMarker.handleUnmarkText(context);
    } else if (eventType === 'markPreSelectedTextToComment') {
      pad.plugins.ep_comments.preCommentMarker.handleMarkText(context);
    }

    if (['setup', 'setBaseText', 'importText'].includes(eventType)) return;

    if (context.callstack.docTextChanged && pad.plugins.ep_comments) {
      pad.plugins.ep_comments.setYofComments();
    }

    // some times on init ep_comments is not yet on the plugin list
    if (pad.plugins.ep_comments) {
      const commentWasPasted = pad.plugins.ep_comments.shouldCollectComment;
      const domClean = context.callstack.domClean;
      // we have to wait the DOM update from a fakeComment 'fakecomment-123' to a comment class
      // 'c-123'
      if (commentWasPasted && domClean) {
        pad.plugins.ep_comments.collectComments(() => {
          pad.plugins.ep_comments.collectCommentReplies();
          pad.plugins.ep_comments.shouldCollectComment = false;
        });
      }
    }
    return;
  },

  // Insert comments classes
  aceAttribsToClasses: (hookName, context, cb) => {
    if (context.key === 'comment' && context.value !== 'comment-deleted') {
      return cb(['comment', context.value]);
    }
    // only read marks made by current user
    if (context.key === preCommentMark.MARK_CLASS && context.value === clientVars.userId) {
      return cb([preCommentMark.MARK_CLASS, context.value]);
    }
    return cb();
  },

  aceEditorCSS: (hookName, context) => cssFiles,
};

exports.aceEditorCSS = hooks.aceEditorCSS;
exports.postAceInit = hooks.postAceInit;
exports.postToolbarInit = hooks.postToolbarInit;
exports.aceAttribsToClasses = hooks.aceAttribsToClasses;
exports.aceEditEvent = hooks.aceEditEvent;

// Given a CSS selector and a target element (in this case pad inner)
// return the rep as an array of array of tuples IE [[[0,1],[0,2]], [[1,3],[1,5]]]
// We have to return an array of a array of tuples because there can be multiple reps
// For a given selector
// A more sane data structure might be an object such as..
/*
0:{
  xStart: 0,
  xEnd: 1,
  yStart: 0,
  yEnd: 1
},
1:...
*/
// Alas we follow the MuDoc convention of using tuples here.
const getRepFromSelector = function (selector, container) {
  const attributeManager = this.documentAttributeManager;

  const repArr = [];

  // first find the element
  const elements = container.contents().find(selector);
  // One might expect this to be a rep for the entire document
  // However what we actually need to do is find each selection that includes
  // this comment and remove it.  This is because content can be pasted
  // Mid comment which would mean a remove selection could have unexpected consequences

  $.each(elements, (index, span) => {
    // create a rep array container we can push to..
    const rep = [[], []];

    // span not be the div so we have to go to parents until we find a div
    const parentDiv = $(span).closest('div');
    // line Number is obviously relative to entire document
    // So find out how many elements before in this parent?
    const lineNumber = $(parentDiv).prevAll('div').length;
    // We can set beginning of rep Y (lineNumber)
    rep[0][0] = lineNumber;

    // We can also update the end rep Y
    rep[1][0] = lineNumber;

    // Given the comment span, how many characters are before it?

    // All we need to know is the number of characters before .foo
    /*

    <div id="boo">
      hello
      <span class='nope'>
        world
      </span>
      are you
      <span class='foo'>
        here?
      </span>
    </div>

    */
    // In the example before the correct number would be 21
    // I guess we could do prevAll each length?
    // If there are no spans before we get 0, simples!
    // Note that this only works if spans are being used, which imho
    // Is the correct container however if block elements are registered
    // It's plausable that attributes are not maintained :(
    let leftOffset = 0;

    // If the line has a lineAttribute then leftOffset should be +1
    // Get each line Attribute on this line..
    let hasLineAttribute = false;
    const attrArr = attributeManager.getAttributesOnLine(lineNumber);
    $.each(attrArr, (attrK, value) => {
      if (value[0] === 'lmkr') hasLineAttribute = true;
    });
    if (hasLineAttribute) leftOffset++;

    $(span).prevAll('span').each(function () {
      const spanOffset = $(this).text().length;
      leftOffset += spanOffset;
    });
    rep[0][1] = leftOffset;
    rep[1][1] = rep[0][1] + $(span).text().length; // Easy!
    repArr.push(rep);
  });
  return repArr;
};

// Once ace is initialized, we set ace_doInsertHeading and bind it to the context
exports.aceInitialized = (hookName, context, cb) => {
  const editorInfo = context.editorInfo;
  isHeading = isHeading.bind(context);
  editorInfo.ace_getRepFromSelector = getRepFromSelector.bind(context);
  editorInfo.ace_getCommentIdOnFirstPositionSelected =
    getCommentIdOnFirstPositionSelected.bind(context);
  editorInfo.ace_hasCommentOnSelection = hasCommentOnSelection.bind(context);
  return cb();
};
