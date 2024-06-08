import * as React from 'react';
import { useState, useEffect } from 'react';
import { exec } from "child_process";
import Avatar from '@mui/material/Avatar';
import NeuraNet_Logo from '/static/NeuraNet_Icons/web/icon-512.png';
import Button from '@mui/material/Button';
import CssBaseline from '@mui/material/CssBaseline';
import TextField from '@mui/material/TextField';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';

import * as receiver5 from '../../main/receiver5';
import Link from '@mui/material/Link';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import theme from "../theme";
import App from './App';
import { createRoot } from "react-dom/client";
import MiniDrawer from "./VariantDrawer";
import { BrowserRouter, Route, Routes, Outlet, Navigate } from "react-router-dom";
import Signup from "./signup";
import Main from "./main";
import Register from "./signup";
import { useAuth } from '../context/AuthContext';
import fs from 'fs';
import dotenv from 'dotenv';
import os from 'os';
import ConfigParser from 'configparser';
import net from 'net';
import useHistory from 'react-router-dom';
import crypto from 'crypto';
import { Dispatch, SetStateAction } from 'react';
import { receiver, send_login_request } from './scripts/receiver';
interface Message {
  type: string;
  content: string;
}


process.on('uncaughtException', (err: Error & { code?: string }) => {
  switch (err.code) {
    case 'ECONNREFUSED':
      console.error('Connection refused. The server is unreachable.');
      break;
    case 'ETIMEDOUT':
      console.error('Connection timed out.');
      break;
    default:
      console.error('Uncaught error:', err);
      break;
  }
});

function Copyright(props: any) {
  return (
    <Typography variant="body2" color="text.secondary" align="center" {...props}>
      {'Copyright © '}
      <Link color="inherit" href="https://website2-v3xlkt54dq-uc.a.run.app/">
        Banbury
      </Link>{' '}
      {new Date().getFullYear()}
      {'.'}
    </Typography>
  );
}

const path = require('path');


dotenv.config();

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



function saveCredentials(credentials: Record<string, string>): void {
  const config = new ConfigParser();
  config.read(CONFIG_FILE);
  const credentialsFile = config.get('banbury_cloud', 'credentials_file') || 'default_filename.json';
  const credentialsFilePath = path.join(BANBURY_FOLDER, credentialsFile);
  fs.writeFileSync(credentialsFilePath, JSON.stringify(credentials));
}

export default function SignIn() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [redirect_to_register, setredirect_to_register] = useState(false);
  const { setUsername } = useAuth(); // Destructure setUsername from useAuth
  const [incorrect_login, setincorrect_login] = useState(false);
  const [server_offline, setserver_offline] = useState(false);
  const incorrect_login_message: Message = {
    type: 'error',
    content: 'Incorrect username or password',
  };
  const server_offline_message: Message = {
    type: 'error',
    content: 'Server is offline. Please try again later.',
  };



  // Move the useState hook outside of the handleSubmit function
  const [showMain, setShowMain] = useState<boolean>(false);
  const [showRegister, setShowRegister] = useState<boolean>(false);
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = data.get('email') as string | null;
    const password = data.get('password') as string | null;

    if (email && password) {
      try {
        const result = await send_login_request(email, password);
        console.log(result);
        setUsername(email);
        setIsAuthenticated(true);
        console.log('Result: Login successful.');
        setShowMain(true); // Set showMain to true when login is successful
      } catch (error) {
        console.error('Error:', error);
        setincorrect_login(true);
      }
    }
  };


  if (isAuthenticated || showMain) { // Render Main component if authenticated or showMain is true
    return <Main />;
  }
  if (redirect_to_register || showRegister) { // Render Main component if authenticated or showMain is true
    return <Register />;
  }

  return (
    <ThemeProvider theme={theme}>
      <Container component="main" maxWidth="xs">
        <CssBaseline />
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          {/* <Avatar sx={{ mt: 10, bgcolor: 'primary.main' }}> */}

          {/* <LockOutlinedIcon /> */}
          {/* </Avatar> */}
          {/* <img src={NeuraNet_Logo} alt="Logo" style={{ marginTop: 100, marginBottom: 20, width: 157.2, height: 137.2 }} /> */}
          <img src={NeuraNet_Logo} alt="Logo" style={{ marginTop: 100, marginBottom: 20, width: 50, height: 50 }} />
          <Typography component="h1" variant="h5">
            Sign in
          </Typography>
          <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Username"
              name="email"
              autoComplete="email"
              size='small'
              autoFocus
              InputProps={{
                style: { fontSize: '1.7rem' }, // Adjusts text font size inside the input box
              }}
              InputLabelProps={{
                style: { fontSize: '1.3rem' }, // Adjusts the label font size
              }}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type="password"
              size='small'
              id="password"
              autoComplete="current-password"
              InputProps={{
                style: { fontSize: '1.7rem' }, // Adjusts text font size inside the input box
              }}
              InputLabelProps={{
                style: { fontSize: '1.3rem' }, // Adjusts the label font size
              }}

            />
            <FormControlLabel
              control={<Checkbox value="remember" color="primary" />}
              // label="Remember me"
              label={<Typography style={{ fontSize: '15px' }}>Remember me</Typography>}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
            >
              Sign In
            </Button>
            <Grid container>
              <Grid item xs>
                {/* <Link href="/register" variant="body2"> */}
                <Link variant="body2" onClick={() => {
                  setredirect_to_register(true);
                }}>
                  Forgot password?
                </Link>
              </Grid>
              <Grid item>
                {/* <Link href="/register" variant="body2"> */}
                <Link variant="body2" onClick={() => {
                  setredirect_to_register(true);
                }}>

                  {"Don't have an account? Sign Up"}
                </Link>
              </Grid>
              <Grid container justifyContent="center">
                <Grid item>
                  <div style={{ color: "#E22134", opacity: incorrect_login ? 1 : 0, transition: 'opacity 0.5s' }}>
                    <p>{incorrect_login_message.content}</p>
                  </div>
                </Grid>
              </Grid>
              <Grid container justifyContent="center">
                <Grid item>
                  <div style={{ color: "#E22134", opacity: server_offline ? 1 : 0, transition: 'opacity 0.5s' }}>
                    <p>{server_offline_message.content}</p>
                  </div>
                </Grid>
              </Grid>

            </Grid>
          </Box>
        </Box>
        <Copyright sx={{ mt: 5 }} />
      </Container>
    </ThemeProvider>
  );
}



