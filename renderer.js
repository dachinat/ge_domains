"use strict";

window.$ = window.jQuery = require('jquery');

// Seconds to keep records in memory
const SEC_LIMIT = 120;

const {clipboard} = require('electron')
const remote = require('electron').remote;
const BrowserWindow = remote.BrowserWindow;
const ipc = require('electron').ipcRenderer
const os = require('os');
const storage = require('electron-json-storage');
const {Menu} = remote;

storage.setDataPath(os.tmpdir() + '/ge_domains');
// When enter key is pressed in input
$(document).on('keypress', 'section input',function(e){
    if (e.keyCode == 13) {
        if ($(this).val().length < 2 || !/^[A-Za-z0-9\-\.]+$/.test($(this).val())) {
            return;
        }
        original_input.clone().val('').appendTo($(this).parent().parent()).wrap('<div class="domain-container"/>').after('<span/>').focus();
        checkDomain($(this));
    }
});

$(document).on('keyup','section input',function(e){
    // When backspace is pressed in input
    if (e.keyCode == 8) {
        // When caret is in the beginning of input
        if ($(this).get(0).selectionStart === 0) {

            // Focus on previous input
            $(this).parent().prev().find('input').focus();

            // Delete surrunding divs for all except first input
            if ($(this).val() == '' && $($(this).parent().parent().children()).length > 1) {
                $(this).parent().remove();
            }
            // When caret is in the end of input
        } else if ($(this).get(0).selectionStart === $(this).val().length) {
            // Clear status
            $(this).next().text('');
        }
        // When up-key is pressed in input
    } else if (e.keyCode == 38) {
        // Focus on parent input
        $(this).parent().prev().find('input').focus();
        // When down-key is pressed in input
    } else if (e.keyCode == 40) {
        // Focus on child input
        $(this).parent().next().find('input').focus();
    }
});

// Focus on input on nearby clicks
$(document).on('click', 'section, section div', function(e) {
    if (e.target !== this) {
        return;
    }

    $(this).find('input').last().focus();
});

// Domain check function
var store = {}
function checkDomain(input) {
    var domain = input.val();

    if (domain.length < 2) {
        return;
    }

    var match = domain.match(/(.+)\.ge$/)
    if (match !== null) {
        domain = match[1];
    }

    if (store.hasOwnProperty(domain)) {
        var now = new Date().getTime();

        if (Math.floor((now - store[domain][0]) / 1000) <= SEC_LIMIT) {
            input.next().html(store[domain][1]);
            return;
        }
        delete store[domain];
    }

    input.next().text('მოწმდება...')

    // $.ajax({
    //     url: 'http://nic.net.ge/Home/DomainCheck',
    //     type: 'post',
    //     data: {
    //         'Domain': domain,
    //         'TopLevelDomain': '.ge'
    //     },
    //     headers: {
    //         'X-Requested-With': 'XMLHttpRequest'
    //     },
    //     success: function (data, textStatus, jqXHR) {
    //         var msg = /დაკავებულია/.test(data['Data']) ?
    //             '<span class="text-red">დაკავებულია</span>' : /არასწორი დომენური სახელი/.test(data['Data']) ?
    //                 '<span class="text-red">სახელი არასწორია</span>' : '<span class="text-blue">თავისუფალია</span>';
    //
    //         input.next().html(msg);
    //
    //         store[domain] = [+new Date(), msg];
    //     }
    // });
}

// When check button is clicked
$('#check').on('click', function(){
    var check = 0;
    $('input').each(function(i, el){
        if ($(el).val().length < 2) {
            return;
        }

        $(this).next().remove();
        $(this).after('<span></span>');

        checkDomain($(el));
        check = 1;
    });
    if (check === 0) {
        ipc.send('open-error-dialog-check')
    }
});

// When copy button is clicked
$(document).on('click','#copy', function(e){
    var text = copy('input');

    if (text.length == 0) {
        // Show dialogs only on direct click
        if (e.originalEvent) {
            ipc.send('open-error-dialog-copy');
        }
        return;
    }

    clipboard.writeText(text);

    if (e.originalEvent) {
        ipc.send('open-message-dialog-copy');
    }
});

