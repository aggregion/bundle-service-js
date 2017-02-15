const CryptoStream = require('./cryptoStream');
const BundleService = require('./index');
const path = require('path');
const temp = require('temp');
const AggregionBundle = require('agg-bundle');
const fs = require('fs');
const BundleProps = require('./bundleprops');

describe('CryptoStream', () => {

  const bundleKey = new Buffer('b61476c21ade3c98c179c4c4ceebc2fab7916a54e6fb293ac1cd23f364408ffc', 'hex');
  const encryptedBundlePath = path.join(__dirname, '../testdata/testbundle.encrypted.agb');
  const unencryptedBundlePath = path.join(__dirname, '../testdata/testbundle.agb');

  const etalonInfo = BundleProps.fromObject({
    device_type: 'grd_v1',
    content_id: '5896efa807d9d181165405e2',
    creation_date: 1486286778
  });
  const etalonProps = BundleProps.fromObject({
    main_file: 'index.html'
  });
  const etalonFileData = 'Hello';
  const etalonFileProps = BundleProps.fromObject({
    size: 5
  });


  function collectBundleData(path) {
    let bundleData = {};
    let bundle = new AggregionBundle({path: path});
    return bundle
      .getBundleInfoData()
      .then((infoData) => {
        bundleData.infoData = infoData;
        return bundle.getBundlePropertiesData();
      })
      .then((propsData) => {
        bundleData.propsData = propsData;
        return bundle.readFileBlock(bundle.openFile('index.html'), 10);
      })
      .then((fileData) => {
        bundleData.fileData = fileData;
        return bundle.readFilePropertiesData(bundle.openFile('index.html'));
      })
      .then((filePropsData) => {
        bundleData.filePropsData = filePropsData;
        return Promise.resolve(bundleData);
      });
  }

  function checkBundle(path) {
    return collectBundleData(path)
      .then((bundleData) => {
        require('chai').should();
        BundleProps.fromJson(bundleData.infoData.toString()).should.deep.equal(etalonInfo);
        BundleProps.fromJson(bundleData.propsData.toString()).should.deep.equal(etalonProps);
        console.log('bundleData.filePropsData.toString()', bundleData.filePropsData.toString());
        BundleProps.fromJson(bundleData.filePropsData.toString()).should.deep.equal(etalonFileProps);
        bundleData.fileData.toString().should.equal(etalonFileData);
        return Promise.resolve();
      });
  }

  describe('#decrypt', () => {
    it('should decrypt all data in the bundle', (done) => {
      let bundleStream = BundleService.createReadStream({path: encryptedBundlePath, encrypted: true});
      let decryptor = CryptoStream.decrypt(bundleKey);
      let tempBundlePath = temp.path() + '.agb';
      let outStream = BundleService.createWriteStream({path: tempBundlePath});
      outStream.once('finish', () => {
        checkBundle(tempBundlePath)
          .then(() => {
            done();
          })
          .catch(done)
          .then(() => fs.unlinkSync(tempBundlePath));
      });
      outStream.once('error', done);
      bundleStream.once('error', done);
      decryptor.once('error', done);
      bundleStream.pipe(decryptor).pipe(outStream);
    });
  });

  describe('#encrypt', () => {
    it('should encrypt all data in the bundle', (done) => {
      let bundleStream = BundleService.createReadStream({path: unencryptedBundlePath});
      let encryptor = CryptoStream.encrypt(bundleKey);
      let tempBundlePath = temp.path() + '.agb';
      let outStream = BundleService.createWriteStream({path: tempBundlePath});
      outStream.once('finish', () => {
        let tempDecryptedBundlePath = temp.path() + '.agb';
        let bundleStream = BundleService.createReadStream({path: tempBundlePath, encrypted: true});
        let outDecryptedStream = BundleService.createWriteStream({path: tempDecryptedBundlePath});
        let decryptor = CryptoStream.decrypt(bundleKey);
        outDecryptedStream.once('finish', () => {
          checkBundle(tempDecryptedBundlePath)
            .then(() => {
              done();
            })
            .catch(done)
            .then(() => {
              fs.unlinkSync(tempBundlePath);
              fs.unlinkSync(tempDecryptedBundlePath);
            });
        });
        outDecryptedStream.once('error', done);
        bundleStream.once('error', done);
        decryptor.once('error', done);
        bundleStream.pipe(decryptor).pipe(outDecryptedStream);
      });
      outStream.once('error', done);
      bundleStream.once('error', done);
      encryptor.once('error', done);
      bundleStream.pipe(encryptor).pipe(outStream);
    });
  });
});
