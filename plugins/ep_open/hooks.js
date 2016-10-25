'use strict';

const fs = require('fs');
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const validator = require('express-validator');
const config = require('./config');
const api = require('./api');

exports.expressCreateServer = function(hook_name, args, cb) {
    const { app } = args;

    app.use(helmet());
    app.use(bodyParser.json({ limit: '50mb' }));
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(validator());
    app.use(express.static(__dirname + '/static'));

    app.use('/api', api);
    app.get('/', indexPageHandler);

    // Add handler for all other client-side pages with timeout, to be sure that etherpad middlewares are applied and
    // none of them will be overridden
    setTimeout(() => app.use(indexPageHandler));

    function indexPageHandler(request, response, next) {
        response.send(fs.readFileSync(path.resolve(__dirname, './index.html'), 'utf-8'));
    }
};