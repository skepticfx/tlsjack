var Tlsjack = require('tlsjack');
var jack = new Tlsjack();

// Tlsjack has its own key pair for TLS connections.

jack
  .listen(443) // Listen on port '443'
  .logRequest() // Log Requests
  .logResponse() // Log Responses
  .logInfo() // Log Connection Information
  .responseHook(str_replace) // Hook responses using custom function
  .start();

// Replace all the instances of the keyword, 'the' with the word 'nodejs'
function str_replace(data){
  return data.toString().replace(/the/gi, 'nodejs');
}
