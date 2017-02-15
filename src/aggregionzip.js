const check = require('check-types');
const fs = require('fs');
const StreamZip = require('node-stream-zip');
const BundleProps = require('./bundleprops');
const packer = require('zip-stream');

const {Readable: ReadableStream, Writable: WritableStream} = require('stream');
const {EntryType, BundleStreamFactory} = require('./types');


class AggregionZipReadableStream extends ReadableStream {

  /**
   * Constructs new instance
   * @param {string} filePath
   * @constructor
   */
  constructor(filePath) {
    super({objectMode: true});
    check.assert.nonEmptyString(filePath, '"filePath" should be non-empty string');
    if (!fs.existsSync(filePath))
      throw new Error(`File does not exist: ${filePath}`);
    this._entries = [];
    this._entryPos = 0;
    let zip = new StreamZip({
      file: filePath,
      storeEntries: true
    });
    zip
      .on('ready', () => {
        let infoData = zip.entryDataSync('meta/.bundleinfo').toString('UTF-8');
        let propsData = zip.entryDataSync('meta/.bundleprops').toString('UTF-8');
        let info = BundleProps.fromJson(infoData);
        let props = BundleProps.fromJson(propsData);
        let entries = [];
        let zipEntries = zip.entries();
        for (let entryKey of Object.keys(zipEntries)) {
          let entry = zipEntries[entryKey];
          if (!entry.isDirectory && entry.name.startsWith('data/')) {
            entries.push({
              type: EntryType.FILE,
              bundlePath: entry.name.slice(5),
              props: BundleProps.fromObject({size: entry.size})
            });
          }
        }
        this._entries = [
          {type: EntryType.BUNDLE_INFO, value: info},
          {type: EntryType.BUNDLE_PROPS, value: props},
          ...entries,
          {end: true}
        ];
        this._files = entries.map((e) => e.bundlePath);
        this._entryPos = 0;
        this._ready = true;
        this._info = info;
        this._props = props;
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
   * Returns files in the bundle
   * @return {string[]}
   */
  getFiles() {
    return this._files;
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
      this._zip.stream('data/' + entry.bundlePath, (err, stream) => {
        if (err) {
          throw err;
        }
        this.push({type: EntryType.FILE, bundlePath: entry.bundlePath, stream});
      });
    } else {
      this.push(entry);
    }
    return size;
  }

}


class AggregionZipWritableStream extends WritableStream {

  /**
   * Constructs new instance
   * @param {string} filePath Path to destination file
   * @constructor
   */
  constructor(filePath) {
    super({objectMode: true});
    check.assert.nonEmptyString(filePath, '"filePath" should be non-empty string');
    let outputStream = fs.createWriteStream(filePath);
    let archive = packer();
    archive.pipe(outputStream);
    this._archive = archive;
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
      const waitForFinish = () => {
        if (archive._archive.finished) {
          setTimeout(() => self.emit('finish'), 0);
        } else {
          setTimeout(waitForFinish, 100);
        }
      };

      setTimeout(waitForFinish, 100);
      return 0;
    }
    if (entry.type === EntryType.FILE) {
      archive.entry(entry.stream, {
        name: 'data/' + entry.bundlePath,
        extra: entry.props ? Buffer.from(entry.props.toJson(), 'UTF-8') : null
      }, done);
    } else if (entry.type === EntryType.BUNDLE_INFO) {
      archive.entry(entry.value.toJson(), {name: 'meta/.bundleinfo'}, done);
    } else if (entry.type === EntryType.BUNDLE_PROPS) {
      archive.entry(entry.value.toJson(), {name: 'meta/.bundleprops'}, done);
    }
  }
}

class AggregionZip extends BundleStreamFactory {

  /**
   * Creates instance of bundle readable stream
   * @param {object} options
   * @param {string} options.path
   * @return {AggregionZipReadableStream}
   */
  static createReadStream(options) {
    return new AggregionZipReadableStream(options.path);
  }

  /**
   * Creates instance of bundle writable stream
   * @param {object} options
   * @param {string} options.path
   * @return {AggregionZipWritableStream}
   */
  static createWriteStream(options) {
    return new AggregionZipWritableStream(options.path);
  }

}


module.exports = AggregionZip;
