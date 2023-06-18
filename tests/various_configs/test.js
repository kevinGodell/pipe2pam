'use strict';

console.time('🎉 =====> various_configs');

const assert = require('assert');

const { spawn } = require('child_process');

const ffmpegPath = require('../../lib/ffmpeg');

const Pipe2Pam = require('../../index');

const soi = Buffer.from([0x50, 0x37, 0x0a]); // start of image, P7\n

const eoh = Buffer.from([0x45, 0x4e, 0x44, 0x48, 0x44, 0x52, 0x0a]); // end of headers, ENDHDR\n

const frameLimit = 200;

const ffmpegConfigs = [
  { width: 320, height: 180, scale: 320, fps: 100, pixFmt: 'gray' },
  { width: 320, height: 180, scale: 320, fps: 100, pixFmt: 'rgb24' },
  { width: 640, height: 360, scale: 640, fps: 100, pixFmt: 'gray' },
  { width: 640, height: 360, scale: 640, fps: 100, pixFmt: 'rgb24' },
  { width: 1280, height: 720, scale: 1280, fps: 100, pixFmt: 'gray' },
  { width: 1280, height: 720, scale: 1280, fps: 100, pixFmt: 'rgb24' },
];

const pipe2pamConfigs = [42, '42', undefined, null, {}, { pool: 1 }, { pool: 2 }, { pool: 5 }, { pool: 42 }];

(async () => {
  for (let i = 0, test = 0; i < pipe2pamConfigs.length; ++i) {
    for (let j = 0; j < ffmpegConfigs.length; ++j, ++test) {
      const pipe2pamConfig = pipe2pamConfigs[i];

      const { fps, width, height, pixFmt } = ffmpegConfigs[j];

      const consoleTime = `✅  test-${test}`;

      console.time(consoleTime);

      await new Promise((resolve, reject) => {
        let counter = 0;

        const params = [
          /* log info to console */
          '-loglevel',
          'quiet',
          '-nostats',

          /* use hardware acceleration if available */
          '-hwaccel',
          'auto',

          /* use an artificial video input */
          // '-re',
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
          frameLimit,
          'pipe:1',
        ];

        const pipe2pam = new Pipe2Pam(pipe2pamConfig);

        pipe2pam.on('data', data => {
          counter++;

          const { width, height, depth, maxval, headers, pixels, pam } = data;

          const pixelsLength = +width * +height * +depth * (+maxval === 65535 ? 2 : 1);

          assert(pixels.length === pixelsLength);

          assert(headers.length + pixels.length === pam.length);

          assert(pam.indexOf(soi) === 0);

          assert(headers.indexOf(soi) === 0);

          assert(pam.indexOf(eoh) > 0);

          assert(headers.indexOf(eoh) > 0);
        });

        pipe2pam.once('error', error => {
          reject(error);
        });

        const ffmpeg = spawn(ffmpegPath, params, {
          stdio: ['ignore', 'pipe', 'ignore'],
        });

        ffmpeg.once('error', error => {
          reject(error);
        });

        ffmpeg.once('exit', (code, signal) => {
          // console.log(pipe2pam.toJSON());

          assert(counter === frameLimit, `${counter} !== ${frameLimit}`);

          assert(code === 0, `FFMPEG exited with code ${code} and signal ${signal}`);

          resolve(i);
        });

        ffmpeg.stdio[1].pipe(pipe2pam, { end: true });
      });

      console.timeEnd(consoleTime);
    }
  }

  console.timeEnd('🎉 =====> various_configs');
})();
