const should = require('chai').should();
const SingleFile = require('./singleFile');
const AggregionZip = require('./aggregionzip');
const BundleProps = require('./bundleprops');
const path = require('path');
const temp = require('temp');

describe('SingleFile', function () {
  const pathToTestFile = path.join(__dirname, '../testdata/test.pdf');
  const testNonExistentBundlePath = path.join(__dirname, '../testdata/test.nonexistent');

  describe('#createReadStream', () => {
    it('should check input arguments', () => {
      should.throw(() => SingleFile.createReadStream());
      should.not.throw(() => SingleFile.createReadStream({path: pathToTestFile}));
    });

    it('should throw an error if file does not exist', () => {
      should.throw(() => SingleFile.createReadStream({path: testNonExistentBundlePath}));
    });

    describe('SingleFileReadStream', () => {
      const props = {main_file: 'index.pdf'};

      describe('#pipe', () => {
        it('should pipe to writable stream', (done) => {
          let dirReadStream = SingleFile.createReadStream({path: pathToTestFile});
          let tempZip = temp.path() + '.zip';
          let zipWriteStream = AggregionZip.createWriteStream({path: tempZip});
          dirReadStream.pipe(zipWriteStream);
          zipWriteStream.on('finish', () => {
            let zipReadStream = AggregionZip.createReadStream({path: tempZip});
            zipReadStream
              .on('readable', () => {
                let count = zipReadStream.getFilesCount();
                let files = zipReadStream.getFiles();
                files[0].should.equal('index.pdf');
                count.should.equal(1);
                zipReadStream.getInfo().toJson().should.equal(BundleProps.fromObject({content_type: 'application/pdf'}).toJson());
                zipReadStream.getProps().toJson().should.equal(BundleProps.fromObject(props).toJson());
                done();
              })
              .on('error', (e) => {
                throw e;
              });
          });
        });

      });

      describe('#getFilesCount', () => {
        it('should return right count', (done) => {
          let dirReadStream = SingleFile.createReadStream({path: pathToTestFile});
          dirReadStream.once('readable', () => {
            dirReadStream.getFilesCount().should.equal(1);
            done();
          });
        });
      });

      describe('#getProps', () => {
        it('should return right props', (done) => {
          let dirReadStream = SingleFile.createReadStream({path: pathToTestFile});
          dirReadStream.once('readable', () => {
            dirReadStream.getProps().toJson().should.equal(BundleProps.fromObject(props).toJson());
            done();
          });
        });
      });

      describe('#getInfo', () => {
        it('should return right info', (done) => {
          let readStream = SingleFile.createReadStream({path: pathToTestFile});
          readStream.once('readable', () => {
            readStream.getInfo().toJson().should.equal(BundleProps.fromObject({content_type: 'application/pdf'}).toJson());
            done();
          });
        });
      });
    });

  });
});
