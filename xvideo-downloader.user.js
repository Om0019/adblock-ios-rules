// ==UserScript==
// @name         Direct Video Downloader (Clean & Simple)
// @namespace    https://github.com/Om0019/adblock-ios-rules
// @version      15.0.0
// @description  Directly downloads video streams / MP4s with a single click. No external apps, no complicated menus.
// @author       Antigravity
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// @grant        GM.xmlHttpRequest
// @grant        GM_setClipboard
// @connect      *
// @run-at       document-end
// ==/UserScript==

(function () {
    'use strict';

    if (window.self !== window.top) {
        if (window.innerWidth < 120 || window.innerHeight < 120) return;
    }

    const STYLES = `
        .xv-direct-download-btn {
            position: absolute !important;
            top: 14px !important;
            right: 14px !important;
            z-index: 2147483647 !important;
            background: linear-gradient(135deg, #e50914, #b80710) !important;
            color: #ffffff !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
            font-size: 13px !important;
            font-weight: 700 !important;
            padding: 8px 16px !important;
            border-radius: 20px !important;
            border: 1.5px solid #ffffff !important;
            display: inline-flex !important;
            align-items: center !important;
            gap: 6px !important;
            cursor: pointer !important;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.8) !important;
            text-decoration: none !important;
            transition: transform 0.15s ease, background 0.15s ease !important;
            opacity: 0.95 !important;
            line-height: 1 !important;
        }

        .xv-direct-download-btn:hover {
            transform: scale(1.06) !important;
            background: #ff1a25 !important;
            box-shadow: 0 6px 20px rgba(229, 9, 20, 0.6) !important;
        }

        .xv-direct-download-btn.downloading {
            background: #222222 !important;
            border-color: #00ff66 !important;
            cursor: wait !important;
            transform: none !important;
        }

        .xv-direct-download-btn svg {
            width: 15px !important;
            height: 15px !important;
            fill: #ffffff !important;
            pointer-events: none !important;
        }

        .xv-toast {
            position: fixed !important;
            bottom: 24px !important;
            left: 50% !important;
            transform: translateX(-50%) !important;
            background: rgba(16, 16, 16, 0.95) !important;
            color: #ffffff !important;
            border: 1px solid #e50914 !important;
            padding: 10px 22px !important;
            border-radius: 30px !important;
            box-shadow: 0 8px 28px rgba(0, 0, 0, 0.85) !important;
            font-size: 13px !important;
            font-weight: 600 !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
            z-index: 2147483647 !important;
            text-align: center !important;
            pointer-events: none !important;
            animation: xvFade 0.2s ease-out !important;
        }

        @keyframes xvFade {
            from { opacity: 0; transform: translate(-50%, 10px); }
            to { opacity: 1; transform: translate(-50%, 0); }
        }
    `;

    function injectStyles() {
        if (document.getElementById('xv-direct-styles')) return;
        const style = document.createElement('style');
        style.id = 'xv-direct-styles';
        style.textContent = STYLES;
        (document.head || document.documentElement).appendChild(style);
    }

    function showToast(msg) {
        const old = document.querySelector('.xv-toast');
        if (old) old.remove();
        const toast = document.createElement('div');
        toast.className = 'xv-toast';
        toast.textContent = msg;
        (document.body || document.documentElement).appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    function getFilename() {
        const title = (document.title || 'video')
            .replace(/ - Pornhub.*$/i, '')
            .replace(/ - Free porn tube.*$/i, '')
            .replace(/[/\\?%*:|"<>]/g, '_')
            .trim();
        return (title.substring(0, 80) || 'video') + '.mp4';
    }

    // Direct browser download trigger
    function triggerDownload(url, filename) {
        const safeName = filename || getFilename();
        const a = document.createElement('a');
        a.href = url;
        a.download = safeName;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    // Find the primary video stream URL directly from the page/player
    function findBestStreamUrl() {
        // 1. Pornhub mediaDefinitions (1080p -> 720p -> 480p)
        for (const key in window) {
            if (key.startsWith('flashvars_') && window[key] && window[key].mediaDefinitions) {
                const defs = window[key].mediaDefinitions.filter(d => d.videoUrl && !d.videoUrl.includes('/ads/'));
                if (defs.length > 0) {
                    // Pick highest quality
                    defs.sort((a, b) => (parseInt(b.quality || b.height, 10) || 0) - (parseInt(a.quality || a.height, 10) || 0));
                    return defs[0].videoUrl;
                }
            }
        }

        // 2. X-Video player_obj
        if (window.player_obj && window.player_obj.conf) {
            const conf = window.player_obj.conf;
            if (conf.video_url) return conf.video_url;
            if (conf.video_alt_url) return conf.video_alt_url;
        }

        // 3. Scan inline scripts for video_url or m3u8
        const scripts = document.querySelectorAll('script:not([src])');
        for (const s of scripts) {
            const text = s.textContent;
            if (text.includes('video_url')) {
                const m = text.match(/video_url:\s*['"]([^'"]+)['"]/);
                if (m && m[1]) return m[1];
            }
            if (text.includes('mediaDefinitions')) {
                const m = text.match(/"videoUrl"\s*:\s*"([^"]+)"/);
                if (m && m[1]) return m[1].replace(/\\/g, '');
            }
        }

        // 4. HTML5 video element source
        const video = document.querySelector('video');
        if (video) {
            if (video.currentSrc && !video.currentSrc.startsWith('blob:')) return video.currentSrc;
            if (video.src && !video.src.startsWith('blob:')) return video.src;
            const source = video.querySelector('source');
            if (source && source.src && !source.src.startsWith('blob:')) return source.src;
        }

        return null;
    }

    // Attach simple 1-click download button
    function attachButton(container) {
        if (!container || container.querySelector('.xv-direct-download-btn')) return;

        injectStyles();

        if (window.getComputedStyle(container).position === 'static') {
            container.style.position = 'relative';
        }

        const btn = document.createElement('div');
        btn.className = 'xv-direct-download-btn';
        btn.innerHTML = `
            <svg viewBox="0 0 24 24"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z"/></svg>
            <span class="xv-label">Download MP4</span>
        `;

        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            const streamUrl = findBestStreamUrl();

            if (!streamUrl) {
                showToast('⚠️ Press Play on the video first to start the stream!');
                return;
            }

            const label = btn.querySelector('.xv-label');
            label.textContent = '⬇️ Starting...';
            btn.classList.add('downloading');
            showToast('⬇️ Starting direct video download...');

            // Direct download with filename
            triggerDownload(streamUrl, getFilename());

            setTimeout(() => {
                label.textContent = 'Download MP4';
                btn.classList.remove('downloading');
            }, 2500);
        });

        container.appendChild(btn);
    }

    function scan() {
        // Pornhub Player
        const phPlayer = document.getElementById('player') || document.querySelector('.player-container') || document.querySelector('.mgp_container');
        if (phPlayer) attachButton(phPlayer);

        // X-Video Player
        const xvPlayer = document.getElementById('kt_player') || document.querySelector('.player-holder');
        if (xvPlayer) attachButton(xvPlayer);

        // All HTML5 video wrappers
        const videos = document.querySelectorAll('video');
        videos.forEach(v => {
            if (v.offsetWidth > 100 || v.offsetHeight > 80 || v.readyState > 0) {
                let p = v.parentElement;
                if (p && p.offsetWidth < 60 && p.parentElement) p = p.parentElement;
                if (p) attachButton(p);
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', scan);
    } else {
        scan();
    }

    const observer = new MutationObserver(scan);
    observer.observe(document.documentElement, { childList: true, subtree: true });
    setInterval(scan, 2000);

})();
