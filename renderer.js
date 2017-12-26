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
const pkg = require('./package.json');

storage.setDataPath(os.tmpdir() + '/ge_domains');

// Add verison
$('#version').text('v' + pkg.version);

// When enter key is pressed in input
$(document).on('keypress', 'section input',function(e){
    if (e.keyCode == 13) {
        if ($(this).val().length < 2 || !/^[A-Za-z0-9\-\.]+$/.test($(this).val())) {
            return;
        }
        //original_input.clone().removeClass("txt-selected").val('').appendTo($(this).parent().parent()).wrap('<div class="domain-container"/>').after('<span/>').focus();

        var input = $(original_input.clone().removeClass("txt-selected").val(''));
        input = $(input);
        var new_container = $('<div class="domain-container"/>').html($(input)).append("<span/>");
        $(this).parent().after(new_container);
        $(input).focus();

        remove();

        checkDomain($(this));
    }
});

let firstBackspace = false;

// Fix for "enter (to create new input) and backspace to go to previous input [needed double backspace]"
$(document).on('keydown','section input',function(e){
    if (e.keyCode == 8) {
        if ($(this).get(0).selectionStart === 0) {
            firstBackspace = true;
        }
    } else {
        firstBackspace = false;
    }
});

$(document).on('keyup','section input',function(e){
    // When backspace is pressed in input
    if (e.keyCode == 8) {
        // When caret is in the beginning of input
        if ($(this).get(0).selectionStart === 0) {
            if (firstBackspace === false) {
                firstBackspace = true;
                return;
            }

            // Focus on previous input
            if ($(this).parent().prev().find('input').length > 0) {
                $(this).parent().prev().find('input').focus();
            } else {
                // Fix when second input with empty value exists
                $("section input:eq(1)").focus();
            }

            // Delete surrunding divs for all except first input
            if ($(this).val() == '' && $($(this).parent().parent().children()).length > 2) { // 2 for ds.selectable
                $(this).parent().remove();
            }

            firstBackspace = false;
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

            storage.get('favorites', function (error, data)  {
                if (data.length > 0) {
                    if (data.includes(store[domain][2])) {
                        $('[status-for='+domain+']').find('.fav').trigger('mouseover').data('lock', true);
                    }
                }
            });

            return;
        }
        delete store[domain];
    }

    input.next().text('მოწმდება...')

    $.ajax({
        url: 'http://nic.net.ge/Home/DomainCheck',
        type: 'post',
        data: {
            'Domain': domain,
            'TopLevelDomain': '.ge'
        },
        headers: {
            'X-Requested-With': 'XMLHttpRequest'
        },
        success: function (data, textStatus, jqXHR) {
            var star = '&nbsp;<a class="fav" href="#"><i class="fa fa-star-o"></i></a>';

            var msg = /დაკავებულია/.test(data['Data']) ?
                '<span class="text-red">დაკავებულია <a class="info" href="#"><i class="fa fa-info-circle"></i></a>' +
                star + '<span class="i" style="display:none;">' +
                domain + '.ge<br/><br/>' + $(data['Data']).find("div.info").html() + '</span></span>' :
                    /არასწორი/.test(data['Data']) ?
                        '<span class="text-red">არასწორია</span>' : '<span class="text-blue">თავისუფალია' +
                        star + '</span>';

            msg = '<span class="status-for" status-for="'+domain+'">' + msg + '</span>';

            input.next().html(msg);

            storage.get('favorites', function (error, data)  {
                if (data.length > 0) {
                    if (data.includes(domain)) {
                       $('[status-for='+domain+']').find('.fav').trigger('mouseover').data('lock', true);
                    }
                }
            });

            store[domain] = [+new Date(), msg, domain];
        }
    });
}

// Fav icon

$(document).on('mouseover', '.fav', function(){
   $(this).find('.fa').removeClass('fa-star-o').addClass('fa-star');
});
$(document).on('mouseout', '.fav', function(){
    if ($(this).data('lock') == true) {
        return;
    }
    $(this).find('.fa').removeClass('fa-star').addClass('fa-star-o');
});
$(document).on('click', '.fav', function(){
    var domain = $(this).closest('.status-for').attr('status-for');
    var domains = $('[status-for='+domain+']');

    storage.get('favorites', function(error, data){
        data = Array.from(data);

        if (data.includes(domain)) {
            data = data.filter(e => e !== domain);

            $(domains).each(function(i, e){
                $(e).find('.fav').data('lock', false);
                $(e).find('.fav').trigger('mouseout');
            });
        } else {
            data.push(domain);

            $(domains).each(function(i, e){
                $(e).find('.fav').data('lock', true);
                $(e).find('.fav').trigger('mouseover');
            });
        }
        storage.set('favorites', data);
    });
});

// When info button is pressed
$(document).on('click','.info',function(e){
    e.preventDefault();

    var infoWindow = new BrowserWindow({
        parent: remote.getCurrentWindow(),
        modal: true,
        width: 400,
        height: 500,
        show: false,
        backgroundColor: '#fffff',
        resizable: false,
        maximizable: false,
        fullscreenable: false,
        minimizable: false
    });
    //infoWindow.webContents.openDevTools()

    infoWindow.setMenu(null);

    infoWindow.loadURL('file://' + __dirname + '/info.html')

    infoWindow.once('ready-to-show', () => {
        infoWindow.show()
        infoWindow.focus()

        infoWindow.webContents.send('show-info', $(this).parent().find('.i').html());

    });
});

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
    var e = $.Event('keydown');
    e.keyCode = 86;
    e.ctrlKey = true;

    $('section input').addClass('txt-selected');
    $('section input.txt-selected').first().trigger(e);
});

