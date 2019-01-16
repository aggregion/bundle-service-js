const check = require('check-types');
const {Readable: ReadableStream} = require('stream');
const {EntryType, BundleStreamFactory} = require('./types');
const BundleProps = require('./bundleprops');
const recursive = require('recursive-readdir');
const fs = require('fs');
const Path = require('path');
const mime = require('mime-types');

class DirectoryReadableStream extends ReadableStream {

  /**
   * Constructs new instance
   * @param {object} options Options
   * @param {string} options.path Path to directory
   * @param {BundleProps|Map|object} options.info Bundle info
   * @param {BundleProps|Map|object} options.props Bundle properties
   * @constructor
   */
  constructor(options) {
    super({objectMode: true});
    check.assert.nonEmptyString(options.path, '"options.path" should be non-empty string');
    check.assert.assigned(options.info, '"options.info" is required argument');
    check.assert.assigned(options.props, '"options.props" is required argument');
    let {path, info, props} = options;
    if (!fs.existsSync(path))
      throw new Error(`Directory does not exist: ${path}`);
    this._entries = [];
    this._entryPos = 0;
    if (props && props.main_file) {
      const fileExt = Path.extname(props.main_file).toLowerCase();
      info.content_type = mime.lookup(fileExt) || 'application/octet-stream';
    }
    this._props = BundleProps.fromObject(props);
    this._info = BundleProps.fromObject(info);
    recursive(path, (err, files) => {
      if (err) {
        throw err;
      }
      let entries = [];
      files.forEach((f) => {
        entries.push({
          type: EntryType.FILE,
          bundlePath: Path.relative(path, f),
          filePath: f,
          props: BundleProps.fromObject({size: fs.statSync(f).size})
        });
      });
      this._entries = [
        {type: EntryType.BUNDLE_PROPS, value: this._props},
        {type: EntryType.BUNDLE_INFO, value: this._info},
        ...entries,
        {end: true}
      ];
      this._ready = true;
      this.emit('ready');
    });
  }

  /**
   * Returns bundle properties
   * @return {BundleProps}
   */
  getProps() {
    return this._props;
  }

  /**
   * Returns bundle info
   * @return {BundleProps}
   */
  getInfo() {
    return this._info;
  }

  /**
   * Returns count of files in the bundle
   * @return {number}
   */
  getFilesCount() {
    return this._entries.length - 3;
  }

  /**
   * Implementation of readable stream
   * @return {*}
   * @private
   */
  _read() {
    if (!this._ready) {
      setTimeout(() => this._read(), 10);
      return;
    }
    if (this._entryPos >= this._entries.length) {
      this.push(null);
      return;
    }
    let entry = this._entries[this._entryPos];
    this._entryPos++;
    if (entry.type === EntryType.FILE) {
      entry.stream = fs.createReadStream(entry.filePath);
    }
    this.push(entry);
  }
}

class Directory extends BundleStreamFactory {
  /**
   * Creates instance of bundle readable stream
   * @param {object} options
   * @return {DirectoryReadableStream}
   */
  static createReadStream(options) {
    return new DirectoryReadableStream(options);
  }
}

module.exports = Directory;
