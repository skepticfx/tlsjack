#!/usr/bin/env node

var fs = require('fs');
var colors = require('colors');

function print_safe(data){
  var x;
  for(x=0; x < data.length; x++){
    var charCode = data.charCodeAt(x);
    if(charCode == 13 || charCode == 10 || (charCode >= 32 && charCode <= 126) ){
      process.stdout.write(data[x]);
    }
  }
}

// Parse the command line options
var program = require('commander');

program
  .version('0.1.4')
  .option('-l, --listen <port>', 'TLS port to listen on. Defaults to 443', parseInt)
  .option('-w, --logfile <filename>', 'Log requests to a file', String)
  .option('-f, --forward <host>', 'Forward all requests to a specific host', String)
  .option('-g, --gen-scripts', 'Generates a sample Intercept script')
  .parse(process.argv);

if(program.genScripts){
  var script = require('./intercept.js').str;
  fs.writeFileSync('script-intercept.js', script);
  console.log('See README for more information on how to script TLSJack');
  console.log('Intercept scripts generated: Look out for' + (' script-intercept.js').yellow);
  console.log('Run the script using,' + (' node script-intercept.js').yellow);
  process.exit(1);
}

program.outputHelp();
// Get a new instance of TLSJack
var TLSJack = require('../index.js');
var tlsjack = new TLSJack();
var tlsOptions = {
  ciphers: 'ALL:!LOW:!DSS:!EXP'
};

// Replace all the instances of the keyword, 'the' with the word 'nodejs'
function str_replace(data){
  return new Buffer(data.toString().replace(/the/gi, 'nodejs'));
}

tlsjack =
  tlsjack
    .listen(program.listen || 443)
    .logInfo()
    .logRequest()
    .logResponse()
    //.responseHook(str_replace);

if(program.logfile){
  tlsjack =
    tlsjack
      .logRequest()
      .logResponse()
      .writeLogs(program.logfile || "")
      // Strip Non-Printable characters while logging
      .setLogger(function(data){
        print_safe(data.toString());
      return data;
      });
}


if(program.forward){
  var fw = program.forward || 'localhost';
  tlsjack = tlsjack.forward(fw);
  console.log('Forwarding all requests to ' + fw);
}
tlsjack = tlsjack.start(tlsOptions);
