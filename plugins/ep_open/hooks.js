'use strict';

const fs = require('fs');
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const validator = require('express-validator');
const api = require('./api');
const socketio = require('./api/common/socketio');
const cookieParser = require('ep_etherpad-lite/node_modules/cookie-parser');
const settings = require('ep_etherpad-lite/node/utils/Settings');

exports.expressCreateServer = function(hookName, args) {
    const { app } = args;

    app.use(helmet());
    app.use(bodyParser.json({ limit: '50mb' }));
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(validator());
    app.use(cookieParser(settings.sessionKey, {}));
    app.use(express.static(__dirname + '/static'));

    app.use('/api', api);
    app.get('/', indexPageHandler);

    socketio.init(args.server);

    // Add handler for all other client-side pages with timeout, to be sure that etherpad middlewares are applied and
    // none of them will be overridden
    setTimeout(() => app.use(indexPageHandler));

    function indexPageHandler(request, response) {
        response.send(fs.readFileSync(path.resolve(__dirname, './index.html'), 'utf-8'));
    }
};