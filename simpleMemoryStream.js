const stream = require('stream');
const Duplex = stream.Duplex;
const util = require('util');

function simpleMemoryStream(options) {
    if (!(this instanceof simpleMemoryStream)) {
        return new simpleMemoryStream(options);
    }

    Duplex.call(this, options);

    this.buffer = null;
    this.waiting = false;
}
util.inherits(simpleMemoryStream, Duplex);

simpleMemoryStream.prototype._write = function (chunk, enc, cb) {
    let chunkBuffer = null;

    if (chunk instanceof Buffer) {
        chunkBuffer = chunk;
    } else {
        chunkBuffer = new Buffer(chunk, enc);
    }

    if (this.buffer === null) {
        this.buffer = chunkBuffer;
    } else {
        this.buffer = Buffer.concat([this.buffer, chunkBuffer]);
    }

    if (this.waiting) {
        const keepPushing = this.push(this.buffer);
        this.waiting = keepPushing;
        this.buffer = null; // throw away what was read
    }

    cb();
};

simpleMemoryStream.prototype._read = function readBytes(n) {
    if (this.buffer === null) {
        this.waiting = true;
        return;
    }

    const chunkSize = Math.min(n, this.buffer.byteLength);
    if (chunkSize > 0) {
        const keepPushing = this.push(this.buffer.slice(0, chunkSize));
        this.waiting = keepPushing;
        this.buffer = this.buffer.slice(chunkSize); // throw away what was read
    } else {
        this.waiting = true;
    }
};

simpleMemoryStream.prototype.finish = function () {
    if (this.buffer !== null) {
        this.push(buffer);
    }

    this.push(null);
    this.waiting = false;
    this.buffer = null;
}

module.exports = simpleMemoryStream;