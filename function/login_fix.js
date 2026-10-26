// ==UserScript==
// @name         ThePosterDB: Forced Login Refresh
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Uses event delegation to force a redirect after clicking Login
// @author       horrid1999
// @match        https://theposterdb.com/login*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Set to true to enable console debugging logs, or false to silence them
    const DEBUG = false;

    // Helper logging functions
    const log = (...args) => {
        if (DEBUG) console.log(...args);
    };
    const warn = (...args) => {
        if (DEBUG) console.warn(...args);
    };

    // We'll attach one single listener to the document body
    // and check if the clicked element matches our button.
    document.addEventListener('click', function(event) {
        // Find the login button using your existing selector
        const loginButtonSelector = 'button[type="submit"].btn.btn-primary.font-weight-bold';
        const clickedElement = event.target;

        // Check if the clicked element IS the login button, or a child of it
        // (sometimes the text inside the button is clicked, not the button itself)
        const loginButton = clickedElement.closest(loginButtonSelector);

        if (loginButton) {
            // This means our login button was clicked!
            log("ThePosterDB: Login button clicked via event delegation.");

            // Prevent the default form submission immediately.
            // This is crucial to prevent native navigation and allow our script to control.
            event.preventDefault();

            // Change button text and disable it
            if (loginButton) { // Ensure it's still there
                loginButton.textContent = 'Signing in...';
                loginButton.disabled = true;
            }

            // Manually submit the form to initiate the login process.
            // This will send your credentials to the server.
            const loginForm = loginButton.closest('form');
            if (loginForm) {
                log("ThePosterDB: Manually submitting login form via delegation.");
                loginForm.submit(); // Perform the POST request
            } else {
                warn("ThePosterDB: Login form not found for manual submission via delegation.");
            }

            // After a very short delay (since you said login is fast), force the redirect.
            setTimeout(function() {
                log("ThePosterDB: Forcing redirect to https://theposterdb.com/ after delegation.");
                window.location.replace("https://theposterdb.com/");
            }, 2000); // (2 seconds) delay

        } else {
            // This click was not on the login button, so do nothing.
        }
    }, true); // Attach this listener in the CAPTURE phase to ensure it fires early.

    log("ThePosterDB: Event delegation listener attached to document body in capture phase.");

})();
