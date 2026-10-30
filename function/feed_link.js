// ==UserScript==
// @name         ThePosterDB: Feed Link Changer
// @namespace    https://theposterdb.com/
// @version      1.2
// @description  Modifies the main Feed navigation link with preferred filters.
// @author       horrid1999
// @match        https://theposterdb.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    const feedURL = 'https://theposterdb.com/feed?category=All&textless=All&language=all&sort=Recent&variation=all';

    function updateFeedLink() {
        document.querySelectorAll('a[href]').forEach(link => {
            const url = new URL(link.href);

            // Only modify the main Feed link.
            // Never modify pagination links.
            if (
                url.origin === 'https://theposterdb.com' &&
                url.pathname === '/feed' &&
                !url.searchParams.has('page')
            ) {
                if (link.href !== feedURL) {
                    link.href = feedURL;
                    console.log('[TPDb] Main Feed link updated');
                }
            }
        });
    }

    updateFeedLink();

    const observer = new MutationObserver(updateFeedLink);

    observer.observe(document.documentElement, {
        childList: true,
        subtree: true
    });
})();
