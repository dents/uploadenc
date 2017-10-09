'use strict';

const fs = require('fs');
const crypto = require('crypto');
const https = require('https');
const util = require('util');
const path = require('path');

const AWS = require('aws-sdk');
const s3 = new AWS.S3();

const moment = require('moment');

const simpleMemoryStream = require('./simpleMemoryStream.js');
const config = require('./config.js');

const startupUID = crypto.randomBytes(16).toString('hex');
const startupTime = moment().format('YYYY-MM-DD_HH-mm-ss-SSSS');
const header = `${startupTime}_${startupUID}`;
console.log('Starting ' + header);

let _reqCount = 0;

const pubKey = fs.readFileSync(config.encryptToPub, 'utf8');

const httpsOptions = {
    key: fs.readFileSync(config.httpsKey, 'utf8'),
    cert: fs.readFileSync(config.httpsCert, 'utf8'),
    ca: [
        fs.readFileSync(config.httpsCA, 'utf8'),
    ]
}

const server = https.createServer(httpsOptions, function (req, res) {
    req.on('error', function (err) {
        console.log('error in req: ' + util.inspect(err));
    });
    res.on('error', function (err) {
        console.log('error in res: ' + util.inspect(err));
    });

    if (req.url == '/') {
        fs.readFile('index.html', function (err, data) {
            res.writeHead(200, {
                'content-type': 'text/html'
            });
            res.write(data);
            res.end();
        });
    } else if (req.url == '/key.pub') {
        fs.readFile('key.pub', function (err, data) {
            res.writeHead(200, {
                'content-type': 'text/plain'
            });
            res.write(data);
            res.end();
        });
    } else if (req.url == '/check.png') {
        fs.readFile('check.png', function (err, data) {
            res.writeHead(200, {
                'content-type': 'image/png'
            });
            res.end(data, 'binary');
        });
    } else if (req.url == '/alive.php') {
        res.writeHead(200, {
            'content-type': 'text/html'
        });
        res.end();
    } else if (req.url == '/upload.do') {
        res.setTimeout(0);

        const currentReq = ++_reqCount;
        let totalLen = 0;
        let chunkCount = 0;

        // generate random key/IV for every file
        const aesIV = crypto.randomBytes(128 / 8);
        const aesKey = crypto.randomBytes(256 / 8);

        // ecnrypt generated key to the public key we have in config
        var cryptedAesKey = crypto.publicEncrypt(pubKey, aesKey);

        // anything written to here gets uploaded to s3
        const cryptedData = new simpleMemoryStream();

        // start watching cryptedData for changes and upload as they come
        const uploader = s3.upload({
            Bucket: config.s3Bucket,
            Key: header + '_' + currentReq + '.bin',
            Body: cryptedData
        }, function (err, uploadResult) {
            if (err) {
                console.error(`Error creating S3 upload: ${err}`);
                return;
            }
            // TODO: track this
        });
        uploader.on('httpUploadProgress', (progress) => {
            // TODO: track this
        });

        var aes = crypto.createCipheriv('aes-256-cbc', aesKey, aesIV);
        aes.on('data', function (chunk) {
            cryptedData.write(chunk);
        });
        aes.on('end', function () {
            cryptedData.finish();
            cryptedData.end();
        });

        // first write header
        cryptedData.write(aesIV);
        cryptedData.write(cryptedAesKey);

        var hash = crypto.createHash('sha512');
        hash.write(aesIV);
        hash.write(aesKey);

        var reqHeaders = JSON.stringify(req.headers);
        if (reqHeaders.length > 0xFFFFFFFF) {
            // writeUInt32LE can't handle integers over 0xFFFFFFFF
            console.log('headers are too big, skipping request ' + reqHeaders.length);
            res.end();
            return;
        }

        var cryptedHeader = new Buffer(1 + 4 + reqHeaders.length);
        cryptedHeader.writeUInt8(2, 0); // format version
        cryptedHeader.writeUInt32LE(reqHeaders.length, 1);
        cryptedHeader.write(reqHeaders, 5);

        aes.write(cryptedHeader);
        hash.write(cryptedHeader);

        req.on('data', function (chunk) {
            totalLen += chunk.length;
            ++chunkCount;

            aes.write(chunk);
            hash.write(chunk);
        });

        req.on('end', function () {
            hash.end();
            var hashDigest = hash.read();
            aes.write(hashDigest);
            aes.write(aesIV);
            aes.end();

            res.writeHead(200, {
                'content-type': 'text/html'
            });
            res.write('<img src="check.png" /><br />');
            res.write('received ' + totalLen + ' bytes in ' + chunkCount + ' chunks');
            res.end();
        });
    } else {
        res.writeHead(404, {
            'content-type': 'text/plain'
        });
        res.end();
    }
});
server.on('connection', function (socket) {
    socket.setNoDelay(true);
});
server.setTimeout(0);
server.listen(config.listenPort, config.listenAddr, null, () => {
    // drop privileges on POSIX os (needed if binding to port 80 or 443)
    if (process.setuid && process.setgid) {
        try {
            process.setgid(config.processGID);
            process.setuid(config.processUID);
            console.log(` listening on ${config.listenAddr}:${config.listenPort} as ${process.getuid()}/${process.getgid()}`);
        } catch (err) {
            console.error('FAILED TO CHANGE USER: ' + err);
            process.exit(1);
        }
    } else {
        console.log(` listening on ${config.listenAddr}:${config.listenPort}`);
    }
});