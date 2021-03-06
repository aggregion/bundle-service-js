const Aggregion = require('./aggregion');
const should = require('chai').should();
const path = require('path');
const temp = require('temp');
const fs = require('fs');
const sinon = require('sinon');
const Bundle = require('@aggregion/agg-bundle');
const BundleProps = require('./bundleprops');

describe('Aggregion', function () {

  function checkProps(props, done) {
    try {
      props.should.not.be.null;
      props.get('main_file').should.equal('index.html');
      done();
    } catch (e) {
      done(e);
    }
  }

  function checkInfo(info, done) {
    try {
      info.should.not.be.null;
      info.get('device_type').should.equal('grd_v1');
      info.get('content_id').should.equal('5896efa807d9d181165405e2');
      info.get('creation_date').should.equal(1486286778);
      done();
    } catch (e) {
      done(e);
    }
  }

  describe('#createReadStream', () => {
    let testBundlePath = path.join(__dirname, '../testdata/testbundle.agb');
    let testIncorrectBundlePath = path.join(__dirname, '../testdata/test.pdf');
    let testNonExistentBundlePath = path.join(__dirname, '../testdata/test.nonexistent');



    it('should check input arguments', () => {
      should.not.throw(() => Aggregion.createReadStream({path: testBundlePath}));
      should.throw(() => Aggregion.createReadStream());
    });

    it('should throw an error if file does not exist', () => {
      should.throw(() => Aggregion.createReadStream({path: testNonExistentBundlePath}));
    });

    describe('AggregionReadStream', () => {

      describe('#pipe', () => {
        it('should pipe to writable stream', (done) => {
          let readStream = Aggregion.createReadStream({path: testBundlePath});
          let tempFile = temp.path() + '.agb';
          const infoToMix = {test: 'test'};
          let writeStream = Aggregion.createWriteStream({path: tempFile, info: infoToMix});
          readStream.pipe(writeStream);
          writeStream.once('finish', () => {
            let testBundle = new Bundle({path: tempFile});
            let fd = testBundle.openFile('index.html');
            testBundle
              .readFilePropertiesData(fd)
              .then((propsData) => {
                propsData.toString().should.equal(BundleProps.fromObject({"size":5}).toJson());
              })
              .then(() => {
                return testBundle.getBundleInfoData();
              })
              .then(bundleInfoData => {
                const info = BundleProps.fromJson(bundleInfoData.toString('UTF-8')).toObject();
                info.test.should.equal(infoToMix.test);
              })
              .then(() => {
                let testStream = Aggregion.createReadStream({path: tempFile});
                testStream
                  .once('ready', () => {
                    checkInfo(testStream.getInfo(), (e) => {
                      if (e) {
                        return done(e);
                      }
                      checkProps(testStream.getProps(), done);
                    });
                    setTimeout(() => fs.unlink(tempFile), 0);
                  })
                  .once('error', (e) => {
                    throw e;
                  });
              })
              .catch(done);
          });
        });

        it('should emit an error if file is incorrect', () => {
          should.throw(() => Aggregion.createReadStream({path: testIncorrectBundlePath}));
        });
      });

      describe('#getFilesCount', () => {
        it('should return right files count', (done) => {
          let agg = Aggregion.createReadStream({path: testBundlePath});
          agg.once('ready', () => {
            let count = agg.getFilesCount();
            count.should.equal(1);
            done();
          });
        });
      });


      describe('#getInfo', () => {
        it('should read bundle info', (done) => {
          let agg = Aggregion.createReadStream({path: testBundlePath});
          agg.once('ready', () => {
            let info = agg.getInfo();
            checkInfo(info, done);
          });
        });
      });

      describe('#getProps', () => {
        it('should read bundle properties', (done) => {
          let agg = Aggregion.createReadStream({path: testBundlePath});
          agg.once('ready', () => {
            let props = agg.getProps();
            checkProps(props, done);
          });
        });
      });
    });
  });

  describe('#createWriteStream', () => {

  });
});
