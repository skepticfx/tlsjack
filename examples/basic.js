// Get an instance of TLSJack
var TLSJack = require('tlsjack');
var tlsjack = new TLSJack();

// Start TLSJack and log requests
tljsack
  .logRequest()
  .logInfo()
  .start();
