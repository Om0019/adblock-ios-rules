// ==UserScript==
// @name         X-Video Tube Video Downloader
// @namespace    https://github.com/Om0019/adblock-ios-rules
// @version      1.0.0
// @description  Adds high-quality MP4 download buttons and direct video download options to x-video.tube
// @author       Antigravity
// @match        https://x-video.tube/*
// @match        https://*.x-video.tube/*
// @icon         https://x-video.tube/favicon-32x32.png
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function () {
    'use strict';

    // CSS Styling for the download button and menu
    const STYLES = `
        .xv-download-btn-wrapper {
            display: inline-flex;
            align-items: center;
            margin-left: 10px;
            position: relative;
            vertical-align: middle;
        }
        .xv-download-btn {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            background: linear-gradient(135deg, #e50914, #b80710);
            color: #ffffff !important;
            font-weight: 700;
            font-size: 14px;
            padding: 8px 16px;
            border-radius: 4px;
            text-decoration: none !important;
            border: none;
            cursor: pointer;
            box-shadow: 0 2px 8px rgba(229, 9, 20, 0.4);
            transition: all 0.2s ease;
        }
        .xv-download-btn:hover {
            background: linear-gradient(135deg, #ff1a25, #d60813);
            box-shadow: 0 4px 12px rgba(229, 9, 20, 0.6);
            transform: translateY(-1px);
        }
        .xv-download-btn svg {
            width: 16px;
            height: 16px;
            fill: currentColor;
        }
        .xv-quality-badge {
            background: rgba(0, 0, 0, 0.35);
            font-size: 11px;
            padding: 2px 6px;
            border-radius: 3px;
            letter-spacing: 0.5px;
        }
        .xv-download-dropdown {
            display: none;
            position: absolute;
            top: 100%;
            left: 0;
            margin-top: 6px;
            background: #1c1c1c;
            border: 1px solid #333333;
            border-radius: 4px;
            box-shadow: 0 6px 16px rgba(0,0,0,0.8);
            z-index: 99999;
            min-width: 180px;
        }
        .xv-download-dropdown.show {
            display: block;
        }
        .xv-download-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 10px 14px;
            color: #dddddd !important;
            text-decoration: none !important;
            font-size: 13px;
            border-bottom: 1px solid #292929;
            transition: background 0.15s ease;
        }
        .xv-download-item:last-child {
            border-bottom: none;
        }
        .xv-download-item:hover {
            background: #e50914;
            color: #ffffff !important;
        }
    `;

    function injectStyles() {
        if (document.getElementById('xv-downloader-styles')) return;
        const style = document.createElement('style');
        style.id = 'xv-downloader-styles';
        style.textContent = STYLES;
        document.head.appendChild(style);
    }

    // Extract video stream URLs from scripts and DOM
    function extractVideoData() {
        const videoData = {
            title: document.title.replace(/ - Free porn tube.*$/i, '').trim() || 'video',
            sources: []
        };

        // 1. Try window.player_obj
        try {
            if (window.player_obj && window.player_obj.conf) {
                const conf = window.player_obj.conf;
                if (conf.video_title) videoData.title = conf.video_title;
                if (conf.video_url) {
                    videoData.sources.push({
                        label: conf.video_url_fhd ? '1080p FHD' : 'HD (720p/1080p)',
                        url: conf.video_url
                    });
                }
                if (conf.video_alt_url) {
                    videoData.sources.push({
                        label: 'SD Quality',
                        url: conf.video_alt_url
                    });
                }
            }
        } catch (e) {
            console.debug('Error reading player_obj:', e);
        }

        // 2. Scan inline scripts for video_url patterns if player_obj is not yet ready
        if (videoData.sources.length === 0) {
            const scripts = document.querySelectorAll('script:not([src])');
            for (const script of scripts) {
                const text = script.textContent;
                if (text.includes('video_url')) {
                    const urlMatch = text.match(/video_url:\s*['"]([^'"]+)['"]/);
                    const titleMatch = text.match(/video_title:\s*['"]([^'"]+)['"]/);
                    const altMatch = text.match(/video_alt_url:\s*['"]([^'"]+)['"]/);
                    const isFhd = text.includes("video_url_fhd: '1'") || text.includes('video_url_fhd: "1"');

                    if (titleMatch && titleMatch[1]) {
                        videoData.title = titleMatch[1];
                    }
                    if (urlMatch && urlMatch[1]) {
                        videoData.sources.push({
                            label: isFhd ? '1080p FHD' : 'HD Quality',
                            url: urlMatch[1]
                        });
                    }
                    if (altMatch && altMatch[1]) {
                        videoData.sources.push({
                            label: 'SD Quality',
                            url: altMatch[1]
                        });
                    }
                    break;
                }
            }
        }

        // 3. Try standard <video> tags in DOM
        if (videoData.sources.length === 0) {
            const videoEl = document.querySelector('video[src]');
            if (videoEl && videoEl.src) {
                videoData.sources.push({
                    label: 'Direct MP4',
                    url: videoEl.src
                });
            }
        }

        return videoData;
    }

    // Trigger direct file download
    function downloadFile(url, filename) {
        const cleanName = (filename || 'video').replace(/[/\\?%*:|"<>]/g, '_') + '.mp4';
        const a = document.createElement('a');
        a.href = url;
        a.download = cleanName;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    // Inject download button on video page
    function initVideoPageDownloader() {
        if (document.getElementById('xv-download-button')) return;

        const targetContainer = document.querySelector('.info-bar .vote-block') ||
                                document.querySelector('.info-bar') ||
                                document.querySelector('.player-holder') ||
                                document.querySelector('.headline');

        if (!targetContainer) return;

        const videoData = extractVideoData();
        if (!videoData.sources || videoData.sources.length === 0) {
            // Retry after player scripts initialize
            setTimeout(initVideoPageDownloader, 800);
            return;
        }

        injectStyles();

        const wrapper = document.createElement('div');
        wrapper.className = 'xv-download-btn-wrapper';
        wrapper.id = 'xv-download-button';

        const mainSource = videoData.sources[0];

        wrapper.innerHTML = `
            <a class="xv-download-btn" href="${mainSource.url}" target="_blank" download="${videoData.title.replace(/[/\\?%*:|"<>]/g, '_')}.mp4">
                <svg viewBox="0 0 24 24">
                    <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z"/>
                </svg>
                <span>Download MP4</span>
                <span class="xv-quality-badge">${mainSource.label}</span>
            </a>
        `;

        // If multiple qualities are available, add dropdown menu
        if (videoData.sources.length > 1) {
            const dropdown = document.createElement('div');
            dropdown.className = 'xv-download-dropdown';
            dropdown.innerHTML = videoData.sources.map(s => `
                <a href="${s.url}" class="xv-download-item" download="${videoData.title}.mp4" target="_blank">
                    <span>${s.label}</span>
                    <span>⬇️</span>
                </a>
            `).join('');

            wrapper.appendChild(dropdown);
            wrapper.addEventListener('mouseenter', () => dropdown.classList.add('show'));
            wrapper.addEventListener('mouseleave', () => dropdown.classList.remove('show'));
        }

        // Intercept download click for cleaner filename triggering
        const btn = wrapper.querySelector('.xv-download-btn');
        btn.addEventListener('click', function (e) {
            e.stopPropagation();
        });

        targetContainer.appendChild(wrapper);
    }

    // Initialize on page load and on dynamic URL changes
    function run() {
        if (window.location.pathname.includes('/video/') || document.querySelector('#kt_player')) {
            initVideoPageDownloader();
            // In case player loads lazily
            setTimeout(initVideoPageDownloader, 1000);
            setTimeout(initVideoPageDownloader, 2500);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', run);
    } else {
        run();
    }

    // Monitor SPA navigation if any
    let lastUrl = location.href;
    new MutationObserver(() => {
        const url = location.href;
        if (url !== lastUrl) {
            lastUrl = url;
            run();
        }
    }).observe(document, { subtree: true, childList: true });

})();
