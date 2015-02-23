/*
  Client-side code for Transcript-IF Repeater demo.

  Written by Andrew Plotkin. This script is in the public domain.
 */

var websocket = null;
var connected = false;
var updates = [];

function accept(arg) {
    if (arg.type == 'init') {
        try {
            var url = 'ws://' + window.location.host + '/websocket';
            websocket = new WebSocket(url);
        }
        catch (ex) {
            GlkOte.error('The connection to the server could not be created. Possibly your browser does not support WebSockets.');
            return;
        }
        
        websocket.onopen = evhan_websocket_open;
        websocket.onclose = evhan_websocket_close;
        websocket.onmessage = evhan_websocket_message;
    }

    var data = {
        type:'update', gen:1
    };

    GlkOte.update(data);
};

function evhan_websocket_open() {
    connected = true;
}

function evhan_websocket_close() {
    websocket = null;
    connected = false;

    GlkOte.error('The connection to the server was lost.');
}

function evhan_websocket_message(ev) {
    GlkOte.log('### message ' + ev);
}

Game = {
    accept: accept,
};

/* The page-ready handler. Like onload(), but better, I'm told. */
$(document).ready(function() {
    GlkOte.init();
});


