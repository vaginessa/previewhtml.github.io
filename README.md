<!--
SPDX-FileCopyrightText: 2012 - 2021 Jerzy Głowacki <jerzyglowacki@gmail.com>
SPDX-FileCopyrightText: 2024 Robin Vobruba <hoijui.quaero@gmail.com>

SPDX-License-Identifier: Apache-2.0
-->

# Git-Forge HTML Preview

[![License: Apache-2.0](
    https://img.shields.io/badge/License-Apache--2.0-blue.svg)](
    LICENSE.txt)
[![REUSE status](
    https://api.reuse.software/badge/github.com/html-preview/html-preview.github.io)](
    https://api.reuse.software/info/github.com/html-preview/html-preview.github.io)

Allows to render HTML files on git forges (like GitHub) in your browser,
without cloning or downloading.

**NOTE**
Freely hosted [CORS][CORS] (Cross-origin resource sharing) proxies -
like the ones used by this script -
are a potential security risc!

Currently supported git forges:

- [x] GitHub
- [x] BitBucket
- [ ] GitLab
- [ ] ForgeJo (CodeBerg)
- [ ] SourceHut
- [ ] Gitea

We have a collection of the [file URLs](forges.md) for the above.

## How it works

If you try to open raw version of any HTML, CSS or JS file
in a web browser directly from GitHub,
all you will see is its source code.
GitHub forces them to use the "text/plain" content-type,
so they cannot be interpreted in their native form by the browser.

## Usage

In order to use it,
just prepend this fragment to the URL of any HTML file:
**[https://html-preview.github.io/?](https://html-preview.github.io/?)**
e.g.:

- <https://html-preview.github.io/?https://github.com/twbs/bootstrap/gh-pages/2.3.2/index.html>
- <https://html-preview.github.io/?https://github.com/documentcloud/backbone/blob/master/examples/todos/index.html>

What it does:

1. Load HTML using [CORS] proxy
2. Process all links, frames, scripts and styles, and
3. Load each of them using [CORS] proxy,
    so they can be evaluated by the browser.

**Git-Forge HTML Preview** was tested
under the latest Google Chrome and Mozilla Firefox (**in _2012_**).

[CORS]: https://httptoolkit.com/blog/cors-proxies/
