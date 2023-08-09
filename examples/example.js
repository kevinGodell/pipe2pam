'use strict';

const Pipe2Pam = require('../index');

const { spawn } = require('child_process');

const ffmpegPath = require('../lib/ffmpeg');

let counter = 0;

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
  'gray',
  // 'rgba',
  // 'rgb24',
  // 'monob',
  '-vf',
  // 'fps=1,scale=iw*1/6:ih*1/6',
  'fps=2,scale=400:225',
  '-frames',
  '1000',
  'pipe:1',
];

const pipe2pam = new Pipe2Pam();

pipe2pam.on('data', data => {
  // pam data object has .depth .height .maxval .pam .pixels .tupltype .width
  console.log(
    `received pam: ${++counter}, depth: ${data.depth}, height: ${data.height}, maxval: ${data.maxval}, pam.length: ${data.pam.length}, headers.length: ${data.headers.length}, pixels.length: ${
      data.pixels.length
    }, tupltype: ${data.tupltype}, width: ${data.width}, chunks: ${data.chunks}`,
  );
});

const ffmpeg = spawn(ffmpegPath, params);

ffmpeg.on('error', error => {
  console.log(error);
});

ffmpeg.on('exit', (code, signal) => {
  console.log(`exit ${code} ${signal}`);
});

ffmpeg.stdout.pipe(pipe2pam);
