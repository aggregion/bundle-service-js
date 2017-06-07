const BundleService = require('./');
const should = require('chai').should();
const path = require('path');
const temp = require('temp');
const fs = require('fs');

describe('BundleService', () => {
  describe.only('#resolve', () => {
    it('should resolve directory streamer', () => {
      let srcPath = path.join(__dirname, '../testdata/directory');
      BundleService.resolve(srcPath).should.be.equal(require('./directory'));
    });

    it('should resolve aggregionzip streamer', () => {
      let srcPath = path.join(__dirname, '../testdata/testbundle.aggregion');
      BundleService.resolve(srcPath).should.be.equal(require('./aggregionzip'));
    });

    it('should resolve aggregion streamer', () => {
      let srcPath = path.join(__dirname, '../testdata/testbundle.agb');
      BundleService.resolve(srcPath).should.be.equal(require('./aggregion'));
    });

    it('should resolve ePub streamer', () => {
      let srcPath = path.join(__dirname, '../testdata/test.epub');
      BundleService.resolve(srcPath).should.be.equal(require('./epub'));
    });

    it('should resolve zip streamer', () => {
      let srcPath = path.join(__dirname, '../testdata/testbundle.zip');
      BundleService.resolve(srcPath).should.be.equal(require('./zip'));
    });

    it('should resolve single file streamer', () => {
      let srcPath = path.join(__dirname, '../testdata/test.pdf');
      BundleService.resolve(srcPath).should.be.equal(require('./singleFile'));
    });

    it('should resolve by explicit type argument', () => {
      let srcPath = path.join(__dirname, '../testdata/test.pdf');
      BundleService.resolve(srcPath, 'write', 'web').should.be.equal(require('./web/web'));
      BundleService.resolve(srcPath, 'write', 'agb').should.be.equal(require('./aggregion'));
      BundleService.resolve(srcPath, 'write', 'aggregion').should.be.equal(require('./aggregionzip'));
      BundleService.resolve(srcPath, 'write', 'epub').should.be.equal(require('./epub'));
      BundleService.resolve(srcPath, 'write', 'zip').should.be.equal(require('./zip'));
      BundleService.resolve(srcPath, 'write', 'directory').should.be.equal(require('./directory'));

    });

    it('should resolve in any characters case in file extension', () => {
      BundleService.resolve(path.join(__dirname, '../testdata/test.pdf')).should.be.equal(require('./singleFile'));
      BundleService.resolve(path.join(__dirname, '../testdata/test.pDf')).should.be.equal(require('./singleFile'));
      BundleService.resolve(path.join(__dirname, '../testdata/test.PDF')).should.be.equal(require('./singleFile'));
    })
  });

  describe('#createReadStream', () => {
    it('should create readable stream', () => {
      let srcPath = path.join(__dirname, '../testdata/testbundle.agb');
      let stream = BundleService.createReadStream({path: srcPath});
      should.exist(stream);
      stream.should.have.property('read');
    });
  });

  describe('#createWriteStream', () => {
    it('should create writable stream', () => {
      let srcPath = temp.path() + '.agb';
      let stream = BundleService.createWriteStream({path: srcPath});
      try {
        should.exist(stream);
        stream.should.have.property('write');
        stream.should.have.property('end');
      } finally {
        fs.unlinkSync(srcPath);
      }
    });
  });

  describe('#createEncryptor', () => {
    it('should create transform stream', () => {
      let stream = BundleService.createEncryptor(new Buffer(32));
      should.exist(stream);
      stream.should.have.property('_transform');
      stream._mode.should.equal('encrypt');
    });
  });

  describe('#createDecryptor', () => {
    it('should create transform stream', () => {
      let stream = BundleService.createDecryptor(new Buffer(32));
      should.exist(stream);
      stream.should.have.property('_transform');
      stream._mode.should.equal('decrypt');
    });
  });
});
