'use strict';

const AttributePool = require('ep_etherpad-lite/static/js/AttributePool');
const Changeset = require('ep_etherpad-lite/static/js/Changeset');
const eejs = require('ep_etherpad-lite/node/eejs/');
const settings = require('ep_etherpad-lite/node/utils/Settings');
const formidable = require('formidable');
const commentManager = require('./commentManager');
const apiUtils = require('./apiUtils');
const _ = require('underscore');
const padMessageHandler = require('ep_etherpad-lite/node/handler/PadMessageHandler');
const readOnlyManager = require('ep_etherpad-lite/node/db/ReadOnlyManager.js');

let io;

exports.exportMuDocAdditionalContent = (hookName, context, callback) => callback(['comments']);

exports.padRemove = async (hookName, context) => {
  await Promise.all([
    commentManager.deleteCommentReplies(context.padID),
    commentManager.deleteComments(context.padID),
  ]);
};

exports.padCopy = async (hookName, context) => {
  await Promise.all([
    commentManager.copyComments(context.originalPad.id, context.destinationID),
    commentManager.copyCommentReplies(context.originalPad.id, context.destinationID),
  ]);
};

exports.handleMessageSecurity = async (hookName, {message, socket}) => {
  const {type: mtype, data: {type: dtype, apool, changeset} = {}} = message;
  if (mtype !== 'COLLABROOM') return;
  if (dtype !== 'USER_CHANGES') return;
  // Nothing needs to be done if the user already has write access.
  if (!padMessageHandler.sessioninfos[socket.id].readonly) return;
  const pool = new AttributePool().fromJsonable(apool);
  const cs = Changeset.unpack(changeset);
  const opIter = Changeset.opIterator(cs.ops);
  while (opIter.hasNext()) {
    const op = opIter.next();
    // Only operations that manipulate the 'comment' attribute on existing text are allowed.
    if (op.opcode !== '=') return;
    const forbiddenAttrib = new Error();
    try {
      Changeset.eachAttribNumber(op.attribs, (n) => {
        // Use an exception to break out of the iteration early.
        if (pool.getAttribKey(n) !== 'comment') throw forbiddenAttrib;
      });
    } catch (err) {
      if (err !== forbiddenAttrib) throw err;
      return;
    }
  }
  return true;
};

