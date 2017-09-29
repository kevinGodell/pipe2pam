// jshint esversion: 6, globalstrict: true, strict: true
'use strict';
const P2P = require('../index');
const PamDiff = require('../index2');
const spawn = require('child_process').spawn;
let counter = 0;

const params = [
    //silence the logs so we can use all pipes from ffmpeg
    '-loglevel',
    'quiet',
    
    //create artificial video input with width 1280 and height 720 and 10 fps
    /*'-re',
    '-f',
    'lavfi',
    '-i',
    'testsrc=size=1280x720:rate=10',*/
    
    '-i',
    'rtsp://192.168.1.5:554/user=admin_password=pass_channel=1_stream=0.sdp',
    
    //transcode video to pam images
    '-an',
    '-c:v',
    'pam',
    '-f',
    'image2pipe',
    
    //use pixel format gray so that we have less pixel data to manage
    '-pix_fmt',
    //'rgb24',
    'rgba',
    //'rgb48be',
    //'rgba64be',
    //'gray',
    //'ya8',
    //'gray16be',
    //'ya16be',
    //'monob',
    
    //lower framerate to 1 fps for image output
    '-vf',
    'fps=1',
    
    //reduce size of images so that we have less data to manage
    '-s',
    '320x180',
    
    //limit frame count to 100 and exit ffmpeg
    '-frames',
    '100',
    
    //pipe data to stdout
    'pipe:1'
];

const p2p = new P2P();

p2p.on('pam', function(data) {
    console.log(`received pam ${++counter}`);
});

const pamDiff = new PamDiff({rgb2gray: 'luminosity', sensitivity: 10, threshold: 100});

pamDiff.on('diff', function(data) {
   console.log(`${data.coords.length} pixels different, percent ${data.percent}`);
});

const ffmpeg = spawn('ffmpeg', params);

ffmpeg.stdout.on('data', function(data) {
    console.log(data.length);
});

ffmpeg.on('error', function(error) {
    console.log(error);
});

ffmpeg.on('exit', function(code, signal) {
    console.log('exit', code, signal);
});

ffmpeg.stdout.pipe(p2p).pipe(pamDiff);