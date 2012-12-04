Confection
========

A configuration management server written in node, with redis for a backend.


Why not Puppet?
========

The main goal of Confection is to provide access for clients needing configuration, not control them. Also, although Puppet has a fairly robust configuration managment system, it is not a pure API. Confection is all API all the time. There will never be a feature added to Confection that isn't added to the API first, even after a GUI is added. In fact, the GUI will most likely be a separate server entirely, which interacts with the storage system entirely through the API.

Contributing
========

Despite Linus Torvalds' gripes about pull requests, that is how we do things. If you want to contribute to Confection, simply fork, commit, and pull request. Thanks!


Usage
========

Running Confection is meant to be insanely easy. Simply `npm install confection`, require it, and run it. If you are using a default install of Redis listening on localhost on the default port, you don't even need to pass any configuration at all. Confection will fire up on port 8080 and your are ready to go with the following server.js:

```js
// this will connect to redis running on localhost on the default port
// and then start listening for rest traffic on port 8080
require( 'confection' ).run();
```


Configuration
========

If you require more customization for your Confection implementation, the run() method takes a configuration object with the following options (provide or ommit any value at any level, ommitted values will simply take the default value):

```js
{
	server:  {
		port: 8080 // the port for the web server to listen on
	},
	storage: { // the redis options passed directly to the redis client
		host: 'redis1.mydomain.com',
		port: 6379
	},
	outputFilters: {
		// your handler will get the raw conf object, and a callback. The callback
		// takes two parameters, the first is the string containing the body of the
		// web reply, and the second is the value for the Content-Type header to be
		// send with the response.
                xml:  function ( conf, callback ) {
                        callback( '<?xml version="1.0" encoding="ISO-8859-1"?><message>You should convert the conf object to XML here!</message>', "application/xml" );
                }
        }
}
```

Security:
========

Confection currently only supports access keys. You will need to generate a key like this at least once:

```js
var confection = require( 'confection' ).run();
confection.generateAuthKey( function (key) {
	// Do something with the key here, or something else if key === null (the result of an error)
} );
```

You can delete keys with the following code:

```js
var confection = require( 'confection' ).run();
confection.delAuthKey( key, function (err) {
	// err is null, or contains a string with the error description
} );
```


Examples:
========

Simple Inheritance:

POST this data to http://confection.mydomain.com:8080/conf/dev/server/app?key=1234567
```json
{
	"__extend":    ".schema.server.app",
	"__override": {
		"CRON":      {
			"DEFAULT_FREQUENCY": 60
		},
		"RESOURCES": {
			"mongodb": "mongodb://db1.dev.mydomain.com/app"
		}
	}
}
```

POST this data to http://confection.mydomain.com:8080/conf/prod/server/app?key=1234567
```json
{
	"__extend":    ".schema.server.app",
	"__override": {
		"RESOURCES": {
			"mongodb": "mongodb://db1.prod.mydomain.com/app"
		}
	}
}
```

POST this data to http://confection.mydomain.com:8080/conf/schema/server/app?key=1234567
```json
{
	"CRON": {
		"DEFAULT_FREQUENCY": 86400
	},
	"RESOURCES": {
    	"mongodb": null
    }
}
```

Now, do a get on http://confection.mydomain.com:8080/conf/prod/server/app?key=1234567 and http://confection.mydomain.com:8080/conf/dev/server/app?key=1234567, you will get the following respective responses:

```json
{
	"CRON": {
		"DEFAULT_FREQUENCY": 86400
	},
	"RESOURCES": {
    	"mongodb": "mongodb://db1.prod.mydomain.com/app"
    }
}
```

```json
{
	"CRON": {
		"DEFAULT_FREQUENCY": 60
	},
	"RESOURCES": {
    	"mongodb": "mongodb://db1.dev.mydomain.com/app"
    }
}
```

More to come soon!


Features
========

Latest:

* Structured configuration - Store structured configuration segments, and not just key/value pairs. Internally, everything is represented as JSON (though, output in other formats is possible).
* Inheritance with overrides - define schemas for your configuration and extend/inherit from other configuration segments. For example, define a configuration segment for a service endpoint which you consume. Then, inherit that configuration segment in all the configurations that use that endpoint.
* Name-spaced configuration which understands environment (configuration segments are arbitrary length in dot notation, begining with the environment, so something like .prod.service.mongodb, or .qa.server.public.app. If you inherit from a global value in your schema, and omit an absolute environment value in the reference to that global value, the system will automatically select the config segment for the environment for which you are pulling a config. This is called a relative inherit and instead of using the namespace .prod.service.mongodb in your inheritance reference, you would put service.mongodb. Note that there is no leading dot with a relative reference.
* Custom output filters (by default, everything is output in JSON, but you can define an arbitrary output format function in javascript in the configuration server's setup. So, you could define XML, ini, whatever, and you can cause output on the rest api to filter with that format by appending .XML, .ini, respectively, to the end of the URL. So, to pull the production config for app server in XML, you would call http://confection.domain.com/conf/prod/server/app.xml.
* Catch all environments (you can define a configuration segment to be a wildcard. So, if a request is made for that segment from the REST api or by an inheritance from another segment, and an environment is specified explicitly or automatically by the environment resolution system which does not exist, the catch all segment will be returned in stead of not-found)

In Progress:

* Versioning (versioning can be applied at any level of your inheritance structure. It will work like npm versioning. So, when you request a config from the api, you could specify version ~0.1.0, and within a conf segment that has inheritance you could specify the version of the conf segment you are extending.
* Changing the back-end store from redis to mongo (supports versioning better and will be better for supporting future features and fail-over for configuration clustering in large-scale computing environments)

Planned:

* Create multiple users, instead of just an access key
* read/write permissions on a per configuration segment basis per user basis - For example, given a user A who maintains a system called 123 which consumes a twitter feed, the user could have read access on .*.service.twitter.* and write access on .*.server.123.*. By default, all users will have read access to everything, so read is implicit. Futhermore, if a particular namespace does not exist, say .dev.globals.456, the user that first stores a config segment there will have read/write and everyone else has read only. Finally, anyone with write access on a path can grant write access to others for that path.
* Pulling a config schema chain - This would show what your schema is inheriting from, and what those things inherit from, etc. So, rather than evaluating the inheritance, it just shows you the inheritance tree.
* Easier generation of first access key

Icebox:

* A GUI - Apparently, not everyone is OK with using CURL to manage configuration. The good news is, every feature will be implmented in the API first, before it goes to the GUI. So, anything you can do in the GUI will be accessible through the API. You're welcome enterprise!
* Subscription to configs (a user can submit a configuration segment to watch. If that segment, or any segment in the inheritance chain change, the callback url supplied in the subscription will be sent a copy of the conf, with all inheritance resolved.
* Authentication plugins - Authenticate users with LDAP, or any arbitrary service. Double you're welcome enterprise!
* Native support for SSL - Currently, SSL is not supported. If you wish to add SSL support to your deployment you will need to use a tool like <a href="https://www.stunnel.org">stunnel</a> to transparently add SSL support.


License
========

(The MIT License)

Copyright (c) 2012 BlueRival Software <anthony@bluerival.com>

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the 'Software'), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