exports.socketio = (hookName, args, cb) => {
  io = args.io.of('/comment');
  io.on('connection', (socket) => {
    const handler = (fn) => (...args) => {
      const respond = args.pop();
      (async () => await fn(...args))().then(
          (val) => respond(null, val),
          (err) => respond({name: err.name, message: err.message}));
    };

    // Join the rooms
    socket.on('getComments', handler(async (data) => {
      const {padId} = await readOnlyManager.getIds(data.padId);
      // Put read-only and read-write users in the same socket.io "room" so that they can see each
      // other's updates.
      socket.join(padId);
      return await commentManager.getComments(padId);
    }));

    socket.on('getCommentReplies', handler(async (data) => {
      const {padId} = await readOnlyManager.getIds(data.padId);
      return await commentManager.getCommentReplies(padId);
    }));

    // On add events
    socket.on('addComment', handler(async (data) => {
      const {padId} = await readOnlyManager.getIds(data.padId);
      const content = data.comment;
      const [commentId, comment] = await commentManager.addComment(padId, content);
      if (commentId != null && comment != null) {
        socket.broadcast.to(padId).emit('pushAddComment', commentId, comment);
        return [commentId, comment];
      }
    }));

    socket.on('deleteComment', handler(async (data) => {
      const {padId} = await readOnlyManager.getIds(data.padId);
      await commentManager.deleteComment(padId, data.commentId, data.authorId);
      socket.broadcast.to(padId).emit('commentDeleted', data.commentId);
    }));

    socket.on('revertChange', handler(async (data) => {
      const {padId} = await readOnlyManager.getIds(data.padId);
      // Broadcast to all other users that this change was accepted.
      // Note that commentId here can either be the commentId or replyId..
      await commentManager.changeAcceptedState(padId, data.commentId, false);
      socket.broadcast.to(padId).emit('changeReverted', data.commentId);
    }));

    socket.on('acceptChange', handler(async (data) => {
      const {padId} = await readOnlyManager.getIds(data.padId);
      // Broadcast to all other users that this change was accepted.
      // Note that commentId here can either be the commentId or replyId..
      await commentManager.changeAcceptedState(padId, data.commentId, true);
      socket.broadcast.to(padId).emit('changeAccepted', data.commentId);
    }));

    socket.on('bulkAddComment', handler(async (padId, data) => {
      padId = (await readOnlyManager.getIds(padId)).padId;
      const [commentIds, comments] = await commentManager.bulkAddComments(padId, data);
      socket.broadcast.to(padId).emit('pushAddCommentInBulk');
      return _.object(commentIds, comments); // {c-123:data, c-124:data}
    }));

    socket.on('bulkAddCommentReplies', handler(async (padId, data) => {
      padId = (await readOnlyManager.getIds(padId)).padId;
      const [repliesId, replies] = await commentManager.bulkAddCommentReplies(padId, data);
      socket.broadcast.to(padId).emit('pushAddCommentReply', repliesId, replies);
      return _.zip(repliesId, replies);
    }));

    socket.on('updateCommentText', handler(async (data) => {
      const {commentId, commentText, authorId} = data;
      const {padId} = await readOnlyManager.getIds(data.padId);
      await commentManager.changeCommentText(padId, commentId, commentText, authorId);
      socket.broadcast.to(padId).emit('textCommentUpdated', commentId, commentText);
    }));

    socket.on('addCommentReply', handler(async (data) => {
      const {padId} = await readOnlyManager.getIds(data.padId);
      const [replyId, reply] = await commentManager.addCommentReply(padId, data);
      reply.replyId = replyId;
      socket.broadcast.to(padId).emit('pushAddCommentReply', replyId, reply);
      return [replyId, reply];
    }));
  });
  return cb();
};

exports.eejsBlock_dd_insert = (hookName, args, cb) => {
  args.content += eejs.require('ep_comments/templates/menuButtons.ejs');
  return cb();
};

exports.eejsBlock_mySettings = (hookName, args, cb) => {
  args.content += eejs.require('ep_comments/templates/settings.ejs');
  return cb();
};

exports.padInitToolbar = (hookName, args, cb) => {
  const toolbar = args.toolbar;

  const button = toolbar.button({
    command: 'addComment',
    localizationId: 'ep_comments.add_comment.title',
    class: 'buttonicon buttonicon-comment-medical',
  });

  toolbar.registerButton('addComment', button);

  return cb();
};

exports.eejsBlock_editbarMenuLeft = (hookName, args, cb) => {
  // check if custom button is used
  if (JSON.stringify(settings.toolbar).indexOf('addComment') > -1) {
    return cb();
  }
  args.content += eejs.require('ep_comments/templates/commentBarButtons.ejs');
  return cb();
};

exports.eejsBlock_scripts = (hookName, args, cb) => {
  args.content += eejs.require('ep_comments/templates/comments.html');
  args.content += eejs.require('ep_comments/templates/commentIcons.html');
  return cb();
};

exports.eejsBlock_styles = (hookName, args, cb) => {
  args.content += eejs.require('ep_comments/templates/styles.html');
  return cb();
};

exports.clientVars = (hook, context, cb) => {
  const displayCommentAsIcon =
    settings.ep_comments ? settings.ep_comments.displayCommentAsIcon : false;
  const highlightSelectedText =
    settings.ep_comments ? settings.ep_comments.highlightSelectedText : false;
  return cb({
    displayCommentAsIcon,
    highlightSelectedText,
  });
};

