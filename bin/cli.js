#!/usr/bin/env node

var fs = require('fs');

// Parse the command line options
var program = require('commander');

program
  .version('0.1.1')
  .option('-l, --listen <port>', 'TLS port to listen on. Defaults to 443', parseInt)
  .option('-w, --logfile <filename>', 'Log requests to a file', String)
  .parse(process.argv);

program.outputHelp();
// Get a new instance of TLSJack
var TLSJack = require('../index.js');
var tlsjack = new TLSJack();
var tlsOptions = {
  ciphers: 'ALL:!LOW:!DSS:!EXP'
};

tlsjack = tlsjack.listen(program.listen || 443)
                 .logInfo()
                 .logRequest();

if(program.logfile){
  tlsjack =
    tlsjack
      .logRequest()
      .writeLogs(program.logfile || "")
      // Disable logger, to stop console.log
      .setLogger(function(data){ return data;});
}


tlsjack = tlsjack.start(tlsOptions);
