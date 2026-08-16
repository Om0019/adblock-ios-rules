// ==UserScript==
// @name         Universal Floating Video Downloader & Stream Extractor
// @namespace    https://github.com/Om0019/adblock-ios-rules
// @version      7.0.0
// @description  Attaches a sleek floating download button over any HTML5 video element on ANY website across the web
// @author       Antigravity
// @match        *://*/*
// @icon         https://raw.githubusercontent.com/Om0019/adblock-ios-rules/main/icon.png
// @grant        GM_xmlhttpRequest
// @grant        GM.xmlHttpRequest
// @grant        GM_setClipboard
// @connect      *
// @run-at       document-end
// ==/UserScript==

(function () {
    'use strict';

    // Prevent running inside tiny tracking iframes
    if (window.self !== window.top) {
        if (window.innerWidth < 100 || window.innerHeight < 100) return;
    }

    const STYLES = `
        /* =========================================
           UNIVERSAL FLOATING VIDEO DOWNLOAD BUTTON
           ========================================= */
        .xv-universal-video-wrapper {
            position: relative !important;
            display: inline-block !important;
        }

        .xv-universal-float-btn {
            position: absolute !important;
            top: 10px !important;
            right: 10px !important;
            z-index: 2147483647 !important;
            width: 36px !important;
            height: 36px !important;
            border-radius: 50% !important;
            background: rgba(18, 18, 18, 0.85) !important;
            backdrop-filter: blur(8px) !important;
            -webkit-backdrop-filter: blur(8px) !important;
            border: 1.5px solid #e50914 !important;
            color: #ffffff !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            cursor: pointer !important;
            box-shadow: 0 4px 14px rgba(0, 0, 0, 0.7) !important;
            transition: transform 0.2s ease, background 0.2s ease, opacity 0.2s ease !important;
            text-decoration: none !important;
            padding: 0 !important;
            margin: 0 !important;
            opacity: 0.85 !important;
            pointer-events: auto !important;
            box-sizing: border-box !important;
            line-height: 1 !important;
        }

        .xv-universal-float-btn:hover {
            opacity: 1 !important;
            transform: scale(1.12) !important;
            background: #e50914 !important;
            border-color: #ffffff !important;
            box-shadow: 0 6px 18px rgba(229, 9, 20, 0.6) !important;
        }

        .xv-universal-float-btn svg {
            width: 17px !important;
            height: 17px !important;
            fill: #ffffff !important;
            pointer-events: none !important;
        }

        /* Toast notification */
        .xv-universal-toast {
            position: fixed !important;
            bottom: 24px !important;
            left: 50% !important;
            transform: translateX(-50%) !important;
            background: rgba(18, 18, 18, 0.95) !important;
            color: #ffffff !important;
            border: 1px solid #e50914 !important;
            padding: 10px 20px !important;
            border-radius: 30px !important;
            box-shadow: 0 8px 28px rgba(0, 0, 0, 0.85) !important;
            font-size: 13px !important;
            font-weight: 600 !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
            z-index: 2147483647 !important;
            text-align: center !important;
            max-width: 90vw !important;
            pointer-events: none !important;
            animation: xvUniversalFade 0.25s ease-out !important;
        }

        @keyframes xvUniversalFade {
            from { opacity: 0; transform: translate(-50%, 12px); }
            to { opacity: 1; transform: translate(-50%, 0); }
        }

        /* =========================================
           THUMBNAIL CARDS (FOR TUBE/MEDIA SITES)
           ========================================= */
        .xv-thumb-float-badge {
            position: absolute !important;
            top: 6px !important;
            right: 6px !important;
            z-index: 9999 !important;
            width: 30px !important;
            height: 30px !important;
            border-radius: 50% !important;
            background: rgba(15, 15, 15, 0.85) !important;
            backdrop-filter: blur(4px) !important;
            -webkit-backdrop-filter: blur(4px) !important;
            border: 1px solid rgba(229, 9, 20, 0.85) !important;
            color: #ffffff !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            cursor: pointer !important;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.6) !important;
            transition: all 0.2s ease !important;
            text-decoration: none !important;
            opacity: 0.85 !important;
        }

        .xv-thumb-float-badge:hover {
            opacity: 1 !important;
            transform: scale(1.12) !important;
            background: #e50914 !important;
            border-color: #ffffff !important;
        }

        .xv-thumb-float-badge svg {
            width: 14px !important;
            height: 14px !important;
            fill: #ffffff !important;
            pointer-events: none !important;
        }
    `;

    function injectStyles() {
        if (document.getElementById('xv-universal-styles')) return;
        const style = document.createElement('style');
        style.id = 'xv-universal-styles';
        style.textContent = STYLES;
        (document.head || document.documentElement).appendChild(style);
    }

    function showToast(msg) {
        const old = document.querySelector('.xv-universal-toast');
        if (old) old.remove();
        const toast = document.createElement('div');
        toast.className = 'xv-universal-toast';
        toast.textContent = msg;
        (document.body || document.documentElement).appendChild(toast);
        setTimeout(() => toast.remove(), 3200);
    }

    function copyToClipboard(text) {
        if (typeof GM_setClipboard !== 'undefined') {
            GM_setClipboard(text);
            return true;
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text);
            return true;
        }
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        return true;
    }

    // Resolve direct stream URL from any <video> element
    function getVideoSource(videoEl) {
        if (!videoEl) return null;

        // 1. Direct src attribute
        if (videoEl.currentSrc && !videoEl.currentSrc.startsWith('blob:')) {
            return videoEl.currentSrc;
        }
        if (videoEl.src && !videoEl.src.startsWith('blob:')) {
            return videoEl.src;
        }

        // 2. Child <source> elements
        const sources = videoEl.querySelectorAll('source');
        for (const s of sources) {
            const src = s.getAttribute('src');
            if (src && !src.startsWith('blob:')) return src;
        }

        // 3. Fallback to currentSrc even if blob
        if (videoEl.currentSrc) return videoEl.currentSrc;
        if (videoEl.src) return videoEl.src;

        return null;
    }

    function getCleanFilename() {
        const title = (document.title || 'video').replace(/[/\\?%*:|"<>]/g, '_').trim();
        return title.substring(0, 100) + '.mp4';
    }

    // Attach floating download button to a video element
    function attachButtonToVideo(video) {
        if (video.dataset.xvHasFloatBtn === 'true') return;
        video.dataset.xvHasFloatBtn = 'true';

        // Find best container
        let container = video.parentElement;
        if (!container) return;

        // If parent is a tiny wrapper, look one level higher
        if (container.offsetWidth < 60 && container.parentElement) {
            container = container.parentElement;
        }

        const compPos = window.getComputedStyle(container).position;
        if (compPos === 'static') {
            container.style.position = 'relative';
        }

        const btn = document.createElement('div');
        btn.className = 'xv-universal-float-btn';
        btn.title = 'Click to Download | Long press/Right-click to Copy Stream URL';
        btn.innerHTML = `
            <svg viewBox="0 0 24 24"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z"/></svg>
        `;

        // Click Handler (Download)
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            const src = getVideoSource(video);
            if (!src) {
                showToast('⚠️ Searching video source...');
                setTimeout(() => {
                    const retrySrc = getVideoSource(video);
                    if (retrySrc) triggerDownload(retrySrc);
                    else showToast('❌ Video stream URL not accessible.');
                }, 800);
                return;
            }

            triggerDownload(src);
        });

        // Context menu / Right click (Copy Stream URL)
        btn.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const src = getVideoSource(video);
            if (src) {
                copyToClipboard(src);
                showToast('📋 Direct video URL copied to clipboard!');
            }
        });

        // Long press support for touch devices
        let pressTimer = null;
        btn.addEventListener('touchstart', (e) => {
            pressTimer = setTimeout(() => {
                const src = getVideoSource(video);
                if (src) {
                    copyToClipboard(src);
                    showToast('📋 Video URL copied to clipboard!');
                }
            }, 700);
        });
        btn.addEventListener('touchend', () => clearTimeout(pressTimer));

        function triggerDownload(url) {
            const filename = getCleanFilename();
            showToast('⬇️ Starting video download...');
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.target = '_blank';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }

        container.appendChild(btn);
    }

    // Attach to thumbnail items on tube & media sites
    function scanThumbnails() {
        const items = document.querySelectorAll('.item.thumb:not(.xv-has-float-badge), .video-item:not(.xv-has-float-badge), [data-video-id]:not(.xv-has-float-badge)');
        items.forEach(item => {
            const imgHolder = item.querySelector('.img-holder, .thumb, .preview, .thumbnail');
            const link = item.querySelector('a[href*="/video/"], a[href*="/watch"]');
            if (!imgHolder || !link) return;

            item.classList.add('xv-has-float-badge');
            const badge = document.createElement('div');
            badge.className = 'xv-thumb-float-badge';
            badge.title = 'Download video';
            badge.innerHTML = `
                <svg viewBox="0 0 24 24"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z"/></svg>
            `;

            badge.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();

                const href = link.getAttribute('href');
                const fullUrl = href.startsWith('http') ? href : window.location.origin + href;
                showToast('⚡ Extracting video stream...');

                try {
                    const res = await fetch(fullUrl);
                    const html = await res.text();
                    const match = html.match(/video_url:\s*['"]([^'"]+)['"]/) ||
                                  html.match(/video_alt_url:\s*['"]([^'"]+)['"]/) ||
                                  html.match(/source\s*src=['"]([^'"]+\.mp4[^'"]*)['"]/);

                    if (match && match[1]) {
                        const titleMatch = html.match(/video_title:\s*['"]([^'"]+)['"]/);
                        const title = (titleMatch && titleMatch[1]) ? titleMatch[1] : (link.getAttribute('title') || 'video');
                        const a = document.createElement('a');
                        a.href = match[1];
                        a.download = title.replace(/[/\\?%*:|"<>]/g, '_') + '.mp4';
                        a.target = '_blank';
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        showToast(`⬇️ Downloading video...`);
                    } else {
                        window.location.href = fullUrl;
                    }
                } catch (err) {
                    window.location.href = fullUrl;
                }
            });

            if (window.getComputedStyle(imgHolder).position === 'static') {
                imgHolder.style.position = 'relative';
            }
            imgHolder.appendChild(badge);
        });
    }

    // Scan all video elements on the current page
    function scanVideos() {
        const videos = document.querySelectorAll('video');
        videos.forEach(video => {
            // Ignore tiny 1x1 audio/tracking video stubs
            if (video.offsetWidth > 60 || video.offsetHeight > 60 || video.readyState > 0 || !video.offsetWidth) {
                attachButtonToVideo(video);
            }
        });
    }

    function run() {
        injectStyles();
        scanVideos();
        scanThumbnails();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', run);
    } else {
        run();
    }

    // Dynamic Observer for videos injected via AJAX, infinite scroll, or SPAs
    const observer = new MutationObserver(() => {
        scanVideos();
        scanThumbnails();
    });

    observer.observe(document.documentElement, {
        childList: true,
        subtree: true
    });

    // Also run periodically for delayed custom media players
    setInterval(scanVideos, 1500);

})();
