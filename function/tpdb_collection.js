// ==UserScript==
// @name ThePosterDB: Collection List & Links
// @namespace http://tampermonkey.net/
// @version 2.3
// @description Adds a list of movies to collection pages that link to ThePosterDB and a clickable "Part of a collection" link to movie pages (including TPDB-only and adult collections).
// @author horrid1999
// @match https://theposterdb.com/posters/*
// @grant GM_xmlhttpRequest
// ==/UserScript==

(function() {
    'use strict';

    // === CONFIGURATION ===
    const DEBUG_MODE = false; // Set to true to enable extensive console logging
    const TMDB_API_KEY = 'TMDB_API_KEY';
    // =====================

    const log = (message, ...args) => {
        if (DEBUG_MODE) {
            console.log(`[TPDB Script Debug] ${message}`, ...args);
        }
    };

    /**
     * NEW: Check the current page for posters that are part of sets
     * This scans the poster overlays on the current movie page for set badges
     */
    function checkPageForSets(buttonContainer) {
        log(`-- CHECKING PAGE: Looking for set badges on poster overlays`);

        // Wait a moment for posters to load, then check
        setTimeout(() => {
            // Look for set links in poster overlays on the current page
            const setLinks = document.querySelectorAll('a.set_poster_count[href*="/set/"]');
            const setsFound = new Map(); // Use Map to store set ID -> count

            if (setLinks.length > 0) {
                log(`-- FOUND: ${setLinks.length} poster(s) with set badges on page`);

                setLinks.forEach(link => {
                    const href = link.getAttribute('href');
                    const match = href.match(/\/set\/(\d+)/);
                    if (match) {
                        const setId = match[1];
                        const count = link.textContent.trim();
                        if (!setsFound.has(setId)) {
                            setsFound.set(setId, count);
                        }
                    }
                });

                if (setsFound.size > 0) {
                    log(`-- SUCCESS: Found ${setsFound.size} unique set(s)`);

                    // Fetch set names by checking each set page
                    const setPromises = Array.from(setsFound.keys()).map(setId => {
                        return new Promise((resolve) => {
                            GM_xmlhttpRequest({
                                method: "GET",
                                url: `https://theposterdb.com/set/${setId}`,
                                onload: function(response) {
                                    try {
                                        const parser = new DOMParser();
                                        const doc = parser.parseFromString(response.responseText, 'text/html');
                                        const titleElem = doc.querySelector('p.h1 strong');
                                        const setName = titleElem ? titleElem.textContent.trim() : `Set ${setId}`;
                                        const posterCount = setsFound.get(setId);
                                        resolve({ id: setId, name: setName, count: posterCount });
                                    } catch (e) {
                                        resolve({ id: setId, name: `Set ${setId}`, count: setsFound.get(setId) });
                                    }
                                },
                                onerror: function() {
                                    resolve({ id: setId, name: `Set ${setId}`, count: setsFound.get(setId) });
                                }
                            });
                        });
                    });

                    Promise.all(setPromises).then(sets => {
                        if (sets.length > 0) {
                            // Filter to only sets with 2 or more posters
                            const validSets = sets.filter(set => parseInt(set.count) >= 2);

                            if (validSets.length > 0) {
                                // Sort by poster count (descending) and take top 3
                                const sortedSets = validSets.sort((a, b) => parseInt(b.count) - parseInt(a.count));
                                const topSets = sortedSets.slice(0, 3);

                                const setLinks = topSets.map(set =>
                                    `<a href="https://theposterdb.com/set/${set.id}" target="_blank"><strong>${set.name}</strong></a> (${set.count} poster${set.count !== '1' ? 's' : ''})`
                                ).join(', ');

                                const moreText = validSets.length > 3 ? ` <em>(+${validSets.length - 3} more)</em>` : '';

                                const collectionInfo = document.createElement('div');
                                collectionInfo.innerHTML = `
                                    <div style="margin-top: 20px;">
                                        Part of ${setLinks}${moreText}
                                        <p style="font-size: 0.9em; color: #666; margin-top: 5px;"><em>(ThePosterDB set${topSets.length > 1 ? 's' : ''})</em></p>
                                    </div>
                                `;
                                buttonContainer.after(collectionInfo);
                                log("-- DOM UPDATE: TPDB set link(s) added to page.");
                            } else {
                                log("-- RESULT: Sets found but none have 2+ posters, skipping display.");
                            }
                        }
                    });
                } else {
                    log(`-- RESULT: No valid set IDs extracted`);
                }
            } else {
                log(`-- RESULT: No set badges found on page (movie not part of any TPDB sets with existing posters)`);
            }
        }, 1000); // Wait 1 second for posters to load
    }

    // Helper function to fetch movie details and insert the collection link.
    function fetchMovieDetails(tmdbMovieId, buttonContainer, apiKey) {
        log(`-- API CALL: Fetching details for TMDB Movie ID: ${tmdbMovieId}`);
        const movieDetailsUrl = `https://api.themoviedb.org/3/movie/${tmdbMovieId}?api_key=${apiKey}&language=en-US`;

        GM_xmlhttpRequest({
            method: "GET",
            url: movieDetailsUrl,
            onload: function(detailsResponse) {
                try {
                    log(`-- API RESPONSE: Received movie details for ID ${tmdbMovieId}`);
                    const detailsData = JSON.parse(detailsResponse.responseText);

                    if (detailsData && detailsData.belongs_to_collection) {
                        const collectionName = detailsData.belongs_to_collection.name;
                        const collectionId = detailsData.belongs_to_collection.id;
                        log(`-- SUCCESS: Movie is part of collection ID ${collectionId}: ${collectionName}`);

                        const collectionInfo = document.createElement('div');
                        collectionInfo.innerHTML = `
                            <div style="margin-top: 20px;">
                                Part of <a href="https://theposterdb.com/search/advanced/results?category=Collections&tmdb_id=${collectionId}" target="_blank"><strong>${collectionName}</strong></a>
                                <p style="font-size: 0.9em; color: #666; margin-top: 5px;"><em>(TMDb collection)</em></p>
                            </div>
                        `;
                        buttonContainer.after(collectionInfo);
                        log("-- DOM UPDATE: TMDb collection link added to page.");
                        log("-- SKIPPING: TMDb collection found, skipping TPDB set check.");
                    } else {
                        log(`-- RESULT: Movie ID ${tmdbMovieId} does not belong to a TMDb collection.`);
                        // Only check for TPDB sets if no TMDb collection found
                        log(`-- FALLBACK: Looking for TPDB sets on page...`);
                        checkPageForSets(buttonContainer);
                    }

                } catch (e) {
                    console.error("[TPDB Script ERROR] Error parsing movie details JSON:", e);
                    // Check for TPDB sets on error as fallback
                    checkPageForSets(buttonContainer);
                }
            },
            onerror: function(e) {
                console.error("[TPDB Script ERROR] Error fetching movie details from TMDB:", e);
                // Check for TPDB sets on error as fallback
                checkPageForSets(buttonContainer);
            }
        });
    }

    /**
     * Normalize the movie title
     */

    function normalizeMovieTitle(title) {
        return title
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .replace(/&/g, "and")
            .replace(/[^a-z0-9]/g, "");
    }

     /**
     * Fetch movies from TPDB upload page.
     * Parses title + year from each movie slot. Accepts "(YYYY)" or "(N/A)".
     * Returns raw { title, year } objects — real TMDb IDs are resolved separately.
     */

    function fetchTPDBMovies(collectionId) {
        return new Promise((resolve) => {
            log(`-- Fetching TPDB movies from upload page for collection ID: ${collectionId}`);
            const uploadPageUrl = `https://theposterdb.com/poster/upload/collection/${collectionId}`;

            GM_xmlhttpRequest({
                method: "GET",
                url: uploadPageUrl,
                onload: function(response) {
                    try {
                        const parser = new DOMParser();
                        const doc = parser.parseFromString(response.responseText, 'text/html');
                        const fileInputs = doc.querySelectorAll(
                            'input[type="file"][name*="poster[optional][movie-"]'
                        );

                        const movies = [];
                        const seen = new Set();

                        fileInputs.forEach(input => {
                            const container = input.closest('.col-sm-12');
                            const labelElement = container
                                ? container.querySelector('label strong strong')
                                : null;
                            const parentLabel = labelElement
                                ? labelElement.closest('label')
                                : null;

                            if (!parentLabel) return;

                            const fullText = parentLabel.textContent.trim();
                            const titleMatch = fullText.match(
                                /^(.+?)\s+\((\d{4}|N\/A)\)$/
                            );

                            if (!titleMatch) {
                                log(`-- WARNING: Could not parse: "${fullText}"`);
                                return;
                            }

                            const title = titleMatch[1].trim();
                            const year = titleMatch[2];

                            const key = `${normalizeMovieTitle(title)}|${year}`;

                            if (seen.has(key)) {
                                log(`-- Skipping duplicate TPDB entry: ${fullText}`);
                                return;
                            }

                            seen.add(key);
                            movies.push({ title, year });
                        });

                        log(`-- Found ${movies.length} unique TPDB movies`);
                        resolve(movies);
                    } catch (e) {
                        console.error(
                            "[TPDB Script ERROR] Error parsing upload page:",
                            e
                        );
                        resolve([]);
                    }
                },
                onerror: function() {
                    resolve([]);
                }
            });
        });
    }


    /**
     * Look up a real TMDb movie ID by searching the TMDb API for title + year.
     * For N/A-year movies the year filter is omitted.
     * Resolves to the TMDb ID (number) or null if not found.
     */

    function resolveTmdbId(title, year) {
        return new Promise((resolve) => {
            const yearParam = (year && year !== 'N/A')
                ? `&year=${encodeURIComponent(year)}`
                : '';

            const url =
                `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}` +
                `&query=${encodeURIComponent(title)}${yearParam}` +
                `&language=en-US&include_adult=true`;

            GM_xmlhttpRequest({
                method: "GET",
                url: url,
                onload: function(response) {
                    try {
                        const data = JSON.parse(response.responseText);
                        const results = data.results || [];

                        const normalizedTitle = normalizeMovieTitle(title);

                        const exactMatches = results.filter(movie =>
                            normalizeMovieTitle(movie.title || '') === normalizedTitle
                        );

                        if (exactMatches.length === 0) {
                            log(`-- No exact TMDb title match: "${title}"`);
                            resolve(null);
                            return;
                        }

                        // Prefer a matching release year when one is known.
                        let best = exactMatches[0];

                        if (year && year !== 'N/A') {
                            const yearMatch = exactMatches.find(movie =>
                                movie.release_date &&
                                movie.release_date.substring(0, 4) === year
                            );

                            if (yearMatch) {
                                best = yearMatch;
                            }
                        }

                        log(`-- Exact TMDb title match: "${title}" → ${best.id}`);
                        resolve(best.id);
                    } catch (e) {
                        console.error(
                            "[TPDB Script ERROR] Error parsing TMDb search:",
                            e
                        );
                        resolve(null);
                    }
                },
                onerror: function() {
                    resolve(null);
                }
            });
        });
    }

    /**
     * Resolve real TMDb IDs for every movie in a TPDB-parsed list, then render the list.
     * Movies where no TMDb ID can be found still appear but link to a title-based search.
     */
    function fetchTPDBCollectionData(collectionId, buttonContainer) {
        log(`-- FALLBACK: Using TPDB-only collection data for collection ID: ${collectionId}`);

        fetchTPDBMovies(collectionId).then(movies => {
            if (movies.length === 0) {
                log("-- FALLBACK FAILED: Could not parse movie data from upload page");
                const container = document.createElement('div');
                container.innerHTML = `<h5><p style="color: orange; margin-top: 20px;">Collection exists on ThePosterDB but movie list could not be parsed</p></h5>`;
                buttonContainer.after(container);
                return;
            }

            // Resolve real TMDb IDs in parallel for all movies
            Promise.all(movies.map(movie =>
                resolveTmdbId(movie.title, movie.year).then(tmdbId => ({ ...movie, tmdbId }))
            )).then(resolvedMovies => {
                // Sort by year; N/A entries go to the end
                resolvedMovies.sort((a, b) => {
                    if (a.year === 'N/A' && b.year === 'N/A') return 0;
                    if (a.year === 'N/A') return 1;
                    if (b.year === 'N/A') return -1;
                    return parseInt(a.year) - parseInt(b.year);
                });

                const movieList = resolvedMovies.map(movie => {
                    const href = movie.tmdbId
                        ? `https://theposterdb.com/search/advanced/results?category=Movies&tmdb_id=${movie.tmdbId}`
                        : `https://theposterdb.com/search/advanced/results?category=Movies&search=${encodeURIComponent(movie.title)}`;
                    return `<li><a href="${href}" target="_blank">${movie.title} (${movie.year})</a></li>`;
                }).join('');

                const container = document.createElement('div');
                container.innerHTML = `
                    <div style="margin-top: 20px;">
                        <h5 style="margin-bottom: 10px;">Movies in this Collection (from ThePosterDB)</h5>
                        <ul style="list-style-type: disc; padding-left: 20px;">${movieList}</ul>
                        <p style="font-size: 0.9em; color: #666; margin-top: 10px;"><em>Note: Collection data retrieved from ThePosterDB (TMDb data unavailable)</em></p>
                    </div>
                `;
                buttonContainer.after(container);
                log("-- DOM UPDATE: TPDB fallback movie list added successfully.");
            });
        });
    }

    // Display combined TMDb and TPDB movies with TPDB-only entries highlighted

    function displayCombinedCollection(tmdbMovies, tpdbMovies, buttonContainer) {
        log(`-- Combining TMDb (${tmdbMovies.length}) and TPDB (${tpdbMovies.length}) movie lists`);

        // Remove duplicate TMDb entries by ID.
        const uniqueTmdbMovies = Array.from(
            new Map(tmdbMovies.map(movie => [movie.id, movie])).values()
        );

        // Build normalized TMDb title/year records.
        const tmdbRecords = uniqueTmdbMovies.map(movie => ({
            title: normalizeMovieTitle(movie.title || ''),
            year: movie.release_date
                ? movie.release_date.substring(0, 4)
                : ''
        }));

        // Remove repeated TPDB title/year entries.
        const seenTpdb = new Set();

        const uniqueTpdbMovies = tpdbMovies.filter(movie => {
            const key =
                `${normalizeMovieTitle(movie.title)}|${movie.year || 'N/A'}`;

            if (seenTpdb.has(key)) {
                log(`-- Removing duplicate TPDB entry: ${movie.title} (${movie.year})`);
                return false;
            }

            seenTpdb.add(key);
            return true;
        });

        // Keep only TPDB entries that are not already represented in TMDb.
        const tpdbOnlyMovies = uniqueTpdbMovies.filter(movie => {
            const title = normalizeMovieTitle(movie.title);
            const year = movie.year && movie.year !== 'N/A'
                ? movie.year
                : '';

            const isInTmdb = tmdbRecords.some(record => {
                if (record.title !== title) return false;

                // If both years are known, require the years to match.
                // If either year is unknown, matching titles are sufficient.
                return !year || !record.year || year === record.year;
            });

            log(`-- Checking "${movie.title}" (${movie.year}): already in TMDb = ${isInTmdb}`);
            return !isInTmdb;
        });

        log(`-- Unique TMDb movies: ${uniqueTmdbMovies.length}`);
        log(`-- Additional TPDB movies: ${tpdbOnlyMovies.length}`);

        // Render the TMDb movies first.
        const tmdbMovieList = [...uniqueTmdbMovies]
            .sort((a, b) => {
                const dateA = a.release_date || '9999-99-99';
                const dateB = b.release_date || '9999-99-99';
                return dateA.localeCompare(dateB);
            })
            .map(movie => {
                const year = movie.release_date
                    ? movie.release_date.substring(0, 4)
                    : 'N/A';

                return `<li><a href="https://theposterdb.com/search/advanced/results?category=Movies&tmdb_id=${movie.id}" target="_blank" rel="noopener noreferrer">${movie.title} (${year})</a></li>`;
            })
            .join('');

        // If no additional TPDB titles remain, display TMDb only.
        if (tpdbOnlyMovies.length === 0) {
            const container = document.createElement('div');

            container.innerHTML = `
                <div style="margin-top: 20px;">
                    <h5 style="margin-bottom: 10px;">
                        Movies in this Collection (from TMDb)
                    </h5>
                    <ul style="list-style-type: disc; padding-left: 20px;">
                        ${tmdbMovieList}
                    </ul>
                </div>
            `;

            buttonContainer.after(container);
            log("-- Displayed deduplicated TMDb collection.");
            return;
        }

        // Resolve IDs for genuine TPDB-only entries.
        Promise.all(
            tpdbOnlyMovies.map(movie =>
                resolveTmdbId(movie.title, movie.year)
                    .then(tmdbId => ({ ...movie, tmdbId }))
            )
        ).then(resolvedMovies => {
            resolvedMovies.sort((a, b) => {
                if (a.year === 'N/A' && b.year === 'N/A') return 0;
                if (a.year === 'N/A') return 1;
                if (b.year === 'N/A') return -1;
                return a.year.localeCompare(b.year);
            });

            const tpdbOnlyList = resolvedMovies.map(movie => {
                const href = movie.tmdbId
                    ? `https://theposterdb.com/search/advanced/results?category=Movies&tmdb_id=${movie.tmdbId}`
                    : `https://theposterdb.com/search/advanced/results?category=Movies&search=${encodeURIComponent(movie.title)}`;

                return `<li><a href="${href}" target="_blank" rel="noopener noreferrer">${movie.title} (${movie.year})</a> <span style="color: #ff9800; font-weight: bold;">(TPDB only)</span></li>`;
            }).join('');

            const container = document.createElement('div');

            container.innerHTML = `
                <div style="margin-top: 20px;">
                    <h5 style="margin-bottom: 10px;">
                        Movies in this Collection (from TMDb)
                    </h5>
                    <ul style="list-style-type: disc; padding-left: 20px;">
                        ${tmdbMovieList}${tpdbOnlyList}
                    </ul>
                    <p style="font-size: 0.9em; color: #666; margin-top: 10px;">
                        <em>${resolvedMovies.length} additional TPDB entry/entries not matched to the TMDb collection.</em>
                    </p>
                </div>
            `;

            buttonContainer.after(container);
            log("-- Displayed combined, deduplicated collection.");
        });
    }

    // Extract ThePosterDB collection ID from the upload button
    function getTPDBCollectionId() {
        const uploadButton = document.querySelector('a[href*="/upload/collection/"]');
        if (uploadButton) {
            const href = uploadButton.getAttribute('href');
            const match = href.match(/\/upload\/collection\/(\d+)/);
            if (match) {
                return match[1];
            }
        }
        return null;
    }

    // Function determines if this is a movie or show page
    function getMediaType() {
        const uploadButton = document.querySelector('a[href*="/upload/"]');
        if (uploadButton) {
            const href = uploadButton.getAttribute('href');
            if (href.includes('/upload/movie/')) {
                return 'movie';
            } else if (href.includes('/upload/show/')) {
                return 'show';
            }
        }
        return null;
    }

    // Use a MutationObserver to watch for when the main content is loaded.
    const observer = new MutationObserver((mutations, obs) => {

        // **Tuned Selectors:** Targeting more unique elements to ensure the observer fires
        const buttonContainer = document.querySelector('div.d-flex.flex-row.justify-content-center.flex-wrap'); // This holds the buttons (upload, request, etc.)
        const titleElem = document.querySelector('p.h1'); // This holds the movie title

        if (!buttonContainer) {
            log("Observer check: buttonContainer not yet found.");
            return;
        }
        if (!titleElem) {
            log("Observer check: titleElem not yet found.");
            return;
        }

        if (buttonContainer.classList.contains('script-run-collection')) {
            log("Observer check: Script already ran.");
            return;
        }

        // If we reach here, we've found the target elements for the first time
        obs.disconnect();
        buttonContainer.classList.add('script-run-collection');
        log("✔ Observer found all elements. Script initialization started.");

        const isCollectionPage = document.querySelector('a[href*="/upload/collection/"]');

        if (isCollectionPage) {
            // ==========================================================
            // === LOGIC FOR COLLECTION PAGES (Collection List) ===
            // ==========================================================
            log("Page Type: Collection page detected.");

            const collectionTitleElem = document.querySelector('p.h1 strong');
            const collectionTitle = collectionTitleElem?.innerText.trim();
            log(`Extracted Collection Title: ${collectionTitle}`);

            if (collectionTitle) {
                const encodedTitle = encodeURIComponent(collectionTitle);
                const searchUrl = `https://api.themoviedb.org/3/search/collection?api_key=${TMDB_API_KEY}&query=${encodedTitle}&language=en-US&include_adult=true`;
                log(`-- API CALL: Searching for collection: ${searchUrl}`);

                GM_xmlhttpRequest({
                    method: "GET",
                    url: searchUrl,
                    onload: function(response) {
                        try {
                            const searchData = JSON.parse(response.responseText);
                            const results = searchData.results;
                            log(`-- API RESPONSE: Search returned ${results ? results.length : 0} results.`);

                            if (results && results.length > 0) {
                                const bestMatch = results.find(result => result.name.trim().toLowerCase() === collectionTitle.toLowerCase());
                                if (bestMatch) {
                                    const tmdbCollectionId = bestMatch.id;
                                    log(`-- BEST MATCH FOUND: TMDB Collection ID: ${tmdbCollectionId}`);
                                    document.body.dataset.tmdbCollectionId = tmdbCollectionId;

                                    const collectionDetailsUrl = `https://api.themoviedb.org/3/collection/${tmdbCollectionId}?api_key=${TMDB_API_KEY}&language=en-US`;
                                    log(`-- API CALL: Fetching collection parts details: ${collectionDetailsUrl}`);

                                    GM_xmlhttpRequest({
                                        method: "GET",
                                        url: collectionDetailsUrl,
                                        onload: function(detailsResponse) {
                                            try {
                                                const detailsData = JSON.parse(detailsResponse.responseText);
                                                log(`-- API RESPONSE: Received collection parts data.`);

                                                if (detailsData && detailsData.parts && detailsData.parts.length > 0) {
                                                    // Now check TPDB for additional movies
                                                    const tpdbCollectionId = getTPDBCollectionId();
                                                    if (tpdbCollectionId) {
                                                        log(`-- Checking TPDB for additional movies...`);
                                                        fetchTPDBMovies(tpdbCollectionId).then(tpdbMovies => {
                                                            displayCombinedCollection(detailsData.parts, tpdbMovies, buttonContainer);
                                                        });
                                                    } else {
                                                        // No TPDB ID found, just display TMDb movies
                                                        log(`-- No TPDB collection ID found, displaying TMDb movies only`);
                                                        const movieList = detailsData.parts
                                                            .sort((a, b) => new Date(a.release_date) - new Date(b.release_date))
                                                            .map(movie => `<li><a href="https://theposterdb.com/search/advanced/results?category=Movies&tmdb_id=${movie.id}" target="_blank">${movie.title} (${movie.release_date ? movie.release_date.substring(0, 4) : 'N/A'})</a></li>`)
                                                            .join('');
                                                        const container = document.createElement('div');
                                                        container.innerHTML = `
                                                            <div style="margin-top: 20px;">
                                                                <h5 style="margin-bottom: 10px;">Movies in this Collection (from TMDb)</h5>
                                                                <ul style="list-style-type: disc; padding-left: 20px;">${movieList}</ul>
                                                            </div>
                                                        `;
                                                        buttonContainer.after(container);
                                                        log("-- DOM UPDATE: TMDb-only movie list added successfully.");
                                                    }
                                                } else {
                                                    // TMDb has the collection but no parts - try TPDB fallback
                                                    log("-- RESULT: Collection found on TMDb but has no movies, trying TPDB fallback...");
                                                    const tpdbCollectionId = getTPDBCollectionId();
                                                    if (tpdbCollectionId) {
                                                        fetchTPDBCollectionData(tpdbCollectionId, buttonContainer);
                                                    } else {
                                                        const container = document.createElement('div');
                                                        container.innerHTML = `<h5><p style="color: red; margin-top: 20px;">No movies found in this collection</p></h5>`;
                                                        buttonContainer.after(container);
                                                    }
                                                }
                                            } catch (e) {
                                                console.error("[TPDB Script ERROR] Error parsing collection details JSON:", e);
                                            }
                                        }
                                    });
                                } else {
                                    // No exact match on TMDb - try TPDB fallback
                                    log("-- RESULT: No exact collection name match found on TMDb, trying TPDB fallback...");
                                    const tpdbCollectionId = getTPDBCollectionId();
                                    if (tpdbCollectionId) {
                                        fetchTPDBCollectionData(tpdbCollectionId, buttonContainer);
                                    } else {
                                        const container = document.createElement('div');
                                        container.innerHTML = `<h5><p style="color: red; margin-top: 20px;">No collection found on TMDb that matches the title</p></h5>`;
                                        buttonContainer.after(container);
                                    }
                                }
                            } else {
                                // No TMDb results - try TPDB fallback
                                log("-- RESULT: TMDb Search returned no results, trying TPDB fallback...");
                                const tpdbCollectionId = getTPDBCollectionId();
                                if (tpdbCollectionId) {
                                    fetchTPDBCollectionData(tpdbCollectionId, buttonContainer);
                                } else {
                                    const container = document.createElement('div');
                                    container.innerHTML = `<h5><p style="color: red; margin-top: 20px;">No collection found on TMDb</p></h5>`;
                                    buttonContainer.after(container);
                                }
                            }
                        } catch (e) {
                            console.error("[TPDB Script ERROR] Error parsing collection search JSON:", e);
                        }
                    },
                    onerror: function(e) {
                        console.error("[TPDB Script ERROR] Error fetching from TMDb, trying TPDB fallback:", e);
                        const tpdbCollectionId = getTPDBCollectionId();
                        if (tpdbCollectionId) {
                            fetchTPDBCollectionData(tpdbCollectionId, buttonContainer);
                        }
                    }
                });
            } else {
                log("Collection Title not found.");
            }

        } else {
            // ======================================================
            // === LOGIC FOR MOVIE/SHOW PAGES (Collection Link) ===
            // ======================================================
            log("Page Type: Movie/Show page detected. Starting TMDB ID extraction.");

            let tmdbId = null;
            const mediaType = getMediaType();

            // RELIABLE METHOD: Target the element used for external media integration (JustWatch/TMDB)
            const mediaIdElement = document.querySelector('[data-media-source="tmdb"][data-media-id]');

            if (mediaIdElement) {
                tmdbId = mediaIdElement.dataset.mediaId;
                log(`✔ Found TMDB ID ${tmdbId} from data-media-id attribute.`);
                log(`✔ Detected media type: ${mediaType}`);
            } else {
                log("❌ Could not find reliable TMDB ID element ([data-media-source='tmdb'][data-media-id]).");
            }

            // Only proceed if this is a movie page (not a show)
            if (tmdbId && mediaType === 'movie') {
                if (Number.isInteger(Number(tmdbId))) {
                    fetchMovieDetails(tmdbId, buttonContainer, TMDB_API_KEY);
                } else {
                    console.error("[TPDB Script ERROR] Found TMDB ID is invalid:", tmdbId);
                }
            } else if (tmdbId && mediaType === 'show') {
                log("📺 This is a TV show page - skipping collection check.");
            } else {
                log("❌ Collection link cannot be created because TMDB ID was not found or media type is unknown.");
            }
        }
    });

    log("Script loaded. Starting MutationObserver.");
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
})();
