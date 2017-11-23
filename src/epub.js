const check = require('check-types');
const {Readable: ReadableStream} = require('stream');
const {EntryType, BundleStreamFactory} = require('./types');
const BundleProps = require('./bundleprops');
const fs = require('fs');
const StreamZip = require('node-stream-zip');


class EpubReadableStream extends ReadableStream {

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
        let info = new BundleProps();
        let entries = [];
        let zipEntries = zip.entries();
        let mainFile;
        for (let entryKey of Object.keys(zipEntries)) {
          let entry = zipEntries[entryKey];
          if (!entry.isDirectory && entry.size > 0) {
            entries.push({
              type: EntryType.FILE,
              bundlePath: entry.name,
              props: BundleProps.fromObject({size: entry.size})
            });
            if (entry.name.toLowerCase().endsWith('content.opf')) {
              mainFile = entry.name;
            }
          }
        }
        let props = BundleProps.fromObject({main_file: mainFile});
        this._entries = [
          {type: EntryType.BUNDLE_INFO, value: info},
          {type: EntryType.BUNDLE_PROPS, value: props},
          ...entries,
          {end: true}
        ];
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


class Epub extends BundleStreamFactory {

  /**
   * Creates instance of bundle readable stream
   * @param {object} options
   * @param {string} options.path
   * @return {EpubReadableStream}
   */
  static createReadStream(options) {
    return new EpubReadableStream(options.path);
  }

}


module.exports = Epub;
