# pipe2pam
Parse individual pam images from an ffmpeg pipe when output video codec(-c:v) is set to pam and format(-f) is set to image2pipe. Pam is an image type similar to ppm, pbm, and pgm. It has a small header that is followed by an uncompressed array of pixel data.

###installation:
``` 
npm install pipe2pam --save
```
###usage:
```
const P2P = require('pipe2pam');
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
```

Pipe2Pam dispatches a "pam" event, which contains an object. It can also pipe the object to a pipe reader. The object contains the entire pam image, plus additional data such as width, height, depth, maxval, and an array of pixels.
