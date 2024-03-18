'use strict';
import {ArgsExpressType} from "../../types/ArgsExpressType";
import path from "path";
import fs from "fs";

const settings = require('ep_etherpad-lite/node/utils/Settings');

const ADMIN_PATH = path.join(settings.root, 'src', 'templates', 'admin');

/**
 * Add the admin navigation link
 * @param hookName {String} the name of the hook
 * @param args {Object} the object containing the arguments
 * @param {Function} cb  the callback function
 * @return {*}
 */
exports.expressCreateServer = (hookName: string, args: ArgsExpressType, cb: Function): any => {
    args.app.register((instance, opts, next) => {
        instance.register(require('@fastify/static'), {
            root: ADMIN_PATH,
            prefix: '/', // optional: default '/'
            constraints: {} // optional: default {}
        })
        instance.setNotFoundHandler((req, res) => {
            const index = path.join(ADMIN_PATH, 'index.html');
            const file = fs.readFileSync(index, 'utf8')
            res.type('text/html').send(file);
        })
        next()
    }, {
        prefix: '/admin'
    })
    return cb();
};
