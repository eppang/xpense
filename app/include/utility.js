let crypto = require('crypto');
let http = require('http');
let https = require('https');

module.exports = {
	/**
	 * Used to get all matches and captures when using a regular expression that contains captures
	 * and uses the global flag.
	 *
	 * Structure of the returned object:
	 *   String fullMatch   - The full string of characters matched
	 *   String[] captures  - The parenthesized substring matches, if any
	 *   Number index       - The 0-based index of the start of the match in the string
	 *
	 * @param RegExp regex  - The regular expression, as a RegExp object
	 * @param String string - The string to perform the regular expression on
	 *
	 * @return an array where 0..n are the of the above structure. The array also has a property,
	 * input, that contains the original string
	 */
	matchAll: function (regex, string) {
		let matches = [];
		
		while (true) {
			let match = regex.exec(string);
			
			if (match == null) {
				break;
			}
			
			let newMatch = {
				fullMatch: match[0],
				captures: [],
				index: match.index
			};
			
			// In the returned object from regexp.exec(), 0 is the full matched text, and 1..n are all n matches
			for (let i = 1; i < match.length; i++) {
				newMatch.matches.push(match[i]);
			}
			
			matches.push(newMatch);
		}
		
		matches.input = string;
		
		return matches;
	},
	
	randomString: function (size, errorCallback) {
		try {
			return crypto.randomBytes(size).toString('base64').replace(/\//g, '_').replace(/\+/g, '-');
		} catch (error) {
			errorCallback(error);
		}
	},
	
	httpRequest: function (host, path, requestOptions, bodyData, callback, errorCallback) {
		let httpModule = http;
		let options = {
			host: host,
			path: path
		};

		if (requestOptions) {
			this.each(requestOptions, (key, value) => {
				options[key] = value;
			});
		}

		if (options.protocol == 'https:') {
			httpModule = https;
		}
		
		let request = httpModule.request(options, (response) => {
			let data = '';
			response.on('data', (chunk) => {
				data += chunk;
			});

			response.on('end', () => {
				callback(data);
			});
		});

		request.on('socket', (socket) => {
			socket.setTimeout(10000);
			socket.on('timeout', () => {
				request.abort();
				if (errorCallback) {
					errorCallback(new Error('Request timed out.'));
				}
			});
		});

		request.on('error', (error) => {
			if (errorCallback) {
				errorCallback(error);
			}
		});

		if (bodyData) {
			request.write(bodyData);
		}

		request.end();
	},
	
	each: function (instance, callback) {
		for (let key in instance) {
			if (instance.hasOwnProperty(key)) {
				callback(key, instance[key]);
			}
		}
	},
	
	round: function (number, places) {
		if (places === undefined || places === false) {
			places = 0;
		}
		number = Math.floor(number * Math.pow(10, places) + 0.5) / Math.pow(10, places);
		// Add zeros (turns number into string)
		number += '';
		if (places > 0) {
			// Escape the magic character "." with "%"
			if (!/\./.test(number)) {
				number += '.';
			}
			let decimal = number.indexOf('.') + 1;
			let decimals = number.substring(decimal).length;
			for (let i = 0; i < places - decimals; i++) {
				number += '0';
			}
		}
		return number;
	},
	
	parseTime: function (dateString) {
		dateString = dateString.split(' ');
		let datePortion = dateString[0];
		let timePortion = dateString[1];
		let antePostMeridiem = dateString[2];
		datePortion = datePortion.split('/');
		timePortion = timePortion.split(':');

		return new Date(Number(datePortion[2]), Number(datePortion[0]), Number(datePortion[1]), Number(timePortion[0]) + (antePostMeridiem == 'PM' ? 12 : 0), Number(timePortion[1]), timePortion[2] !== undefined ? Number(timePortion[2]) : null);
	}
};
