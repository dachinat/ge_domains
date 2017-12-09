const electron = require('electron')
const app = electron.app

const BrowserWindow = electron.BrowserWindow

const ipc = require('electron').ipcMain

const path = require('path')
const url = require('url')

const dialog = require('electron').dialog
const {Menu} = require('electron')

let mainWindow

function createWindow () {
    mainWindow = new BrowserWindow({
        width: 490,
        height: 660,
        backgroundColor: '#cee8fa',
        resizable: false,
        maximizable: false,
        fullscreenable: false,
        title: 'GE დომენები',
        icon: path.join(__dirname, 'assets', 'icons', 'ge_domains.png'),
        show: false
    })

    mainWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'index.html'),
        protocol: 'file:',
        slashes: true
    }))

    mainWindow.webContents.openDevTools()

    mainWindow.on('closed', function () {
        mainWindow = null
    })

    mainWindow.on('ready-to-show', function() {
        mainWindow.show();
        mainWindow.focus();
    })

    ipc.on('load-version', function(event, arg) {
        mainWindow.webContents.send('load-version', arg);
    });

    var aboutWindow;
    var template = [{
        label: 'GE Domains',
        submenu: [{
            label: 'შესახებ',
            click: function() {
                if (typeof aboutWindow === "undefined") {
                    aboutWindow = new BrowserWindow({
                        parent: mainWindow,
                        modal: true,
                        width: 350,
                        height: 280,
                        show: false,
                        backgroundColor: '#fffff',
                        resizable: false,
                        maximizable: false,
                        fullscreenable: false,
                        minimizable: false
                    });

                    aboutWindow.loadURL('file://' + __dirname + '/about.html')
                    aboutWindow.setMenu(null);
                    aboutWindow.once('ready-to-show', () => {
                        aboutWindow.show()
                        aboutWindow.focus()
                    });
                    aboutWindow.on('closed', function() {
                       aboutWindow = undefined;
                    });
                }
            }
        }, {
            label: 'დახურვა',
            accelerator: 'CmdOrCtrl+Q',
            click: function() {
                app.quit();
            }
        }]
    }, {
        label: 'Edit',
        submenu: [{
            label: 'უკან',
            accelerator: 'CmdOrCtrl+Z',
            selector: 'undo:'
        }, {
            label: 'წინ',
            accelerator: 'Shift+CmdOrCtrl+Z',
            selector: 'redo:'
        }, {
            type: 'separator'
        }, {
            label: 'ამოჭრა',
            accelerator: 'CmdOrCtrl+X',
            selector: 'cut:'
        }, {
            label: 'კოპირება',
            accelerator: 'CmdOrCtrl+C',
            selector: 'copy:'
        }, {
            label: 'ჩასმა',
            accelerator: 'CmdOrCtrl+V',
            selector: 'paste:'
        }, {
            label: 'ყველას მონიშვნა',
            accelerator: 'CmdOrCtrl+A',
            selector: 'selectAll:'
        }]
    }];
    var osxMenu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(osxMenu);
}



app.on('ready', createWindow)

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('activate', function () {
    if (mainWindow === null) {
        createWindow()
    }
})

ipc.on('open-error-dialog-check', function (event) {
    dialog.showErrorBox('შეცდომა', 'შესამოწმებლად დომენები არაა მოცემული.')
})

ipc.on('open-error-dialog-history', function (event) {
    dialog.showErrorBox('შეცდომა', 'ისტორიაში ჯერ ჩანაწერები არ დამატებულა.')
})

ipc.on('open-confirm-dialog-history', function (event, args) {
    const options = {
        type: 'info',
        title: 'დადასტურება',
        message: 'ნამდვილად გსურთ ამ შენატანის გაუქმება?',
        buttons: ['კი', 'არა']
    }
    dialog.showMessageBox(options, function (index) {
        event.sender.send('confirm-dialog-selection-history', [index, args])
    })
})

ipc.on('open-error-dialog-copy', function (event) {
    dialog.showErrorBox('შეცდომა', 'დასაკოპირებლად არაფერია.')
});

ipc.on('open-message-dialog-copy', function (event) {
    dialog.showMessageBox({
        type: 'info',
        title: 'შეტყობინება',
        message: 'დომენების სია წარმატებით დაკოპირდა',
        buttons: ['დახურვა']
    });
});

ipc.on('open-error-dialog-save', function() {
   dialog.showErrorBox('შეცდომა', 'დასამახსოვრებლად დომენები შეყვანილი არაა.')
});

ipc.on('open-message-dialog-save', function (event) {
    dialog.showMessageBox({
        type: 'info',
        title: 'შეტყობინება',
        message: 'დომენების სია წარმატებით დამახსოვრდა',
        buttons: ['დახურვა']
    });
});