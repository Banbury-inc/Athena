
import * as os from 'os';
import * as fs from 'fs';
import axios from 'axios';
import * as path from 'path';
import si from '../../../../dependency/systeminformation';
import { DateTime } from 'luxon';
import * as dotenv from 'dotenv';
import * as net from 'net';
import * as crypto from 'crypto';
import ConfigParser from 'configparser';
import * as receiver5 from '../../../main/receiver5';
import { useState, useEffect } from 'react';

dotenv.config();

interface FileHeader {
  file_type: string;
  file_name: string;
  file_size: number;
  username: string;
  password: string;
}

interface ProfileInfo {
  first_name: string;
  last_name: string;
  username: string;
  email: string;
  password: string;
}

interface DeviceInfo {
  user: string;
  device_number: number;
  device_name: string;
  files: FileInfo[];
  storage_capacity_GB: number;
  max_storage_capacity_GB: number;
  date_added: string;
  ip_address: string;
  average_network_speed: number;
  upload_network_speed: number;
  download_network_speed: number;
  gpu_usage: number;
  cpu_usage: number;
  ram_usage: number;
  predicted_upload_network_speed: number;
  predicted_download_network_speed: number;
  predicted_gpu_usage: number;
  predicted_cpu_usage: number;
  predicted_ram_usage: number;
  predicted_performance_score: number;
  network_reliability: number;
  average_time_online: number;
  tasks: number;
  device_priority: number;
  sync_status: boolean;
  optimization_status: boolean;
  online: boolean;
}

interface SmallDeviceInfo {
  user: string;
  device_number: number;
  device_name: string;
  files: FileInfo[];
  date_added: string;
}

interface FileInfo {
  File_Name: string;
  Date_Uploaded: string;
  File_Size: number;
  File_Priority: number;
  Original_Device: string;
}

interface CPUPerformance {
  manufacturer: string;
  brand: string;
  speed: number;
  cores: number;
  physicalCores: number;
  processors: number;
}

interface GPUUsage {
  model: string;
  utilization: number;
  temperature: number;
}

interface memUsage {
  total: number;
  free: number;
  used: number;
  usagePercentage: number;
}

interface SpeedResult {
  upload: number;
  download: number;
}

interface IPAddress {
  networkInterfaces: string;
}

interface SpeedTestResult {
  download: number;
  upload: number;
  ping: number;
  downloadUnit: number;
  uploadUnit: number;
  pingUnit: string;
  server: {
    name: string;
    country: string;
    sponsor: string | undefined;
    id: number;
  };
}

const homeDirectory = os.homedir();
const BANBURY_FOLDER = path.join(homeDirectory, '.banbury');
const CONFIG_FILE = path.join(BANBURY_FOLDER, '.banbury_config.ini');

if (!fs.existsSync(BANBURY_FOLDER)) {
  fs.mkdirSync(BANBURY_FOLDER);
}

if (!fs.existsSync(CONFIG_FILE)) {
  const config = new ConfigParser();
  config.set('banbury_cloud', 'credentials_file', 'credentials.json');
  fs.writeFileSync(CONFIG_FILE, config.toString());
}

let senderSocket: net.Socket | null = null;

function connectToRelayServer(): net.Socket {
  const RELAY_HOST = '0.0.0.0'; // Change this to your actual server IP
  const RELAY_PORT = 443;

  // Check if an existing socket should be closed
  if (senderSocket !== null) {
    senderSocket.end(); // Close the existing socket
    senderSocket.destroy(); // Optionally force close the socket immediately
    senderSocket = null; // Reset the variable
  }

  // Create a new socket and connect
  senderSocket = new net.Socket();
  senderSocket.connect(RELAY_PORT, RELAY_HOST, () => {
    console.log("Connected to the server.");
  });

  // Add error handling to log or handle errors
  senderSocket.on('error', (err) => {
    console.error("Error connecting to the relay server:", err);
  });

  senderSocket.on('close', () => {
    console.log("Socket is now closed.");
  });

  return senderSocket;
}


function connectToRelayServer2(): Promise<net.Socket> {
  return new Promise((resolve, reject) => {


    // Check if an existing socket should be closed
    if (senderSocket !== null) {
      // senderSocket.end(); // Close the existing socket
      // senderSocket.destroy(); // Optionally force close the socket immediately
      // senderSocket = null; // Reset the variable
      console.log("Socket already exists");
    }

    const RELAY_HOST = '0.0.0.0'; // Replace with your actual host
    const RELAY_PORT = 443;       // Replace with your actual port
    const sendersocket = new net.Socket();

    sendersocket.connect(RELAY_PORT, RELAY_HOST, () => {
      console.log("Successfully connected to the server.");
      resolve(sendersocket);  // Ensure that the socket is resolved here
    });

    sendersocket.on('error', (err) => {
      console.error("Error connecting to the relay server:", err);
      reject(err);  // Make sure to reject the promise on errors
    });

    sendersocket.on('close', () => {
      console.log("Socket has been closed.");
    });
  });
}


