/* NameDialog -- a Javascript load/save library for IF interfaces
 * Designed by Andrew Plotkin <erkyrath@eblong.com>
 * <http://eblong.com/zarf/glk/glkote.html>
 * 
 * This Javascript library is copyright 2017 by Andrew Plotkin.
 * It is distributed under the MIT license; see the "LICENSE" file.
 *
 * This library lets you open a modal dialog box to select a filename for
 * saving or loading data. The web page must have a <div> with id "windowport"
 * (this will be greyed out during the selection process, with the dialog box
 * as a child of the div). It should also have the dialog.css stylesheet
 * loaded.
 *
 * This is an extremely simplified version of the dialog.js which is
 * distributed with GlkOte. This version just prompts for a bare filename and
 * returns it to the caller. It does not interact with localStorage or the
 * local filesystem at all.
 *
 * (This simple behavior makes sense for talking to a RemGlk-based interpreter
 * on the other side of a network connection. We can't know what files are
 * available on the interpreter's end, so we just hand over a filename.)
 *
 * The primary function to call:
 *
 * Dialog.open(tosave, usage, gameid, callback) -- open a file-choosing dialog
 *
 */

/* Put everything inside the Dialog namespace. */

Dialog = function() {

var dialog_el_id = 'dialog';

var is_open = false;
var dialog_callback = null;
var will_save; /* is this a save dialog? */
var cur_usage; /* a string representing the file's category */
var cur_usage_name; /* the file's category as a human-readable string */
var cur_gameid; /* a string representing the game */

/* Dialog.open(tosave, usage, gameid, callback) -- open a file-choosing dialog
 *
 * The "tosave" flag should be true for a save dialog, false for a load
 * dialog.
 *
 * The "usage" and "gameid" arguments are arbitrary strings which describe the
 * file. These filter the list of files displayed; the dialog will only list
 * files that match the arguments. Pass null to either argument (or both) to
 * skip filtering.
 *
 * The "callback" should be a function. This will be called with a fileref
 * argument (see below) when the user selects a file. If the user cancels the
 * selection, the callback will be called with a null argument.
*/
function dialog_open(tosave, usage, gameid, callback) {
    if (is_open)
        throw new Error('Dialog: dialog box is already open.');

    dialog_callback = callback;
    will_save = tosave;
    cur_usage = usage;
    cur_gameid = gameid;
    cur_usage_name = label_for_usage(cur_usage);

    /* Figure out what the root div is called. The dialog box will be
       positioned in this div; also, the div will be greyed out by a 
       translucent rectangle. We use the same default as GlkOte: 
       "windowport". We also try to interrogate GlkOte to see if that
       default has been changed. */
    var root_el_id = 'windowport';
    var iface = window.Game;
    if (window.GlkOte) 
        iface = window.GlkOte.getinterface();
    if (iface && iface.windowport)
        root_el_id = iface.windowport;

    var rootel = $('#'+root_el_id);
    if (!rootel.length)
        throw new Error('Dialog: unable to find root element #' + root_el_id + '.');

    /* Create the grey-out screen. */
    var screen = $('#'+dialog_el_id+'_screen');
    if (!screen.length) {
        screen = $('<div>',
            { id: dialog_el_id+'_screen' });
        rootel.append(screen);
    }

    /* And now, a lot of DOM creation for the dialog box. */

    var frame = $('#'+dialog_el_id+'_frame');
    if (!frame.length) {
        frame = $('<div>',
            { id: dialog_el_id+'_frame' });
        rootel.append(frame);
    }

    var dia = $('#'+dialog_el_id);
    if (dia.length)
        dia.remove();

    dia = $('<div>', { id: dialog_el_id });

    var form, el, row;

    form = $('<form>');
    form.on('submit', evhan_accept_button);
    dia.append(form);

    row = $('<div>', { id: dialog_el_id+'_cap', 'class': 'DiaCaption' });
    if (will_save)
        row.append('Enter a filename to write:');
    else
        row.append('Enter a filename to read:');
    form.append(row);

    row = $('<div>', { id: dialog_el_id+'_input', 'class': 'DiaInput' });
    form.append(row);
    el = $('<input>', { id: dialog_el_id+'_infield', type: 'text', name: 'filename' });
    row.append(el);

    row = $('<div>', { id: dialog_el_id+'_body', 'class': 'DiaBody' });
    form.append(row);

    row = $('<div>', { id: dialog_el_id+'_cap2', 'class': 'DiaCaption' });
    row.hide();
    form.append(row);

    row = $('<div>', { id: dialog_el_id+'_buttonrow', 'class': 'DiaButtons' });
    {
        /* Row of buttons */
        el = $('<button>', { id: dialog_el_id+'_cancel', type: 'button' });
        el.append('Cancel');
        el.on('click', evhan_cancel_button);
        row.append(el);

        el = $('<button>', { id: dialog_el_id+'_accept', type: 'submit' });
        el.append(will_save ? 'Save' : 'Load');
        el.on('click', evhan_accept_button);
        row.append(el);
    }
    form.append(row);

    frame.append(dia);
    is_open = true;

    /* Set the input focus to the input field.

       MSIE is weird about when you can call focus(). The element has just been
       added to the DOM, and MSIE balks at giving it the focus right away. So
       we defer the call until after the javascript context has yielded control
       to the browser. 
    */
    var focusfunc = function() {
        var el = $('#'+dialog_el_id+'_infield');
        if (el.length) 
            el.focus();
    };
    defer_func(focusfunc);
}

/* Close the dialog and remove the grey-out screen.
*/
function dialog_close() {
    var dia = $('#'+dialog_el_id);
    if (dia.length)
        dia.remove();
    var frame = $('#'+dialog_el_id+'_frame');
    if (frame.length)
        frame.remove();
    var screen = $('#'+dialog_el_id+'_screen');
    if (screen.length)
        screen.remove();

    is_open = false;
    dialog_callback = null;
}

/* Pick a human-readable label for the usage. This will be displayed in the
   dialog prompts. (Possibly pluralized, with an "s".) 
*/
function label_for_usage(val) {
    switch (val) {
    case 'data': 
        return 'data file';
    case 'save': 
        return 'save file';
    case 'transcript': 
        return 'transcript';
    case 'command': 
        return 'command script';
    default:
        return 'file';
    }
}

/* Decide whether a given file is likely to contain text data. 
   ### really this should rely on a text/binary metadata field.
*/
function usage_is_textual(val) {
    return (val == 'transcript' || val == 'command');
}

/* Run a function (no arguments) "soon". */
function defer_func(func)
{
  return window.setTimeout(func, 0.01*1000);
}

/* Event handler: The "Save" or "Load" button.
*/
function evhan_accept_button(ev) {
    ev.preventDefault();
    if (!is_open)
        return false;

    //GlkOte.log('### accept save');
    var fel = $('#'+dialog_el_id+'_infield');
    if (!fel.length)
        return false;
    var filename = fel.val();
    filename = jQuery.trim(filename);
    if (!filename.length)
        return false;

    var callback = dialog_callback;
    //GlkOte.log('### selected ' + filename);
    dialog_close();
    if (callback)
        callback(filename);

    return false;
}

/* Event handler: The "Cancel" button.
*/
function evhan_cancel_button(ev) {
    ev.preventDefault();
    if (!is_open)
        return false;

    var callback = dialog_callback;
    //GlkOte.log('### cancel');
    dialog_close();
    if (callback)
        callback(null);

    return false;
}


/* End of Dialog namespace function. Return the object which will
   become the Dialog global. */
return {
    open: dialog_open
};

}();

/* End of Dialog library. */
