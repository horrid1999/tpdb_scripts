
// ==UserScript==
// @name         ThePosterDB: Feed Link Changer
// @namespace    https://theposterdb.com/
// @version      1.1
// @description  Modifies the Feed link to include specific query parameters.
// @author       horrid1999
// @match        https://theposterdb.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    const feedURL = 'https://theposterdb.com/feed?category=All&textless=All&language=all&sort=Recent&variation=all';

    function updateFeedLink() {
        const links = document.querySelectorAll('a');

        links.forEach(link => {
            if (link.href.split('?')[0].replace(/\/$/, '') === 'https://theposterdb.com/feed') {
                if (link.href !== feedURL) {
                    link.href = feedURL;
                    console.log('[TPDb] Feed link updated:', link.href);
                }
            }
        });
    }

    // Initial attempt
    updateFeedLink();

    // Watch for dynamically added or rebuilt navigation elements
    const observer = new MutationObserver(updateFeedLink);

    observer.observe(document.documentElement, {
        childList: true,
        subtree: true
    });

})();
