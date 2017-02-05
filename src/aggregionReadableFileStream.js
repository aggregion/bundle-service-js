const {Readable: ReadableStream} = require('stream');
const check = require('check-types');


class AggregionReadableFileStream extends ReadableStream {

  /**
   * Constructs a new instance
   * @param {object} options
   * @param {AggregionBundle} options.bundle Bundle instance
   * @param {string} options.path Path to file in the bundle
   */
  constructor(options) {
    check.assert.assigned(options, '"options" is required argument');
    check.assert.assigned(options.bundle, '"options.bundle" is required argument');
    check.assert.nonEmptyString(options.path, '"options.path" is required argument and should be non-empty string');
    super();
    let {bundle, path} = options;
    this._bundle = bundle;
    this._file = bundle.openFile(path);
    this._size = bundle.getFileSize(path);
    this._readedSize = 0;
  }

  _read(size) {
    if (this._readedSize >= this._size) {
      this.push(null);
      return;
    }
    let {_file: file, _bundle: bundle} = this;
    this._readedSize += size;
    bundle
      .readFileBlock(file, size)
      .then((chunk) => {
        if (!chunk || chunk.length === 0) {
          this.push(null);
        } else {
          this.push(chunk);
        }
      });
  }

}

module.exports = AggregionReadableFileStream;
