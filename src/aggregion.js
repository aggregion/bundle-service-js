const check = require('check-types');
const fs = require('fs');
const BundleProps = require('./bundleprops');
const {Duplex: DuplexStream} = require('stream');
const {EntryType, BundleStreamFactory} = require('./types');
const AggregionBundle = require('@aggregion/agg-bundle');
const AggregionReadableFileStream = require('./aggregionReadableFileStream');
const AggregionWritableFileStream = require('./aggregionWritableFileStream');



class AggregionBundleStream extends DuplexStream {

  /**
   * Constructs a nre instance
   * @param {object} options
   * @param {string} options.path Path to the bundle
   * @param {boolean} [options.encrypted=false] Indicates that bundle is encrypted
   */
  constructor(options) {
    check.assert.assigned(options, '"options" is required argument');
    check.assert.nonEmptyString(options.path, '"options.path" should be non-empty string');
    super({objectMode: true});
    let {path, readonly, info} = options;
    let bundle = new AggregionBundle({path, readonly});
    this._encrypted = options.encrypted || false;
    this._entries = [];
    this._entryPos = 0;
    this._files = [];
    this._props = new BundleProps();
    this._info = new BundleProps();
    this._infoToMix = info;
    this._bundle = bundle;
    this._initPromise = bundle
      .getBundleInfoData()
      .then((infoData) => {
        if (infoData && infoData.length > 0) {
          this._info = BundleProps.fromJson(infoData.toString('UTF-8'));
        }
        return bundle.getBundlePropertiesData();
      })
      .then((propsData) => {
        if (propsData && propsData.length > 0) {
          if (this._encrypted) {
            this._props = propsData;
          } else {
            this._props = BundleProps.fromJson(propsData.toString('UTF-8'));
          }
        }
        return bundle.getFiles();
      })
      .then((files) => {
        let promises = [];
        files.forEach((f) => {
          let fd = bundle.openFile(f);
          promises.push(bundle.readFilePropertiesData(fd));
        });
        return Promise
          .all(promises)
          .then((allProps) => {
            this._files = files;
            this._entries = [
              {type: EntryType.BUNDLE_INFO, value: this._info},
              {type: EntryType.BUNDLE_PROPS, value: this._props},
              ...files.map((f, i) => {
                return {
                  type: EntryType.FILE,
                  bundlePath: f,
                  props: this._encrypted ? allProps[i] : BundleProps.fromJson(allProps[i].toString())
                }
              }),
              {end: true}
            ];
            this.emit('ready');
          });
      })
      .catch((e) => {
        this.emit('error', e);
      });
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
   * @return {BundleProps|Buffer}
   */
  getProps() {
    return this._props;
  }

  /**
   * Returns count of files in the bundle
   * @return {number}
   */
  getFilesCount() {
    return this._files.length;
  }

  _read() {
    this._initPromise.then(() => {
      let {_entries: entries, _bundle: bundle} = this;
      if (this._entryPos >= entries.length) {
        this.push(null);
        return;
      }
      let entry = entries[this._entryPos++];
      if (entry.type === EntryType.FILE) {
        entry.stream = new AggregionReadableFileStream({bundle: bundle, path: entry.bundlePath});
      }
      this.push(entry);
    });
  }

  _write(entry, encoding, done) {
    let {_bundle: bundle} = this;
    this._initPromise.then(() => {
      if (entry.end) {
        bundle.close();
        this.emit('finish');
        return;
      }
      if (entry.type === EntryType.FILE) {
        let writeStream = new AggregionWritableFileStream({bundle, path: entry.bundlePath});
        writeStream.on('finish', (fd) => {
          if (entry.props) {
            let data;
            if (entry.props instanceof BundleProps) {
              data = new Buffer(entry.props.toJson(), 'utf8');
            } else {
              data = entry.props;
            }
            bundle
              .writeFilePropertiesData(fd, data)
              .then(() => {
                done();
              })
              .catch((e) => {
                this.emit('error', e);
              });
          } else {
            done();
          }
        });
        entry.stream.pipe(writeStream);
      } else if (entry.type === EntryType.BUNDLE_INFO) {
        bundle
          .setBundleInfoData(this._propsDataFromEntry(entry))
          .then(done)
          .catch(done);
      } else if (entry.type === EntryType.BUNDLE_PROPS) {
        bundle
          .setBundlePropertiesData(this._propsDataFromEntry(entry))
          .then(done)
          .catch(done);
      }
    });
  }

  _propsDataFromEntry(entry) {
    if (!entry.value) {
      throw new Error('value does not exist');
    }
    if (entry.value instanceof BundleProps) {
      const obj = Object.assign(entry.value.toObject(), this._infoToMix || {});
      return new Buffer(BundleProps.fromObject(obj).toJson(), 'UTF-8');
    }
    if ((entry.value instanceof Buffer) || (typeof entry.value === 'string')) {
      return entry.value;
    }
    throw new Error('Invalid type');
  }

}


class Aggregion extends BundleStreamFactory {

  /**
   * Creates instance of bundle readable stream
   * @param {object} options
   * @param {string} options.path
   * @return {AggregionBundleStream}
   */
  static createReadStream(options) {
    check.assert.assigned(options, '"options" is required argument');
    check.assert.nonEmptyString(options.path, '"options.path" should be non-empty string');
    if (!fs.existsSync(options.path)) {
      throw new Error(`File does not exist: ${options.path}`);
    }
    return new AggregionBundleStream(Object.assign(options, {readonly: true}));
  }

  /**
   * Creates instance of bundle writable stream
   * @param {object} options
   * @param {string} options.path
   * @return {AggregionBundleStream}
   */
  static createWriteStream(options) {
    return new AggregionBundleStream(options);
  }

}

module.exports = Aggregion;
