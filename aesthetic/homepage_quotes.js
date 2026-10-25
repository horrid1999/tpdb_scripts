// ==UserScript==
// @name         TPDb Random Homepage Title
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Randomly changes homepage title text
// @match        https://theposterdb.com/
// @author       horrid1999
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

        const titles = [
            // Scarface & Gangster Classics
            'Say Hello to My Little Friend!',
            'The World Is Yours',
            'I\'m Gonna Make Him an Offer He Can\'t Refuse',

            // Jaws & Thrillers
            'You\'re Gonna Need a Bigger Boat',
            'Here\'s Johnny!',
            'I See Dead People',
            'Hello, Clarice',

            // Star Wars
            'May the Force Be With You',
            'No... I Am Your Father',
            'Hello There!',
            'This Is the Way',

            // Sci-Fi & Action
            'I\'ll Be Back',
            'To Infinity and Beyond!',
            'Welcome to Jurassic Park',
            'Houston, We Have a Problem',
            'Roads? Where We\'re Going, We Don\'t Need Roads.',
            'Hasta La Vista, Baby',
            'There Is No Spoon',

            // Iconic Movie Lines
            'Why So Serious?',
            'You Shall Not Pass!',
            'The First Rule of Fight Club',
            'Nobody Puts Baby in a Corner',
            'You Can\'t Handle the Truth!',
            'Keep Your Friends Close, but Your Enemies Closer',
            'Frankly My Dear, I Don\'t Give a Damn',
            'Toto, I\'ve a Feeling We\'re Not in Kansas Anymore',
            'Show Me the Money!',
            'I Love the Smell of Napalm in the Morning',

            // Television & Pop Culture
            'Winter Is Coming',
            'I Am the One Who Knocks',
            'Live Long and Prosper',
            'The Truth Is Out There',
            'The Dude Abides',
            'Well That\'s Just Your Opinion, Man',
            'Bazinga!',
            'D\'oh!',
        ];

    window.addEventListener('load', () => {
        const title = document.querySelector('h1');

        if (title && title.textContent.includes('The Best Media Poster Database')) {
            const randomTitle = titles[Math.floor(Math.random() * titles.length)];
            title.textContent = randomTitle;
        }
    });
})();
