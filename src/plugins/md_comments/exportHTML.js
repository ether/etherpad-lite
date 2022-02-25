'use strict';

const $ = require('cheerio');
const commentManager = require('./commentManager');
const settings = require('ep_etherpad-lite/node/utils/Settings');

// Iterate over pad attributes to find only the comment ones
const findAllCommentUsedOn = (pad) => {
  const commentsUsed = [];
  pad.pool.eachAttrib((key, value) => { if (key === 'comment') commentsUsed.push(value); });
  return commentsUsed;
};

// Add the props to be supported in export
exports.exportHtmlAdditionalTagsWithData =
  async (hookName, pad) => findAllCommentUsedOn(pad).map((name) => ['comment', name]);

exports.getLineHTMLForExport = async (hookName, context) => {
  if (settings.ep_comments && settings.ep_comments.exportHtml === false) return;

  // I'm not sure how optimal this is - it will do a database lookup for each line..
  const {comments} = await commentManager.getComments(context.padId);
  let hasPlugin = false;
  // Load the HTML into a throwaway div instead of calling $.load() to avoid
  // https://github.com/cheeriojs/cheerio/issues/1031
  const content = $('<div>').html(context.lineContent);
  // include links for each comment which we will add content later.
  content.find('span').each(function () {
    const span = $(this);
    const commentId = span.data('comment');
    if (!commentId) return; // not a comment.  please optimize me in selector
    if (!comments[commentId]) return; // if this comment has been deleted..
    hasPlugin = true;
    span.append(
        $('<sup>').append(
            $('<a>').attr('href', `#${commentId}`).text('*')));
    // Replace data-comment="foo" with class="comment foo".
    if (/^c-[0-9a-zA-Z]+$/.test(commentId)) {
      span.removeAttr('data-comment').addClass('comment').addClass(commentId);
    }
  });
  if (hasPlugin) context.lineContent = content.html();
};

exports.exportHTMLAdditionalContent = async (hookName, {padId}) => {
  if (settings.ep_comments && settings.ep_comments.exportHtml === false) return;
  const {comments} = await commentManager.getComments(padId);
  if (!comments) return;
  const div = $('<div>').attr('id', 'comments');
  for (const [commentId, comment] of Object.entries(comments)) {
    div.append(
        $('<p>')
            .attr('role', 'comment')
            .addClass('comment')
            .attr('id', commentId)
            .text(`* ${comment.text}`));
  }
  // adds additional HTML to the body, we get this HTML from the database of comments:padId
  return $.html(div);
};
