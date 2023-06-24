import "./vendors/jquery.js";
import * as padUtils from "./pad_utils.js";
import * as hooks from "./pluginfw/hooks.js";
import * as socketio from "./socketio.js";
import { loadBroadcastRevisionsJS } from "./broadcast_revisions.js";
import { padimpexp } from "./pad_impexp.js";
'use strict';
const Cookies = { Cookies: padUtils }.Cookies;
const randomString = { randomString: padUtils }.randomString;
const padutils = { padutils: padUtils }.padutils;
let token, padId, exportLinks, socket, changesetLoader, BroadcastSlider;
const init = () => {
    padutils.setupGlobalExceptionHandler();
    $(document).ready(() => {
        // start the custom js
        if (typeof customStart === 'function')
            customStart(); // eslint-disable-line no-undef
        // get the padId out of the url
        const urlParts = document.location.pathname.split('/');
        padId = decodeURIComponent(urlParts[urlParts.length - 2]);
        // set the title
        document.title = `${padId.replace(/_+/g, ' ')} | ${document.title}`;
        // ensure we have a token
        token = Cookies.get('token');
        if (token == null) {
            token = `t.${randomString()}`;
            Cookies.set('token', token, { expires: 60 });
        }
        socket = socketio.connect(exports.baseURL, '/', { query: { padId } });
        // send the ready message once we're connected
        socket.on('connect', () => {
            sendSocketMsg('CLIENT_READY', {});
        });
        socket.on('disconnect', (reason) => {
            BroadcastSlider.showReconnectUI();
            // The socket.io client will automatically try to reconnect for all reasons other than "io
            // server disconnect".
            if (reason === 'io server disconnect')
                socket.connect();
        });
        // route the incoming messages
        socket.on('message', (message) => {
            if (message.type === 'CLIENT_VARS') {
                handleClientVars(message);
            }
            else if (message.accessStatus) {
                $('body').html('<h2>You have no permission to access this pad</h2>');
            }
            else if (message.type === 'CHANGESET_REQ' || message.type === 'COLLABROOM') {
                changesetLoader.handleMessageFromServer(message);
            }
        });
        // get all the export links
        exportLinks = $('#export > .exportlink');
        $('button#forcereconnect').click(() => {
            window.location.reload();
        });
        socket; // make the socket available
        BroadcastSlider; // Make the slider available
        hooks.aCallAll('postTimesliderInit');
    });
};
// sends a message over the socket
const sendSocketMsg = (type, data) => {
    socket.json.send({
        component: 'pad',
        type,
        data,
        padId,
        token,
        sessionID: Cookies.get('sessionID'),
    });
};
const fireWhenAllScriptsAreLoaded = [];
const handleClientVars = (message) => {
    // save the client Vars
    window.clientVars = message.data;
    if (window.clientVars.sessionRefreshInterval) {
        const ping = () => $.ajax('../../_extendExpressSessionLifetime', { method: 'PUT' }).catch(() => { });
        setInterval(ping, window.clientVars.sessionRefreshInterval);
    }
    // load all script that doesn't work without the clientVars
    BroadcastSlider = require('./broadcast_slider')
        .loadBroadcastSliderJS(fireWhenAllScriptsAreLoaded);
    ({ loadBroadcastRevisionsJS }.loadBroadcastRevisionsJS());
    changesetLoader = require('./broadcast')
        .loadBroadcastJS(socket, sendSocketMsg, fireWhenAllScriptsAreLoaded, BroadcastSlider);
    // initialize export ui
    ({ padimpexp }.padimpexp.init());
    // Create a base URI used for timeslider exports
    const baseURI = document.location.pathname;
    // change export urls when the slider moves
    BroadcastSlider.onSlider((revno) => {
        // exportLinks is a jQuery Array, so .each is allowed.
        exportLinks.each(function () {
            // Modified from regular expression to fix:
            // https://github.com/ether/etherpad-lite/issues/4071
            // Where a padId that was numeric would create the wrong export link
            if (this.href) {
                const type = this.href.split('export/')[1];
                let href = baseURI.split('timeslider')[0];
                href += `${revno}/export/${type}`;
                this.setAttribute('href', href);
            }
        });
    });
    // fire all start functions of these scripts, formerly fired with window.load
    for (let i = 0; i < fireWhenAllScriptsAreLoaded.length; i++) {
        fireWhenAllScriptsAreLoaded[i]();
    }
    $('#ui-slider-handle').css('left', $('#ui-slider-bar').width() - 2);
    // Translate some strings where we only want to set the title not the actual values
    $('#playpause_button_icon').attr('title', html10n.get('timeslider.playPause'));
    $('#leftstep').attr('title', html10n.get('timeslider.backRevision'));
    $('#rightstep').attr('title', html10n.get('timeslider.forwardRevision'));
    // font family change
    $('#viewfontmenu').change(function () {
        $('#innerdocbody').css('font-family', $(this).val() || '');
    });
};
export const baseURL = '';
export { init as socket };
export { init as BroadcastSlider };
export { init };
