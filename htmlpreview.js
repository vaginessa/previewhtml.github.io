// SPDX-FileCopyrightText: 2012 - 2021 Jerzy Głowacki <jerzyglowacki@gmail.com>
//
// SPDX-License-Identifier: Apache-2.0

(function () {

	var previewForm = document.getElementById('previewform');

	// Get URL of the raw file
	var url = location.search.substring(1)
		.replace(/\/\/github\.com/, '//raw.githubusercontent.com')
		.replace(/\/blob\//, '/').replace(/\/raw\//, '/');

	var rewrite = function (url) {
		if (location.port.length) {
			port_part = ':' + location.port
		} else {
			port_part = ''
		}
		return location.protocol + '//' + location.hostname + port_part + location.pathname + '?' + url
	}

	var replaceAssets = function () {
		var frame, a, link, links = [], script, scripts = [], i, href, src;
		// Framesets
		if (document.querySelectorAll('frameset').length) {
			// Don't replace CSS/JS if it's a frameset,
			// because it will be erased by document.write()
			return;
		}
		// Frames
		frame = document.querySelectorAll('iframe[src],frame[src]');
		for (i = 0; i < frame.length; ++i) {
			// Get absolute URL
			src = frame[i].src;
			// Check if it's from raw.github.com or bitbucket.org
			if (src.indexOf('//raw.githubusercontent.com') > 0 || src.indexOf('//bitbucket.org') > 0) {
				// Then rewrite URL so it can be loaded using CORS proxy
				frame[i].src = rewrite(src);
			}
		}
		// Objects
		object = document.querySelectorAll('object[data]');
		for (i = 0; i < object.length; ++i) {
			// Get absolute URL
			src = object[i].data;
			// Check if it's from raw.github.com or bitbucket.org
			if (src.indexOf('//raw.githubusercontent.com') > 0 || src.indexOf('//bitbucket.org') > 0) {
				// Then rewrite URL so it can be loaded using CORS proxy
				object[i].data = rewrite(src);
			}
		}
		// Links
		a = document.querySelectorAll('a[href]');
		for (i = 0; i < a.length; ++i) {
			// Get absolute URL
			href = a[i].href;
			// Check if it's an anchor
			if (href.indexOf('#') > 0) {
				// Rewrite links to this document only
				if ((a[i].protocol + '//' + a[i].hostname + a[i].pathname) == url) {
					a[i].href = location.protocol + '//' + location.hostname + ':' + location.port + location.pathname + location.search + '#' + a[i].hash.substring(1); //Then rewrite URL with support for empty anchor
				}
				// Do not modify external URLs with fragment
			}
			// Check if it's from raw.github.com or bitbucket.org and to HTML files
			else if (
				(href.indexOf('//raw.githubusercontent.com') > 0
					|| href.indexOf('//bitbucket.org') > 0)
				&& (href.indexOf('.html') > 0 || href.indexOf('.htm') > 0))
			{
				// Then rewrite URL so it can be loaded using CORS proxy
				a[i].href = rewrite(href);
			}
		}
		// Stylesheets
		link = document.querySelectorAll('link[rel=stylesheet]');
		for (i = 0; i < link.length; ++i) {
			// Get absolute URL
			href = link[i].href;
			// Check if it's from raw.github.com or bitbucket.org
			if (href.indexOf('//raw.githubusercontent.com') > 0 || href.indexOf('//bitbucket.org') > 0) {
				// Then add it to links queue and fetch using CORS proxy
				links.push(fetchProxy(href, null, 0));
			}
		}
		Promise.all(links).then(function (res) {
			for (i = 0; i < res.length; ++i) {
				loadCSS(res[i]);
			}
		});
		// Scripts
		script = document.querySelectorAll('script[type="text/htmlpreview"]');
		for (i = 0; i < script.length; ++i) {
			 // Get absolute URL
			src = script[i].src;
			// Check if it's from raw.github.com or bitbucket.org
			if (src.indexOf('//raw.githubusercontent.com') > 0 || src.indexOf('//bitbucket.org') > 0) {
				// Then add it to scripts queue and fetch using CORS proxy
				scripts.push(fetchProxy(src, null, 0));
			} else {
				script[i].removeAttribute('type');
				// Add inline script to queue to eval in order
				scripts.push(script[i].innerHTML);
			}
		}
		Promise.all(scripts).then(function (res) {
			for (i = 0; i < res.length; ++i) {
				loadJS(res[i]);
			}
			// Dispatch DOMContentLoaded event after loading all scripts
			document.dispatchEvent(new Event('DOMContentLoaded', {bubbles: true, cancelable: true}));
		});
	};

	var loadHTML = function (data) {
		if (data) {
			// Add <base> just after <head>
			// and replace <script type="text/javascript">
			// with <script type="text/htmlpreview">
			data = data
				.replace(/<head([^>]*)>/i, '<head$1><base href="' + url + '">')
				.replace(/<script(\s*src=["'][^"']*["'])?(\s*type=["'](text|application)\/javascript["'])?/gi, '<script type="text/htmlpreview"$1');
			// Delay updating document to have it cleared before
			setTimeout(function () {
				document.open();
				document.write(data);
				document.close();
				replaceAssets();
			}, 10);
		}
	};

	var loadCSS = function (data) {
		if (data) {
			var style = document.createElement('style');
			style.innerHTML = data;
			document.head.appendChild(style);
		}
	};

	var loadJS = function (data) {
		if (data) {
			var script = document.createElement('script');
			script.innerHTML = data;
			document.body.appendChild(script);
		}
	};

	var fetchProxy = function (url, options, i) {
		var proxy = [
			'', // try without proxy first
			'https://api.codetabs.com/v1/proxy/?quest='
		];
		return fetch(proxy[i] + url, options).then(function (res) {
			if (!res.ok) {
				throw new Error('Cannot load ' + url + ': ' + res.status + ' ' + res.statusText);
			}
			return res.text();
		}).catch(function (error) {
			if (i === proxy.length - 1) {
				throw error;
			}
			return fetchProxy(url, options, i + 1);
		})
	};

	if (url && url.indexOf(location.hostname) < 0) {
		fetchProxy(url, null, 0).then(loadHTML).catch(function (error) {
			console.error(error);
			previewForm.style.display = 'block';
			previewForm.innerText = error;
		});
	} else {
		previewForm.style.display = 'block';
	}
})()
