"use strict";

var conf = null;

module.exports.init = function ( params, callback ) {

	conf = {
		express: null,
		storage: null
	}.mixin( params );

	if ( !conf.express ) {
		throw "no express supplied to core";
	}

	if ( !conf.storage ) {
		throw "no storage supplied to core";
	}

	configureExpress();

	callback( null );

};

function dereferencePointers( conf, environment, callback, context ) {
	callback( conf );
}

function applyInheritance( conf, environment, callback, context ) {
	callback( conf );
}

function getAuthKey( req ) {
	return { key: null }.mixin( req.query ).key || req.header( 'key' );
}
function checkAuth( req, res, next ) {
	var key = getAuthKey( req );

	conf.storage.isAuthorized( key, function ( authorized ) {
		if ( authorized ) {
			next();
		}
		else {
			getResponder( req, res )( 401 );
		}
	} );

}

function onPutConf( req, res ) {

	res = getResponder( req, res );
	var path = getPath( req );

	if ( !path ) {
		res( 400 );
		return;
	}
	conf.storage.setConf( path, JSON.parse( req.body ), function ( err ) {
		if ( err ) {
			res( 500 );
		}
		else {
			res( 200, true );
		}
	} );

}

function onGetConf( req, res ) {
	res = getResponder( req, res );
	var path = getPath( req );
	var environment = { env: '*' }.mixin( req.query ).env;

	if ( !path ) {
		res( 400 );
		return;
	}

	conf.storage.getConf( path, function ( err, conf ) {

		if ( err && err !== 'could not retrieve conf' ) {
			res( 500 );
			return;
		}
		applyInheritance( conf, environment, function ( conf ) {
			dereferencePointers( conf, environment, function ( conf ) {
				if ( conf === null ) {
					res( 404 );
				}
				else {
					res( 200, conf );
				}
			} );
		} );

	} );

}

function onDeleteConf( req, res ) {
	res = getResponder( req, res );
	var path = getPath( req );

	if ( !path ) {
		res( 400 );
		return;
	}

	conf.storage.delConf( path, function ( err ) {
		if ( err ) {
			res( 500 );
		}
		else {
			res( 200, true );
		}
	} );
}

function onPutAuth( req, res ) {
	conf.storage.generateAuthKey( function ( key ) {
		res = getResponder( req, res );
		if ( key ) {
			res( 200, key );
		}
		else {
			res( 500 );
		}
	} );
}

function onDeleteAuth( req, res ) {
	var key = getAuthKey( req );
	conf.storage.delAuthKey( key, function ( err ) {
		res = getResponder( req, res );

		if ( err ) {
			res( 500 );
		}
		else {
			res( 200, true );
		}

	} );
}

/**
 * Get the conf path from the URL path.
 *
 * @param req The express request handle
 * @return {string} The conf path
 */
function getPath( req ) {

	var path = req.path.replace( /\//g, '.' ).replace( /^\.conf\./, '' );

	if ( path.length < 1 ) {
		return null;
	}

	return path;

}

function storeRequestBody( req, res, next ) {
	var body = "";
	req.setEncoding( 'utf8' );
	console.log( 'hi' );
	req.on( 'data', function ( data ) {
		console.log( 'got data', data );
		body += data;
	} );

	req.on( 'end', function () {
		console.log( 'end' );
		req.body = body;
		next();
	} );

}

/**
 * Configures the express instance.
 */
function configureExpress() {

	// create configuration routes
	conf.express.get( /^\/conf.*/, checkAuth, getMiddlewareWrapper( onGetConf ) );
	conf.express.put( /^\/conf.*/, storeRequestBody, checkAuth, getMiddlewareWrapper( onPutConf ) );
	conf.express.delete( /^\/conf.*/, checkAuth, getMiddlewareWrapper( onDeleteConf ) );

	// create auth management routes
	conf.express.put( "/auth", checkAuth, getMiddlewareWrapper( onPutAuth ) );
	conf.express.delete( "/auth", checkAuth, getMiddlewareWrapper( onDeleteAuth ) );

}

/**
 * This wrapper simply traps any uncaught exceptions.
 *
 * @param middleware The middleware function to wrap
 * @return {Function} The wrapper function to pass to express
 */
function getMiddlewareWrapper( middleware ) {
	return function ( req, res, next ) {
		try {
			middleware( req, res, next );
		}
		catch ( e ) {
			getResponder( req, res )( 500 );
		}
	};
}

/**
 * Gets a response generating function. Used in middleware to simplify response logic.
 *
 * @param res A handle to a response object to send the response to when the responder function is called
 * @return {Function} The responder function for middleware to call to send a response to a request
 */
function getResponder( req, res, format ) {

	if ( !format ) {
		format = 'json';
	}

	return function ( code, body ) {

		var contentType = null;

		if ( code !== 200 ) {
			body = "";
			contentType = "text/html; charset=utf-8";
		}
		else if ( typeof body !== "string" ) {
			switch ( format ) {
				case 'xml':
					code = 400;
					body = "";
					contentType = "text/html; charset=utf-8";
					break;
				case 'json':
					body = JSON.stringify( body );
					contentType = "application/json; charset=utf-8";
					break;
				default:
					break;
			}

		}

		res.writeHead( code, {
			"Content-type": contentType
		} );

		res.end( body );

	};
}
