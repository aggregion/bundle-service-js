const fs = require('fs');
const digestStream = require('digest-stream');
const passStream = require('pass-stream');
const AggregionBundle = require('agg-bundle');
const AggregionReadableFileStream = require('./aggregionReadableFileStream');
const temp = require('temp');
const should = require('chai').should();


describe('AggregionReadableFileStream', () => {
  describe('#constructor', () => {
    it('should check input arguments', () => {
      should.throw(() => new AggregionWritableFileStream());
      should.throw(() => new AggregionWritableFileStream({bundle: {}, path: 'test.dat'}));
    });
  });

  describe('#pipe', () => {
    it('should pipe to another stream', (done) => {
      let data = new Buffer('Test data', 'UTF-8');
      let hashStream = digestStream('sha1', 'hex', (digest, length) => {
        let filePath = 'test.dat';
        let tempBundlePath = temp.path() + '.agb';
        let bundle = new AggregionBundle({path: tempBundlePath});
        bundle
          .createFile(filePath)
          .then((fd) => {
            return bundle.writeFileBlock(fd, data);
          })
          .then(() => {
            let bundle = new AggregionBundle({path: tempBundlePath});
            let sourceStream = new AggregionReadableFileStream({bundle, path: filePath});
            let checkHashStream = digestStream('sha1', 'hex', (checkDigest, checkLength) => {
              digest.should.equal(checkDigest);
              length.should.equal(checkLength);
              done();
            });
            sourceStream.pipe(checkHashStream);
          })
          .catch(done)
          .then(() => {
            fs.unlinkSync(tempBundlePath);
          });
      });
      let pStream = passStream();
      pStream.pipe(hashStream);
      pStream.end(data);
    });
  });
});
