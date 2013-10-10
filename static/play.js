
var generation = 0;

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
    console.log('### success: ' + data.type);
    GlkOte.update(data);
}

Game = {
    accept: accept,
};

/* The page-ready handler. Like onload(), but better, I'm told. */
$(document).ready(function() {
    GlkOte.init();
});


