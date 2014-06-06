TLSJack
=======

A simple TLS forwarder that lets you intercept traffic and play with them.


Its available via npm

`npm install -g tlsjack`

### Passively monitor data
```
# tlsjack
TLSJack listeing on port: 443
```

### Usage
```
# tlsjack --help

  Usage: tlsjack [options]

  Options:

    -h, --help                output usage information
    -V, --version             output the version number
    -l, --listen <port>       TLS port to listen on. Defaults to 443
    -w, --logfile <filename>  Log requests to a file
    -f, --forward <host>  Forward all requests to a specific host

```
##### Listen on port 1531 and Log requests to a file

```
# tlsjack --listen 1531 --logfile example.txt

Logging to: example.txt
TLSJack listeing on port: 1531
```

### What does it do?
 - Creates an SSL Server on port 443.
 - A Client's DNS entry is spoofed so example.com for instance, redirects to this machine. (use [dnjack](https://github.com/mafintosh/dnsjack) or [hostile](https://github.com/feross/hostile))
 - Terminates the TLS connection and streams the data in plaintext to be logged, intercepted or modified as needed.
 - Completes the connection with google.com, by creating another SSL connection. Thus acting like a forward proxy.
 - This is a Bi-Directional tunnel and data can flow in both directions.
 - This leverages the power of awesome `streams` api in nodejs.

### Programmatic Injection
```javascript
var Tlsjack = require('tlsjack');
var jack = new Tlsjack();

// Tlsjack has its own key pair for TLS connections.

jack
  .listen(443) // Listen on port '443'
  .logRequest() // Log Requests
  .logInfo() // Log Connection Information
  .responseHook(str_replace) // Hook responses using custom function
  .start(tlsOptions);

// Replace all the instances of the keyword, 'the' with the word 'nodejs'
function str_replace(data){
  return data.toString().replace(/the/gi, 'nodejs');
}


```
Refer the **exmaples** folder, for more real world use cases.
### Features
#### Server Name Indication (SNI)
  * Implicitly supports SNI, by forwarding client's request to the approriate server using the servername in Client Hello.
  * To specifically serve a custom server certificate for a given server name, say example.com. Just place the public and private keys under a folder named 'certs'.
  * Public Certificate(.cert) - `certs/example.com.cert`
  * Private Key(.key) - `certs/example.com.key`

### Options Supported
  * **listen(port)** - Spawns TLSJack on the given port. Defaults to 443
  * **start(TLSOptions)** - Starts the TLSJack daemon. (Required)
    `TLSOptions` is the options required to start the TLS Server. See (here)[http://nodejs.org/api/tls.html#tls_tls_createserver_options_secureconnectionlistener] for more.
  * **forward(host, [port])** - Forwards the connection to a given host and port(defaults to 443), regardless
     of the SNI in the request.
  * **requestHook(custom_function)** - Intercept and modify request data on the fly using a custom function.

  `custom_function` will be passed a `data` argument, which
    can be modified and returned. It must return a `string` always. You can define it as something like this,

    ```javascript
    function custom_function(data){
      data = data.replace(/GET/, 'PUT');
    }
    ```
    This is will turn all `GET` requests to a `PUT` request.
  * **responseHook(custom_function)** - Similar to `requestHook` but for responses.
  * **logRequest()** - Logs all requests.
  * **logResponse()** - Logs all responses.
  * **enableLogs()** - Enable all types of logging.
  * **disableLogs()** - Disable all types of logging.
  * **setLogger(custom_function)** - Define a custom logger for logging data. It must always return the original `data`.

### TODO / Future
- Write test cases.
- Write real world examples under /examples.
- Enable client cert authentication.
- Enable socat style redirection to other streams / pipes.
- Option to change the default key pair.
- Add HTTP request/response parser.
- Remove the ugly gzip header removal hack.
- Write android https tampering documentation.

### License
The MIT License (MIT)

Copyright (c) 2014 Ahamed Nafeez

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
