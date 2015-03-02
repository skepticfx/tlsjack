var net = require('net');
var tls = require('tls');
var Xstream = require('node-xstream');
var fs = require('fs');
var crypto = require('crypto');
var colors = require('colors');
var inherits = require('util').inherits;

colors.setTheme({
  once: 'rainbow',
  input: 'grey',
  verbose: 'cyan',
  prompt: 'grey',
  info: 'green',
  data: 'grey',
  help: 'cyan',
  warn: 'yellow',
  debug: 'blue',
  error: 'red'
});

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

module.exports = Tlsjack;

function Tlsjack(){
  this.listenPort = '443';
  this.forwardPort = '443';
  this.forwardHost = 'localhost';
  this.isLogRequest = false;
  this.isLogResponse = false;
  this.isLogInfo = false;
  this.reqh = "";
  this.resh = "";
  this.isWriteLogs = false;
  this.logFileName = "";
  this.customForwarding = false;
}



Tlsjack.prototype.writeLogs = function(fileName){
  this.isWriteLogs = true;
  if(fileName === "")  fileName = null;
  this.logFileName = fileName || String("tlsjack-logs-" + new Date().getTime() + ".txt");
  console.log(('Logging to: ').red + this.logFileName);
return this;
}


Tlsjack.prototype.setLogger = function(fn){
  // Check whether the custom function returns the data. If not, fallback to default.
  var a = fn('testing setLogger');
  if(a !== 'testing setLogger'){
    console.log('The Custom Logger provided using setLogger, doesn\'t return the original data arg.');
    console.log('Using the default logger for now');
    return this;
  }
  this.logger = fn;
return this;
}

Tlsjack.prototype.logger = function(data){
  console.log(data.toString());
return data;
}

Tlsjack.prototype.logInfo = function(){
  this.isLogInfo = true;
return this;
}

Tlsjack.prototype.logRequest = function(){
  this.isLogRequest = true;
return this;
}

Tlsjack.prototype.logResponse = function(){
  this.isLogResponse = true;
return this;
}

Tlsjack.prototype.enableLogs = function(){
  this.isLogRequest = true;
  this.isLogResponse = true;
  this.isLogInfo = true;
return this;
}

Tlsjack.prototype.disableLogs = function(){
  this.isLogRequest = false;
  this.isLogResponse = false;
  this.isLogInfo = false;
return this;
}

Tlsjack.prototype.listen = function(port){
  this.listenPort = port || this.listenPort;
return this;
}

Tlsjack.prototype.forward = function(host, port){
  this.customForwarding = true;
  this.forwardPort = port || this.forwardPort;
  if(host === null){  host = 'localhost';}
  this.forwardHost = host;
return this;
}

Tlsjack.prototype.responseHook = function(fn){
  this.resh = fn;
return this;
}

Tlsjack.prototype.requestHook = function(fn){
  this.reqh = fn;
return this;
}

Tlsjack.prototype.start = function(opts, callback){
  var that = this;
  if(opts == null){
    opts = {};
  }

  function Options(){
    this.key = defaultKey;
    this.cert = defaultCert;
    this.ciphers = 'ALL:!LOW:!DSS:!EXP';
    this.SNICallback = function(servername){
      return getSecureContext(servername);
    }

  }

  var options = new Options();
  var x;
  for(x in opts)
    options[x] = opts[x];

  var writeFile = function(data){
    return data;
  }

  var logFile = "";
  if(that.isWriteLogs){
    logFile = fs.createWriteStream(that.logFileName);
    logFile.write("---------------------------------------------------------------------------------\n");
    logFile.write("\t\tTLSJack Logs\n");
    logFile.write("---------------------------------------------------------------------------------\n");
    writeFile = function(data){
      logFile.write(data.toString());
    return data;
    }
  }



  var server = tls.createServer(options);
  server.listen(that.listenPort);
  if(that.isLogInfo)
    console.log(('TLSJack listeing on port: ').red + that.listenPort);
  server.on('secureConnection', function(clearStream){
    if(!that.customForwarding)
      that.forwardHost = clearStream.servername;
    var forwardSocket = tls.connect(that.forwardPort, that.forwardHost, function(){

      forwardSocket.on('error', function(err){
        console.log('Forward Socket Error: ' + err);
      })

      server.on('error', function(err){
        console.log('Original Socket Error: ' + err);
      })

      process.on('uncaughtException', function(err) {
        console.log('Caught exception: ' + err);
      });

      if(that.isLogInfo)
        console.log('Forwarding to '.debug + that.forwardHost);
      // Pipeline the send and recieve streams.
      var send = clearStream
      // Disable gzip, Google Chrome
      send = send.pipe(Xstream.replace('gzip,deflate,sdch', ''));
      if(that.isLogRequest){
        send = send.pipe(Xstream.hook(that.logger));
        if(that.isWriteLogs)
          send = send.pipe(Xstream.hook(writeFile));
      }
      if(typeof that.reqh == 'function')
        send = send.pipe(Xstream.hook(that.reqh));
      send = send.pipe(forwardSocket);

      // Do not log img responses
      var receive = forwardSocket;
      if(that.isLogResponse){
        receive = receive.pipe(Xstream.hookBuffer(that.logger));
        if(that.isWritelogs)
          receive = receive.pipe(Xstream.hookBuffer(writeFile));
      }
      if(typeof that.resh == 'function')
        receive = receive.pipe(Xstream.hookBuffer(that.resh));
      receive = receive.pipe(clearStream);
    });

  });

}



