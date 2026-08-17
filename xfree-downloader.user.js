// ==UserScript==
// @name         Xfree Video Downloader
// @namespace    https://github.com/Om0019/adblock-ios-rules
// @version      1.3.0
// @description  Adds a beautiful, transparent blur global download button to xfree.com
// @author       Antigravity
// @match        *://*.xfree.com/*
// @match        *://xfree.com/*
// @grant        GM_download
// @grant        GM_setClipboard
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    if (window.self !== window.top) return;

    const STYLES = `
        .xfree-dl-global-btn {
            position: fixed !important;
            top: 50% !important;
            left: 15px !important;
            transform: translateY(-50%) !important;
            width: 44px !important;
            height: 44px !important;
            border-radius: 50% !important;
            background: rgba(20, 20, 20, 0.4) !important;
            backdrop-filter: blur(16px) !important;
            -webkit-backdrop-filter: blur(16px) !important;
            border: 1px solid rgba(255, 255, 255, 0.4) !important;
            box-shadow: 0 4px 20px rgba(0,0,0,0.5) !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            cursor: pointer !important;
            z-index: 2147483647 !important;
            transition: background 0.2s ease !important;
        }
        .xfree-dl-global-btn:active {
            background: rgba(255, 255, 255, 0.3) !important;
        }
        .xfree-dl-global-btn svg {
            width: 20px !important;
            height: 20px !important;
            fill: none !important;
            stroke: #ffffff !important;
            stroke-width: 2.5 !important;
            stroke-linecap: round !important;
            stroke-linejoin: round !important;
            filter: drop-shadow(0 1px 2px rgba(0,0,0,0.5)) !important;
        }
    `;

    function injectStyles() {
        if (document.getElementById('xfree-dl-styles')) return;
        const style = document.createElement('style');
        style.id = 'xfree-dl-styles';
        style.textContent = STYLES;
        (document.head || document.documentElement).appendChild(style);
    }

    function getActiveVideo() {
        const videos = Array.from(document.querySelectorAll('video'));
        if (videos.length === 0) return null;

        let active = videos.find(v => !v.paused && !v.ended && v.readyState > 2);
        
        if (!active) {
            let maxArea = 0;
            for (const v of videos) {
                const rect = v.getBoundingClientRect();
                const visibleHeight = Math.max(0, Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0));
                const visibleWidth = Math.max(0, Math.min(rect.right, window.innerWidth) - Math.max(rect.left, 0));
                const area = visibleHeight * visibleWidth;
                if (area > maxArea) {
                    maxArea = area;
                    active = v;
                }
            }
        }
        return active;
    }

    function ensureButtonExists() {
        injectStyles();
        
        if (document.getElementById('xfree-global-dl')) return;

        const btn = document.createElement('div');
        btn.id = 'xfree-global-dl';
        btn.className = 'xfree-dl-global-btn';
        btn.innerHTML = \`
            <svg viewBox="0 0 24 24">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
        \`;

        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            const videoElement = getActiveVideo();
            if (!videoElement) {
                alert('No active video found on screen.');
                return;
            }

            let videoUrl = videoElement.src;
            if (!videoUrl) {
                const source = videoElement.querySelector('source');
                if (source) videoUrl = source.src;
            }

            if (!videoUrl || videoUrl.startsWith('blob:')) {
                alert('Cannot extract direct URL for this video (it might be a blob or hidden stream).');
                return;
            }

            btn.style.background = 'rgba(255, 255, 255, 0.6)';
            setTimeout(() => {
                btn.style.background = '';
            }, 200);

            if (typeof GM_setClipboard !== 'undefined') {
                GM_setClipboard(videoUrl);
            }

            if (typeof GM_download !== 'undefined') {
                GM_download({
                    url: videoUrl,
                    name: \`xfree_\${new Date().getTime()}.mp4\`,
                    onerror: () => {
                        window.open(videoUrl, '_blank');
                    }
                });
            } else {
                const a = document.createElement('a');
                a.href = videoUrl;
                a.download = \`xfree_\${new Date().getTime()}.mp4\`;
                a.target = '_blank';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            }
        });

        document.body.appendChild(btn);
    }

    // Run interval to ensure button survives Vue.js DOM wipes
    setInterval(ensureButtonExists, 1000);
    ensureButtonExists();
})();
