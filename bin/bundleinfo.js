#!/usr/bin/env node

const cli = require('cli');
const check = require('check-types');
const BundleService = require('../src/');
const TextStream = require('../src/text');
const process = require('process');
const EntryType = require('../src/entryType');

cli.parse({
  key: ['k', 'Hexadecimal string master key', 'string'],
  public: ['p', 'Show only public info', 'boolean']
});

cli.main((args, options) => {
  try {
    check.assert.nonEmptyArray(args, 'You must specify input file or directory');
    check.assert.hasLength(args, 1, 'You can specify only one input file or directory');
    check.assert.nonEmptyString(args[0], 'Invalid input file argument');
    if (options.key) {
      check.assert.hasLength(options.key, 64, 'Key should be length of 64 characters');
    }
  } catch (e) {
    cli.fatal(e.message);
  }
  let path = args[0];
  let decryptor;
  if (options.key) {
    decryptor = BundleService.createDecryptor(new Buffer(options.key, 'hex'));
  }
  let rs = BundleService.createReadStream({path, encrypted: options.public || !!options.key});
  let ws = TextStream.createWriteStream();
  ws.on('entry', (entry) => {
    if (entry.type === EntryType.FILE) {
      console.log('File:');
      console.log('  Path:', entry.bundlePath);
      if (entry.props && !options.public) {
        console.log('  Properties:', entry.props.toJson());
      }
    } else if (entry.type == EntryType.BUNDLE_PROPS && !options.public) {
      console.log('Bundle properties:');
      console.log('  ', entry.value.toJson());
    } else if (entry.type == EntryType.BUNDLE_INFO) {
      console.log('Bundle info:');
      console.log('  ', entry.value.toJson());
    }
  });
  ws.on('finish', () => {
    cli.ok('Done!');
    process.exit(0);
  });
  rs.on('error', (e) => {
    console.log(new Error(e));
    cli.fatal(e);
    process.exit(-1);
  });
  if (decryptor) {
    decryptor.on('error', (e) => {
      cli.fatal(e);
      process.exit(-1);
    });
    rs.pipe(decryptor).pipe(ws);
  } else {
    rs.pipe(ws);
  }
});
