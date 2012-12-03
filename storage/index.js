"use strict";

/*

 Storage is a light wrapper around redis. It was implemented this way to make sure storage is modular and can be upgraded
 later if other storage options are desired.

 */

var crypto = require( 'crypto' );
var redis = require( 'redis' );
var client = null;
var clientConnectErr = null;
var initCallbacks = [];

module.exports.init = function ( params, callback ) {

	if ( typeof params === 'function' ) {
		callback = params;
		params = {};
	}

	initCallbacks.push( callback );

	function flushCallback( callback, err ) {
		process.nextTick( function () {
			executeCallback( callback, err );
		} );
	}

	function flushInitCallbacks() {
		while ( initCallbacks.length > 0 ) {
			flushCallback( initCallbacks.shift(), clientConnectErr );
		}
	}

	if ( !client ) {

		params = {
			host:    "localhost",
			port:    6379,
			options: {}
		}.mixin( params );

		client = redis.createClient( params.port, params.host, params.options );

		var errorHandler = function () {
			client = null;
			clientConnectErr = 'failed to connect';
			client.removeListener( 'connect', connectHandler );
			flushInitCallbacks();
		};

		var connectHandler = function () {
			clientConnectErr = null;
			client.removeListener( 'error', errorHandler );
			flushInitCallbacks();
		};

		client.on( 'connect', connectHandler );
		client.on( 'error', errorHandler );

	}
	else {
		flushInitCallbacks();
	}

};

module.exports.getConf = function ( key, callback ) {
	getRaw( key, 'moduleConfig', callback );
};

module.exports.setConf = function ( key, conf, callback ) {
	setRaw( key, 'moduleConfig', conf, callback );
};

module.exports.delConf = function ( key, callback ) {
	delRaw( key, 'moduleConfig', callback );
};

module.exports.isAuthorized = function ( key, callback ) {

	getRaw( key, 'auth', function ( err, value ) {
		executeCallback( callback, ( value && !err ) );
	} );

};

module.exports.generateAuthKey = function ( callback ) {

	var hash = crypto.createHash( 'sha1' );
	hash.update( new Date().getTime() + "|" + Math.random() );
	hash = hash.digest( 'hex' );

	setRaw( hash, 'auth', true, function ( err ) {
		if ( err ) {
			executeCallback( callback, null );
		}
		else {
			executeCallback( callback, hash );
		}
	} );

};

module.exports.delAuthKey = function ( key, callback ) {
	delRaw( key, 'auth', callback );
};

function delRaw( key, type, callback ) {

	checkReady();

	client.del( encodeKey( key, type ), function ( err ) {

		executeCallback( callback, err ? "could not delete " + type : null );

	} );

}

function getRaw( key, type, callback ) {

	checkReady();

	client.get( encodeKey( key, type ), function ( err, data ) {

		if ( err ) {
			executeCallback( callback, err, null );
		}
		else {
			executeCallback( callback, null, decodeData( data ) );
		}

	} );

}

function setRaw( key, type, data, callback ) {

	checkReady();

	data = encodeData( data );

	if ( !data ) {
		executeCallback( callback, type + " could not be serialized", null );
		return;
	}

	client.set( encodeKey( key, type ), data, function ( err, data ) {

		if ( err || !data ) {
			executeCallback( callback, "could not store " + type );
		}
		else {
			executeCallback( callback, null );
		}
	} );

}

function executeCallback() {
	var args = Array.prototype.slice.call( arguments );

	if ( typeof args[0] === 'function' ) {
		args[0].apply( {}, args.slice( 1 ) );
	}
}

function encodeKey( key, type ) {

	return type + ":" + key;

}

function encodeData( data ) {

	try {
		return JSON.stringify( data );
	}
	catch ( e ) {
		return null;
	}

}

function decodeData( data ) {

	if ( !data ) {
		return null;
	}

	try {
		return JSON.parse( data );
	}
	catch ( e ) {
		return null;
	}

}

function checkReady() {

	if ( !client ) {
		throw "storage has not been initialized";
	}

}
