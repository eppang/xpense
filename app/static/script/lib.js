let _ = {};

(() => {
	_.request = (url, method, headers, body) => {
		method = method ? method : "GET";

		return fetch(url, {
			method: method,
			cache: "no-cache",
			headers: headers ? headers : undefined,
			body: method == "GET" || method == "HEAD" || !body ? undefined : body
		});
	};

	_.getJSON = (url, headers) => {
		return _.request(url, "GET", headers).then((response) => {
			return response.json();
		});
	};
})();

export default _;
