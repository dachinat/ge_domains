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

storage.setDataPath(os.tmpdir() + '/ge_domains');
// When enter key is pressed in input
$(document).on('keypress', 'section input',function(e){
    if (e.keyCode == 13) {
        if ($(this).val().length < 2 || !/^[A-Za-z0-9\-\.]+$/.test($(this).val())) {
            return;
        }
        original_input.clone().val("").appendTo($(this).parent().parent()).wrap('<div/>').after('<span/>').focus();
        checkDomain($(this));
    }
});

$(document).on('keyup',"section input",function(e){
    // When backspace is pressed in input
    if (e.keyCode == 8) {
        // When caret is in the beginning of input
        if ($(this).get(0).selectionStart === 0) {

            // Focus on previous input
            $(this).parent().prev().find("input").focus();

            // Delete surrunding divs for all except first input
            if ($(this).val() == "" && $($(this).parent().parent().children()).length > 1) {
                $(this).parent().remove();
            }
            // When caret is in the end of input
        } else if ($(this).get(0).selectionStart === $(this).val().length) {
            // Clear status
            $(this).next().text("");
        }
        // When up-key is pressed in input
    } else if (e.keyCode == 38) {
        // Focus on parent input
        $(this).parent().prev().find("input").focus();
        // When down-key is pressed in input
    } else if (e.keyCode == 40) {
        // Focus on child input
        $(this).parent().next().find("input").focus();
    }
});

// Focus on input on nearby clicks
$(document).on("click", "section, section div", function(e) {
    if (e.target !== this) {
        return;
    }

    $(this).find("input").last().focus();
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

    input.next().text("მოწმდება...")

    $.ajax({
        url: 'http://nic.net.ge/Home/DomainCheck',
        type: 'post',
        data: {
            "Domain": domain,
            "TopLevelDomain": ".ge"
        },
        headers: {
            "X-Requested-With": 'XMLHttpRequest'
        },
        success: function (data, textStatus, jqXHR) {
            var msg = /დაკავებულია/.test(data['Data']) ?
                '<span class="text-red">დაკავებულია</span>' : /არასწორი დომენური სახელი/.test(data['Data']) ?
                    '<span class="text-red">სახელი არასწორია</span>' : '<span class="text-blue">თავისუფალია</span>';

            input.next().html(msg);

            store[domain] = [+new Date(), msg];
        }
    });
}

// When check button is clicked
$("#check").on("click", function(){
    var check = 0;
    $("input").each(function(i, el){
        if ($(el).val().length < 2) {
            console.log("<2");
            return;
        }

        $(this).next().remove();
        $(this).after("<span></span>");

        checkDomain($(el));
        check = 1;
    });
    if (check === 0) {
        ipc.send('open-error-dialog-check')
    }
});

// When copy button is clicked
$("#copy").click(function(){
    var text = Array.from(
        $('input').filter(
            (i, el) => $(el).val().length > 1
        ).map(
            (i, el) => {
                var domain = $(el).val();
                if (!/.+\.ge$/.test(domain)) {
                    domain += ".ge";
                }

                var status = $(el).next().text()
                domain += (status.length > 0) ? ' (' + status + ')' : '';
                return domain;
            }
        )
    ).join("\n");

    if (text.length == 0) {
        ipc.send("open-error-dialog-copy");
        return;
    }

    clipboard.writeText(text);
    ipc.send("open-message-dialog-copy");
});

// When paste button is clicked
$("#paste").click(function(){
    var domains = clipboard.readText().match(/[a-zA-Z0-9\-\.]+\.ge/g)

    if (domains === null || domains.length == 0) {
        return;
    }

    $("section").text("");
    $.each(domains, function(i, v) {
        var input = original_input.clone().val(v).appendTo("section").wrap("<div/>").after("<span/>");

        setInputWidth(input);
    });
});

// When clear button is clicked

$("#clear").click(function(){
    $("section").text("");
    original_input.clone().val("").appendTo("section").wrap("<div/>").after("<span/>").focus();
});

// When history butotn is clciked
$("[data-toggle=history]").click(function(){
    storage.getAll(function(error, data) {
        if (error) throw error;
        if ($.isEmptyObject(data)) {
            ipc.send('open-error-dialog-history')
        } else {
            var win = new BrowserWindow({
                parent: remote.getCurrentWindow(),
                modal: true,
                width: 300,
                height: 500,
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

        $("section").text("");
        $.each(data, function(i, v) {
            //var input = original_input.clone().val(v).appendTo("section").after("<div/>").after("<span></span>");
            var input = original_input.clone().val(v).appendTo("section").wrap("<div/>").after("<span/>");

            setInputWidth(input);
        });
    });
});

// When save butotn is clicked
$("#save").on("click", function(e){
    var all = Array.from($('input').filter((i, el) => $(el).val().length > 1).map((i, el) => $(el).val()));
    if (all.length == 0) {
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

    console.log(date);

    date = date.slice(0, 3).join('-') + ' ' + date.slice(3).join(':');

    storage.set('' + date, json);

    e.preventDefault();
});

// Function to set input width relative to length
function setInputWidth(input) {
    $(input).css("width", (($(input).val().length + 1) * 9.7) + 'px');
}
$(document).on('keydown',"section input",function(e){
    setInputWidth($(this));
});

// Store original input state
// Focus on ready
var original_input;
$(document).ready(function(){
    $("input").focus();
    original_input = $("input")
});
