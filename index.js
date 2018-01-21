'use strict';

const util = require('util');
const Transform = require('stream').Transform;

//constructor
function Pipe2Pam() {
    if (!(this instanceof Pipe2Pam)) {
        return new Pipe2Pam();
    }
    //set readableObjectMode to true so that we can push objects out
    //set writableObjectMode to false since we only support receiving buffer
    Transform.call(this, {writableObjectMode: false, readableObjectMode: true});
    //parsing first chunk should be looking for image header info
    this._parseChunk = this._findHeaders;
}

util.inherits(Pipe2Pam, Transform);

//parse headers into object with values for width, height, depth, maxval, and tupltype
Pipe2Pam.prototype._parseHeaders = function (data) {
    const headersArr = data.toString().toLowerCase().split('\n');
    const headersObj = {};
    for (let i = 0, headerArr, length = headersArr.length; i < length; i++) {
        headerArr = headersArr[i].split(' ');
        headersObj[headerArr[0]] = headerArr[1];
    }
    return headersObj;
};

//find pam headers and reassign this._parseChunk to Pipe2Pam.prototype._findPam
Pipe2Pam.prototype._findHeaders = function (chunk) {
    for (let i = 0, length = chunk.length; i < length; i++) {
        //find start of image P7\n = 0x50 0x37 0x0A
        if (chunk[i] === 0x50 && chunk[i + 1] === 0x37 && chunk[i + 2] === 0x0A) {
            this._soi = i;//might return if this._soi !== 0
            i += 56;
            for (i; i < length; i++) {
                //DR\n = 0x44 0x52 0x0A
                if (chunk[i] === 0x44 && chunk[i + 1] === 0x52 && chunk[i + 2] === 0x0A) {
                    //cache headers
                    this._headers = this._parseHeaders(chunk.slice(this._soi + 3, i - 5));
                    //byte length of headers
                    this._loh = (i + 3) - this._soi;
                    //byte length of pixel data, possible values for MAXVAL are 1, 255, 65535
                    this._lop = this._headers.width * this._headers.height * this._headers.depth * (this._headers.maxval === 65535 ? 2 : 1);
                    //byte length of image
                    this._loi = this._loh + this._lop;
                    //eoi position
                    this._eoi = this._soi + this._loi;
                    //only needed to find first header, now only parse for whole pam image
                    this._parseChunk = this._findPam;
                    //push chunks into array until we have enough to make a complete pam image
                    this._chunks = [];
                    //length of chunks array
                    this._chunksLength = 0;
                    // total length of bytes in chunks array
                    this._chunksTotalLength = 0;
                    //start parsing this chunk for pam image
                    this._parseChunk(chunk);
                    break;
                }
            }
            break;
        }
    }
};

Pipe2Pam.prototype._findPam = function (chunk) {
    const chunkLength = chunk.length;
    this._chunks.push(chunk);
    this._chunksLength++;
    this._chunksTotalLength += chunkLength;
    if (this._loi === this._chunksTotalLength) {
        const buffer = Buffer.concat(this._chunks, this._loi);
        const data = {pam: buffer, headers: buffer.slice(0, this._loh), pixels: buffer.slice(this._loh), width: this._headers.width, height: this._headers.height, depth: this._headers.depth, maxval: this._headers.maxval, tupltype: this._headers.tupltype, chunks: this._chunksLength};
        if (this._readableState.pipesCount > 0) {
            this.push(data);
        }
        if (this.listenerCount('pam') > 0) {
            this.emit('pam', data);
        }
        this._chunks = [];
        this._chunksLength = 0;
        this._chunksTotalLength = 0;
    } else if (this._loi < this._chunksTotalLength) {
        const divided = Math.floor(this._chunksTotalLength / this._loi);
        const remainder = this._chunksTotalLength % this._loi;
        const buffer = Buffer.concat(this._chunks, this._chunksTotalLength);
        for (let i = 0, soi = 0, sop = this._loh, eoi = this._loi; i < divided; i++, soi += this._loi, sop += this._loi, eoi += this._loi) {
            const data = {pam: buffer.slice(soi, eoi), headers: buffer.slice(soi, sop), pixels: buffer.slice(sop, eoi), width: this._headers.width, height: this._headers.height, depth: this._headers.depth, maxval: this._headers.maxval, tupltype: this._headers.tupltype, chunks: this._chunksLength};
            if (this._readableState.pipesCount > 0) {
                this.push(data);
            }
            if (this.listenerCount('pam') > 0) {
                this.emit('pam', data);
            }
        }
        this._chunks = [];
        this._chunksLength = 0;
        this._chunksTotalLength = 0;
        if (remainder !== 0) {
            this._chunks.push(chunk.slice(chunkLength - remainder));
            this._chunksLength++;
            this._chunksTotalLength += remainder;
        }
    }
};

//read data from pipe
Pipe2Pam.prototype._transform = function (chunk, encoding, callback) {
    this._parseChunk(chunk);
    callback();
};

//flush
Pipe2Pam.prototype._flush = function (callback) {
    this.resetCache();
    callback();
};

//reset and delete some cached values
Pipe2Pam.prototype.resetCache = function () {
    delete this._headers;
    delete this._soi;
    delete this._loh;
    delete this._lop;
    delete this._loi;
    delete this._eoi;
    delete this._chunks;
    delete this._chunksLength;
    delete this._chunksTotalLength;
    this._parseChunk = this._findHeaders;
};

module.exports = Pipe2Pam;