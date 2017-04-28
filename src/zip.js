const check = require('check-types');
const fs = require('fs');
const StreamZip = require('node-stream-zip');
const BundleProps = require('./bundleprops');
const packer = require('zip-stream');

const {Readable: ReadableStream, Writable: WritableStream} = require('stream');
const {EntryType, BundleStreamFactory} = require('./types');



class ZipReadableStream extends ReadableStream {

  /**
   * Constructs new instance
   * @param {object} options Options
   * @param {string} options.path Path to directory
   * @param {BundleProps|Map|object} [options.info] Bundle info
   * @param {BundleProps|Map|object} [options.props] Bundle properties
   * @constructor
   */
  constructor(options) {
    super({objectMode: true});
    check.assert.nonEmptyString(options.path, '"options.path" should be non-empty string');
    if (!fs.existsSync(options.path))
      throw new Error(`File does not exist: ${options.path}`);
    let {path, info, props} = options;
    if (!info) {
      info = {};
    }
    this._entries = [];
    this._entryPos = 0;
    this._info = BundleProps.fromObject(info);
    let zip = new StreamZip({
      file: path,
      storeEntries: true
    });
    zip
      .on('ready', () => {
        let entries = [];
        let zipEntries = zip.entries();
        if (!props) {
          if (zipEntries['index.pdf']) {
            props = {main_file: 'index.pdf'};
          } else if (zipEntries['index.html']) {
            props = {main_file: 'index.html'};
          } else {
            this.emit('error', new Error('Can\'t resolve index file'));
            props = {};
          }
        }
        this._props = BundleProps.fromObject(props);
        for (let entryKey of Object.keys(zipEntries)) {
          let entry = zipEntries[entryKey];
          if (!entry.isDirectory) {
            entries.push({
              type: EntryType.FILE,
              bundlePath: entry.name,
              props: BundleProps.fromObject({size: entry.size})
            });
          }
        }
        this._entries = [
          {type: EntryType.BUNDLE_INFO, value: this._info},
          {type: EntryType.BUNDLE_PROPS, value: this._props},
          ...entries,
          {end: true}
        ];
        this._entryPos = 0;
        this._ready = true;
        this.emit('ready');
      })
      .on('error', (e) => {
        this.emit('error', e);
      });
    this._zip = zip;
  }


  /**
   * Returns bundle info
   * @return {BundleProps}
   */
  getInfo() {
    return this._info;
  }

  /**
   * Returns bundle properties
   * @return {BundleProps}
   */
  getProps() {
    return this._props;
  }

  /**
   * Returns count of files in the bundle
   * @return {number}
   */
  getFilesCount() {
    return this._entries.length - 3;
  }

  /**
   * Implementation of ReadableStream.read
   * @param {number} size Ignored
   * @private
   */
  _read(size) {
    if (!this._ready) {
      setTimeout(() => {
        this._read(size);
      }, 10);
      return;
    }
    if (this._entryPos >= this._entries.length) {
      this.push(null);
      return;
    }
    let entry = this._entries[this._entryPos];
    this._entryPos++;
    if (entry.type === EntryType.FILE) {
     this._zip.stream(entry.bundlePath, (err, stream) => {
        if (err) {
          throw err;
        }
        this.push({type: EntryType.FILE, bundlePath: entry.bundlePath, stream, props: entry.props});
      });
    } else {
      this.push(entry);
    }
    return size;
  }

}


class ZipWritableStream extends WritableStream {

  /**
   * Constructs new instance
   * @param {object} options Options
   * @param {string} options.path Path to directory
   * @constructor
   */
  constructor(options) {
    super({objectMode: true});
    check.assert.nonEmptyString(options.path, '"options.path" should be non-empty string');
    let outputStream = fs.createWriteStream(options.path);
    let archive = packer();
    archive.pipe(outputStream);
    this._archive = archive;
    this._outputStream = outputStream;
  }

  /**
   * Implementation of WritableStream._write
   * @param {StreamEntry} entry
   * @param {string} encoding Is not using
   * @param {function} done Callback
   * @private
   */
  _write(entry, encoding, done) {
    let {_archive: archive} = this;
    if (entry.end) {
      archive.finalize();
      let self = this;
      self._outputStream.on('close', () => {
        done();
        self.emit('finish');
      });
      return 0;
    }
    if (entry.type === EntryType.FILE) {
      archive.entry(entry.stream, {name: entry.bundlePath}, done);
    } else {
      done();
    }
  }
}

class Zip extends BundleStreamFactory {

  /**
   * Creates instance of bundle readable stream
   * @param {object} options
   * @param {string} options.path
   * @param {BundleProps|Map|object} options.info Bundle info
   * @param {BundleProps|Map|object} options.props Bundle properties
   * @return {ZipReadableStream}
   */
  static createReadStream(options) {
    return new ZipReadableStream(options);
  }

  /**
   * Creates instance of bundle writable stream
   * @param {object} options
   * @param {string} options.path
   * @return {ZipWritableStream}
   */
  static createWriteStream(options) {
    return new ZipWritableStream(options);
  }

}


module.exports = Zip;
