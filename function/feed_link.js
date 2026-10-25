// ==UserScript==
// @name       ThePosterDB: Feed Link Changer
// @namespace  https://theposterdb.com/
// @version    1.0
// @description  Modifies the 'Feed' link to include specific query parameters for faster loading.
// @author      horrid1999
// @match       https://theposterdb.com/*
// @grant       none
// ==/UserScript==

(function() {
    'use strict';

    // Select the 'Feed' link using its class and href attribute
    const feedLink = document.querySelector('a.nav-link[href="https://theposterdb.com/feed"]');

    if (feedLink) {
        // Update the href attribute with the desired URL
        feedLink.href = 'https://theposterdb.com/feed?category=All&textless=All&language=all&sort=Recent&variation=all';
    }
})();
