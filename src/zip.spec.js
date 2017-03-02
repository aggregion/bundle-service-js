const Zip = require('./zip');
const Aggregion = require('./aggregion');
const should = require('chai').should();
const path = require('path');
const temp = require('temp');
const fs = require('fs');
const sinon = require('sinon');
const BundleProps = require('./bundleprops');

describe('Zip', function () {

  const testInfo = BundleProps.fromObject({foo: 'bar', answerToTheUltimateQuestionOfLife: 42, godExists: false});
  const testProps = BundleProps.fromObject({main_file: 'index.html'});

  const checkProps = (props) => {
    props.should.not.be.null;
    props.toJson().should.be.equal(testProps.toJson());
  };

  const checkInfo = (info) => {
    info.should.not.be.null;
    info.toJson().should.be.equal(testInfo.toJson());
  };

  describe('#createReadStream', function () {
    this.timeout(10000);
    let testBundlePath = path.join(__dirname, '../testdata/testbundle.zip');
    let testIncorrectBundlePath = path.join(__dirname, '../testdata/test.pdf');
    let testNonExistentBundlePath = path.join(__dirname, '../testdata/test.nonexistent');



    it('should check input arguments', () => {
      should.not.throw(() => Zip.createReadStream({path: testBundlePath, info: testInfo, props: testProps}));
      should.throw(() => Zip.createReadStream());
    });

    it('should throw an error if file does not exist', () => {
      should.throw(() => Zip.createReadStream({path: testNonExistentBundlePath, info: testInfo, props: testProps}));
    });

    describe('AggregionZipReadStream', () => {

      describe('#pipe', () => {
        it('should pipe to writable stream', (done) => {
          let readStream = Zip.createReadStream({path: testBundlePath, info: testInfo, props: testProps});
          let tempFile = temp.path() + '.zip';
          let writeStream = Zip.createWriteStream({path: tempFile});
          readStream.pipe(writeStream);
          writeStream.once('finish', () => {
            let testStream = Zip.createReadStream({path: tempFile, info: testInfo, props: testProps});
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
          let readStream = Zip.createReadStream({path: testIncorrectBundlePath, info: testInfo, props: testProps});
          readStream.once('error', spy);
          setTimeout(() => {
            spy.called.should.equal.true;
            done();
          }, 200);
        });

        it('should resolve main file', (done) => {
          let readStream = Zip.createReadStream({path: testBundlePath});
          let tempFile = temp.path() + '.agb';
          let writeStream = Aggregion.createWriteStream({path: tempFile});
          readStream.pipe(writeStream);
          writeStream.once('finish', () => {
            try {
              let testStream = Aggregion.createReadStream({path: tempFile});
              testStream
                .once('ready', () => {
                  let props = testStream.getProps();
                  let mainFile = props.get('main_file');
                  should.exist(mainFile);
                  mainFile.should.be.equal('index.html');
                  done();
                  setTimeout(() => fs.unlink(tempFile), 0);
                })
                .once('error', (e) => {
                  done(e);
                });
            } catch (e) {
              done(e);
            }
          });
          writeStream.once('error', (e) => {
            done(e);
          });
          readStream.once('error', (e) => {
            done(e);
          });
        });

      });

      describe('#getFilesCount', () => {
        it('should return right files count', (done) => {
          let aggZip = Zip.createReadStream({path: testBundlePath, info: testInfo, props: testProps});
          aggZip.once('ready', () => {
            let count = aggZip.getFilesCount();
            count.should.equal(2);
            done();
          });
        });
      });


      describe('#getInfo', () => {
        it('should read bundle info', (done) => {
          let aggZip = Zip.createReadStream({path: testBundlePath, info: testInfo, props: testProps});
          aggZip.once('ready', () => {
            let info = aggZip.getInfo();
            checkInfo(info);
            done();
          });
        });
      });

      describe('#getProps', () => {
        it('should read bundle properties', (done) => {
          let aggZip = Zip.createReadStream({path: testBundlePath, info: testInfo, props: testProps});
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