function loadCredentials(): Record<string, string> {
  try {
    const config = new ConfigParser();
    config.read(CONFIG_FILE);
    const credentialsFile = config.get('banbury_cloud', 'credentials_file') || 'default_filename.json';
    const credentialsFilePath = path.join(BANBURY_FOLDER, credentialsFile);
    return JSON.parse(fs.readFileSync(credentialsFilePath, 'utf-8'));
  } catch (error) {
    return {};
  }
}

// let senderSocket = connectToRelayServer();
function send_login_request(username: string, password: string, senderSocket: net.Socket): Promise<string> {
  return new Promise((resolve, reject) => {
    const file_header: string = `LOGIN_REQUEST::${password}:${username}:END_OF_HEADER`;
    senderSocket.write(file_header);
    const endOfHeader = Buffer.from('END_OF_HEADER');
    let buffer = Buffer.alloc(0);

    senderSocket.on('data', (data) => {
      buffer = Buffer.concat([buffer, data]);
      if (buffer.includes(endOfHeader)) {
        const endOfHeaderIndex = buffer.indexOf(endOfHeader);
        if (endOfHeaderIndex !== -1) {
          const headerPart = buffer.slice(0, endOfHeaderIndex);
          const content = buffer.slice(endOfHeaderIndex + endOfHeader.length);
          buffer = content;  // Update buffer to remove processed header

          const header = headerPart.toString();
          const splitHeader = header.split(':');
          const fileType = splitHeader[0];
          if (fileType === 'GREETINGS') {
            console.log('Received greeting from server');
          } else if (fileType === 'LOGIN_SUCCESS') {
            console.log('Received login success from server');
            const result = receiver(username, senderSocket);
            resolve('login success');
          } else if (fileType === 'LOGIN_FAIL') {
            console.log('Received login failure from server');
            // senderSocket.end();
            reject('login failure');
          }
        }
      }
    });
    senderSocket.on('end', () => {
      console.log('Disconnected from server');
    });

    senderSocket.on('error', (err) => {
      console.error('Socket error:', err);
      reject(err.message);
    });

    senderSocket.on('close', (hadError) => {
      if (!hadError) {
        reject(new Error('Connection closed unexpectedly'));
      }
    });
  });
}




