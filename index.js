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
    //needed if pam image byte length is larger than chunk size(mac 8192, unbuntu 65535, windows ~ 93000+)
    this._buffer = Buffer.allocUnsafe(0);
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
                    //only needed to find first header, now only parse for whole pam image
                    this._parseChunk = this._findPam;
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
        } else {
            let data = {pam: this._buffer.slice(this._soi, this._eoi), headers: this._buffer.slice(this._soi, this._soi + this._loh), pixels: this._buffer.slice(this._soi + this._loh, this._eoi), width: this._headers.width, height: this._headers.height, depth: this._headers.depth, maxval: this._headers.maxval, tupltype: this._headers.tupltype};
            if (this._readableState.pipesCount > 0) {
                this.push(data);
            }
            if (this.listenerCount('pam') > 0) {
                this.emit('pam', data);
            }
            if (bufferLength === this._eoi) {
                this._buffer = Buffer.allocUnsafe(0);
                this._soi = 0;
                this._eoi = this._loi;
                break;
            } else {
                this._soi = this._eoi;
                this._eoi = this._soi + this._loi;
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
    this._buffer = Buffer.allocUnsafe(0);
    delete this._headers;
    delete this._soi;
    delete this._loh;
    delete this._lop;
    delete this._loi;
    delete this._eoi;
    this._parseChunk = this._findHeaders;
    callback();
};

module.exports = Pipe2Pam;
//todo: to avoid multiple if-else statements, in findHeader function, change chunk parser based on whether receiving single image per chunk, multiple images per chunk, or single image spread across multiple chunks