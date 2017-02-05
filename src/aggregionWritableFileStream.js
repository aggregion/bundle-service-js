const BundleProps = require('./bundleprops');
const {Writable: WritableStream} = require('stream');
const check = require('check-types');
const Q = require('q');


class AggregionWritableFileStream extends WritableStream {

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
    this._initPromise = bundle
      .createFile(path)
      .then((fd) => {
        this._file = fd;
        return Promise.resolve();
      })
      .catch((e) => {
        this.emit('error', e);
      });
    this._size = 0;
    this._writePromises = [];
  }

  _write(chunk, encoding, done) {
    if (typeof chunk === 'string') {
      chunk = new Buffer(chunk, encoding);
    }
    let def = Q.defer();
    this._writePromises.push(def.promise);
    this._initPromise
      .then(() => {
        let {_file: file, _bundle: bundle} = this;
        bundle
          .writeFileBlock(file, chunk)
          .then(() => {
            this._size += chunk.length;
            done();
            def.resolve();
          })
          .catch((e) => {
            this.emit('error', e);
            done(e);
            def.reject(e);
          });
      });
  }

  end(chunk, encoding, done) {
    let self = this;
    function setAttrs(size, callback) {
      let {_file: file, _bundle: bundle} = self;
      return bundle
        .writeFilePropertiesData(file, BundleProps.fromObject({size}).toJson())
        .then(() => {
          self.emit('finish');
          if (callback) {
            callback();
          }
        })
        .catch((e) => {
          self.emit('error', e);
          if (callback) {
            callback(e);
          }
        });
    }

    this._initPromise.then(() => {
      Promise
        .all(this._writePromises)
        .then(() => {
          if (chunk && chunk.length > 0) {
            this._write(chunk, encoding, (e) => {
              if (e) {
                done(e);
              }
              setAttrs(this._size, done);
            });
          } else {
            setAttrs(this._size, done);
          }
        })
        .catch((e) => {
          self.emit('error', e);
        });
    });
  }
}

module.exports = AggregionWritableFileStream;
