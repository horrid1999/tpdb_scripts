// ==UserScript==
// @name         ThePosterDB: Bulk Tab Opener (Minimized)
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  Minimized multi-tab opener: Opens top # search results, each in new tabs
// @match        https://theposterdb.com/search*
// @author       horrid1999
// @grant        none
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';

    const container = document.createElement('div');
    container.style.cssText = `
        position: fixed;
        top: 55px;
        right: 20px;
        z-index: 10000;
        font-family: Arial, sans-serif;
    `;

    const toggleBtn = document.createElement('div');
    toggleBtn.innerHTML = '+';
    toggleBtn.style.cssText = `
        width: 30px;
        height: 30px;
        background: #111111;
        color: #888888;
        border: 1px solid #333;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        font-size: 20px;
        font-weight: bold;
        transition: all 0.2s;
    `;

    const panel = document.createElement('div');
    panel.style.cssText = `
        display: none;
        background: #111111;
        padding: 15px;
        border-radius: 8px;
        border: 1px solid #333;
        box-shadow: 0 4px 12px rgba(0,0,0,0.5);
        color: #888888;
        width: 180px;
        margin-top: 5px;
    `;
    panel.innerHTML = `
        <div style="margin-bottom: 10px; font-weight: bold; font-size: 14px;">Open Results</div>
        <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 10px;">
            <label style="font-size: 12px;">Count:</label>
            <input type="number" id="tabCount" value="10" min="1" max="50"
                   style="width: 50px; padding: 3px; border-radius: 4px; border: 1px solid #333; background: #000; color: #888888;">
        </div>
        <button id="openTabsBtn" style="
            width: 100%;
            padding: 8px;
            background: #222;
            border: 1px solid #444;
            border-radius: 4px;
            color: #888888;
            cursor: pointer;
            font-size: 13px;
            font-weight: bold;
        ">Open Tabs</button>
        <div id="statusMsg" style="margin-top: 8px; font-size: 11px;"></div>
    `;

    toggleBtn.onclick = () => {
        const isHidden = panel.style.display === 'none';
        panel.style.display = isHidden ? 'block' : 'none';
        toggleBtn.innerHTML = isHidden ? '−' : '+';
    };

    container.appendChild(toggleBtn);
    container.appendChild(panel);
    document.body.appendChild(container);

    const openBtn = panel.querySelector('#openTabsBtn');
    openBtn.addEventListener('mouseenter', () => { openBtn.style.background = '#333'; });
    openBtn.addEventListener('mouseleave', () => { openBtn.style.background = '#222'; });

   openBtn.addEventListener('click', () => {
        const count = parseInt(document.getElementById('tabCount').value);
        const statusMsg = document.getElementById('statusMsg');

        const allLinks = document.querySelectorAll('a[href*="theposterdb.com/posters/"]');
        const posterLinks = [...allLinks].filter(a => /\/posters\/\d+$/.test(a.href));

        if (posterLinks.length === 0) {
            statusMsg.textContent = 'No results found';
            return;
        }

        const uniqueLinks = [...new Map(posterLinks.map(a => [a.href, a])).values()];
        const actualCount = Math.min(count, uniqueLinks.length);
        statusMsg.textContent = `Opening ${actualCount} of ${uniqueLinks.length}...`;

        for (let i = 0; i < actualCount; i++) {
            window.open(uniqueLinks[i].href, '_blank');
        }
    });
})();
