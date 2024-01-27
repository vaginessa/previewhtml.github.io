// SPDX-FileCopyrightText: 2012 - 2021 Jerzy Głowacki <jerzyglowacki@gmail.com>
//
// SPDX-License-Identifier: Apache-2.0

(function () {

	/**
	 * If the first parameter is a URL to a file on a known git forge,
	 * returns the URL to the raw version of this file
	 * (vs the HTML/Web view of it).
	 * @returns {string} The raw version of the (git hosted) file URL
	 *   requested to be previewed.
	 *
	 * NOTE: This function 1 of 2 that is git-forge specific.
	 */
	const getRawFileUrl = function () {
		return location.search.substring(1)
			.replace(/\/\/github\.com/, '//raw.githubusercontent.com')
			.replace(/\/blob\//, '/').replace(/\/raw\//, '/');
	};

	/**
	 * Indicates whether the given URL points to a file on a known git forge.
	 * @param {string} url - Any URL,
	 *   potentially pointing to a git hosted raw (plain-text) file
	 * @returns {boolean} `true` if the given URL indeed does point
	 *   to a git hosted raw file
	 *
	 * NOTE: This is function 2 of 2 that is git-forge specific.
	 */
	const isGitForgeFileUrl = function (url) {
		return (url.indexOf('//raw.githubusercontent.com') > 0
			|| url.indexOf('//bitbucket.org') > 0);
	};

	/**
	 * Returns whether the given URL points to an HTML file,
	 * considering only the file extension.
	 * @param {string} url - Any URL
	 * @returns {boolean} 'true' if the given URL points to an HTML file.
	 */
	const isHtmlUrl = function (url) {
		return (url.indexOf('.html') > 0 || url.indexOf('.htm') > 0);
	};

	/**
	 * Returns the base URL of our service,
	 * to which the git hosted file URL can be appended.
	 * @returns {string} a URL representing the our service base.
	 */
	const getServiceBase = function () {
		if (window.location) {
			const loc = window.location;
			const serviceBase = loc.origin + loc.pathname;
			return serviceBase;
		}
		// Fallback value
		return 'https://git-forge-html-preview.github.io/git-forge-html-preview/?';
	};

	/**
	 * Rewrite URL so it can be loaded using CORS proxy.
	 * @param {string} url - Any URL
	 * @returns {string} The re-routed (for preview) version of the provided URL
	 */
	const rewrite = function (url) {
		return location.origin + location.pathname + '?' + url;
	};

	/**
	 * Rewrite URL so it can be loaded using CORS proxy,
	 * if it points to a file on a known git forge.
	 * @param {object} obj - An object containing a property that is a URL
	 * @param {string} prop - The name of the URL property
	 * @returns {void}
	 */
	const rewriteCond = function (obj, prop) {
		// Get absolute URL
		const url = obj[prop];
		if (isGitForgeFileUrl(url)) {
			obj[prop] = rewrite(url);
		}
	};

	const serviceBase = getServiceBase();
	document.getElementById("service_base").innerHTML = serviceBase + '?';

	const previewForm = document.getElementById('previewform');

	// Get URL of the raw file
	const rawFileUrl = getRawFileUrl();

	const replaceFrames = function () {
		const frame = document.querySelectorAll('iframe[src],frame[src]');
		for (let i = 0; i < frame.length; ++i) {
			rewriteCond(frame[i], "src");
		}
	};

	const replaceObjects = function () {
		const object = document.querySelectorAll('object[data]');
		for (let i = 0; i < object.length; ++i) {
			rewriteCond(object[i], "data");
		}
	};

	const replaceLinks = function () {
		const a = document.querySelectorAll('a[href]');
		let href;
		for (let i = 0; i < a.length; ++i) {
			// Get absolute URL
			href = a[i].href;
			// Check if it's an anchor
			if (href.indexOf('#') > 0) {
				// Rewrite links to this document only
				if ((a[i].protocol + '//' + a[i].hostname + a[i].pathname) == rawFileUrl) {
					// Then rewrite URL with support for empty anchor
					a[i].href
						= location.origin + location.pathname + location.search
						+ '#' + a[i].hash.substring(1);
				}
				// Do not modify external URLs with fragment
			} else if (isGitForgeFileUrl(href) && isHtmlUrl(href)) {
				// Then rewrite URL so it can be loaded using CORS proxy
				a[i].href = rewrite(href);
			}
		}
	};

	const replaceStylesheets = function () {
		const link = document.querySelectorAll('link[rel=stylesheet]');
		const links = [];
		let href;
		for (let i = 0; i < link.length; ++i) {
			// Get absolute URL
			href = link[i].href;
			if (isGitForgeFileUrl(href)) {
				// Then add it to links queue and fetch using CORS proxy
				links.push(fetchProxy(href, null, 0));
			}
		}
		Promise.all(links).then(function (res) {
			for (let i = 0; i < res.length; ++i) {
				loadCSS(res[i]);
			}
		});
	};

	const replaceScripts = function () {
		// eslint-disable-next-line max-len
		const script = document.querySelectorAll('script[type="text/htmlpreview"]');
		const scripts = [];
		let src;
		for (let i = 0; i < script.length; ++i) {
			// Get absolute URL
			src = script[i].src;
			if (isGitForgeFileUrl(src)) {
				// Then add it to scripts queue and fetch using CORS proxy
				scripts.push(fetchProxy(src, null, 0));
			} else {
				script[i].removeAttribute('type');
				// Add inline script to queue to eval in order
				scripts.push(script[i].innerHTML);
			}
		}
		Promise.all(scripts).then(function (res) {
			for (let i = 0; i < res.length; ++i) {
				loadJS(res[i]);
			}
			// Dispatch DOMContentLoaded event after loading all scripts
			document.dispatchEvent(new Event(
				'DOMContentLoaded',
				{bubbles: true, cancelable: true}
			));
		});
	};

	const replaceAssets = function () {
		// Framesets
		if (document.querySelectorAll('frameset').length) {
			// Don't replace CSS/JS if it's a frameset,
			// because it will be erased by document.write()
			return;
		}
		replaceFrames();
		replaceObjects();
		replaceLinks();
		replaceStylesheets();
		replaceScripts();
	};

	const loadHTML = function (data) {
		if (data) {
			// Add <base> just after <head>
			// and replace <script type="text/javascript">
			// with <script type="text/htmlpreview">
			data = data.replace(
				/<head([^>]*)>/i,
				'<head$1><base href="' + rawFileUrl + '">'
			).replace(
				/<script(\s*src=["'][^"']*["'])?(\s*type=["'](text|application)\/javascript["'])?/gi,
				'<script type="text/htmlpreview"$1'
			);
			// Delay updating document to have it cleared before
			setTimeout(function () {
				document.open();
				document.write(data);
				document.close();
				replaceAssets();
			}, 10);
		}
	};

	const loadCSS = function (data) {
		if (data) {
			const style = document.createElement('style');
			style.innerHTML = data;
			document.head.appendChild(style);
		}
	};

	const loadJS = function (data) {
		if (data) {
			const script = document.createElement('script');
			script.innerHTML = data;
			document.body.appendChild(script);
		}
	};

	const fetchProxy = function (url, options, i) {
		const proxy = [
			// try without proxy first
			'',
			'https://api.codetabs.com/v1/proxy/?quest='
		];
		return fetch(proxy[i] + url, options).then(function (res) {
			if (!res.ok) {
				const errMsg = res.status + ' ' + res.statusText;
				throw new Error('Cannot load ' + url + ': ' + errMsg);
			}
			return res.text();
		}).catch(function (error) {
			if (i === proxy.length - 1) {
				throw error;
			}
			return fetchProxy(url, options, i + 1);
		});
	};

	if (rawFileUrl && rawFileUrl.indexOf(location.hostname) < 0) {
		fetchProxy(rawFileUrl, null, 0).then(loadHTML).catch(function (error) {
			// console.error(error);
			previewForm.style.display = 'block';
			previewForm.innerText = error;
		});
	} else {
		previewForm.style.display = 'block';
	}
})();
