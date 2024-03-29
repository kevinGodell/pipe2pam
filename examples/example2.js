'use strict';

const Pipe2Pam = require('../index');

const { spawn } = require('child_process');

const ffmpegPath = require('../lib/ffmpeg');

let counter = 0;

let counter2 = 0;

const params = [
  '-loglevel',
  'quiet',
  '-re',
  '-f',
  'lavfi',
  '-i',
  'testsrc=size=1920x1080:rate=15',
  '-an',
  '-c:v',
  'pam',
  '-f',
  'image2pipe',
  '-pix_fmt',
  // 'rgb24',
  // 'rgba',
  'gray',
  // 'monob',
  '-vf',
  'fps=1,scale=iw*1/5:ih*1/5',
  '-frames',
  '10',
  'pipe:1',
];

const params2 = [
  '-loglevel',
  'quiet',
  '-re',
  '-f',
  'lavfi',
  '-i',
  'testsrc=size=1920x1080:rate=15',
  '-an',
  '-c:v',
  'pam',
  '-f',
  'image2pipe',
  '-pix_fmt',
  'rgb24',
  // 'rgba',
  // 'gray',
  // 'monob',
  '-vf',
  'fps=1,scale=iw*1/6:ih*1/6',
  '-frames',
  '10',
  'pipe:1',
];

const pipe2pam = new Pipe2Pam();

pipe2pam.on('data', data => {
  console.log(`received pam1: ${++counter} data: ${data}`);
});

const ffmpeg = spawn(ffmpegPath, params);

ffmpeg.on('error', error => {
  console.log(error);
});

ffmpeg.on('exit', (code, signal) => {
  console.log(`exit ${code} ${signal}`);
});

ffmpeg.stdout.pipe(pipe2pam);

// ///create second ffmpeg pam piping

const pipe2pam2 = new Pipe2Pam();

pipe2pam2.on('data', data => {
  console.log(`received pam2: ${++counter2} data: ${data}`);
});

const ffmpeg2 = spawn('ffmpeg', params2);

ffmpeg2.on('error', error => {
  console.log(error);
});

ffmpeg2.on('exit', (code, signal) => {
  console.log(`exit ${code} ${signal}`);
});

ffmpeg2.stdout.pipe(pipe2pam2);
