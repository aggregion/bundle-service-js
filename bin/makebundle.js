#!/usr/bin/env node

const cli = require('cli');
const check = require('check-types');
const BundleService = require('../src/');
const process = require('process');
const EntryType = require('../src/entryType');

cli.parse({
  index: ['i', 'Relative path to the index file in the bundle', 'string'],
  output: ['o', 'Path to the destination file', 'string'],
  outputType: ['t', 'Type of output bundle. By default it automatically resolves by extension.', 'string'],
  idApiUrl: ['Wu', 'Url to ID service API (for web-bundle).', 'string'],
  tokenLocalStoragePath: ['Wt', 'Path to localStorage token (for web-bundle)', 'string'],
  inputKey: ['k', 'Hexadecimal key of input file', 'string'],
  outputKey: ['K', 'Hexadecimal key of output file', 'string']
});

cli.main((args, options) => {
  try {
    if (!options.outputType === 'text') {
      check.assert.nonEmptyString(options.output, '"--output" is required argument and should be non-empty string');
      check.assert.nonEmptyArray(args, 'You must specify input file or directory');
      check.assert.hasLength(args, 1, 'You can specify only one input file or directory');
      check.assert.nonEmptyString(args[0], 'Invalid input file argument');
    }
    if (options.inputKey) {
      check.assert.hasLength(options.inputKey, 64, 'Input key should be length of 64');
    }
    if (options.outputKey) {
      check.assert.hasLength(options.outputKey, 64, 'Input key should be length of 64');
    }
  } catch (e) {
    cli.fatal(e.message);
  }
  let path = args[0];
  let rs = BundleService.createReadStream({path, encrypted: !!options.inputKey, info: {}, props: {main_file: options.index}});
  let ws = BundleService.createWriteStream({path: options.output, encrypted: !!options.outputKey, type: options.outputType});
  if (options.outputType === 'text') {
    ws.on('entry', (entry) => {
      if (entry.type === EntryType.FILE) {
        console.log('File:');
        console.log('  Path:', entry.bundlePath);
        if (entry.props) {
          console.log('  Properties:', entry.props.toJson());
        }
      } else if (entry.type == EntryType.BUNDLE_PROPS) {
        console.log('Bundle properties:');
        console.log('  ', entry.value.toJson());
      } else if (entry.type == EntryType.BUNDLE_INFO) {
        console.log('Bundle info:');
        console.log('  ', entry.value.toJson());
      }
    });
  }
  ws.on('finish', () => {
    cli.ok('Done!');
    process.exit(0);
  });
  ws.on('error', (e) => {
    cli.fatal(e);
    process.exit(-1);
  });
  rs.on('error', (e) => {
    cli.fatal(e);
    process.exit(-1);
  });
  let readStream = rs;
  let writeStream = ws;
  if (options.inputKey) {
    let decryptor = BundleService.createDecryptor(new Buffer(options.inputKey, 'hex'));
    readStream = readStream.pipe(decryptor);
  }
  if (options.outputKey) {
    let encryptor = BundleService.createEncryptor(new Buffer(options.outputKey, 'hex'));
    readStream = readStream.pipe(encryptor);
  }
  readStream.pipe(writeStream);
});
