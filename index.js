'use strict';

const { Transform } = require('node:stream');

const BufferPool = require('./lib/buffer-pool');

class Pipe2Pam extends Transform {
  static #SOI = Pipe2Pam.#markerFrom([0x50, 0x37, 0x0a]); // start of image, P7\n
  static #EOH = Pipe2Pam.#markerFrom([0x45, 0x4e, 0x44, 0x48, 0x44, 0x52, 0x0a]); // end of headers, ENDHDR\n

  #parseChunk = this.#parseHeaders;
  #bufferConcat = Buffer.concat;

  #bufferPool;
  #poolLength;
  #data;
  #headers;
  #headersBuffer;
  #pixelsIndex;
  #pixelsLength;
  #totalLength;
  #chunks = [];
  #chunksTotalLength = 0;

  constructor(options) {
    super({ writableObjectMode: false, readableObjectMode: true });
    options = options && typeof options === 'object' ? options : {};
    if (+options.pool > 0) {
      this.#bufferPool = new BufferPool({ length: +options.pool + 1 });
      this.#poolLength = this.#bufferPool.length;
      this.#bufferConcat = this.#bufferPool.concat.bind(this.#bufferPool);
    }
  }

  reset() {
    this.emit('reset');
    this.#data = undefined;
    this.#headers = undefined;
    this.#pixelsIndex = undefined;
    this.#pixelsLength = undefined;
    this.#totalLength = undefined;
    this.#chunks = [];
    this.#chunksTotalLength = 0;
    this.#parseChunk = this.#parseHeaders;
    if (this.#bufferPool) {
      this.#bufferPool.reset();
    }
  }

  #parseHeaders(chunk) {
    const soiIdx = chunk.indexOf(Pipe2Pam.#SOI, 0);
    const eohIdx = chunk.indexOf(Pipe2Pam.#EOH, soiIdx);
    if (soiIdx !== -1 && eohIdx !== -1) {
      const headers = chunk
        .subarray(soiIdx + 3, eohIdx - 1)
        .toString()
        .toLowerCase()
        .split('\n');
      this.#headers = {};
      headers.forEach(item => {
        const [name, value] = item.split(' ');
        this.#headers[name] = Number.isNaN(+value) ? value : +value;
      });
      this.#pixelsIndex = eohIdx + 7 - soiIdx;
      this.#pixelsLength = this.#headers.width * this.#headers.height * this.#headers.depth * (this.#headers.maxval === 65535 ? 2 : 1);
      this.#totalLength = this.#pixelsIndex + this.#pixelsLength;
      this.#headersBuffer = Buffer.allocUnsafeSlow(this.#pixelsIndex);
      chunk.copy(this.#headersBuffer, 0, 0, this.#pixelsIndex);
      this.emit('initialized', {
        headers: this.#headers,
      });
      this.#data = {
        width: this.#headers.width,
        height: this.#headers.height,
        depth: this.#headers.depth,
        maxval: this.#headers.maxval,
        tupltype: this.#headers.tupltype,
        // pixelsIndex: this.#pixelsIndex,
        // pixelsLength: this.#pixelsLength,
        // totalLength: this.#totalLength,
        headers: this.#headersBuffer,
        pixels: null,
        pam: null,
      };
      this.#parseChunk = this.#parsePam;
      if (soiIdx > 0) {
        chunk = chunk.subarray(soiIdx);
      }
      this.#parseChunk(chunk);
    }
  }

  #parsePam(chunk) {
    const chunkLength = chunk.length;
    this.#chunks.push(chunk);
    this.#chunksTotalLength += chunkLength;
    if (this.#chunksTotalLength < this.#totalLength) {
      return;
    }
    const nextChunkLength = this.#chunksTotalLength - this.#totalLength;
    const buffer = this.#chunks.length === 1 ? (nextChunkLength > 0 ? chunk.subarray(0, this.#totalLength) : chunk) : this.#bufferConcat(this.#chunks, this.#totalLength);
    this.#data.pam = buffer;
    this.#data.pixels = buffer.subarray(this.#pixelsIndex, this.#totalLength);
    this.emit('data', this.#data);
    this.#chunks = [];
    this.#chunksTotalLength = 0;
    if (nextChunkLength > 0) {
      const nextChunk = chunk.subarray(chunkLength - nextChunkLength);
      this.#parseChunk(nextChunk);
    }
  }

  _transform(chunk, encoding, callback) {
    this.#parseChunk(chunk);
    callback();
  }

  _flush(callback) {
    this.reset();
    callback();
  }

  // _final(callback) {
  // console.log('final');
  // console.log(callback.toString());
  // callback();
  // }

  static #markerFrom(arr) {
    const buffer = Buffer.allocUnsafeSlow(arr.length);
    for (let i = 0; i < arr.length; ++i) {
      buffer[i] = arr[i];
    }
    return buffer;
  }
}

module.exports = Pipe2Pam;
