// jshint esversion: 6, globalstrict: true, strict: true
'use strict';
const P2P = require('../index');
const spawn = require('child_process').spawn;
let counter = 0;

const params = [
    '-loglevel',
    'quiet',
    '-max_delay',
    '0',
    '-f',
    'rtsp',
    '-rtsp_transport',
    'udp',
    '-stimeout',
    '10000000',
    '-i',
    'rtsp://192.168.1.9:554/user=admin_password=pass_channel=1_stream=0.sdp',
    '-an',
    '-c:v',
    'pam',
    '-f',
    'image2pipe',
    '-pix_fmt',
    //'rgb24',
    //'rgba',
    //'rgb48be',
    //'rgba64be',
    'gray',
    //'ya8',
    //'gray16be',
    //'ya16be',
    //'monob',
    '-vf',
    'fps=1',
    '-vsync',
    '0',
    '-s',
    '640x360',
    '-frames',
    '100',
    'pipe:1'
];

const p2p = new P2P();

p2p.on('pam', function(data) {
    console.log(data);
    console.log('received pam', ++counter);
});

const ffmpeg = spawn('ffmpeg', params);

ffmpeg.on('error', function(error) {
    console.log(error);
});

ffmpeg.on('exit', function(code, signal) {
    console.log('exit', code, signal);
});

ffmpeg.stdout.pipe(p2p);