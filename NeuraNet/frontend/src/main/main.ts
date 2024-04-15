
import { app, BrowserWindow, ipcMain } from "electron";
import * as path from "path";
import * as url from "url";
import { exec } from "child_process";
const { spawn } = require("child_process");
import axios from 'axios'; // Adjusted import for axios
import { resolve } from 'path';
import * as receiver5 from './receiver5';
import net from 'net';
let mainWindow: BrowserWindow | null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 768,
    // frame: false,
    backgroundColor: "#23272a",
    titleBarStyle: 'hidden' || 'customButtonsOnHover',
    trafficLightPosition: { x: 15, y: 15 },
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      devTools: process.env.NODE_ENV !== "production",
      // preload: path.join(__dirname, 'preload.ts')
    },
  });

  // const startURL = process.env.NODE_ENV === "development"
  //   ? "http://localhost:8081"
  //   : url.format({
  //       pathname: path.join(__dirname, "index.html"),
  //       protocol: "file:",
  //       slashes: true,
  //     });


  if (process.env.NODE_ENV === "development") {
    mainWindow.loadURL("http://localhost:8081");
  } else {
    mainWindow.loadURL(
      url.format({
        pathname: path.join(__dirname, "renderer/index.html"),
        protocol: "file:",
        slashes: true,
      })
    );
  }


  // mainWindow.loadURL(startURL);

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  mainWindow.webContents.on('did-finish-load', () => {
    // This event is triggered when the main window has finished loading
    // Now you can safely execute any code that interacts with the mainWindow
    runPythonScript();
  });
}

// function runPythonScript() {
//   const scriptPath = "resources/python/receiver5.py";
//   const python = spawn('python3', [scriptPath]);

//   python.stdout.on("data", (data: Buffer) => {
//     const result = data.toString();
//     console.log(`Python Script Message: ${result}`);

//     // Ensure mainWindow is not null before sending message to its webContents
//     if (mainWindow) {
//       mainWindow.webContents.send('python-output', result);
//     }
//   });

//   python.stderr.on("data", (data: Buffer) => {
//     const error = data.toString();
//     console.error(`Python Script Error: ${error}`);
//   });

//   python.on("close", (code: number) => {
//     console.log(`Python Script exited with code ${code}`);
//   });
// }



function runPythonScript() {
    const SERVER_HOST = '34.28.13.79'
    const SERVER_PORT = 443;
    const receiver_socket = new net.Socket();

    receiver_socket.connect(SERVER_PORT, SERVER_HOST, () => {
        console.log("Connected to server");
    });

    receiver_socket.on('error', (err) => {
        console.error("Error:", err);
    });
 

  receiver5.run(receiver_socket); 
}
ipcMain.on('fetch-data', async (event, args) => {
  try {
    const response = await axios.get('https://catfact.ninja/fact');
    event.reply('fetch-data-response', response.data);
  } catch (error) {
    console.error('Error fetching data:', error);
  }
});

// Enable logging and disable sandbox for all processes:
//
//app.commandLine.appendSwitch('enable-logging');
//app.commandLine.appendSwitch('no-sandbox');

//mainWindow.webContents.openDevTools();


app.on("ready", () => {
  createWindow();
});


ipcMain.on('close-window', () => {
  if (mainWindow) {
    mainWindow.close();
  }
});

ipcMain.on('minimize-window', () => {
  if (mainWindow) {
    mainWindow.minimize();
  }
});

ipcMain.on('maximize-window', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});



app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (mainWindow === null) {
    createWindow();
  }
});
