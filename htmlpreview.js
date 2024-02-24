// SPDX-FileCopyrightText: 2012 - 2021 Jerzy Głowacki <jerzyglowacki@gmail.com>
// SPDX-FileCopyrightText: 2024 Robin Vobruba <hoijui.quaero@gmail.com>
//
// SPDX-License-Identifier: Apache-2.0

// eslint-disable-next-line max-statements
(function () {
	/**
	 * Given a set of variant values, creates an enum.
	 * @param {string[]} variants -
	 *   A list of unique strings, representing the enum variants.
	 * @return {object} an enum-like, immutable dictionary
	 */
	const createEnum = function (variants) {
		const enumObject = {};
		for (const vari of variants) {
			enumObject[vari] = Symbol(vari);
		}
		return Object.freeze(enumObject);
	};

	const FORGE_SOFTWARES = createEnum([
		'GitHub',
		'BitBucket',
		'GitLab',
		'ForgeJo',
		'SourceHut'
	]);

	const FORGE_HOSTS = createEnum([
		'GitHub_com',
		'BitBucket_org',
		'GitLab_com',
		'Allmende_io',
		'GitLab_OpenSourceEcology_de',
		'CodeBerg_org',
		'Git_Sr_Ht'
	]);

	/**
	 * Takes any URL to a file on a known git forge,
	 * and returns the raw version of that files URL on the same forge.
	 * If it already is the raw version,
	 * this function just returns it as is.
	 * @param {URL} forgeFileUrl - Any URL,
	 *   potentially pointing to a git hosted raw (plain-text) file
	 * @returns {URL} The raw version of the (git hosted) file URL.
	 *
	 * NOTE: This function 1st of 2 that is git-forge specific.
	 */
	// eslint-disable-next-line max-statements
	const rawifyForgeUrl = function (forgeFileUrl) {
		if (forgeFileUrl === null) {
			return null;
		}

		const forge = extractForge(forgeFileUrl);
		const sw = forge[0];
		if (sw === null) {
			// do nothing
		} else if (sw === FORGE_SOFTWARES.GitHub) {
			forgeFileUrl.hostname = 'raw.githubusercontent.com';
			forgeFileUrl.pathname = forgeFileUrl.pathname.replace(
				/^(\/[^/]+\/[^/]+)\/(blob|raw)\/([^/]+\/)/,
				'$1/$3'
			);
		} else if (sw === FORGE_SOFTWARES.BitBucket) {
			forgeFileUrl.pathname = forgeFileUrl.pathname.replace(
				/^(\/[^/]+\/[^/]+)\/src\/([^/]+\/)/,
				'$1/raw/$2'
			);
		} else if (sw === FORGE_SOFTWARES.GitLab) {
			forgeFileUrl.pathname = forgeFileUrl.pathname.replace(
				/^(\/[^/]+\/.+?)\/(-\/)?blob\/([^/]+\/)/,
				'$1/-/raw/$3'
			);
		} else if (sw === FORGE_SOFTWARES.ForgeJo) {
			forgeFileUrl.pathname = forgeFileUrl.pathname.replace(
				/^(\/[^/]+\/[^/]+)\/src\/([^/]+\/)/,
				'$1/raw/$2'
			);
		} else if (sw === FORGE_SOFTWARES.SourceHut) {
			forgeFileUrl.pathname = forgeFileUrl.pathname.replace(
				/^(\/~[^/]+\/[^/]+)\/tree\/([^/]+)\/item\/([^/]+)/,
				'$1/blob/$2/$3'
			);
		} else {
			reportError('Unsupported git-forge software: ' + sw.toString());
		}
		return forgeFileUrl;
	};

	/**
	 * Takes any URL to a file on a known git forge,
	 * and returns the raw version of that files URL on the same forge.
	 * If it already is the raw version,
	 * this function just returns it as is.
	 * @param {string} previewFileUrl - Any URL,
	 *   potentially pointing to a git hosted raw (plain-text) file
	 * @returns {URL} The raw version of the (git hosted) file URL.
	 *
	 * NOTE: This function 1st of 2 that is git-forge specific.
	 */
	const rawifyForgeUrlStr = function (previewFileUrl) {
		let previewFileUrlParsed;
		try {
			previewFileUrlParsed = new URL(previewFileUrl);
		} catch (err) {
			reportError('Invalid URL provided in parameter "url"');
		}
		return rawifyForgeUrl(previewFileUrlParsed);
	};

	/**
	 * Reports an error directly in HTML.
	 * @param {string} msg - The error message to be reported to the user.
	 * @returns {void}
	 */
	const reportError = function (msg) {
		const errP = document.createElement('p');
		errP.innerHTML = msg;
		document.body.appendChild(errP);
		throw new SyntaxError(msg);
	};

	/**
	 * If the first parameter is a URL to a file on a known git forge,
	 * returns the URL to the raw version of this file
	 * (vs the HTML/Web view of it).
	 * @returns {string} The raw version of the (git hosted) file URL
	 *   requested to be previewed.
	 */
	const getRawFileUrl = function () {
		if (location.search.length === 0) {
			return null;
		}

		const params = new URLSearchParams(location.search);
		const previewFileUrl = params.get('url');
		if (previewFileUrl === null) {
			reportError('Missing required parameter "url"');
			// reportError('Please use "...?url=..." vs the old "...?..."');
		}
		return rawifyForgeUrlStr(previewFileUrl).href;
	};

	const RE_GITLAB_PATH = /^\/[^/]+\/.+\/(-\/)?(blob|raw)\/[^/]+/;
	const RE_SOURCEHUT_PATH = /^\/~[^/]+\/[^/]+\/(tree|blob)\/[^/]+/;

	/**
	 * Extracts the forge software and host,
	 * the given a URL that points to a file on a known git forge.
	 * @param {URL} url - Any URL,
	 *   potentially pointing to a git hosted raw (plain-text) file
	 * @returns {{ software: Symbol, host: Symbol}} `(software, host)`,
	 *   or `(null, null)` if unsupported/unidentified/
	 *   not a git hosted raw file.
	 *
	 * NOTE: This is function 2nd of 2 that is git-forge specific.
	 */
	// eslint-disable-next-line max-statements
	const extractForge = function (url) {
		let software = null;
		let host = null;
		if (url.host == 'raw.githubusercontent.com'
				|| url.host == 'github.com') {
			software = FORGE_SOFTWARES.GitHub;
			host = FORGE_HOSTS.GitHub_com;
		} else if (url.host == 'bitbucket.org'
				&& (/^\/[^/]+\/[^/]+\/(src|raw)\/[^/]+/).test(url.pathname)) {
			software = FORGE_SOFTWARES.BitBucket;
			host = FORGE_HOSTS.BitBucket_org;
		} else if (url.host == 'gitlab.com'
				&& RE_GITLAB_PATH.test(url.pathname)) {
			software = FORGE_SOFTWARES.GitLab;
			host = FORGE_HOSTS.GitLab_com;
		} else if (url.host == 'lab.allmende.io'
				&& RE_GITLAB_PATH.test(url.pathname)) {
			software = FORGE_SOFTWARES.GitLab;
			host = FORGE_HOSTS.Lab_Allmende_io;
		} else if (url.host == 'gitlab.opensourceecology.de'
				&& RE_GITLAB_PATH.test(url.pathname)) {
			software = FORGE_SOFTWARES.GitLab;
			host = FORGE_HOSTS.GitLab_OpenSourceEcology_de;
		} else if (url.host == 'codeberg.org'
				&& (/^\/[^/]+\/[^/]+\/(src|raw)\/[^/]+/).test(url.pathname)) {
			software = FORGE_SOFTWARES.ForgeJo;
			host = FORGE_HOSTS.CodeBerg_org;
		} else if (url.host == 'git.sr.ht'
				&& RE_SOURCEHUT_PATH.test(url.pathname)) {
			software = FORGE_SOFTWARES.SourceHut;
			host = FORGE_HOSTS.Git_Sr_Ht;
		}
		return [software, host];
	};

	/**
	 * Indicates whether the given URL points to a file on a known git forge.
	 * @param {URL} url - Any URL,
	 *   potentially pointing to a git hosted raw (plain-text) file
	 * @returns {boolean} `true` if the given URL indeed does point
	 *   to a git hosted raw file
	 */
	const isGitForgeFileUrlParsed = function (url) {
		return extractForge(url)[0] !== null;
	};

	/**
	 * Indicates whether the given URL points to a file on a known git forge.
	 * @param {string} url - Any URL,
	 *   potentially pointing to a git hosted raw (plain-text) file
	 * @returns {boolean} `true` if the given URL indeed does point
	 *   to a git hosted raw file
	 */
	const isGitForgeFileUrl = function (url) {
		try {
			return isGitForgeFileUrlParsed(new URL(url));
		} catch (err) {
			if (err instanceof RangeError) {
				return false;
			}
			throw err;
		}
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
			return loc.origin + loc.pathname;
		}
		// Fallback value
		return 'https://html-preview.github.io/';
	};

	/**
	 * Rewrite URL so it can be loaded using CORS proxy.
	 * @param {string} url - Any URL
	 * @returns {string} The re-routed (for preview) version of the provided URL
	 */
	const rewrite = function (url) {
		return location.origin + location.pathname + '?url=' + url;
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
	document.getElementById('service_base').innerHTML = serviceBase + '?url=';

	const previewForm = document.getElementById('previewform');

	// Get URL of the raw file
	const rawFileUrl = getRawFileUrl();

	const replaceFrames = function () {
		const frame = document.querySelectorAll('iframe[src],frame[src]');
		for (let i = 0; i < frame.length; ++i) {
			rewriteCond(frame[i], 'src');
		}
	};

	const replaceObjects = function () {
		const object = document.querySelectorAll('object[data]');
		for (let i = 0; i < object.length; ++i) {
			rewriteCond(object[i], 'data');
		}
	};

	const replaceLinks = function () {
		const a = document.querySelectorAll('a[href]');
		let href;
		for (let i = 0; i < a.length; ++i) {
			// Get absolute URL
			href = a[i].href;
			// Check if it's an anchor
			if (a[i].hash.length > 0) {
				// Rewrite links to this document only
				if ((a[i].origin + a[i].pathname) == rawFileUrl) {
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
			if (href != "" && isGitForgeFileUrl(href)) {
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
		// eslint-disable-next-line @stylistic/js/max-len
		const script = document.querySelectorAll('script[type="text/htmlpreview"]');
		const scripts = [];
		let src;
		for (let i = 0; i < script.length; ++i) {
			// Get absolute URL
			src = script[i].src;
			if (src != "" && isGitForgeFileUrl(src)) {
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
				// eslint-disable-next-line @stylistic/js/max-len
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
