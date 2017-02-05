#!/usr/bin/env node

const cli = require('cli');
const check = require('check-types');
const BundleService = require('../src/');
const process = require('process');

cli.parse({
  index: ['i', 'Relative path to the index file in the bundle', 'string'],
  output: ['o', 'Path to the destination file', 'string']
});

cli.main((args, options) => {
  try {
    check.assert.nonEmptyString(options.index, '"--index" is required argument and should be non-empty string');
    check.assert.nonEmptyString(options.output, '"--output" is required argument and should be non-empty string');
    check.assert.nonEmptyArray(args, 'You must specify input file or directory');
    check.assert.hasLength(args, 1, 'You can specify only one input file or directory');
    check.assert.nonEmptyString(args[0], 'Invalid input file argument');
  } catch (e) {
    cli.fatal(e.message);
  }
  let path = args[0];
  let rs = BundleService.createReadStream({path, info: {}, props: {main_file: options.index}});
  let ws = BundleService.createWriteStream({path: options.output});
  ws.on('finish', () => {
    cli.ok('Done!');
    process.exit(0);
  });
  rs.on('error', (e) => {
    cli.fatal(e);
    process.exit(-1);
  });
  rs.pipe(ws);
});
