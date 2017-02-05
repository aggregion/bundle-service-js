const AggregionZip = require('./aggregionzip');
const should = require('chai').should();
const path = require('path');
const temp = require('temp');
const fs = require('fs');
const sinon = require('sinon');

describe('Zip', function () {

  const checkProps = (props) => {
    props.should.not.be.null;
    props.get('main_file').should.equal('index.html');
  };

  const checkInfo = (info) => {
    info.should.not.be.null;
    info.get('title').should.equal('index.html');
    info.get('content_id').should.equal('163b27b5-7e99-49c1-8a98-df7a65a88c4a');
    info.get('creation_date').should.equal(1485870937);
  };

  describe('#createReadStream', function () {
    this.timeout(10000);
    let testBundlePath = path.join(__dirname, '../testdata/testbundle.aggregion');
    let testIncorrectBundlePath = path.join(__dirname, '../testdata/test.pdf');
    let testNonExistentBundlePath = path.join(__dirname, '../testdata/test.nonexistent');



    it('should check input arguments', () => {
      should.not.throw(() => AggregionZip.createReadStream({path: testBundlePath}));
      should.throw(() => AggregionZip.createReadStream());
    });

    it('should throw an error if file does not exist', () => {
      should.throw(() => AggregionZip.createReadStream({path: testNonExistentBundlePath}));
    });

    describe('AggregionZipReadStream', () => {

      describe('#pipe', () => {
        it('should pipe to writable stream', (done) => {
          let readStream = AggregionZip.createReadStream({path: testBundlePath});
          let tempFile = temp.path() + '.zip';
          let writeStream = AggregionZip.createWriteStream({path: tempFile});
          readStream.pipe(writeStream);
          writeStream.once('finish', () => {
            let testStream = AggregionZip.createReadStream({path: tempFile});
            testStream
              .once('ready', () => {
                checkInfo(testStream.getInfo());
                checkProps(testStream.getProps());
                done();
                setTimeout(() => fs.unlink(tempFile), 0);
              })
              .once('error', (e) => {
                throw e;
              });
          });
        });

        it('should emit an error if file is incorrect', (done) => {
          let spy = sinon.spy();
          let readStream = AggregionZip.createReadStream({path: testIncorrectBundlePath});
          readStream.once('error', spy);
          setTimeout(() => {
            spy.called.should.equal.true;
            done();
          }, 200);
        });
      });

      describe('#getFilesCount', () => {
        it('should return right files count', (done) => {
          let aggZip = AggregionZip.createReadStream({path: testBundlePath});
          aggZip.once('ready', () => {
            let count = aggZip.getFilesCount();
            count.should.equal(1);
            done();
          });
        });
      });


      describe('#getInfo', () => {
        it('should read bundle info', (done) => {
          let aggZip = AggregionZip.createReadStream({path: testBundlePath});
          aggZip.once('ready', () => {
            let info = aggZip.getInfo();
            checkInfo(info);
            done();
          });
        });
      });

      describe('#getProps', () => {
        it('should read bundle properties', (done) => {
          let aggZip = AggregionZip.createReadStream({path: testBundlePath});
          aggZip.once('ready', () => {
            let props = aggZip.getProps();
            checkProps(props);
            done();
          });
        });
      });
    });
  });

  describe('#createWriteStream', () => {

  });
});