exports.expressCreateServer = (hookName, args, callback) => {
  args.app.get('/p/:pad/:rev?/comments', async (req, res) => {
    const fields = req.query;
    // check the api key
    if (!apiUtils.validateApiKey(fields, res)) return;

    // sanitize pad id before continuing
    const padIdReceived = (await readOnlyManager.getIds(apiUtils.sanitizePadId(req))).padId;

    let data;
    try {
      data = await commentManager.getComments(padIdReceived);
    } catch (err) {
      console.error(err.stack ? err.stack : err.toString());
      res.json({code: 2, message: 'internal error', data: null});
      return;
    }
    if (data == null) return;
    res.json({code: 0, data});
  });

  args.app.post('/p/:pad/:rev?/comments', async (req, res) => {
    const fields = await new Promise((resolve, reject) => {
      (new formidable.IncomingForm()).parse(req, (err, fields) => {
        if (err != null) return reject(err);
        resolve(fields);
      });
    });

    // check the api key
    if (!apiUtils.validateApiKey(fields, res)) return;

    // check required fields from comment data
    if (!apiUtils.validateRequiredFields(fields, ['data'], res)) return;

    // sanitize pad id before continuing
    const padIdReceived = (await readOnlyManager.getIds(apiUtils.sanitizePadId(req))).padId;

    // create data to hold comment information:
    let data;
    try {
      data = JSON.parse(fields.data);
    } catch (err) {
      res.json({code: 1, message: 'data must be a JSON', data: null});
      return;
    }

    let commentIds, comments;
    try {
      [commentIds, comments] = await commentManager.bulkAddComments(padIdReceived, data);
    } catch (err) {
      console.error(err.stack ? err.stack : err.toString());
      res.json({code: 2, message: 'internal error', data: null});
      return;
    }
    if (commentIds == null) return;
    for (let i = 0; i < commentIds.length; i++) {
      io.to(padIdReceived).emit('pushAddComment', commentIds[i], comments[i]);
    }
    res.json({code: 0, commentIds});
  });

  args.app.get('/p/:pad/:rev?/commentReplies', async (req, res) => {
    // it's the same thing as the formidable's fields
    const fields = req.query;
    // check the api key
    if (!apiUtils.validateApiKey(fields, res)) return;

    // sanitize pad id before continuing
    const padIdReceived = (await readOnlyManager.getIds(apiUtils.sanitizePadId(req))).padId;

    // call the route with the pad id sanitized
    let data;
    try {
      data = await commentManager.getCommentReplies(padIdReceived);
    } catch (err) {
      console.error(err.stack ? err.stack : err.toString());
      res.json({code: 2, message: 'internal error', data: null});
      return;
    }
    if (data == null) return;
    res.json({code: 0, data});
  });

  args.app.post('/p/:pad/:rev?/commentReplies', async (req, res) => {
    const fields = await new Promise((resolve, reject) => {
      (new formidable.IncomingForm()).parse(req, (err, fields) => {
        if (err != null) return reject(err);
        resolve(fields);
      });
    });

    // check the api key
    if (!apiUtils.validateApiKey(fields, res)) return;

    // check required fields from comment data
    if (!apiUtils.validateRequiredFields(fields, ['data'], res)) return;

    // sanitize pad id before continuing
    const padIdReceived = (await readOnlyManager.getIds(apiUtils.sanitizePadId(req))).padId;

    // create data to hold comment reply information:
    let data;
    try {
      data = JSON.parse(fields.data);
    } catch (err) {
      res.json({code: 1, message: 'data must be a JSON', data: null});
      return;
    }

    let replyIds, replies;
    try {
      [replyIds, replies] = await commentManager.bulkAddCommentReplies(padIdReceived, data);
    } catch (err) {
      console.error(err.stack ? err.stack : err.toString());
      res.json({code: 2, message: 'internal error', data: null});
      return;
    }
    if (replyIds == null) return;
    for (let i = 0; i < replyIds.length; i++) {
      replies[i].replyId = replyIds[i];
      io.to(padIdReceived).emit('pushAddCommentReply', replyIds[i], replies[i]);
    }
    res.json({code: 0, replyIds});
  });
  return callback();
};
