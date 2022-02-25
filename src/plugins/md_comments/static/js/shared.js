'use strict';

const randomString = require('ep_etherpad-lite/static/js/pad_utils').randomString;

const collectContentPre = (hookName, context, cb) => {
  const comment = /(?:^| )(c-[A-Za-z0-9]*)/.exec(context.cls);
  const fakeComment = /(?:^| )(fakecomment-[A-Za-z0-9]*)/.exec(context.cls);

  if (comment && comment[1]) {
    context.cc.doAttrib(context.state, `comment::${comment[1]}`);
  }

  // a fake comment is a comment copied from this or another pad. To avoid conflicts
  // with existing comments, a fake commentId is used, so then we generate a new one
  // when the comment is saved
  if (fakeComment) {
    const mapFakeComments = pad.plugins.ep_comments.getMapfakeComments();
    const fakeCommentId = fakeComment[1];
    const commentId = mapFakeComments[fakeCommentId];
    context.cc.doAttrib(context.state, `comment::${commentId}`);
  }
  return cb();
};

exports.collectContentPre = collectContentPre;


exports.generateCommentId = () => {
  const commentId = `c-${randomString(16)}`;
  return commentId;
};