// When clear button is clicked

$('#clear').click(function(){
    var e = $.Event('keydown');
    e.keyCode = 46;

    $('section input').addClass('txt-selected');
    $('section input.txt-selected').first().trigger(e);
});

// When history butotn is clciked
$('[data-toggle=history]').click(function(){
    storage.getAll(function(error, data) {
        if (error) throw error;
        if ($.isEmptyObject(data) || (Object.keys(data).length == 1 && data.hasOwnProperty("favorites"))) {
            ipc.send('open-error-dialog-history')
        } else {
            var win = new BrowserWindow({
                parent: remote.getCurrentWindow(),
                modal: true,
                width: 300,
                height: 535,
                show: false,
                backgroundColor: '#fffff',
                resizable: false,
                maximizable: false,
                fullscreenable: false,
                minimizable: false
            });
            win.setMenu(null);
            //win.webContents.openDevTools();

            win.loadURL('file://' + __dirname + '/history.html')
            win.once('ready-to-show', () => {
                win.show()
                win.focus()
            });
        }
    });
});

function replaceRecords(data, callback=null) {
    if ($.isEmptyObject(data)) {
        return;
    }

    $('section').find(".domain-container:not(:first)").remove();
    $.each(data, function(i, v) {
        var input = original_input.clone().removeClass("txt-selected").val(v).appendTo('section').wrap('<div class="domain-container"/>').after('<span/>');
        if (callback) {
            callback(v, input);
        }
    });

    $('section').find('input').focus();
    $('section').find(".domain-container:first").remove();
}

