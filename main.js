const electron = require('electron')
const app = electron.app

const BrowserWindow = electron.BrowserWindow

const ipc = require('electron').ipcMain

const path = require('path')
const url = require('url')

const dialog = require('electron').dialog

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow

function createWindow () {
    // Create the browser window.
    mainWindow = new BrowserWindow({
        width: 500,
        height: 685,
        backgroundColor: '#cee8fa',
        resizable: false,
        maximizable: false,
        fullscreenable: false,
        title: "GE დომენები",
        icon: path.join(__dirname, 'ge_domains.png'), // ?
        show: true //false (ready-to-show)
    })

    // and load the index.html of the app.
    mainWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'index.html'),
        protocol: 'file:',
        slashes: true
    }))

    //Open the DevTools.
    mainWindow.webContents.openDevTools()

    // Emitted when the window is closed.
    mainWindow.on('closed', function () {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
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

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', function () {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('activate', function () {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
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
        message: "ნამდვილად გსურთ ამ შენატანის გაუქმება?",
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
        message: "დომენების სია წარმატებით დაკოპირდა",
        buttons: ['დახურვა']
    });
});