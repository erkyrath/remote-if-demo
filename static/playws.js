/*
  Client-side code for Remote-IF demo (websocket version).

  Written by Andrew Plotkin. This script is in the public domain.
 */

var websocket = null;
var connected = false;

function accept(arg) {
    var val = JSON.stringify(arg);
    websocket.send(val);
}

function open_websocket() {
    try {
        /* If this is an https: URL, we'd want to use wss: instead of wd: */
        var url = 'ws://' + window.location.host + '/websocket';
        GlkOte.log('Creating websocket: ' + url);
        websocket = new WebSocket(url);
    }
    catch (ex) {
        GlkOte.error('Unable to open websocket: ' + ex);
        return;
    }

    websocket.onopen = callback_websocket_open;
    websocket.onclose = callback_websocket_close;
    websocket.onmessage = callback_websocket_message;
}

function callback_websocket_open() {
    connected = true;
    GlkOte.init();
}

function callback_websocket_close(ev) {
    websocket = null;
    connected = false;

    GlkOte.error('Websocket has closed: (' + ev.code + ',' + ev.reason + ')');
}

function callback_websocket_message(ev) {
    var obj = JSON.parse(ev.data);
    GlkOte.update(obj);
}


Game = {
    accept: accept,
};

/* The page-ready handler. Like onload(), but better, I'm told. */
$(document).ready(function() {
    if (use_gidebug) {
        Game.debug_commands = true;
        Game.debug_console_open = true;
    }
    open_websocket();
});


