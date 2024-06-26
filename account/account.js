// https://www.npmjs.com/package/jwt-decode

function b64DecodeUnicode(str) {
	return decodeURIComponent(
		atob(str).replace(/(.)/g, (m, p) => {
			let code = p.charCodeAt(0).toString(16).toUpperCase();
			if (code.length < 2) {
				code = '0' + code;
			}
			return '%' + code;
		})
	);
}
function base64UrlDecode(str) {
	let output = str.replace(/-/g, '+').replace(/_/g, '/');
	switch (output.length % 4) {
		case 0:
			break;
		case 2:
			output += '==';
			break;
		case 3:
			output += '=';
			break;
		default:
			throw 'base64 string is not of the correct length';
	}
	try {
		return b64DecodeUnicode(output);
	} catch (err) {
		return atob(output);
	}
}
function jwtDecode(token, options) {
	if (typeof token !== 'string') {
		throw 'Invalid token specified: must be a string';
	}
	options || (options = {});
	const pos = options.header === true ? 0 : 1;
	const part = token.split('.')[pos];
	if (typeof part !== 'string') {
		throw `Invalid token specified: missing part #${pos + 1}`;
	}
	let decoded;
	try {
		decoded = base64UrlDecode(part);
	} catch (e) {
		throw `Invalid token specified: invalid base64 for part #${pos + 1} (${e.message})`;
	}
	try {
		return JSON.parse(decoded);
	} catch (e) {
		throw `Invalid token specified: invalid json for part #${pos + 1} (${e.message})`;
	}
}

// Parse the URL to extract the id_token parameter
(async () => {
	let user;
	let idToken = localStorage.getItem('idToken');

	if (idToken && idToken != 'null') {
		try {
			user = jwtDecode(idToken);
		} catch (e) {
			console.error(e);
			idToken = null;
		}
	} else idToken = null;

	// code for checking if the token has been expired for more than a month
	// user.exp + 2419200 < Date.now() / 1000

	// check if there's no token
	// expired tokens are accepted so users don't have to login again
	if (!idToken || !user.given_name) {
		// tries to get the token from the URL
		let params = location.search;
		if (!params) params = '?' + location.hash.slice(1);
		const urlParams = new URLSearchParams(params);
		idToken = urlParams.get('id_token');

		if (idToken) {
			try {
				user = jwtDecode(idToken);
			} catch (e) {
				console.error(e);
				idToken = null;
			}
		}

		// if there's no token, display the unauthorized section of the page
		if (!idToken) {
			if (window.showUnauthContent) await showUnauthContent();
			let els = document.getElementsByClassName('unauth');
			for (let el of els) el.style.display = 'block';
			return;
		}

		// hide the token from the URL
		window.history.pushState(null, '', location.href.split(/[?#]/)[0]);

		// save to local storage
		localStorage.setItem('idToken', idToken);
	}

	window.p5playAccount = {
		birthdate: user.birthdate,
		company: user.family_name,
		country: user.address?.formatted,
		email: user.email,
		full_name: user.given_name,
		username: user['cognito:username'],
		type: user.middle_name,
		locale: user.locale
	};

	// show section of page that requires authentication
	if (window.showAuthContent) await showAuthContent();

	let els = document.getElementsByClassName('unauth');
	for (let el of els) el.style.display = 'none';
	els = document.getElementsByClassName('auth');
	for (let el of els) el.style.display = 'block';

	// let apiUrl = 'https://ntaknarhb9.execute-api.us-west-2.amazonaws.com/prod';
	// let res = await (
	// 	await fetch(apiUrl + '/getUserData', {
	// 		method: 'GET',
	// 		headers: {
	// 			Authorization: idToken,
	// 			'Content-Type': 'application/json'
	// 		}
	// 	})
	// ).json();

	// console.log(res);
})();
