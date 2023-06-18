'use strict';

console.time('🎉 =====> various_sizes');

const { readFileSync } = require('fs');

const assert = require('assert');

const Pipe2Pam = require('../../index');

const pamFiles = ['320x180-gray', '320x180-rgb24', '640x360-gray', '640x360-rgb24', '1280x720-gray', '1280x720-rgb24'];

const pipe2pamConfigs = [{ pool: 0 }, { pool: 1 }, { pool: 2 }];

pamFiles.forEach(pamFile => {
  const pam1 = readFileSync(`${__dirname}/${pamFile}-1.pam`);

  const split = Math.floor(pam1.length / 4);

  const pam1sub1 = pam1.subarray(0, split);

  const pam1sub2 = pam1.subarray(split);

  const pam2 = readFileSync(`${__dirname}/${pamFile}-2.pam`);

  const combined1 = Buffer.concat([pam1, pam2]);

  const combined2 = Buffer.concat([pam2, pam1sub1]);

  pipe2pamConfigs.forEach(pipe2pamConfig => {
    let pixelsLength;

    let pamCounter = 0;

    const pipe2pam = new Pipe2Pam(pipe2pamConfig);

    pipe2pam.on('initialized', data => {
      pixelsLength = +data.headers.width * +data.headers.height * +data.headers.depth * (+data.headers.maxval === 65535 ? 2 : 1);
    });

    pipe2pam.on('pam', data => {
      pamCounter++;

      assert(data.pixels.length === pixelsLength);
    });

    const limit = 1000;

    const [size, format] = pamFile.split('-');

    const { pool } = pipe2pamConfig;

    const consoleTime = `✅  size=${size} format=${format} pool=${pool}`;

    console.time(consoleTime);

    for (let i = 0; i < limit; ++i) {
      pipe2pam.write(pam1);

      pipe2pam.write(pam1sub1);

      pipe2pam.write(pam1sub2);

      pipe2pam.write(pam2);

      pipe2pam.write(combined1);

      pipe2pam.write(combined2);

      pipe2pam.write(pam1sub2);
    }

    console.timeEnd(consoleTime);

    assert(pamCounter === 7 * limit);
  });
});

console.timeEnd('🎉 =====> various_sizes');
