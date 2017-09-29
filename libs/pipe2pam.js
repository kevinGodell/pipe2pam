// jshint esversion: 6, globalstrict: true, strict: true
'use strict';

const util = require('util');
const Transform = require('stream').Transform;

function Pipe2Pam() {
    if (!(this instanceof Pipe2Pam)) {
        return new Pipe2Pam();
    }
    Transform.call(this, {objectMode: true});//set objectMode to true so that we can pipe objects instead of just strings
    this._buffer = Buffer.allocUnsafe(0);//needed if pam image byte length is larger than chunk size(mac 8192, unbuntu 65535, windows ~ 93000+)
    this._headers = null;//header data, should be cached and used for all subsequent pam images in current piping
    this._soi = null;//start of image (P7\n)
    this._loh = null;//byte length of headers (from P7/n to ENDHDR\n), also is start index of pixels
    this._lop = null;//byte length of pixels (this._headers.WIDTH * this._headers.HEIGHT * this._headers.DEPTH * MAXVAL-multiplier)
    this._loi = null;//byte length of image
    this._eoi = null;//should be this._soi + this._loi(this._loh + this._lop)
    this._parseChunk = Pipe2Pam.prototype._findHeaders;
}

util.inherits(Pipe2Pam, Transform);

//parse headers into object with values for width, height, depth, maxval, and tupltype
Pipe2Pam.prototype._parseHeaders = function(data) {
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
    for (let i = 0, len = chunk.length; i < len; i++) {
        if (chunk[i] === 0x50 && chunk[i + 1] === 0x37 && chunk[i + 2] === 0x0A) {//P7\n = 0x50 0x37 0x0A
            this._soi = i;
            i += 56;
            for (i; i < len; i++) {
                if (chunk[i] === 0x44 && chunk[i + 1] === 0x52 && chunk[i + 2] === 0x0A) {//DR\n = 0x44 0x52 0x0A
                    //cache headers
                    this._headers = this._parseHeaders(chunk.slice(this._soi + 3, i - 5));
                    //byte length of headers
                    this._loh = (i + 3) - this._soi;
                    //byte length of pixel data
                    this._lop = this._headers.width * this._headers.height * this._headers.depth * (this._headers.maxval === 65535 ? 2 : 1);//possible values for MAXVAL are 1, 255, 65535
                    //byte length of image
                    this._loi = this._loh + this._lop;
                    //eoi position
                    this._eoi = this._soi + this._loi;
                    //only needed to find first header, now only parse for whole pam image
                    this._parseChunk = Pipe2Pam.prototype._findPam;
                    //start parsing this chunk for pam image
                    this._parseChunk(chunk);
                    break;
                }
            }
            break;
        }
    }
};


//find complete pam image and pass along to pipe and emit event
Pipe2Pam.prototype._findPam = function (chunk) {
    this._buffer = Buffer.concat([this._buffer, chunk]);
    const bufferLength = this._buffer.length;
    while (true) {
        if (bufferLength < this._eoi) {
            if (this._soi > 0) {
                this._buffer = this._buffer.slice(this._soi);
            }
            this._soi = 0;
            this._eoi = this._loi;
            break;
        } else if (bufferLength === this._eoi) {
            let data = {pam: this._buffer.slice(this._soi, this._eoi), pixels: this._buffer.slice(this._loh, this._eoi), width: this._headers.width, height: this._headers.height, depth: this._headers.depth, maxval: this._headers.maxval, tupltype: this._headers.tupltype};
            this.emit('pam', data);
            //only push data if other pipe is consuming it, otherwise pipe will stop flowing when highwatermark(16) is reached
            if (this._readableState.pipesCount > 0) {
                this.push(data);
            }
            this._buffer = Buffer.allocUnsafe(0);
            this._soi = 0;
            this._eoi = this._loi;
            break;
        } else {
            let data = {pam: this._buffer.slice(this._soi, this._eoi), pixels: this._buffer.slice(this._loh, this._eoi), width: this._headers.width, height: this._headers.height, depth: this._headers.depth, maxval: this._headers.maxval, tupltype: this._headers.tupltype};
            this.emit('pam', data);
            if (this._readableState.pipesCount > 0) {
                this.push(data);
            }
            this._soi = this._eoi;
            this._eoi = this._soi + this._loi;
        }
    }
};

Pipe2Pam.prototype._transform = function (chunk, encoding, callback) {
    this._parseChunk(chunk);
    callback();
};

Pipe2Pam.prototype._flush = function (callback) {
    this._buffer = Buffer.allocUnsafe(0);
    this._headers = null;
    this._soi = null;
    this._loh = null;
    this._lop = null;
    this._loi = null;
    this._eoi = null;
    this._parseChunk = Pipe2Pam.prototype._findHeaders;
    callback();
};

module.exports = Pipe2Pam;