const {Writable: WritableStream} = require('stream');
const {BundleStreamFactory} = require('./types');




class TextStream extends WritableStream {

  /**
   * Constructs a new instance
   */
  constructor() {
    super({objectMode: true});
  }


  _write(entry, encoding, done) {
    this.emit('entry', entry);
    done();
  }


}


class Text extends BundleStreamFactory {


  /**
   * Creates instance of bundle writable stream
   * @return {TextStream}
   */
  static createWriteStream() {
    return new TextStream();
  }

}

module.exports = Text;
