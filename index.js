"use strict";

require( 'core-extensions' );
var express = require( 'express' )();
var storage = require( './storage' );
var core = require( './lib/core' );
var running = false;

module.exports.run = function ( conf ) {

	if ( running ) {
		console.error( 'confection service already running' );
		return;
	}
	running = true;

	conf = {
		server:        {
			port: 8080
		},
		storage:       {
			host: 'localhost',
			port: 6379
		},
		outputFilters: {}
	}.mixin( conf );

	storage.init( conf.storage, function ( err ) {

			if ( err ) {
				console.error( 'could not initialize storage: ' + err );
				process.exit( 1 );
			}
			else {
				core.init( {
					express:       express,
					storage:       storage,
					outputFilters: conf.outputFilters
				}, function ( err ) {
					if ( err ) {
						console.error( 'could not start up core' );
						process.exit( 1 );
					}
					else {
						console.log( 'listening' );
						express.listen( conf.server.port );
					}
				} );
			}

		}
	);

};
