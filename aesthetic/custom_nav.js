// ==UserScript==
// @name ThePosterDB: Button Cleanup & Optional TMDb Button
// @namespace http://tampermonkey.net/
// @version 4.3
// @description Removes unwanted buttons and optionally adds a TMDb navigation button.
// @author horrid1999
// @match https://theposterdb.com/posters/*
// ==/UserScript==

(function() {
    'use strict';

    // --- Configuration ---
    const addTmdbButton = true; // Adds a TMDb button to open the TMDb page directly (when true)
    const removeRequest = true; // Removes Request button when true
    const removeWatchNow = true; // Removes Watch Now button when true
    const removeUpload = false; // Removes Upload button when true

    const TMDB_MEDIA_TYPE_MAP = {
        'movie': 'movie',
        'show': 'tv',
        'collection': 'collection',
        'person': 'person',
        'company': 'company'
    };

    function getTmdbPath(type) {
        return TMDB_MEDIA_TYPE_MAP[type] || 'movie';
    }

    function getTmdbIdFromJustWatch() {
        const justwatchDiv = document.querySelector('.justwatch-button div[data-media-id]');
        return justwatchDiv ? justwatchDiv.getAttribute('data-media-id') : null;
    }

    function getMediaTypeFromUploadButton(uploadButton) {
        if (uploadButton) {
            const match = uploadButton.href.match(/\/upload\/(movie|show|collection|person)\/\d+$/);
            if (match && match[1]) return match[1];
        }
        return 'movie';
    }

    function createTmdbButton(buttonContainer, title, year = '', tmdbId = null, tdbMediaType = 'movie') {
        buttonContainer.querySelectorAll('.enhanced-nav-button').forEach(button => button.remove());

        const encodedTitle = encodeURIComponent(title);
        const tmdbMediaTypePath = getTmdbPath(tdbMediaType);

        const a = document.createElement('a');
        let tmdbUrl = `https://www.themoviedb.org/search?query=${encodedTitle}${year ? ' ' + year : ''}`;
        let tmdbTooltip = 'Search on TMDb';

        if (tmdbId && tmdbMediaTypePath) {
            tmdbUrl = `https://www.themoviedb.org/${tmdbMediaTypePath}/${tmdbId}`;
            tmdbTooltip = `Go to TMDb Page (ID: ${tmdbId})`;
        }

        a.href = tmdbUrl;
        a.target = '_blank';
        a.className = 'enhanced-nav-button text-white h4 font-weight-bold btn btn-outline-white mb-0 mr-1 mr-md-0';
        a.setAttribute('data-toggle', 'tooltip');
        a.setAttribute('data-placement', 'top');
        a.setAttribute('title', tmdbTooltip);
        a.innerHTML = `<i class="fas fa-video mr-md-1"></i><span class="d-none d-md-inline">TMDb</span>`;

        a.style.backgroundColor = 'transparent';
        a.style.borderColor = 'white';

        buttonContainer.appendChild(a);
    }

    const observer = new MutationObserver((mutations, obs) => {
        const buttonContainer = document.querySelector('div.mt-3.mt-lg-2.d-flex.flex-row.justify-content-center.flex-wrap.d-md-block');
        const titleElem = document.querySelector('p.h1');
        const uploadButton = document.querySelector('a[href*="/poster/upload/"]');

        if (buttonContainer && titleElem && uploadButton && !buttonContainer.classList.contains('script-run')) {
            obs.disconnect();
            buttonContainer.classList.add('script-run');

            // Extract media type BEFORE removing the upload button
            const tdbMediaType = getMediaTypeFromUploadButton(uploadButton);

            // Handle button removals based on config flags
            const watchNowButton = buttonContainer.querySelector('.justwatch-button');
            if (watchNowButton && removeWatchNow) {
                watchNowButton.style.cssText = 'display:none !important;';
            }

            const requestButton = buttonContainer.querySelector('a[href^="https://theposterdb.com/posters/requests/create"]');
            if (requestButton && removeRequest) {
                requestButton.remove();
            }

            if (uploadButton && removeUpload) {
                uploadButton.remove();
            }

            // Only proceed with TMDb button creation if enabled
            if (addTmdbButton) {
                const isCollectionPage = tdbMediaType === 'collection';
                let tmdbId = getTmdbIdFromJustWatch();
                let title = '';
                let year = '';

                if (isCollectionPage) {
                    const collectionTitleElem = document.querySelector('p.h1 strong');
                    title = collectionTitleElem?.innerText.trim() || '';
                } else {
                    let fullTitleText = (titleElem.innerText || titleElem.textContent).replace(/\s+/g, ' ').trim();
                    const match = fullTitleText.match(/(.*)\((\d{4})\)$/);

                    if (match) {
                        title = match[1].trim();
                        year = match[2];
                    } else {
                        const strongElem = titleElem.querySelector('strong');
                        title = strongElem ? strongElem.innerText.replace(/\s+/g, ' ').trim() : fullTitleText.replace(/\s+\(\d{4}\)$/, '').trim();
                        const yearMatch = fullTitleText.match(/(\d{4})/);
                        if (yearMatch) year = yearMatch[1];
                    }
                }

                if (title) {
                    createTmdbButton(buttonContainer, title, year, tmdbId, tdbMediaType);
                }
            }
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
})();