async function receiver(username: any, senderSocket: net.Socket): Promise<void> {
  console.log("receiver function called")
  const file_header: string = `GREETINGS::::END_OF_HEADER`;
  senderSocket.write(file_header);

  const endOfHeader = Buffer.from('END_OF_HEADER');
  let buffer = Buffer.alloc(0);

  senderSocket.on('data', async (data) => {
    buffer = Buffer.concat([buffer, data]);
    if (buffer.includes(endOfHeader)) {
      const endOfHeaderIndex = buffer.indexOf(endOfHeader);
      if (endOfHeaderIndex !== -1) {
        const headerPart = buffer.slice(0, endOfHeaderIndex);
        const content = buffer.slice(endOfHeaderIndex + endOfHeader.length);
        buffer = content;  // Update buffer to remove processed header
        console.log('buffer:', buffer.toString());

        const header = headerPart.toString();
        const splitHeader = header.split(':');
        const fileType = splitHeader[0];
        const file_name = splitHeader[1];
        const file_size = splitHeader[2];
        if (fileType === 'GREETINGS') {
          console.log('Received greeting from server');
        }
        if (fileType === 'LOGIN_SUCCESS') {
          console.log('Received login success from server');
        }
        if (fileType === 'LOGIN_FAIL') {
          console.log('Received login failure from server');
        }
        if (fileType === 'SMALL_PING_REQUEST') {
          console.log("received small ping request");
          // Handle ping request
          let credentials = loadCredentials();
          let user = username;
          // let user = Object.keys(credentials)[0];
          let device_number = 0;
          let device_name = get_device_name();
          let files = get_directory_info();
          let date_added = get_current_date_and_time();

          const device_info_json: SmallDeviceInfo = {
            user,
            device_number,
            device_name,
            files,
            date_added,
          };

          await sendSmallDeviceInfo(senderSocket, device_info_json);
          console.log("completed small ping request");
        }
        if (fileType === 'PING_REQUEST') {
          console.log("Received a ping request");

          let user = username;
          // let user = username;
          let device_number = 1;
          let device_name = get_device_name();
          let files = get_directory_info();
          let storage_capacity_GB = await get_storage_capacity();
          let max_storage_capacity_GB = 50;
          let date_added = get_current_date_and_time();
          let ip_address = await get_ip_address();
          let average_network_speed = 0;
          let upload_network_speed = 0;
          let download_network_speed = 0;
          let gpu_usage = await get_gpu_usage();
          let cpu_usage = await get_cpu_usage();
          let ram_usage = await get_ram_usage();
          let predicted_upload_network_speed = 0;
          let predicted_download_network_speed = 0;
          let predicted_gpu_usage = 0;
          let predicted_cpu_usage = 0;
          let predicted_ram_usage = 0;
          let predicted_performance_score = 0;
          let network_reliability = 0;
          let average_time_online = 0;
          let tasks = 0;
          let device_priority = 1;
          let sync_status = true;
          let optimization_status = true;
          let online = true;

          const device_info_json: DeviceInfo = {
            user,
            device_number,
            device_name,
            files,
            storage_capacity_GB,
            max_storage_capacity_GB,
            date_added,
            ip_address,
            average_network_speed,
            upload_network_speed,
            download_network_speed,
            gpu_usage,
            cpu_usage,
            ram_usage,
            predicted_upload_network_speed,
            predicted_download_network_speed,
            predicted_gpu_usage,
            predicted_cpu_usage,
            predicted_ram_usage,
            predicted_performance_score,
            network_reliability,
            average_time_online,
            tasks,
            device_priority,
            sync_status,
            optimization_status,
            online
          };

          await sendDeviceInfo(senderSocket, device_info_json);
          console.log("completed ping request");
        }

        if (fileType === 'FILE_REQUEST') {
          console.log(`Device is requesting file: ${file_name}`);
          const directory_name: string = "BCloud";
          const directory_path: string = path.join(os.homedir(), directory_name);
          const file_save_path: string = path.join(directory_path, file_name);
          let request_file_name = path.basename(file_save_path);

          try {
            // Attempt to open the file
            const file: fs.ReadStream = fs.createReadStream(file_save_path);
            const null_string: string = "";
            const file_header: string = `FILE_REQUEST_RESPONSE:${request_file_name}:${file_size}:${null_string}:END_OF_HEADER`;
            senderSocket.write(file_header);

            let total_bytes_sent: number = 0;
            file.on('data', (bytes_read: Buffer) => {
              console.log("sending file...");
              senderSocket.write(bytes_read);
              total_bytes_sent += bytes_read.length;
            });

            file.on('end', () => {

              console.log(`${file_name} has been sent successfully.`);


              senderSocket.end();
            });

            file.on('error', (err: NodeJS.ErrnoException) => {
              console.error(`Error reading file: ${err}`);

              senderSocket.end();
            });

          } catch (error) {
            console.error(`Error sending file response: ${error}`);
            senderSocket.end();
          }
        }
        if (fileType === 'REGISTRATION_FAILURE_USER_ALREADY_EXISTS') {
          // Handle registration failure
        }
      }
    }
  });

  senderSocket.on('end', () => {
    console.log('Disconnected from server');
  });

  senderSocket.on('error', (err) => {
    console.error('Socket error:', err);
  });

  senderSocket.on('close', hadError => {
    if (!hadError) {
      console.error('Connection closed unexpectedly');
    }
  });
}

function get_device_name(): string {
  return os.hostname();
}

function get_current_date_and_time(): string {
  const now: Date = new Date();
  const year: number = now.getFullYear();
  const month: number = now.getMonth() + 1; // Month is zero-based, so we add 1
  const day: number = now.getDate();
  const hours: number = now.getHours();
  const minutes: number = now.getMinutes();
  const seconds: number = now.getSeconds();

  // Format the date and time
  const formattedDateTime: string = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')} ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  return formattedDateTime;
}

function get_directory_info() {
  const directoryName = "BCloud";
  const directoryPath = os.homedir() + `/${directoryName}`;
  const filesInfo: any[] = [];

  // Check if the directory exists, create if it does not and create a welcome text file
  if (!fs.existsSync(directoryPath)) {
    fs.mkdirSync(directoryPath, { recursive: true });
    const welcomeFilePath = directoryPath + "/welcome.txt";
    fs.writeFileSync(welcomeFilePath,
      "Welcome to Banbury Cloud! This is the directory that will contain all of the files " +
      "that you would like to have in the cloud and streamed throughout all of your devices. " +
      "You may place as many files in here as you would like, and they will appear on all of " +
      "your other devices."
    );
  }

  // Loop through each file in the directory
  const files = fs.readdirSync(directoryPath);
  for (const filename of files) {
    const filePath = directoryPath + '/' + filename;

    // Skip directories, only process files
    if (fs.statSync(filePath).isFile()) {
      // Get file stats
      const stats = fs.statSync(filePath);
      const fileInfo = {
        "file_name": filename,
        "date_uploaded": DateTime.fromMillis(stats.mtimeMs).toFormat('yyyy-MM-dd HH:mm:ss'),
        "file_size": stats.size,
        "file_priority": 5,
        "original_device": filename,
      };
      filesInfo.push(fileInfo);
    }
  }

  return filesInfo;
}

