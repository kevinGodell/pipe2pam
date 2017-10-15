// jshint esversion: 6, globalstrict: true, strict: true
'use strict';
const P2P = require('../index');
const spawn = require('child_process').spawn;
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
    //'rgb24',
    //'rgba',
    'gray',
    //'monob',
    '-vf',
    'fps=1,scale=iw*1/5:ih*1/5',
    '-frames',
    '10',
    'pipe:1'
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
    //'rgba',
    //'gray',
    //'monob',
    '-vf',
    'fps=1,scale=iw*1/6:ih*1/6',
    '-frames',
    '10',
    'pipe:1'
];

const p2p = new P2P();

p2p.on('pam', (data) => {
    console.log(`received pam1: ${++counter} data: ${data}`);
});

const ffmpeg = spawn('ffmpeg', params);

ffmpeg.on('error', (error) => {
    console.log(error);
});

ffmpeg.on('exit', (code, signal) => {
    console.log(`exit ${code} ${signal}`);
});

ffmpeg.stdout.pipe(p2p);

/////create second ffmpeg pam piping

const p2p2 = new P2P();

p2p2.on('pam', (data) => {
    console.log(`received pam2: ${++counter2} data: ${data}`);
});

const ffmpeg2 = spawn('ffmpeg', params2);

ffmpeg2.on('error', (error) => {
    console.log(error);
});

ffmpeg2.on('exit', (code, signal) => {
    console.log(`exit ${code} ${signal}`);
});

ffmpeg2.stdout.pipe(p2p2);