
var generation = 0;

function accept(arg) {
    $.ajax({
            type: 'POST',
            url: '/play',
            data: JSON.stringify(arg),
            complete: callback
        });
};

function callback(jqxhr, status) {
    console.log('### callback: ' + status);
};

Game = {
    accept: accept,
};

/* The page-ready handler. Like onload(), but better, I'm told. */
$(document).ready(function() {
    GlkOte.init();
});


