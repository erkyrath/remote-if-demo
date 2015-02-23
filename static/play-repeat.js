/*
  Client-side code for Transcript-IF Repeater demo.

  Written by Andrew Plotkin. This script is in the public domain.
 */

var websocket = null;
var connected = false;
var updates = [];
var generation = 1;

function accept(arg) {
    if (arg.type == 'init') {
        try {
            var url = 'ws://' + window.location.host + '/websocket/' + sessionid;
            websocket = new WebSocket(url);
        }
        catch (ex) {
            GlkOte.error('The connection to the server could not be created. Possibly your browser does not support WebSockets.');
            return;
        }
        
        websocket.onopen = evhan_websocket_open;
        websocket.onclose = evhan_websocket_close;
        websocket.onmessage = evhan_websocket_message;

        var data = {
            type:'update', gen:generation
        };
        generation++;
        GlkOte.update(data);
        return;
    }

    if (arg.type == 'external' && arg.value == 'websocket') {
        if (updates.length == 0) {
            GlkOte.log('websocket event, but no updates');
            return;
        }

        while (updates.length) {
            var data = updates.shift();
            data.gen = generation;
            generation++;
            GlkOte.update(data);
        }
        return;
    }
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
    try {
        var obj = JSON.parse(ev.data);
        updates.push(obj);
        GlkOte.extevent('websocket');
    }
    catch (ex) {
        GlkOte.log('badly-formatted message from websocket: ' + ev.data);
        return;
    }
}

Game = {
    accept: accept,
};

/* The page-ready handler. Like onload(), but better, I'm told. */
$(document).ready(function() {
    GlkOte.init();
});


