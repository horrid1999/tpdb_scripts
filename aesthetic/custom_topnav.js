// ==UserScript==
// @name         ThePosterDB: Custom Top Navigation Links
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Allows the addition.removal of custom navigation links to ThePosterDB top navbar
// @match        https://theposterdb.com/*
// @author       horrid1999
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const customLinks = [
        {
            text: 'FUTURE MOVIES',
            url: 'https://theposterdb.com/search/advanced/results?category=Movies&year_filter=equals&yone=2027',
            newTab: false
        },
        {
            text: 'BOOKMARKS',
            url: 'https://app.raindrop.io/my/0',
            newTab: true
        }
    ];

    const linksToHide = [
        'Feed',
        'Official',
        'Top',
        'Textless'
    ];

    function modifyNavbar() {
        const leftNavbar = document.querySelector('.navbar-nav.mr-auto');
        if (!leftNavbar) return false;

        // Hide existing links
        const allNavLinks = leftNavbar.querySelectorAll('.nav-item a.nav-link');
        allNavLinks.forEach(link => {
            const text = link.textContent.trim();
            if (linksToHide.includes(text)) {
                link.closest('.nav-item').style.display = 'none';
            }
        });

        // Add custom links
        customLinks.forEach(link => {
            const li = document.createElement('li');
            li.className = 'nav-item';

            const a = document.createElement('a');
            a.className = 'nav-link';
            a.href = '#';
            a.textContent = link.text;

            if (link.action) {
                a.addEventListener('click', e => {
                    e.preventDefault();
                    link.action();
                });
            } else {
                a.href = link.url;
                if (link.newTab) {
                    a.target = '_blank';
                    a.rel = 'noopener noreferrer';
                }
            }

            li.appendChild(a);
            leftNavbar.appendChild(li);
        });

        return true;
    }

    let attempts = 0;
    const timer = setInterval(() => {
        if (modifyNavbar() || attempts++ > 20) {
            clearInterval(timer);
        }
    }, 250);
})();
