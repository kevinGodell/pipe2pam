// jshint esversion: 6, globalstrict: true, strict: true
'use strict';

console.time('==========> single pam packed into single piped chunk');

const assert = require('assert');

const P2P = require('../index');

const spawn = require('child_process').spawn;

const pamCount = 10;

const fps = 1;

const scale = 1/50;

let pamCounter = 0;

const params = [
    /* log info to console */
    '-loglevel',
    'info',
    
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
    'pipe:1'
];

const p2p = new P2P();

p2p.on('pam', (data) => {
    pamCounter++;
    assert(data.width * data.height * data.depth === data.pixels.length, 'Pixels are not the correct length');
    assert(data.headers.length + data.pixels.length === data.pam.length, 'Headers plus pixels are not the correct length');
    const pam = data.pam;
    assert(pam[0] === 0x50 && pam[1] === 0x37 && pam[2] === 0x0A, 'Start of pam is not correct');
});

const ffmpeg = spawn('ffmpeg', params, {stdio: ['ignore', 'pipe', 'inherit']});

ffmpeg.on('error', (error) => {
    console.log(error);
});

ffmpeg.on('exit', (code, signal) => {
    assert(code === 0, `FFMPEG exited with code ${code} and signal ${signal}`);
    assert(pamCounter === pamCount, `did not get ${pamCount} pams`);
    console.timeEnd('==========> single pam packed into single piped chunk');
});

ffmpeg.stdout.pipe(p2p);