const electron = require('electron')
const app = electron.app

const BrowserWindow = electron.BrowserWindow

const ipc = require('electron').ipcMain

const path = require('path')
const url = require('url')

const dialog = require('electron').dialog

let mainWindow

function createWindow () {
    mainWindow = new BrowserWindow({
        width: 500,
        height: 685,
        backgroundColor: '#cee8fa',
        resizable: false,
        maximizable: false,
        fullscreenable: false,
        title: 'GE დომენები',
        icon: path.join(__dirname, 'ge_domains.png'),
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
}

app.on('ready', createWindow)

// Quit when all windows are closed.
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