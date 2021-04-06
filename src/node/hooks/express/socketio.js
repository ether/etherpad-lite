'use strict';

const events = require('events');
const express = require('../express');
const log4js = require('log4js');
const proxyaddr = require('proxy-addr');
const settings = require('../../utils/Settings');
const socketio = require('socket.io');
const socketIORouter = require('../../handler/SocketIORouter');
const hooks = require('../../../static/js/pluginfw/hooks');
const padMessageHandler = require('../../handler/PadMessageHandler');

let io;
const logger = log4js.getLogger('socket.io');
const sockets = new Set();
const socketsEvents = new events.EventEmitter();

exports.expressCloseServer = async () => {
  if (io == null) return;
  logger.info('Closing socket.io engine...');
  // Close the socket.io engine to disconnect existing clients and reject new clients. Don't call
  // io.close() because that closes the underlying HTTP server, which is already done elsewhere.
  // (Closing an HTTP server twice throws an exception.) The `engine` property of socket.io Server
  // objects is undocumented, but I don't see any other way to shut down socket.io without also
  // closing the HTTP server.
  io.engine.close();
  // Closing the socket.io engine should disconnect all clients but it is not documented. Wait for
  // all of the connections to close to make sure, and log the progress so that we can troubleshoot
  // if socket.io's behavior ever changes.
  //
  // Note: `io.sockets.clients()` should not be used here to track the remaining clients.
  // `io.sockets.clients()` works with socket.io 2.x, but not with 3.x: With socket.io 2.x all
  // clients are always added to the default namespace (`io.sockets`) even if they specified a
  // different namespace upon connection, but with socket.io 3.x clients are NOT added to the
  // default namespace if they have specified a different namespace. With socket.io 3.x there does
  // not appear to be a way to get all clients across all namespaces without tracking them
  // ourselves, so that is what we do.
  let lastLogged = 0;
  while (sockets.size > 0) {
    if (Date.now() - lastLogged > 1000) { // Rate limit to avoid filling logs.
      logger.info(`Waiting for ${sockets.size} socket.io clients to disconnect...`);
      lastLogged = Date.now();
    }
    await events.once(socketsEvents, 'updated');
  }
  logger.info('All socket.io clients have disconnected');
};

exports.expressCreateServer = (hookName, args, cb) => {
  // init socket.io and redirect all requests to the MessageHandler
  // there shouldn't be a browser that isn't compatible to all
  // transports in this list at once
  // e.g. XHR is disabled in IE by default, so in IE it should use jsonp-polling
  io = socketio({
    transports: settings.socketTransportProtocols,
  }).listen(args.server, {
    /*
     * Do not set the "io" cookie.
     *
     * The "io" cookie is created by socket.io, and its purpose is to offer an
     * handle to perform load balancing with session stickiness when the library
     * falls back to long polling or below.
     *
     * In Etherpad's case, if an operator needs to load balance, he can use the
     * "express_sid" cookie, and thus "io" is of no use.
     *
     * Moreover, socket.io API does not offer a way of setting the "secure" flag
     * on it, and thus is a liability.
     *
     * Let's simply nuke "io".
     *
     * references:
     *   https://socket.io/docs/using-multiple-nodes/#Sticky-load-balancing
     *   https://github.com/socketio/socket.io/issues/2276#issuecomment-147184662 (not totally true, actually, see above)
     */
    cookie: false,
    maxHttpBufferSize: settings.socketIo.maxHttpBufferSize,
  });

  io.on('connect', (socket) => {
    sockets.add(socket);
    socketsEvents.emit('updated');
    socket.on('disconnect', () => {
      sockets.delete(socket);
      socketsEvents.emit('updated');
    });
  });

  io.use((socket, next) => {
    const req = socket.request;
    // Express sets req.ip but socket.io does not. Replicate Express's behavior here.
    if (req.ip == null) {
      if (settings.trustProxy) {
        req.ip = proxyaddr(req, args.app.get('trust proxy fn'));
      } else {
        req.ip = socket.handshake.address;
      }
    }
    if (!req.headers.cookie) {
      // socketio.js-client on node.js doesn't support cookies (see https://git.io/JU8u9), so the
      // token and express_sid cookies have to be passed via a query parameter for unit tests.
      req.headers.cookie = socket.handshake.query.cookie;
    }
    // See: https://socket.io/docs/faq/#Usage-with-express-session
    express.sessionMiddleware(req, {}, next);
  });

  // var socketIOLogger = log4js.getLogger("socket.io");
  // Debug logging now has to be set at an environment level, this is stupid.
  // https://github.com/Automattic/socket.io/wiki/Migrating-to-1.0
  // This debug logging environment is set in Settings.js

  // minify socket.io javascript
  // Due to a shitty decision by the SocketIO team minification is
  // no longer available, details available at:
  // http://stackoverflow.com/questions/23981741/minify-socket-io-socket-io-js-with-1-0
  // if(settings.minify) io.enable('browser client minification');

  // Initialize the Socket.IO Router
  socketIORouter.setSocketIO(io);
  socketIORouter.addComponent('pad', padMessageHandler);

  hooks.callAll('socketio', {app: args.app, io, server: args.server});

  return cb();
};