// When find window sends query
ipc.on('find-query', function(arg, val){
    var found, focused;
    $("input.txt-found").removeClass('txt-found');
    $("section input").each(function(i, el){
       if ($(el).val() == val) {
           if (focused !== 1) {
               $(el).focus();
           }
           $(el).addClass('txt-found');
           found = 1;
           focused = 1;
           return;
       } else if ((i + 1) == $("section input").length && found !== 1) {
           $("section input").each(function(i2, el2){
               if ($(el2).val().indexOf(val) !== -1) {
                   $(el2).addClass('txt-found');
                   if (focused !== 1) {
                       $(el2).focus();
                   }
                   focused = 1;
                   return;
               }
           })
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

        replaceRecords(data);
    });
});

// When favorites button is clicked
$('#favorites').on('click', function(e){
   storage.get('favorites', function(error, data) {
      if (error) throw error;

      replaceRecords(data, function(domain, input){
        $(input).parent().find("span").html('<span class="status-for" status-for="'+domain+'">' +
            '&nbsp;<a class="fav" href="#"><i class="fa fa-star"></i></a>' +
            '</span>');

        $(input).parent().find(".fav").data("lock", true);
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
        $('section input').val('').focus().next().text('');
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

                var status = $(el).next().text();

                var match = status.match(/\S+/)
                if (match !== null) {
                    status = match[0];
                }

                domain += (status.length > 0) ? ' (' + status + ')' : '';
                return domain;
            }
        )
    ).join("\n");
}

$(document).on('keydown', function(e){
    // ctrl|cmd
    if (e.keyCode == 91 || e.keyCode == 17) {
        return;
    }

    // backspace
    if (e.keyCode == 8 || e.keyCode == 46) {
        if ($('input.txt-selected').length > 0) {
            e.preventDefault();
            remove();
        }
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
        var text = clipboard.readText();

        if (/\n/.test(text)) {
            e.preventDefault();
        } else {
            return;
        }

        var domains = text.match(/[a-zA-Z0-9\-\.]+\.ge/g)
        if (domains === null || domains.length == 0) {
            return;
        }

        var txtSelected = $("section input.txt-selected");

        if ($(txtSelected).length == 0) {
           //domains = domains.reverse();
        }

        // paste func
        $.each(domains, function(i, v) {
            var input = $(original_input.clone().removeClass("txt-selected").val(v));

            input = $(input);

            var new_container = $('<div class="domain-container"/>').html($(input)).append("<span/>");

            if ($(txtSelected).length > 0) {
                var el = $(txtSelected).first().parent().prev();
                if ($(el).length > 0) {
                    $(el).after(new_container);
                } else {
                    $("section input").first().parent().before(new_container);
                }
            } else {
                $("input:focus").parent().after(new_container);
            }

            $(input).focus();
        });

        remove();
    }

    // ctrl+x
    if ((e.ctrlKey || e.metaKey) && e.keyCode == 88) {
        if ($('input.txt-selected').length == 0) {
            return;
        }

        var text = copy('input.txt-selected');

        if (text.length == 0) {
            return;
        }

        clipboard.writeText(text);
        remove();
    }

    // ctrl+f
    if ((e.ctrlKey || e.metaKey) && e.keyCode == 70) {
        var findWindow = new BrowserWindow({
            parent: remote.getCurrentWindow(),
            modal: true,
            width: 350,
            height: 245,
            show: false,
            backgroundColor: '#fffff',
            resizable: false,
            maximizable: false,
            fullscreenable: false,
            minimizable: false
        });
        //findWindow.webContents.openDevTools()

        findWindow.setMenu(null);

        findWindow.loadURL('file://' + __dirname + '/find.html')

        findWindow.once('ready-to-show', () => {
            findWindow.show()
            findWindow.focus()
        });
    }

    // chars
    var char = String.fromCharCode(event.keyCode);
    if (char.match(/(\w|\s)/g) && !(e.ctrlKey || e.metaKey)) {
        if ($('input.txt-selected').length == 0) {
            return;
        }

        var prev = $("section input.txt-selected").first().parent().prev();

        remove();

        var input = $(original_input).clone().val('');
        input = $(input);

        var new_container = $('<div class="domain-container"/>').html(input).append("<span/>")

        if (prev.length > 0) {
            $(prev).after(new_container);
        } else {
            $("section input").first().parent().before(new_container);
        }

        $(input).focus();
    }

    if ((e.ctrlKey || e.metaKey) && e.keyCode == 65) {
        $('section input').addClass('txt-selected').blur();
    } else {
        $('section input').removeClass('txt-selected');
    }
});

// + mouse

var ds = new DragSelect({
    selectables: document.getElementsByClassName("domain-container"),
    area: $('section')[0],
    autoScrollSpeed:5,
    //customStyles: true,
    onDragStart: function() {
        $('section input').removeClass('txt-selected');
        ds.addSelectables(document.getElementsByClassName('domain-container'));
    },
    onDragMove: function(elements) {
        $('section input').removeClass('txt-selected');
        var selection = ds.getSelection()
        if (selection.length > 1) {
            $('section input').blur();
            $(selection).each(function(el){
                $(this).find("input").addClass('txt-selected');
            });
        }
    }
});
$(document).on('mouseup', function(){
    ds.reset();
});

$(document).on('click mousedown keydown', function(){
   $("input.txt-found").removeClass('txt-found');
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
