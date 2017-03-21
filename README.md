# pipe2pam
Parse individual pam images from an ffmpeg pipe when output video codec(-c:v) is set to pam and format(-f) is set to image2pipe. Pam is an image type similar to ppm, pbm, and pgm. It has a small header that is followed by an uncompressed array of pixel data.

##installation:
``` 
npm install pipe2pam --save
```
##usage:
```
const P2P = require('pipe2pam');
const spawn = require('child_process').spawn;
let counter = 0;

const params = [
    '-loglevel',
    'quiet',
    '-i',
    'rtsp://192.168.1.9:554/user=admin_password=pass_channel=1_stream=0.sdp',
    '-frames',
    '100',
    '-pix_fmt',
    'rgb24',
    '-c:v',
    'pam',
    '-vf',
    'fps=1',
    '-vsync',
    '0',
    '-f',
    'image2pipe',
    '-s',
    '640x360',
    'pipe:1'
];

const p2p = new P2P();

p2p.on('pam', function(pam, headers, sop, length) {
    console.log(pam);
    console.log(headers);
    console.log('size of pam image', length);
    console.log('start index of pixels', sop);
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