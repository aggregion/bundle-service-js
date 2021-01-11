const fs = require('fs');
const path = require('path');
const digestStream = require('digest-stream');
const passStream = require('pass-stream');
const AggregionBundle = require('@aggregion/agg-bundle');
const AggregionWritableFileStream = require('./aggregionWritableFileStream');
const temp = require('temp');
const should = require('chai').should();
const BundleProps = require('./bundleprops');


describe('AggregionWritableFileStream', () => {
  describe('#constructor', () => {
    it('should check input arguments', () => {
      should.throw(() => new AggregionWritableFileStream());
      should.throw(() => new AggregionWritableFileStream({bundle: {}, path: 'test.dat'}));
    });
  });

  describe('#pipe', () => {
    it('should accept pipe from another stream', (done) => {
      let testFilePath = path.join(__dirname, '../testdata/test.pdf');
      let sourceStream = fs.createReadStream(testFilePath);
      let writtenSize;
      let writtenDigest;
      let hashStream = digestStream('sha1', 'hex', (resultDigest, length) => {
        writtenSize = length;
        writtenDigest = resultDigest;
      });
      let tempBundlePath = temp.path() + '.agb';
      let bundle = new AggregionBundle({path: tempBundlePath});
      let filePath = 'test.dat';
      let bundleStream = new AggregionWritableFileStream({bundle, path: filePath});
      sourceStream
        .pipe(hashStream)
        .pipe(bundleStream);
      bundleStream.on('finish', () => {
        let checkHashStream = digestStream('sha1', 'hex', (digest, length) => {
          length.should.equal(writtenSize);
          digest.should.equal(writtenDigest);
          done();
        });
        let bundle = new AggregionBundle({path: tempBundlePath});
        let size = bundle.getFileSize(filePath);
        size.should.equal(writtenSize);
        let fd = bundle.openFile(filePath);
        bundle
          .readFileBlock(fd, size)
          .then((block) => {
            let sourceStream = passStream();
            sourceStream.pipe(checkHashStream);
            sourceStream.end(block);
          })
          .catch(done)
          .then(() => {
            fs.unlinkSync(tempBundlePath);
          });
      });
      bundleStream.on('error', (e) => {
        done(e);
      });
    });
  });
});
