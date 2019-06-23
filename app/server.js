//#!/bin/env node
"use strict";

console.log("\r--------------------------XPENSE SERVER--------------------------");

const Directory = {};
Directory.SELF = __dirname + "/";
Directory.INCLUDE = Directory.SELF + "include/";
Directory.STATIC = Directory.SELF + "static/";
Directory.TEMPLATE = Directory.SELF + "template/";
const ALLOWED_METHODS = ["GET", "POST"];

const application = require("express")();
const http = require("http");
const https = require("https");
const cookieParser = require("cookie-parser"); 
const server = http.createServer(application);
const fs = require("fs");
const handlebars = require("handlebars");
const utility = require(Directory.INCLUDE + "utility.js");
const ServerError = require(Directory.INCLUDE + "ServerError.js");

const listenPort = process.env.PORT || 8080; // 3000;
const listenAddress = "0.0.0.0";

// Use cookie-parser
app.use(cookieParser);

// Add headers
application.use((request, response, next) => {
	// Request methods you wish to allow
	response.setHeader("Access-Control-Allow-Methods", ALLOWED_METHODS.join(", "));
	
	// Pass to next layer of middleware
	next();
});

application.get("/", (request, response) => {
	response.sendFile(Directory.STATIC + "index.html");
});

application.post("/authenticate/login", (request, response) => {
	response.sendFile(Directory.STATIC + "index.html");
});

application.get("/authenticate/logout", (request, response) => {
	response.sendFile(Directory.STATIC + "index.html");
});

// Catch 405 errors
// Supported methods are in ALLOWED_METHODS
application.use((request, response, next) => {
	// Filter for methods
	if (ALLOWED_METHODS.indexOf(request.method) > -1) {
		// Pass the request down the chain
		next();
		
		return;
	}
	
	let error = new Error("405 Method Not Allowed");
	error.status = 405;
	error._method = request.method;
	error._originalPath = request.path;
	
	// Trigger the error handler chain
	next(error);
});

// Attempt to serve any file
application.use((request, response, next) => {
	let path = request.path;
	// Removes the leading slash
	let internalPath = Directory.STATIC + path.substring("/".length);
	
	if (path.charAt(path.length - 1) == "/") {
		// Try to route to an index if the request is for a directory
		internalPath += "index";
	}
	
	// Look for a file with the same path but with the .html extension appended
	// This allows /test to point to /test.html
	fs.access(internalPath + ".html", fs.constants.R_OK, (error) => {
		if (error) {
			// Look for the explicit file
			fs.access(internalPath, fs.constants.R_OK, (error) => {
				if (error) {
					let httpError = new Error("404 Not Found");
					httpError.status = 404;
					httpError._errorObject = error;
					httpError._method = request.method;
					httpError._originalPath = request.path;
					httpError._impliedPath = path;
					httpError._internalPath = internalPath;

					// Trigger the error handler chain
					next(httpError);
					
					return;
				}
				
				let redirect = undefined;
				
				// Redirect any relative /index.html to just the relative /
				// Redirect any .html file to the URL without the extension
				if (path.substring(path.length - "/index.html".length) == "/index.html") {
					redirect = path.substring(0, path.length - "index.html".length);
				} else if (path.substring(path.length - ".html".length) == ".html") {
					redirect = path.substring(0, path.length - ".html".length);
				}
					
				if (redirect !== undefined) {
					// Send a 301 Moved Permanently
					response.status(301);
					response.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
					response.setHeader("Expires", "Thu, 01 Jan 1970 00:00:00 GMT");
					response.setHeader("Location", redirect);
					response.send("");
				} else {
					// Send the file
					response.sendFile(internalPath);
				}
			});
			
			return;
		}
		
		let redirect = undefined;
		
		// Redirect any relative /index to just the relative /
		if (path.substring(path.length - "/index".length) == "/index") {
			redirect = path.substring(0, path.length - "index".length);
		}
		
		if (redirect !== undefined) {
			// Send a 301 Moved Permanently
			response.status(301);
			response.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
			response.setHeader("Expires", "Thu, 01 Jan 1970 00:00:00 GMT");
			response.setHeader("Location", redirect);
			response.send("");
		} else {
			// Send the file
			response.sendFile(internalPath + ".html");
		}
	});
});

// Handle errors
application.use(async (mainError, request, response, next) => {
	// If there is a specific error object for the given error, use it. Otherwise, use 500
	// Internal Server Error
	let errorType = mainError.status in ServerError ? ServerError[mainError.status] : ServerError[500];
	
	// Return the correct status code header
	response.status(errorType.code);
	
	let errorID;
	
	try {
		errorID = utility.randomString(25);
	} catch (error) {
		// Couldn't generate an ID
		console.error("Application error:");
		console.error(mainError);
		console.error("Error generating reference ID:");
		console.error(error);
		
		// Send a plain text error
		response.setHeader("Content-Type", "text/plain");
		response.send(errorType.code + " " + errorType.name);
		
		return;
	}
	
	console.error("Application error reference ID: " + errorID);
	console.error(mainError);
	
	fs.readFile(Directory.TEMPLATE + "error.html", "utf8", (error, data) => {
		if (error) {
			// Couldn't read the error template
			console.error("Error reading template:");
			console.error(error);

			// Send a plain text error
			response.setHeader("Content-Type", "text/plain");
			response.send(errorType.code + " " + errorType.name + "\nError Reference ID: " + errorID);

			return;
		}
		
		let errorTemplate = handlebars.compile(data);
		
		try {
			let errorPage = errorTemplate({
				errorCode: errorType.code,
				errorName: errorType.name,
				errorMessage: errorType.message,
				errorInformation: () => {
					if (typeof errorType.information == "function") {
						return errorType.information(request.method, request.path);
					}
					
					return errorType.information;
				},
				errorHelpText: () => {
					if (typeof errorType.helpText == "function") {
						return errorType.helpText(errorID);
					}
					
					return errorType.helpText;
				}
			});
			
			response.setHeader("Content-Type", "text/html");
			console.error("");
			
			response.send(errorPage);
		} catch (error) {
			// Couldn't compile the error template
			console.error("Error compiling template:");
			console.error(error);
			
			// Send a plain text error
			response.setHeader("Content-Type", "text/plain");
			response.send(errorType.code + " " + errorType.name + "\nError Reference ID: " + errorID);
		}
	});
});

function start() {
	server.listen(listenPort, listenAddress, () => {
		console.log("Listening on " + listenAddress + ":" + listenPort);
	});
}

function exit() {
	console.log("-------------------------SERVER SHUTDOWN-------------------------");
	process.exit();
}

process.on("SIGINT", () => {
	exit();
});

process.on("unhandledRejection", err => {
	console.log("Caught unhandledRejection");
	console.log(err);
});

start();
