/*
  Client-side code for Remote-IF demo (AJAX version).

  Written by Andrew Plotkin. This script is in the public domain.
 */

function accept(arg) {
    $.ajax({
        type: 'POST',
        url: '/play',
        data: JSON.stringify(arg),
        dataType: 'json',
        success: callback_success,
        error: callback_error
    });
};

function callback_error(jqxhr, status, error) {
    var msg = status;
    if (error)
        msg = msg + ': ' + error;
    GlkOte.error('Server error: ' + msg);
};

function callback_success(data, status, jqxhr) {
    GlkOte.update(data);
}

Game = {
    accept: accept,
    spacing: 4
};

/* The page-ready handler. Like onload(), but better, I'm told. */
$(document).ready(function() {
    if (use_gidebug) {
        Game.debug_commands = true;
        Game.debug_console_open = true;
    }
    GlkOte.init();
});


