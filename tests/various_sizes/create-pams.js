'use strict';

const { writeFileSync } = require('fs');

const assert = require('assert');

const { spawn } = require('child_process');

const ffmpegPath = require('../../lib/ffmpeg');

const Pipe2Pam = require('../../index');

const ffmpegConfigs = [
  { width: 320, height: 180, fps: 1, pixFmt: 'gray' },
  { width: 320, height: 180, fps: 1, pixFmt: 'rgb24' },
  { width: 640, height: 360, fps: 1, pixFmt: 'gray' },
  { width: 640, height: 360, fps: 1, pixFmt: 'rgb24' },
  { width: 1280, height: 720, fps: 1, pixFmt: 'gray' },
  { width: 1280, height: 720, fps: 1, pixFmt: 'rgb24' },
];

const pamCount = 2;

ffmpegConfigs.forEach(config => {
  const { width, height, fps, pixFmt } = config;

  let pamCounter = 0;

  const params = [
    /* log info to console */
    '-loglevel',
    'quiet',
    '-nostats',

    /* use an artificial video input */
    '-re',
    '-f',
    'lavfi',
    '-i',
    `testsrc=size=${width}x${height}:rate=${fps}`,

    /* set output flags */
    '-an',
    '-c:v',
    'pam',
    '-pix_fmt',
    pixFmt,
    '-f',
    'image2pipe',
    '-frames',
    pamCount,
    'pipe:1',
  ];

  const pipe2pam = new Pipe2Pam();

  pipe2pam.on('initialized', data => {
    console.log(data);
  });

  pipe2pam.on('pam', data => {
    pamCounter++;
    writeFileSync(`${__dirname}/${width}x${height}-${pixFmt}-${pamCounter}.pam`, data.pam);
    assert(data.width * data.height * data.depth === data.pixels.length, 'Pixels are not the correct length');
    assert(data.headers.length + data.pixels.length === data.pam.length, 'Headers plus pixels are not the correct length');
    const pam = data.pam;
    assert(pam[0] === 0x50 && pam[1] === 0x37 && pam[2] === 0x0a, 'Start of pam is not correct');
  });

  pipe2pam.on('reset', () => {
    console.log('reset');
  });

  const ffmpeg = spawn(ffmpegPath, params, { stdio: ['ignore', 'pipe', 'ignore'] });

  ffmpeg.on('error', error => {
    console.log(error);
  });

  ffmpeg.on('exit', (code, signal) => {
    assert(code === 0, `FFMPEG exited with code ${code} and signal ${signal}`);
    assert(pamCounter === pamCount, `did not get ${pamCount} pams`);
  });

  ffmpeg.stdout.pipe(pipe2pam);
});