/*
var tj = new Tlsjack();
  tj
  .listen(443)
  .disableLogs()
  .forward('citrix.com', 443)
  .start(options);
*/

// Helper functions

function getSecureContext(servername){

  var keyFile = './certs' + servername + '.key';
  var certFile = './certs' + servername + '.cert';

  if(!fs.existsSync(keyFile) || !fs.existsSync(keyFile)){
    logOnce(servername, ("Cannot find key pair for ").blue + (servername).green +
      (", Using the default key pair by TLSJack").blue);

    // returning 'null' as secureContext forces tls server to use the default key pair.
    return null;
  }

  var secureContext = crypto.createCredentials({
      key: fs.readFileSync(keyFile),
      cert: fs.readFileSync(certFile)
  }).context;

return secureContext;
}


// Log once based on the key value
var logOnce_keys = [];
function logOnce(key, data){
  if(logOnce_keys.indexOf(key) === -1){
    logOnce_keys.push(key);
    console.log(data);
  }
return;
}



var defaultKey = "-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEAzNpcSSQm6lZkMyxW6P1CFa0OpfMsxa2qqxWl9/z+9c4YgGpr\n2aBIr+hDUuJ9a+sKPmydfRmNzr+n5BwLd3v5C/HYMS0wi28WD9iu7R2G3ATu8kV5\nqlkDbHeXchxaXZHLviyagIVntcXpzLOziNNW07IfFXXraoOshEyIbQ6r/lGmUS+B\nKqbR7PPTi0evGnHL3nH9khG8OFEcws8zRGknsAyqizH9vsyCOAX+sUX33HLuIyvr\nQo4hhBmlPQ4gLGnAut9E7RRSvYXZCUKEUjOY6d+QKGhBp1wJx18Z4zG/li03feOh\nrD54R25vJcLVtGSlrcRANSTGU6Ss8ngqjBbzJwIDAQABAoIBAQDHuT2wseafIoue\nuOQjVIhRyeA2O9izApcbJogiOC/8R2vsB9YO4A7+Ml0xOlE+HnJmWk9R4NA5evKd\nnBox7FTsKGa3y29BApVn7cLeu6L4cHbnDoWIaDDGV/L39lzETZlvWN1p4Kc0ujkw\nsyOfiy1kSI21xro3pxlUA6ofaeaWlBWJvAfXwXKD1dyDt/i9gbPvmrazoXActz8V\nTv3y8kBBuPsVBeqYMseUzvRMuvMDTbTkRetGYVxnhpLMoHZ9cwiGTqf27uBlJNKi\nsQ6bj2ohYreyNBl6pGZp9zm0UVCfRPz9DHpWmDO+63Mw0spmwRK3vVm/qNgH2z7I\nX/HoTgCBAoGBAPEO7l+RAAQGpSWMZlQAT2Qnc7bcpTCM02AodjiPMarSNGl05BQv\naChq+ydllrhNTnwWkgjQiwUrXuc1NhR20C4gqlcj0WHqqmwX2FcbOlepZQ9ss3D5\nwkJDKjq3Znj79N0wMBuwXZfMZjmpbBHhtBEVCB3jGL2t2UqofHxw5wtpAoGBANmM\n7fMkPVgF4IwcONcW85I+IVkUx0UhcgXCc9Nvsen0uZfcMJ5G/zH+cMMewCQIjYLu\nyAqW4rHl6C7PIXbulRfvBRT+23J9g3m710bWgTqlW+u8RJ47sjLlwB+U4XfVA2K5\nnWC6ISHGMoqRHeRA5yjFKKgNxAOUoiugLSCYYggPAoGBAIv5VpNpmC++SBEomJa4\nY2FNw1RwhP9PFsJkXFl1VKrTSpndxT6vVHT7wgDbbYxxX1yQopW5uq/ywjXRYSi6\n4SGX2DGnW8LWx8Tih7300ojqlQNC5GN6s8FUTOYxbrBb5ZC2lYjOfVpS1x0uctFj\nVPMCWmc4YjpqA53lffuod5DZAoGAJcyZz4Q9cFzdDhsdOSoQuhk3fB3jHbzY7e1C\naLtgg1D1KlCk1etqDcqy1wQxyFEAHX7VnRloXBahR/jPTLXZi+YI0QQTJwpt3Knp\nlrJQk9sFZKk6lu+yX6uRvSsGHecSBoZPtO3CMfcY8wCR3AX25BuVm9WAeErL/p5/\nGMnBRrsCgYAG7PUwKYFaLfv2gN8s91+lO0wmebSMysCuCrXou9zKWE7oSBh+c0om\nCKdsFGmS0QqP/pU0ZnvQur/oP0Wkrfk7zGu2BDkXabvKejmKMJGCAJpv796vjiTg\nfjFP5J4dvcfvAB7WNGvv/o0moxTnpdul8g4LY9+KX6H5bVKieerbkw==\n-----END RSA PRIVATE KEY-----\n";
var defaultCert = "-----BEGIN CERTIFICATE-----\nMIIDEzCCAfugAwIBAgIJAMshV/OMJ2FIMA0GCSqGSIb3DQEBBQUAMCAxHjAcBgNV\nBAMMFXRsc2phY2suc2tlcHRpY2Z4LmNvbTAeFw0xNDA1MTkwODQxMzBaFw0yNDA1\nMTYwODQxMzBaMCAxHjAcBgNVBAMMFXRsc2phY2suc2tlcHRpY2Z4LmNvbTCCASIw\nDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBAMzaXEkkJupWZDMsVuj9QhWtDqXz\nLMWtqqsVpff8/vXOGIBqa9mgSK/oQ1LifWvrCj5snX0Zjc6/p+QcC3d7+Qvx2DEt\nMItvFg/Yru0dhtwE7vJFeapZA2x3l3IcWl2Ry74smoCFZ7XF6cyzs4jTVtOyHxV1\n62qDrIRMiG0Oq/5RplEvgSqm0ezz04tHrxpxy95x/ZIRvDhRHMLPM0RpJ7AMqosx\n/b7MgjgF/rFF99xy7iMr60KOIYQZpT0OICxpwLrfRO0UUr2F2QlChFIzmOnfkCho\nQadcCcdfGeMxv5YtN33joaw+eEdubyXC1bRkpa3EQDUkxlOkrPJ4KowW8ycCAwEA\nAaNQME4wHQYDVR0OBBYEFGJad4vqDAJAFQHJWipzh9pJo8MXMB8GA1UdIwQYMBaA\nFGJad4vqDAJAFQHJWipzh9pJo8MXMAwGA1UdEwQFMAMBAf8wDQYJKoZIhvcNAQEF\nBQADggEBADodCBBOUdRU9F7o+Xm1z3QGC+CXOzcJjLG2iaGsBzHdlhXrX6DCNSoT\nu6Hqyuvn9ia61bseWwx8c1ijmqr75tctcmnVUGacPdsA6MyjRnWnTls8iW8xD7Wp\nba09SFxc54OYfrJj2FU2dw8JTdy2Lt0Z9lzx8XXgpzrJqsprlbiosW2qXh5yxyRi\nJnpWajm0Tn4wc2Ph1gM38hoPjuxFvQWfwh4FRF9Qu9ageOoI1WrD2mlhmMwiC8xA\nlSqhGroKGs0lzZbnRCt7KmKbYaGeTkCjOEXjsr5aQtIq2nlXiI7xEHo4MhMXojA3\nFzTFllZtUs/WFML7AB36zc+8bZfs9/o=\n-----END CERTIFICATE-----\n";


// cleanup code onexit?
// Close logFile fd if it exists.
