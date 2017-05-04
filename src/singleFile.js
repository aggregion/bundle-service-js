const check = require('check-types');
const {Readable: ReadableStream} = require('stream');
const {EntryType, BundleStreamFactory} = require('./types');
const BundleProps = require('./bundleprops');
const fs = require('fs');
const path = require('path');

class SingleFileReadableStream extends ReadableStream {
  /**
   * Constructs new instance
   * @param {object} options Options
   * @param {string} options.path Path to file
   * @constructor
   */
  constructor(options) {
    super({objectMode: true});
    check.assert.nonEmptyString(options.path, '"options.path" should be non-empty string');
    if (!fs.existsSync(options.path))
      throw new Error(`File does not exist: ${options.path}`);
    let fileExt = path.extname(options.path).toLowerCase();
    let bundleFileName = 'index' + fileExt;
    this._props = BundleProps.fromObject({
      main_file: 'index.pdf'
    });
    this._info = new BundleProps();
    this._files = [bundleFileName];
    this.push({type: EntryType.BUNDLE_PROPS, value: this._props});
    this.push({type: EntryType.BUNDLE_INFO, value: this._info});
    this.push({
      type: EntryType.FILE,
      bundlePath: bundleFileName,
      stream: fs.createReadStream(options.path),
      props: BundleProps.fromObject({size: fs.statSync(options.path).size})
    });
    this.push({end: true});
    this.push(null);
    this.emit('ready');
  }

  /**
   * Returns count of files in the bundle
   * @return {number}
   */
  getFilesCount() {
    return 1;
  }


  /**
   * Returns an array of existing files in the bundle
   * @return {Array.<string>}
   */
  getFiles() {
    return this._files;
  }


  /**
   * Returns bundle properties
   * @return {BundleProps}
   */
  getProps() {
    return this._props;
  }

  /**
   * Return bundle info
   * @return {BundleProps}
   */
  getInfo() {
    return this._info;
  }

  _read() {
    return;
  }

}

class SingleFileStreamFactory extends BundleStreamFactory {
  /**
   * Creates instance of bundle readable stream
   * @param {object} options
   * @param {string} options.path
   * @return {SingleFileReadableStream}
   */
  static createReadStream(options) {
    return new SingleFileReadableStream(options);
  }
}

module.exports = SingleFileStreamFactory;
