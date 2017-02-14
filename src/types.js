require('./entryType');
const BundleProps = require('./bundleprops');

/**
 * @typedef {object} StreamEntry
 * @property {EntryType} type Chunk type: "file", "bundleInfo" or "bundleProps"
 * @property {string} bundlePath Path in the bundle
 * @property {Stream} stream Stream if type is 'file'
 * @property {BundleProps|Buffer} value Value if type is not 'file'
 * @property {boolean} end Notifies that this is special end-chunk
 * @property {BundleProps|Buffer} props
 */

/**
 * @typedef {object} Encoder
 * @property {string} key Key for encoding
 */

/**
 * @typedef {object} StreamOptions
 * @property {string} filePath Path to file
 * @property {Encoder} [encoder]
 */

/**
 * Types of streaming entries
 * @enum {string}
 */
const EntryType = {
  FILE: 'file',
  BUNDLE_INFO: 'bundleInfo',
  BUNDLE_PROPS: 'bundleProps'
};


/**
 * Interface for bundle stream classes
 * @interface
 */
class BundleStreamFactory {
  /**
   * Creates instance of bundle readable stream
   * @param {StreamOptions} options
   * @return {Stream}
   */
  static createReadStream(options) {
    throw new Error('Not supported');
  }

  /**
   * Creates instance of bundle writable stream
   * @param {StreamOptions} options
   * @return {Stream}
   */
  static createWriteStream(options) {
    throw new Error('Not supported');
  }
}

module.exports = {EntryType, BundleStreamFactory};
