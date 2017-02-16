#!/usr/bin/env node

const cli = require('cli');
const check = require('check-types');
const BundleService = require('../src/');
const process = require('process');

cli.parse({
  index: ['i', 'Relative path to the index file in the bundle', 'string'],
  output: ['o', 'Path to the destination file', 'string'],
  inputKey: ['k', 'Hexadecimal key of input file', 'string'],
  outputKey: ['K', 'Hexadecimal key of output file', 'string']
});

cli.main((args, options) => {
  try {
    check.assert.nonEmptyString(options.index, '"--index" is required argument and should be non-empty string');
    check.assert.nonEmptyString(options.output, '"--output" is required argument and should be non-empty string');
    check.assert.nonEmptyArray(args, 'You must specify input file or directory');
    check.assert.hasLength(args, 1, 'You can specify only one input file or directory');
    check.assert.nonEmptyString(args[0], 'Invalid input file argument');
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
  let rs = BundleService.createReadStream({path, info: {}, props: {main_file: options.index}});
  let ws = BundleService.createWriteStream({path: options.output});
  ws.on('finish', () => {
    cli.ok('Done!');
    setTimeout(() => process.exit(0), 20000);
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
