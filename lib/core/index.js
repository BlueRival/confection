"use strict";

var async = require( 'async' );
var moduleConfig = null;

module.exports.init = function ( config, callback ) {

	moduleConfig = {
		express: null,
		storage: null
	}.mixin( config );

	if ( !config.express ) {
		throw "no express supplied to core";
	}

	if ( !config.storage ) {
		throw "no storage supplied to core";
	}

	configureExpress();

	callback( null );

};

function getAuthKey( req ) {

	return { key: null }.mixin( req.query ).key || req.header( 'key' );

}

function checkAuth( req, res, next ) {

	var key = getAuthKey( req );

	moduleConfig.storage.isAuthorized( key, function ( authorized ) {
		if ( authorized ) {
			next();
		}
		else {
			getResponder( req, res )( 401 );
		}
	} );

}

function onPostConf( req, res ) {

	res = getResponder( req, res );
	var path = getPath( req );

	if ( !path ) {
		res( 400 );
		return;
	}

	moduleConfig.storage.setConf( path, JSON.parse( req.body ), function ( err ) {
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

	if ( !path ) {
		res( 400 );
		return;
	}

	// strip environment from path
	var environment = path.replace( /^\.([^\.]*)\.?.*/, '$1' );
	path = path.replace( /^\.[^\.]*\.?/, '' );

	if ( path.length < 1 ) {
		res( 400 );
	}

	getConf( path, environment, function ( conf ) {
		if ( conf === null ) {
			res( 404 );
		}
		else {
			res( 200, conf );
		}
	} );

}

/**
 * getConf is responsible for the core logic in the API. It handles applying all extensions and wildcard lookups.
 *
 * External Params:
 * @param path the dot notation path to pull from the storage engine
 * @param environment the name of the environment to pull the configuration for
 * @param callback
 *
 * Recursive Params:
 * @param context
 */
function getConf( path, environment, callback, context ) {

	// relative paths need to be auto-prefixed with the environment
	if ( path.match( /^[^\.]/ ) ) {
		path = "." + environment + "." + path;
	}

	if ( !context ) {
		context = {
			pathsSeen: {}
		};
	}

	// avoid circular references
	if ( context.pathsSeen[path] ) {
		callback( undefined );
		return;
	}
	context.pathsSeen[path] = true;

	// calculate catch all path
	var catchAllPath = ".*." + path.replace( /^\.[^\.]*\./, '' );
	if ( catchAllPath === path ) {
		catchAllPath = false;
	}

	// try exact path
	moduleConfig.storage.getConf( path, function ( err, conf ) {

		// if there was an error, don't try for wildcard
		if ( err ) {
			callback( undefined );
		}

		// not found, try wildcard
		else if ( conf === null && catchAllPath ) {

			moduleConfig.storage.getConf( catchAllPath, function ( err, conf ) {

				// error searching for wild card
				if ( err ) {
					callback( undefined );
				}

				// wild card found
				else {
					applyAbstractions( conf, environment, context, callback );
				}

			} );

		}

		// exact path found
		else {
			applyAbstractions( conf, environment, context, callback );
		}

	} );

}

function applyAbstractions( conf, environment, context, callback ) {

	// only arrays and objects can have abstraction, everything else just returns
	if ( !Array.isArray( conf ) && !Object.isObject( conf ) ) {
		callback( conf );
		return;
	}

	var pathsToExtend = [];
	var currentPath = null;
	var currentPathRef = null;
	var currentPathRefTemp = null;
	var currentSubTree = null;
	var currentPathTail = null;

	// seed the inspection loop
	var pathsToCheck = [
		['seed']
	];
	conf = {
		seed: conf
	};

	function extendPath( extendedPath, currentPathRef, override ) {
		pathsToExtend.push( function ( callback ) {
			getConf( extendedPath, environment, function ( conf ) {
				if ( override && conf ) {
					conf = conf.mixin( override );
				}
				callback( null, {
					path: currentPathRef,
					conf: conf
				} );
			}, context );
		} );
	}

	while ( pathsToCheck.length > 0 ) {

		// get current path and subtree on that path
		currentPath = pathsToCheck.pop();

		currentPathRef = currentPath.clone(); // we need an unmodified current path for later
		currentSubTree = conf; // we start at the root
		currentPathTail = currentPath.pop(); // we don't dereference the last field, because we want to modify it in place
		while ( currentPath.length > 0 ) {
			currentSubTree = currentSubTree[ currentPath.shift() ];
		}

		// seed pathsToCheck
		if ( Array.isArray( currentSubTree[currentPathTail] ) ) {
			for ( var i = 0; i < currentSubTree[currentPathTail].length; i++ ) {
				currentPathRefTemp = currentPathRef.clone();
				currentPathRefTemp.push( i );
				pathsToCheck.push( currentPathRefTemp );
			}
		}
		else if ( Object.isObject( currentSubTree[currentPathTail] ) ) {

			if ( currentSubTree[currentPathTail].__extend ) {
				extendPath( currentSubTree[currentPathTail].__extend, currentPathRef.clone(), currentSubTree[currentPathTail].__override || null );
			}
			else {
				for ( var field in currentSubTree[currentPathTail] ) {
					if ( currentSubTree[currentPathTail].hasOwnProperty( field ) ) {
						currentPathRefTemp = currentPathRef.clone();
						currentPathRefTemp.push( field );
						pathsToCheck.push( currentPathRefTemp );
					}
				}
			}
		}
	}

	if ( pathsToExtend.length > 0 ) {
		async.parallel( pathsToExtend, function ( err, results ) {
			if ( Array.isArray( results ) ) {
				for ( var i = 0; i < results.length; i++ ) {
					currentPath = results[i].path;
					currentSubTree = conf;
					currentPathTail = currentPath.pop(); // we don't dereference the last field, because we want to modify it in place
					while ( currentPath.length > 0 ) {
						currentSubTree = currentSubTree[ currentPath.shift() ];
					}
					currentSubTree[currentPathTail] = results[i].conf;
				}
			}
			callback( conf.seed );
		} );
	}
	else {
		callback( conf.seed );
	}

}

function onDeleteConf( req, res ) {
	res = getResponder( req, res );
	var path = getPath( req );

	if ( !path ) {
		res( 400 );
		return;
	}

	moduleConfig.storage.delConf( path, function ( err ) {
		if ( err ) {
			res( 500 );
		}
		else {
			res( 200, true );
		}
	} );
}

function onPostAuth( req, res ) {
	moduleConfig.storage.generateAuthKey( function ( key ) {
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
	moduleConfig.storage.delAuthKey( key, function ( err ) {
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

	var path = req.path.replace( /\//g, '.' ).replace( /^\.conf/, '' ).replace( /\.$/, '' );

	if ( path.length < 1 ) {
		return null;
	}

	return path;

}

function storeRequestBody( req, res, next ) {

	var body = "";
	req.setEncoding( 'utf8' );

	req.on( 'data', function ( data ) {
		body += data;
	} );

	req.on( 'end', function () {
		req.body = body;
		next();
	} );

}

/**
 * Configures the express instance.
 */
function configureExpress() {

	// create configuration routes
	moduleConfig.express.get( /^\/conf.*/, checkAuth, getMiddlewareWrapper( onGetConf ) );
	moduleConfig.express.post( /^\/conf.*/, storeRequestBody, checkAuth, getMiddlewareWrapper( onPostConf ) );
	moduleConfig.express.delete( /^\/conf.*/, checkAuth, getMiddlewareWrapper( onDeleteConf ) );

	// create auth management routes
	moduleConfig.express.post( "/auth", checkAuth, getMiddlewareWrapper( onPostAuth ) );
	moduleConfig.express.delete( "/auth", checkAuth, getMiddlewareWrapper( onDeleteAuth ) );

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