// When paste button is clicked
$(document).on('click', '#paste', function(){
    var domains = clipboard.readText().match(/[a-zA-Z0-9\-\.]+\.ge/g)

    if (domains === null || domains.length == 0) {
        return;
    }

    $('section').text('');
    $.each(domains, function(i, v) {
        var input = original_input.clone().val(v).appendTo('section').wrap('<div class="domain-container"/>').after('<span/>');
        setInputWidth(input);
    });
});

// When clear button is clicked

$('#clear').click(function(){
    $('section').text('');
    original_input.clone().val('').appendTo('section').wrap('<div class="domain-container"/>').after('<span/>').focus();
});

// When history butotn is clciked
$('[data-toggle=history]').click(function(){
    storage.getAll(function(error, data) {
        if (error) throw error;
        if ($.isEmptyObject(data)) {
            ipc.send('open-error-dialog-history')
        } else {
            var win = new BrowserWindow({
                parent: remote.getCurrentWindow(),
                modal: true,
                width: 300,
                height: 535,
                show: false,
                backgroundColor: '#fffff'
            });

            win.loadURL('file://' + __dirname + '/history.html')
            win.once('ready-to-show', () => {
                win.show()
                win.focus()
            });
        }
    });
});

// When child window sends selected version
ipc.on('load-version', function(arg, val) {
    storage.get(val, function(error, data) {
        if (error) throw error;

        data = JSON.parse(data);

        if ($.isEmptyObject(data)) {
            return;
        }

        $('section').text('');
        $.each(data, function(i, v) {
            var input = original_input.clone().val(v).appendTo('section').wrap('<div class="domain-container"/>').after('<span/>');

            setInputWidth(input);
        });
    });
});

// When save butotn is clicked
$('#save').on('click', function(e){
    var all = Array.from($('input').filter((i, el) => $(el).val().length > 1).map((i, el) => $(el).val()));
    if (all.length == 0) {
        ipc.send('open-error-dialog-save');
        return;
    }

    var json = JSON.stringify(all);

    var date = new Date();
    date = [
        '0' + date.getDate(),
        '0' + (date.getMonth() + 1),
        '' + date.getFullYear(),
        '0' + date.getHours(),
        '0' + date.getMinutes(),
        '0' + date.getSeconds()
    ].map(component => component.slice(-2));

    date = date.slice(0, 3).join('-') + ' ' + date.slice(3).join(':');

    storage.set('' + date, json);

    ipc.send('open-message-dialog-save');

    e.preventDefault();
});

// Keyboard shortcuts

function remove() {
    if ($('section input.txt-selected').length == 0) {
        return;
    }

    var parent = $('section input.txt-selected').first().parent().prev().find("input").first();

    if ($('section input.txt-selected').length == $('section input').length) {
        $('section input.txt-selected').parent().not(':first').remove();
        $('section input').val('').focus();
    } else {
        $('section input.txt-selected').parent().remove();

        if (parent.length == 0) {
            $('section input').focus();
        } else {
            parent.focus();
        }
    }
}

function copy(input) {
    return Array.from(
        $(input).filter(
            (i, el) => $(el).val().length > 1
        ).map(
            (i, el) => {
                var domain = $(el).val();
                if (!/.+\.ge$/.test(domain)) {
                    domain += '.ge';
                }

                var status = $(el).next().text()
                domain += (status.length > 0) ? ' (' + status + ')' : '';
                return domain;
            }
        )
    ).join("\n");
}

function paste(domains, current) {
    $.each(domains, function(i, v) {
        var input = $(original_input.clone().val(v));

        input = $(input).after("<p>test</p>");

        console.log(input);

        console.log(input[0]);

        $(current).parent().after($('<div class="domain-container"/>').html($(input)).append("<span/>"));

        setInputWidth($(current).parent().next().find("input"));
    });
}

