const should = require('chai').should();
const Directory = require('./directory');
const AggregionZip = require('./aggregionzip');
const BundleProps = require('./bundleprops');
const path = require('path');
const temp = require('temp');

describe('Directory', function () {
  const pathToTestDir = path.join(__dirname, '../testdata/directory');
  const pathToUnexistentDir = path.join(__dirname, '../testdata/directory-nonexistent');

  const info = {foo: 'bar', answerToTheUltimateQuestionOfLife: 42, godExists: false};
  const props = {main_file: 'index.html'};
  describe('#createReadStream', () => {
    it('should check input arguments', () => {
      should.throw(() => Directory.createReadStream());
      should.throw(() => Directory.createReadStream({path: pathToTestDir}));
      should.not.throw(() => Directory.createReadStream({path: pathToTestDir, info, props}));
    });

    it('should throw an error if directory does not exist', () => {
      should.throw(() => Directory.createReadStream({path: pathToUnexistentDir}));
    });

    describe('DirectoryReadStream', () => {

      describe('#pipe', () => {
        it('should pipe to writable stream', (done) => {
          let dirReadStream = Directory.createReadStream({path: pathToTestDir, info, props});
          let tempZip = temp.path() + '.zip';
          let zipWriteStream = AggregionZip.createWriteStream({path: tempZip});
          dirReadStream.pipe(zipWriteStream);
          zipWriteStream.on('finish', () => {
            let zipReadStream = AggregionZip.createReadStream({path: tempZip});
            zipReadStream
              .on('ready', () => {
                let count = zipReadStream.getFilesCount();
                count.should.equal(2);
                zipReadStream.getInfo().toJson().should.equal(BundleProps.fromObject(info).toJson());
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
          let dirReadStream = Directory.createReadStream({path: pathToTestDir, info, props});
          dirReadStream.once('ready', () => {
            dirReadStream.getFilesCount().should.equal(2);
            done();
          });
        });
      });

      describe('#getProps', () => {
        it('should return right props', (done) => {
          let dirReadStream = Directory.createReadStream({path: pathToTestDir, info, props});
          dirReadStream.once('ready', () => {
            dirReadStream.getProps().toJson().should.equal(BundleProps.fromObject(props).toJson());
            done();
          });
        });
      });

      describe('#getInfo', () => {
        it('should return right info', (done) => {
          let dirReadStream = Directory.createReadStream({path: pathToTestDir, info, props});
          dirReadStream.once('ready', () => {
            dirReadStream.getInfo().toJson().should.equal(BundleProps.fromObject(info).toJson());
            done();
          });
        });
      });

    });
  });
});
