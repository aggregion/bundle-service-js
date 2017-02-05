# Aggregion bundle management library

This library can create, unpack, encrypt and decrypt bundles used in Aggregion.

Support creating from:
* Directory
* PDF-file
* ePub book
* ZIP-archive
* Another bundle (ZIP or binary)
* Any single file

Supported bundles:
* Aggregion binary bundles (with encryption support)
* Aggregion ZIP-bundles

## Installation

```sh
npm install git+ssh://git@stash.aggregion.com:7999/bck/bundle-service-js.git --save
```

## Usage


Service automatically resolves types of input and output by file extension or if passed path is a directory. So, supported extensions are:

* .epub - ePub book. Only read stream is supported
* .zip - ZIP-archives. Read and write streams are supported
* .aggregion - Old Aggregion ZIP-bundle. Read and write streams are supported
* .agb - Aggregion binary bundle. Read and write streams are supported
* .pdf (and any other single file) - Only read stream is supported

```javascript
const BundleService = require('agg-bundle-service');

// Create read stream

let readStream = BundleService.createReadStream({path: '/path/to/any/file/or/directory/example.epub'});

// Create write stream

let writeStream = BundleService.createWriteStream({path: '/path/to/any/file/example.agb'});

// Pipe one to another

readStream.pipe(writeStream);

// Waiting for finish

writeStream.on('finish', () => {
    console.log('Done!');
});

// Encrypt

let encryptor = BundleService.createEncryptor(new Buffer(16));

readStream
  .pipe(encryptor)
  .pipe(writeStream);

// Decrypt

let decryptor = BundleService.createDecryptor(new Buffer(16));

readStream
  .pipe(decryptor)
  .pipe(writeStream);

// Get source bundle info

readStream.on('ready', () => {
    let info = readStream.getInfo();
    let props = readStream.getProps();
    let filesList = readStream.getFiles();
    let filesCount = readStream.getFilesCount();
});

```
## Console usage

### Print help

```sh
makebundle --help
```
### Make bundle

```sh
makebundle -i path/to/index/file -o /path/to/output /path/to/input/file/or/directory
```

## Run tests

```sh
npm test
```
## License

All rights reserved by Aggregion Ltd. Any use is only permitted with the consent of Aggregion.

## Contacts

For any questions: info@aggregion.com