$(document).on('keydown', function(e){
    // ctrl|cmd
    if (e.keyCode == 91 || e.keyCode == 17) {
        return;
    }

    // backspace
    if (e.keyCode == 8 || e.keyCode == 46) {
        remove();
    }

    // ctrl+c
    if ((e.ctrlKey || e.metaKey) && e.keyCode == 67) {
        if ($('input.txt-selected').length == 0) {
            return;
        }

        var text = copy('input.txt-selected');

        if (text.length == 0) {
            return;
        }

        clipboard.writeText(text);

        e.preventDefault();
    }

    // ctrl+v
    if ((e.ctrlKey || e.metaKey) && e.keyCode == 86) {
        if ($('input.txt-selected').length == 0) {
            return;
        }

        e.preventDefault();

        var domains = clipboard.readText().match(/[a-zA-Z0-9\-\.]+\.ge/g)
        if (domains === null || domains.length == 0) {
            return;
        }

        remove();
        paste(domains, $('input:focus'));
    }

    // ctrl+x
    if ((e.ctrlKey || e.metaKey) && e.keyCode == 88) {
        var text = copy('input.txt-selected');

        if (text.length == 0) {
            return;
        }

        clipboard.writeText(text);
        remove();
    }


    if ((e.ctrlKey || e.metaKey) && e.keyCode == 65) {
        $('section input').addClass('txt-selected');
    } else {
        $('section input').removeClass('txt-selected');
    }
});

/*var ctrlA = false;

$(document).on('keydown', 'section input', function(e){
    // only cmd|ctrl
    if (e.keyCode == 91 || e.keyCode == 17) {
        return;
    }

    // Ctrl|cmd+a
    if ((e.ctrlKey || e.metaKey) && e.keyCode == 65) {
        console.log('activate ctrl|cmd+a');
        ctrlA = true;

        $('section input').addClass('txt-selected');

        return;
    }

    // Backspace, delete
    if ((e.keyCode == 8 || e.keyCode == 46) && ctrlA) {
        // var parent = $('section input.txt-selected').first().parent().prev().find("input").first()
        // $('section input.txt-selected').parent().remove();
        // e.preventDefault();
        // parent.focus();
        $('section div:not(:first)').remove();
        $('section input').val('').focus();
    } else if (((e.ctrlKey || e.metaKey) && e.keyCode == 67) && ctrlA) { // Ctrl|cmd+c
        e.preventDefault();
        $('#copy').trigger('click');
        console.log('copy');
    } else if (((e.ctrlKey || e.metaKey) && e.keyCode == 86) && ctrlA) { // Ctrl|cmd+v
        $('#paste').trigger('click');
        console.log('paste');
    } else if (((e.ctrlKey || e.metaKey) && e.keyCode == 88) && ctrlA) { // Ctrl|cmd+x
        e.preventDefault();
        $('#copy').trigger('click');
        $('section div:not(:first)').remove();
        $('section input').val('').focus();
    } else if (ctrlA) { // any other
        // If non-special key is pressed
        var char = String.fromCharCode(event.keyCode);
        if (char.match(/(\w|\s)/g)) {
            $('section div:not(:first)').remove();
            $('section input').val(char).focus();
        }
    }

    $('section input').removeClass('txt-selected');
    ctrlA = false;
});*/


// + mouse

var ds = new DragSelect({
    selectables: document.getElementsByClassName("domain-container"),
    customStyles: true,
    onDragStart: function() {
        $('section input').removeClass('txt-selected ds');
        ds.addSelectables(document.getElementsByClassName('domain-container'));
    },
    onDragMove: function(elements) {
        $('section input').removeClass('txt-selected ds');
        var selection = ds.getSelection()
        if (selection.length > 1) {
            $(selection).each(function(el){
                $(this).find("input").addClass('txt-selected ds');
            });
        }
    }
});

// Function to set input width relative to length
function setInputWidth(input) {
    $(input).css('width', (($(input).val().length + 1) * 9.7) + 'px');
}
$(document).on('keydown','section input',function(e){
    setInputWidth($(this));
});

// Store original input state
// Focus on ready
var original_input;
$(document).ready(function(){
    $('input').focus();
    original_input = $('input')
});

// Context menus

window.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    var mainMenu = Menu.getApplicationMenu().items.filter(function(item){
        return item.label == "Edit";
    })[0].submenu;
    mainMenu.popup(remote.getCurrentWindow());
}, false);