const Resolver = require('./index');
const temp = require('temp');
const fs = require('fs');
const path = require('path');
const should = require('chai').should();



describe('Renderer', function() {
  this.timeout(10000);
  const pathToTestPdfFile = path.join(__dirname, '../testdata/test.pdf');
  const pathToTestEPubFile = path.join(__dirname, '../testdata/test.epub');


  describe('#createReadStream', () => {
    it('should check input arguments', () => {
      should.throw(() => Resolver.createRenderer());
      should.not.throw(() => Resolver.createRenderer({path: pathToTestPdfFile, pages: ['1-100']}));
    });

    const renderTestFunc = process.env.WITH_RENDERER ? it : it.skip;

    renderTestFunc('should render PDF', (done) => {
      const tempPath = temp.path({suffix: '.pdf'});
      const readStream = Resolver.createReadStream({path: pathToTestPdfFile});
      const writeStream = Resolver.createRenderer({path: tempPath, pages: [1,2]});
      writeStream.once('finish', () => {
        fs.statSync(tempPath).size.should.be.greaterThan(0);
        fs.unlinkSync(tempPath);
        done();
      });
      readStream.pipe(writeStream);
    });

    renderTestFunc('should render ePub', (done) => {
      const tempPath = temp.path({suffix: '.pdf'});
      const readStream = Resolver.createReadStream({path: pathToTestEPubFile});
      const writeStream = Resolver.createRenderer({path: tempPath, pages: [1, '3-100']});
      writeStream.once('finish', () => {
        fs.statSync(tempPath).size.should.be.greaterThan(0);
        fs.unlinkSync(tempPath);
        done();
      });
      readStream.pipe(writeStream);
    });
  });
});
