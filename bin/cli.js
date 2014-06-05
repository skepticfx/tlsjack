#!/usr/bin/env node

var fs = require('fs');

// Parse the command line options
var program = require('commander');

program
  .version('0.1.3')
  .option('-l, --listen <port>', 'TLS port to listen on. Defaults to 443', parseInt)
  .option('-w, --logfile <filename>', 'Log requests to a file', String)
  .option('-f, --forward <filename>', 'Forward all requests to a specific host', String)
  .parse(process.argv);

program.outputHelp();
// Get a new instance of TLSJack
var TLSJack = require('../index.js');
var tlsjack = new TLSJack();
var tlsOptions = {
  ciphers: 'ALL:!LOW:!DSS:!EXP'
};

tlsjack =
  tlsjack
    .listen(program.listen || 443)
    .logInfo()
    .logRequest()
    .logResponse();

if(program.logfile){
  tlsjack =
    tlsjack
      .logRequest()
      .logResponse()
      .writeLogs(program.logfile || "")
      // Disable Non-Printable characters while logging, to stop console.log
      .setLogger(function(data){
        print_safe(data);
        return data;
      });
}

if(program.forward){
  var fw = program.forward || 'localhost';
  tlsjack = tlsjack.forward(fw);
  console.log('Forwarding all requests to ' + fw);
}
tlsjack = tlsjack.start(tlsOptions);


function print_safe(data){
  var x;
  for(x=0; x < data.lenght; x++){
    var charCode = data.charCodeAt(x);
    if( charCode >= 32 && charCode <= 126){
      console.log(data[x]);
    }
  }
}
