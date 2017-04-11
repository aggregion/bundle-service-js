const check = require('check-types');
const fs = require('fs');
const {Writable: WritableStream} = require('stream');
const {EntryType, BundleStreamFactory} = require('./types');
const temp = require('temp');
const mkdirp = require('mkdirp');
const Path = require('path');
const exec = require('child_process').execFile;
const archiver = require('archiver');


class RenderingStream extends WritableStream {

  /**
   * Constructs a nre instance
   * @param {object} options
   * @param {string} options.path Path to the bundle
   * @param {boolean} [options.encrypted=false] Indicates that bundle is encrypted
   */
  constructor(options) {
    check.assert.assigned(options, '"options" is required argument');
    check.assert.nonEmptyString(options.path, '"options.path" should be non-empty string');
    check.assert.assigned(options.pages, '"options.pages" is required');
    check.assert.array(options.pages, '"options.pages" should be an array');
    super({objectMode: true});
    this._options = options;
    const tempPath = temp.path();
    mkdirp.sync(tempPath);
    this._tempPath = tempPath;
  }


  _write(entry, encoding, done) {
    if (entry.end) {
      this._render()
        .then(() => {
          // ToDo: clean temp dir
          this.emit('finish');
          done();
        })
        .catch((e) => {
          this.emit('error', e);
        });
      return;
    }

    if (entry.type === EntryType.FILE) {
      const {_tempPath} = this;
      const outPath = Path.join(_tempPath, entry.bundlePath);
      mkdirp.sync(Path.dirname(outPath));
      let writeStream = fs.createWriteStream(outPath);
      writeStream.on('close', done);
      entry.stream.pipe(writeStream);
    } else if (entry.type === EntryType.BUNDLE_PROPS) {
      this._mainFile = entry.value.get('main_file');
      done();
    } else {
      done();
    }
  }

  _render() {
    const {path: outPath, pages} = this._options;
    const pagesStr = pages.join(',');
    return this._prepareFile()
      .then((path) => {
        return new Promise((resolve, reject) => {
          exec('mutool', ['draw', '-r', 150, '-o', outPath, path, pagesStr], (err) => {
            if (err) {
              return reject(err);
            }
            resolve();
          });
        });
      });
  }

  _prepareFile() {
    const {_mainFile} = this;
    if (!_mainFile) {
      throw new Error('Main file does not exist');
    }
    let preparePromise;
    if (/\.opf$/.test(_mainFile.toLowerCase())) {
      preparePromise = this._prepareEpub();
    } else if (/\.pdf$/.test(_mainFile.toLowerCase())) {
      preparePromise = this._preparePdf();
    } else {
      throw new Error('Unsupported format');
    }
    return preparePromise;
  }

  _prepareEpub() {
    const {_tempPath} = this;
    let outPath = temp.path({suffix: '.epub'})
    let outputStream = fs.createWriteStream(outPath);
    return new Promise((resolve, reject) => {
      const archive = archiver('zip');
      archive.once('error', reject);
      outputStream.once('close', () => {
        resolve(outPath);
      });
      archive.pipe(outputStream);
      archive.directory(_tempPath, '').finalize();
    });
  }

  _preparePdf() {
    const {_tempPath, _mainFile} = this;
    const outPath = Path.join(_tempPath, _mainFile);
    return Promise.resolve(outPath);
  }

}


class Renderer extends BundleStreamFactory {

  /**
   * Creates instance of renderer writable stream
   * @param {object} options
   * @param {string} options.path
   * @param {string[]} options.pages
   * @return {AggregionBundleStream}
   */
  static createWriteStream(options) {
    return new RenderingStream(options);
  }

}

module.exports = Renderer;
