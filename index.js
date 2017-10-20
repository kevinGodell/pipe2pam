// jshint esversion: 6, globalstrict: true, strict: true
'use strict';

const util = require('util');
const Transform = require('stream').Transform;

//constructor
function Pipe2Pam() {
    if (!(this instanceof Pipe2Pam)) {
        return new Pipe2Pam();
    }
    //set objectMode to true so that we can pipe objects instead of just strings
    Transform.call(this, {objectMode: true});
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
        //P7\n = 0x50 0x37 0x0A
        if (chunk[i] === 0x50 && chunk[i + 1] === 0x37 && chunk[i + 2] === 0x0A) {
            this._soi = i;
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
                    //determine which pam parser to use based on size of pam relative to size of chunk
                    this._chunksNeeded = Math.ceil(this._loi / length);
                    if (this._chunksNeeded > 1) {
                        this._chunksCounter = 0;
                        this._chunks = [];
                        this._parseChunk = this._findBigPam;//pam image spans across more than 1 chunk
                    } else {
                        this._parseChunk = this._findSmallPam;//pam image(s) exist in only 1 chunk
                    }
                    //start parsing this chunk for pam image
                    this._parseChunk(chunk);
                    break;
                }
            }
            break;
        }
    }
};

//pam considered big because its file size exceeds 1 piped chunk
Pipe2Pam.prototype._findBigPam = function (chunk) {
    this._chunks[this._chunksCounter++] = chunk;
    if (this._chunksCounter === this._chunksNeeded) {
        const pam = Buffer.concat(this._chunks, this._loi);
        const data = {pam: pam, headers: pam.slice(0, this._loh), pixels: pam.slice(this._loh), width: this._headers.width, height: this._headers.height, depth: this._headers.depth, maxval: this._headers.maxval, tupltype: this._headers.tupltype, chunks: this._chunksCounter};
        if (this._readableState.pipesCount > 0) {
            this.push(data);
        }
        if (this.listenerCount('pam') > 0) {
            this.emit('pam', data);
        }
        this._chunksCounter = 0;
        this._chunks.length = 0;
    }
};

//pam considered small because it fits within 1 piped chunk, chunk may be packed with a single pam or multiple pams
Pipe2Pam.prototype._findSmallPam = function (chunk) {
    const length = chunk.length;
    if (length === this._loi) {
        const data = {pam: chunk, headers: chunk.slice(0, this._loh), pixels: chunk.slice(this._loh), width: this._headers.width, height: this._headers.height, depth: this._headers.depth, maxval: this._headers.maxval, tupltype: this._headers.tupltype, chunks: 1};
        if (this._readableState.pipesCount > 0) {
            this.push(data);
        }
        if (this.listenerCount('pam') > 0) {
            this.emit('pam', data);
        }
    } else {//assumed to be less because of calculation of image size vs chunk size done in findHeaders()
        const pamsPerChunk = length / this._loi;
        for (let i = 0, soi = 0, sop = this._loh, eoi = this._loi; i < pamsPerChunk; i++, soi += this._loi, sop += this._loi, eoi += this._loi) {
            const data = {pam: chunk.slice(soi, eoi), headers: chunk.slice(soi, sop), pixels: chunk.slice(sop, eoi), width: this._headers.width, height: this._headers.height, depth: this._headers.depth, maxval: this._headers.maxval, tupltype: this._headers.tupltype, chunks: 1};
            if (this._readableState.pipesCount > 0) {
                this.push(data);
            }
            if (this.listenerCount('pam') > 0) {
                this.emit('pam', data);
            }
        }
    }
};

//read data from pipe
Pipe2Pam.prototype._transform = function (chunk, encoding, callback) {
    this._parseChunk(chunk);
    callback();
};

//reset some values
Pipe2Pam.prototype._flush = function (callback) {
    //this._buffer = Buffer.allocUnsafe(0);
    delete this._headers;
    delete this._soi;
    delete this._loh;
    delete this._lop;
    delete this._loi;
    delete this._eoi;
    delete this._chunksCounter;
    delete this._chunks;
    this._parseChunk = this._findHeaders;
    callback();
};

module.exports = Pipe2Pam;