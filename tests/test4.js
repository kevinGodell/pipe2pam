'use strict';

const assert = require('assert');

const { spawn } = require('child_process');

const ffmpegPath = require('../lib/ffmpeg');

const P2P = require('../index');

const fps = 100;

const scale = 1 / 2;

console.time(`=====> fps=${fps} scale=${scale} single pam split between multiple piped chunks with overlap`);

const pamCount = 200;

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
  'testsrc=size=1920x1080:rate=15',

  /* set output flags */
  '-an',
  '-c:v',
  'pam',
  '-pix_fmt',
  'rgb24',
  '-f',
  'image2pipe',
  '-vf',
  `fps=${fps},scale=iw*${scale}:ih*${scale}`,
  '-frames',
  pamCount,
  'pipe:1',
];

const p2p = new P2P();

p2p.on('pam', data => {
  pamCounter++;
  assert(data.width * data.height * data.depth === data.pixels.length, 'Pixels are not the correct length');
  assert(data.headers.length + data.pixels.length === data.pam.length, 'Headers plus pixels are not the correct length');
  const pam = data.pam;
  assert(pam[0] === 0x50 && pam[1] === 0x37 && pam[2] === 0x0a, 'Start of pam is not correct');
});

const ffmpeg = spawn(ffmpegPath, params, { stdio: ['ignore', 'pipe', 'ignore'] });

ffmpeg.on('error', error => {
  console.log(error);
});

ffmpeg.on('exit', (code, signal) => {
  assert(code === 0, `FFMPEG exited with code ${code} and signal ${signal}`);
  assert(pamCounter === pamCount, `did not get ${pamCount} pams`);
  console.timeEnd(`=====> fps=${fps} scale=${scale} single pam split between multiple piped chunks with overlap`);
});

ffmpeg.stdout.pipe(p2p);
