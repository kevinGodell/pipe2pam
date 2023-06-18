# pipe2pam
###### [![Buy me a coffee](https://img.shields.io/badge/-buy%20me%20a%20coffee-red?logo=buy%20me%20a%20coffee)](https://buymeacoffee.com/kevinGodell) [![Donate via PayPal](https://img.shields.io/badge/Donate-Paypal-blue)](https://www.paypal.com/donate/?business=HTMERJAFHJJEU&no_recurring=0&item_name=support+open+source+software+development&currency_code=USD) [![build](https://github.com/kevinGodell/pipe2pam/actions/workflows/node.js.yml/badge.svg)](https://github.com/kevinGodell/pipe2pam/actions/workflows/node.js.yml) [![Build status](https://ci.appveyor.com/api/projects/status/v29p3vhykt756hvc/branch/master?svg=true)](https://ci.appveyor.com/project/kevinGodell/pipe2pam/branch/master) [![GitHub issues](https://img.shields.io/github/issues/kevinGodell/pipe2pam.svg)](https://github.com/kevinGodell/pipe2pam/issues) [![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://raw.githubusercontent.com/kevinGodell/pipe2pam/master/LICENSE) [![npm](https://img.shields.io/npm/dt/pipe2pam.svg?style=flat-square)](https://www.npmjs.com/package/pipe2pam)
Parse individual pam images from an ffmpeg pipe when the output video codec (*-c:v*) is set to **pam** and the format (*-f*) is set to **image2pipe**. The supported pixel formats (*-pix_fmt*) are **rgb24**, **rgba**, **gray**, and **monob**. Pam is an image type similar to ppm, pbm, and pgm. It has a small header that is followed by an uncompressed array of pixel data. This can be used as an alternate way to get pixel data instead of generating jpegs and using canvas. It is currently being used for a video motion detection project.
### installation:
```
npm install pipe2pam --save
```
### usage:
The following [example](https://github.com/kevinGodell/pipe2pam/blob/master/examples/example.js) uses ffmpeg's **testsrc** to simulate a video input and generates 100 downscaled grayscale pam images at a rate of 1 per second. The pam images are piped in from ffmpeg's stdout and output a pam image object. Pipe2Pam dispatches a "data" event, which contains a pam image object. The object contains the entire pam image, plus additional data such as width, height, depth, maxval, tupltype, and an array of pixels. It can also pipe the object to a [pipe reader](https://github.com/kevinGodell/pam-diff) for further use, such as pixel comparison between 2 pam images:
```javascript
const Pipe2Pam = require('pipe2pam');

const { spawn } = require('child_process');

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
    //'rgb24',
    //'rgba',
    'gray',
    //'monob',
    '-vf',
    'fps=1,scale=iw*1/6:ih*1/6',
    '-frames',
    '100',
    'pipe:1'
];

const pipe2pam = new Pipe2Pam();

pipe2pam.on('data', (data) => {
    console.log(data);
    console.log('received pam', ++counter);
});

const ffmpeg = spawn('ffmpeg', params);

ffmpeg.on('error', (error) => {
    console.log(error);
});

ffmpeg.on('exit', (code, signal) => {
    console.log('exit', code, signal);
});

ffmpeg.stdout.pipe(pipe2pam);
```
### testing:
Clone the repository
```
git clone https://github.com/kevinGodell/pipe2pam.git
```
Change into the directory
```
cd pipe2pam
```
Initialize with npm
```
npm install
```
Start the tests
```
npm test
```
