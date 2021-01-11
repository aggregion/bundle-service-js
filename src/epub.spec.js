const should = require('chai').should();
const Epub = require('./epub');
const AggregionZip = require('./aggregionzip');
const BundleProps = require('./bundleprops');
const path = require('path');
const temp = require('temp');
const sinon = require('sinon');

describe('Epub', function () {
  const pathToTestFile = path.join(__dirname, '../testdata/test.epub');
  const testIncorrectBundlePath = path.join(__dirname, '../testdata/test.pdf');
  const testNonExistentBundlePath = path.join(__dirname, '../testdata/test.nonexistent');

  describe('#createReadStream', () => {
    it('should check input arguments', () => {
      should.throw(() => Epub.createReadStream());
      should.not.throw(() => Epub.createReadStream({path: pathToTestFile}));
    });

    it('should throw an error if file does not exist', () => {
      should.throw(() => Epub.createReadStream({path: testNonExistentBundlePath}));
    });

    describe('EpubReadStream', () => {

      const props = {main_file: 'OEBPS/content.opf'};

      describe('#pipe', () => {
        it('should pipe to writable stream', (done) => {
          let dirReadStream = Epub.createReadStream({path: pathToTestFile});
          let tempZip = temp.path() + '.zip';
          let zipWriteStream = AggregionZip.createWriteStream({path: tempZip});
          dirReadStream.pipe(zipWriteStream);
          zipWriteStream.on('finish', () => {
            let zipReadStream = AggregionZip.createReadStream({path: tempZip});
            zipReadStream
              .once('readable', () => {
                let count = zipReadStream.getFilesCount();
                count.should.equal(18);
                zipReadStream.getInfo().toJson().should.equal(BundleProps.fromObject({content_type: 'application/epub+zip'}).toJson());
                zipReadStream.getProps().toJson().should.equal(BundleProps.fromObject(props).toJson());
                done();
              })
              .on('error', (e) => {
                throw e;
              });
          });
        });

        it('should emit an error if file is incorrect', (done) => {
          let spy = sinon.spy();
          let readStream = Epub.createReadStream({path: testIncorrectBundlePath});
          readStream.once('error', spy);
          setTimeout(() => {
            spy.called.should.equal.true;
            done();
          }, 200);
        });
      });

      describe('#getFilesCount', () => {
        it('should return right count', (done) => {
          let dirReadStream = Epub.createReadStream({path: pathToTestFile});
          dirReadStream.once('readable', () => {
            dirReadStream.getFilesCount().should.equal(18);
            done();
          });
        });
      });

      describe('#getProps', () => {
        it('should return right props', (done) => {
          let dirReadStream = Epub.createReadStream({path: pathToTestFile});
          dirReadStream.once('readable', () => {
            dirReadStream.getProps().toJson().should.equal(BundleProps.fromObject(props).toJson());
            done();
          });
        });
      });

      describe('#getInfo', () => {
        it('should return correct info', (done) => {
          let dirReadStream = Epub.createReadStream({path: pathToTestFile});
          dirReadStream.once('readable', () => {
            dirReadStream.getInfo().toJson().should.equal(BundleProps.fromObject({content_type: 'application/epub+zip'}).toJson());
            done();
          });
        });
      });
    });
  });
});
