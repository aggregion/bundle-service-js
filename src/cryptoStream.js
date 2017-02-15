const {Transform: TransformStream} = require('stream');
const check = require('check-types');
const EntryType = require('./entryType');
const Crypto = require('crypto');
const BundleProps = require('./bundleprops');
const types = require('./types');

/**
 * Cipher modes
 * @enum {string}
 */
const CipherMode = {
  ENCRYPT: 'encrypt',
  DECRYPT: 'decrypt'
};

class CryptoTransformStream extends TransformStream {

  /**
   * Constructs a new instance
   * @param {object} options
   * @param {Buffer} options.key 256-bit key
   * @param {CipherMode} options.mode Mode: 'encrypt' or 'decrypt'
   */
  constructor(options) {
    check.assert.assigned(options, '"options" is required argument');
    check.assert.assigned(options.key, '"options.key" is required argument');
    check.assert.assigned(options.mode, '"options.mode" is required argument');
    super({objectMode: true});
    this._algo = 'aes-128-ecb';
    this._mode = options.mode;
    this._key = options.key;
  }

  /**
   * Implementation of Stream.Transform._transform
   * @param {StreamEntry} entry
   * @param encoding
   * @param done
   * @private
   */
  _transform(entry, encoding, done) {
    try {
      if (entry.type === EntryType.FILE) {
        entry.stream = this._wrapStream(entry.bundlePath, entry.stream);
        if (entry.props) {
          entry.props = this._wrapProps(entry.bundlePath, entry.props);
        }
        this.push(entry);
      } else if (entry.type == EntryType.BUNDLE_PROPS) {
        entry.value = this._wrapProps('AES', entry.value);
        this.push(entry);
      } else {
        this.push(entry);
      }
      done();
    } catch (e) {
      this.emit('error', e);
    }
  }

  /**
   * Encode or decode properties
   * @param {string} salt
   * @param {BundleProps|Buffer} props
   * @private
   */
  _wrapProps(salt, props) {
    if (props instanceof BundleProps) {
      if (this._mode === CipherMode.DECRYPT) {
        return props;
      }
      props = new Buffer(props.toJson(), 'UTF-8');
    }
    let propsKey = this._deriveKey(salt);
    //console.log('key for props', salt, propsKey);
    let cipher = this._createCipher(propsKey);
    cipher.setAutoPadding(true);
    let dec = cipher.update(props, null, 'hex');
    dec += cipher.final('hex');
    let data = new Buffer(dec, 'hex');
    if (this._mode === CipherMode.DECRYPT) {
      return BundleProps.fromJson(data.toString('utf8'));
    }
    return data;
  }

  /**
   * Creates encoding or decoding stream
   * @param {string} salt
   * @param {Stream} stream
   * @return {Stream}
   * @private
   */
  _wrapStream(salt, stream) {
    let aesKey = this._deriveKey(salt);
    //console.log('key for file', salt, aesKey);
    return stream.pipe(this._createCipher(aesKey));
  }

  /**
   * Creates cipher
   * @param {Buffer} aesKey
   * @return {object}
   * @private
   */
  _createCipher(aesKey) {
    const {_algo: algo, _mode: mode} = this;
    return mode === CipherMode.ENCRYPT
      ? Crypto.createCipheriv(algo, aesKey, new Buffer(0))
      : Crypto.createDecipheriv(algo, aesKey, new Buffer(0));
  }


  /**
   * Derives key
   * @param {string|Buffer} salt
   * @private
   */
  _deriveKey(salt) {
    const {_key: key} = this;
    if (typeof salt === 'string') {
      salt = new Buffer(salt);
    }
    let buffer = Buffer.allocUnsafe(4);
    buffer.writeInt32BE(1);
    let hash = Crypto.createHash('sha1');
    hash.update(key);
    hash.update(buffer);
    hash.update(salt);
    let digest = hash.digest('hex');
    return new Buffer(digest, 'hex').slice(0, 16);
  }
}

class CryptoStream {

  /**
   * Creates encryption stream
   * @param {Buffer} key
   * @return {CryptoTransformStream}
   */
  static encrypt(key) {
    check.assert.assigned(key, '"key" is required argument');
    check.assert.instanceStrict(key, Buffer, '"key" should be Buffer');
    check.assert.hasLength(key, 32, '"key" should be length of 256-bit');
    return new CryptoTransformStream({key, mode: CipherMode.ENCRYPT});
  }

  /**
   * Creates decryption stream
   * @param {Buffer} key
   * @return {CryptoTransformStream}
   */
  static decrypt(key) {
    check.assert.assigned(key, '"key" is required argument');
    check.assert.instanceStrict(key, Buffer, '"key" should be Buffer');
    check.assert.hasLength(key, 32, '"key" should be length of 256-bit');
    return new CryptoTransformStream({key, mode: CipherMode.DECRYPT});
  }
}


module.exports = CryptoStream;
