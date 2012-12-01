Confection
========

A configuration management server written in node, with redis for a backend.


Usage
========

```js
// this will connect to redis running on localhost on the default port
// and then start listening for rest traffic on port 8080
require( 'confection' ).run();
```


Configuration
========

The run() method takes the following options:

```js
{
	server:  {
		port: 8080 // the port for the web server to listen on
	},
	storage: { // the redis options passed directly to the redis client
		host: 'localhost',
		port: 6379
	}
}
```


License
========

(The MIT License)

Copyright (c) 2012 BlueRival Software <anthony@bluerival.com>

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation
files (the 'Software'), to deal in the Software without restriction, including without limitation the rights to use, copy,
modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software
is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS
BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
