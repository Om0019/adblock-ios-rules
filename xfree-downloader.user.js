// ==UserScript==
// @name         Xfree Video Downloader
// @namespace    https://github.com/Om0019/adblock-ios-rules
// @version      1.0.0
// @description  Adds a beautiful, transparent blur download button to videos on xfree.com
// @author       Antigravity
// @match        *://*.xfree.com/*
// @grant        GM_download
// @grant        GM_setClipboard
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    // Prevent running in iframes
    if (window.self !== window.top) return;

    const STYLES = `
        .xfree-dl-btn {
            position: absolute;
            bottom: 30px;
            right: 20px;
            width: 48px;
            height: 48px;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.15);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.3);
            box-shadow: 0 4px 16px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            z-index: 2147483647;
            transition: transform 0.2s ease, background 0.2s ease;
        }
        .xfree-dl-btn:active {
            transform: scale(0.9);
            background: rgba(255, 255, 255, 0.3);
        }
        .xfree-dl-btn svg {
            width: 24px;
            height: 24px;
            fill: none;
            stroke: #ffffff;
            stroke-width: 2.5;
            stroke-linecap: round;
            stroke-linejoin: round;
            filter: drop-shadow(0 1px 2px rgba(0,0,0,0.5));
        }
        /* Make sure the wrapper is relatively positioned so the absolute button sits correctly */
        .video-container, [class*="video-wrapper"] {
            position: relative;
        }
    `;

    function injectStyles() {
        if (document.getElementById('xfree-dl-styles')) return;
        const style = document.createElement('style');
        style.id = 'xfree-dl-styles';
        style.textContent = STYLES;
        (document.head || document.documentElement).appendChild(style);
    }

    function createDownloadButton(videoElement) {
        // Find a suitable wrapper to attach the button to
        const wrapper = videoElement.parentElement;
        if (!wrapper) return;
        
        // Prevent adding multiple buttons to the same wrapper
        if (wrapper.dataset.hasXfreeDl) return;
        wrapper.dataset.hasXfreeDl = 'true';

        // Ensure the wrapper can contain absolute elements safely
        if (window.getComputedStyle(wrapper).position === 'static') {
            wrapper.style.position = 'relative';
        }

        const btn = document.createElement('div');
        btn.className = 'xfree-dl-btn';
        // Download Icon SVG
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

            let videoUrl = videoElement.src;
            if (!videoUrl) {
                const source = videoElement.querySelector('source');
                if (source) videoUrl = source.src;
            }

            if (!videoUrl || videoUrl.startsWith('blob:')) {
                alert('Cannot extract direct URL for this video (blob URL).');
                return;
            }

            // Flash animation for visual feedback
            btn.style.background = 'rgba(255, 255, 255, 0.6)';
            setTimeout(() => {
                btn.style.background = '';
            }, 200);

            // Copy to clipboard as fallback and trigger native download logic
            if (typeof GM_setClipboard !== 'undefined') {
                GM_setClipboard(videoUrl);
            }

            if (typeof GM_download !== 'undefined') {
                GM_download({
                    url: videoUrl,
                    name: \`xfree_video_\${new Date().getTime()}.mp4\`,
                    onerror: () => {
                        window.open(videoUrl, '_blank');
                    }
                });
            } else {
                // Standard fallback
                const a = document.createElement('a');
                a.href = videoUrl;
                a.download = \`xfree_video_\${new Date().getTime()}.mp4\`;
                a.target = '_blank';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            }
        });

        wrapper.appendChild(btn);
    }

    function init() {
        injectStyles();
        
        // Scan for existing videos
        document.querySelectorAll('video').forEach(createDownloadButton);

        // Watch for new videos being added as the user scrolls the feed
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.addedNodes.length) {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeName === 'VIDEO') {
                            createDownloadButton(node);
                        } else if (node.querySelectorAll) {
                            node.querySelectorAll('video').forEach(createDownloadButton);
                        }
                    });
                }
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