async function sendSmallDeviceInfo(sender_socket: net.Socket, device_info: SmallDeviceInfo): Promise<void> {
  const date_time: string = get_current_date_and_time();
  const null_string: string = "";
  const file_header: string = "SMALL_PING_REQUEST_RESPONSE::::END_OF_HEADER";
  const device_info_with_stop_signal: string = JSON.stringify(device_info) + "END_OF_JSON";
  let full_message = file_header + device_info_with_stop_signal;
  sender_socket.write(full_message);
}

async function sendDeviceInfo(sender_socket: net.Socket, device_info: DeviceInfo): Promise<void> {
  const date_time: string = get_current_date_and_time();
  const null_string: string = "";
  const file_header: string = `PING_REQUEST_RESPONSE:${null_string}:${null_string}:${null_string}:END_OF_HEADER`;
  const device_info_with_stop_signal: string = JSON.stringify(device_info) + "END_OF_JSON";
  let full_message = file_header + device_info_with_stop_signal;
  sender_socket.write(full_message);
}

async function get_storage_capacity(): Promise<number> {
  try {
    const diskData = await si.fsSize();
    const totalCapacityBytes = diskData.reduce((total, disk) => total + disk.size, 0);
    const totalCapacityGB = totalCapacityBytes / (1024 * 1024 * 1024); // Convert bytes to GB
    return totalCapacityGB;
  } catch (error) {
    console.error('Error retrieving storage capacity:', error);
    throw error; // Rethrow error to handle externally
  }
}

async function get_cpu_info(): Promise<CPUPerformance> {
  try {
    const cpuData = await si.cpu();
    const cpuPerformance: CPUPerformance = {
      manufacturer: cpuData.manufacturer || 'Unknown',
      brand: cpuData.brand || 'Unknown',
      speed: cpuData.speed || 0,
      cores: cpuData.cores || 0,
      physicalCores: cpuData.physicalCores || 0,
      processors: cpuData.processors || 0
    };
    return cpuPerformance;
  } catch (error) {
    console.error('Error retrieving CPU performance:', error);
    throw error; // Rethrow error to handle externally
  }
}

async function get_cpu_usage(): Promise<number> {
  try {
    const cpuData = await si.currentLoad();
    const cpuUsage = cpuData.currentLoad || 0;
    return cpuUsage;
  } catch (error) {
    console.error('Error retrieving CPU usage:', error);
    throw error; // Rethrow error to handle externally
  }
}

async function get_gpu_usage(): Promise<number> {
  try {
    const gpuData = await si.graphics();
    const totalUtilization = gpuData.controllers.reduce((total, controller) => total + (controller.utilizationGpu || 0), 0);
    return totalUtilization / gpuData.controllers.length;
  } catch (error) {
    console.error('Error retrieving GPU utilization:', error);
    throw error; // Rethrow error to handle externally
  }
}

async function get_ram_usage(): Promise<number> {
  try {
    const memData = await si.mem();
    const totalMemory = memData.total || 0;
    const usedMemory = memData.used || 0;
    const freeMemory = memData.free || 0;

    const usagePercentage = (usedMemory / totalMemory) * 100;

    const ramUsage: memUsage = {
      total: totalMemory,
      free: freeMemory,
      used: usedMemory,
      usagePercentage: isNaN(usagePercentage) ? 0 : usagePercentage // Handle NaN case
    };

    return isNaN(usagePercentage) ? 0 : usagePercentage; // Handle NaN case
  } catch (error) {
    console.error('Error retrieving RAM usage:', error);
    throw error; // Rethrow error to handle externally
  }
}

async function get_ip_address(): Promise<string> {
  let ip_address: string | null = null;

  try {
    const response = await axios.get('https://httpbin.org/ip');
    const ip_info = response.data;
    const origin: string = ip_info.origin || 'Unknown';
    ip_address = origin.split(',')[0];
  } catch (error) {
    console.error('Error occurred:', error);
    ip_address = 'Unknown';
  }

  return ip_address || 'Unknown';
}

// Wrap the main logic in an async function
async function run() {
  try {
    console.log('Starting receiver...');
  } catch (error) {
    console.error('Error in receiver:', error);
  }
}

// Call the async function from the top-level main function
run().catch((error) => {
  console.error('Error in main function:', error);
});

export { receiver, run, send_login_request, connectToRelayServer, connectToRelayServer2 }
