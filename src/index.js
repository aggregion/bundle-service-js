const {BundleStreamFactory} = require('./types');
const path = require('path');
const fs = require('fs');
const check = require('check-types');
const CryptoStream = require('./cryptoStream');
const Renderer = require('./renderer');


class BundleService extends BundleStreamFactory{
  /**
   * Creates instance of bundle readable stream
   * @param {object} options
   * @param {string} options.path Path to source file or directory
   * @return {Stream.Readable}
   * @throws {Error} Will throw if streamer will not be resolved or if source file does not exist
   */
  static createReadStream(options) {
    check.assert.assigned(options, '"options" is required argument');
    check.assert.nonEmptyString(options.path, '"options.path" is required and should be non-empty string');
    return this.resolve(options.path).createReadStream(options);
  }

  /**
   * Creates instance of bundle writable stream
   * @param {object} options
   * @param {string} options.path Path to source file or directory
   * @return {Stream.Writable}
   * @throws {Error} Will throw if streamer will not be resolved
   */
  static createWriteStream(options) {
    check.assert.assigned(options, '"options" is required argument');
    check.assert.nonEmptyString(options.path, '"options.path" is required and should be non-empty string');
    return this.resolve(options.path).createWriteStream(options);
  }

  /**
   * Creates encryption stream
   * @param {Buffer} key
   * @return {CryptoTransformStream}
   */
  static createEncryptor(key) {
    return CryptoStream.encrypt(key);
  }

  /**
   * Creates decryption stream
   * @param {Buffer} key
   * @return {CryptoTransformStream}
   */
  static createDecryptor(key) {
    return CryptoStream.decrypt(key);
  }

  /**
   * Creates render stream
   * @param {object} options
   * @return {Renderer}
   */
  static createRenderer(options) {
    return Renderer.createWriteStream(options);
  }

  /**
   * Resolves stream factory by path
   * @param srcPath
   * @return {BundleStreamFactory}
   * @throws {Error} Will throw if streamer will not be resolved
   */
  static resolve(srcPath) {
    const resolvers = [
      // Resolve directory
      (srcPath) => {
        try {
          if (fs.lstatSync(srcPath).isDirectory()) {
            return require('./directory');
          }
        } catch (e) {
        }
      },
      // Resolve ePub
      (srcPath) => {
        if (path.extname(srcPath).toLowerCase() === '.epub') {
          return require('./epub');
        }
      },
      // Resolve Aggregion ZIP-bundle
      (srcPath) => {
        if (path.extname(srcPath).toLowerCase() === '.aggregion') {
          return require('./aggregionzip');
        }
      },
      // Resolve Aggregion binary bundle
      (srcPath) => {
        if (path.extname(srcPath).toLowerCase() === '.agb') {
          return require('./aggregion');
        }
      },
      // Resolve ZIP-archive
      (srcPath) => {
        if (path.extname(srcPath).toLowerCase() === '.zip') {
          return require('./zip');
        }
      },
      // Resolve any other single file
      () => {
        return require('./singleFile');
      }
    ];
    for (let r of resolvers) {
      let resolved = r(srcPath);
      if (resolved)
        return resolved;
    }
    throw new Error(`Can\'t resolve module for source path: ${srcPath}`);
  }
}

module.exports = BundleService;
