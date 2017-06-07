const check = require('check-types');
const {Writable: WritableStream} = require('stream');
const {EntryType, BundleStreamFactory} = require('../types');
const mkdirp = require('mkdirp');
const path = require('path');
const fs = require('fs-extra');
const handlebars = require('handlebars');

const finalizeWithTemplate = (mainFile, destDir, template) => {
  const dataDir = path.join(__dirname, `./data/${template}`);
  const indexFile = path.join(destDir, 'index.html');
  return fs.copy(dataDir, destDir)
    .then(() => {
      return fs.readFile(indexFile, 'utf8');
    })
    .then((templateData) => {
      const template = handlebars.compile(templateData);
      const html = template({mainFile});
      return fs.writeFile(indexFile, html, 'utf8');
    });
};

const finalizeEpub = (mainFile, destDir) => {
  return finalizeWithTemplate(mainFile, destDir, 'epub');
};

const finalizeHtml = (mainFile, destDir) => {
  return finalizeWithTemplate(mainFile, destDir, 'html');
};

const finalizePdf = (mainFile, destDir) => {
  return finalizeWithTemplate(mainFile, destDir, 'pdf');
};

const getFinalizer = (mainFile) => {
  const ext = path.extname(mainFile).toLowerCase();
  switch (ext) {
    case '.opf':
      return finalizeEpub;
    case '.html':
    case '.htm':
    case '.xhtml':
      return finalizeHtml;
    case '.pdf':
      return finalizePdf;
  }
  throw new Error(`Type of content is not supported: ${mainFile}`);
};

class WebWritableStream extends WritableStream {
  /**
   * Constructs new instance
   * @param {object} options Options
   * @param {string} options.path Path to destination directory
   * @constructor
   */
  constructor(options) {
    super({objectMode: true});
    check.assert.assigned(options, '"options" is required argument');
    check.assert.nonEmptyString(options.path, '"options.path" should be non-empty string');
    this._path = options.path;
    this._dataPath = path.join(options.path, '_data');
    mkdirp.sync(this._dataPath);
  }

  /**
   * Implementation of WritableStream._write
   * @param {StreamEntry} entry
   * @param {string} encoding Is not using
   * @param {function} done Callback
   * @private
   */
  _write(entry, encoding, done) {
    if (entry.end) {
      this._finalize()
        .then(() => {
          this.emit('finish');
        })
        .catch((e) => {
          this.emit('error', e);
        });
    }
    const {_path, _dataPath} = this;
    if (entry.type === EntryType.FILE) {
      const filePath = path.join(_dataPath, entry.bundlePath);
      mkdirp.sync(path.dirname(filePath));
      const writeStream = fs.createWriteStream(filePath);
      writeStream.once('close', done);
      writeStream.once('error', (e) => {
        this.emit('error', e);
      });
      entry.stream.pipe(writeStream);
    } else if (entry.type === EntryType.BUNDLE_INFO) {
      done();
    } else if (entry.type === EntryType.BUNDLE_PROPS) {
      this._mainFile = entry.value.get('main_file');
      done();
    }
  }

  /**
   * Writes additional data and finalizes web bundle creation
   * @private
   * @return {Promise}
   */
  _finalize() {
    return new Promise((resolve, reject) => {
      const {_mainFile, _path} = this;
      if (!_mainFile) {
        throw new Error('Main file is not set');
      }
      try  {
        const finalizer = getFinalizer(_mainFile);
        resolve(finalizer(_mainFile, _path));
      } catch (e) {
        reject(e);
      }
    });
  }
}


class Web extends BundleStreamFactory {

  /**
   * Creates an instance of bundle writable stream
   * @param {object} options
   * @param {string} options.path
   * @return {AggregionBundleStream}
   */
  static createWriteStream(options) {
    return new WebWritableStream(options);
  }

}

module.exports = Web;
