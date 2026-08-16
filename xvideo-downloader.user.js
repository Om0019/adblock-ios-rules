// ==UserScript==
// @name         Universal Video Downloader & Stream Sniffer (Ad-Filtered)
// @namespace    https://github.com/Om0019/adblock-ios-rules
// @version      14.0.0
// @description  Sniffs real video streams, strictly filters out pre-roll/ad streams (TrafficJunky, VAST, phncdn/ads), and attaches exact Referer headers for Downie/yt-dlp.
// @author       Antigravity
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// @grant        GM.xmlHttpRequest
// @grant        GM_setClipboard
// @connect      *
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

    if (window.self !== window.top) {
        if (window.innerWidth < 120 || window.innerHeight < 120) return;
    }

    const capturedStreams = new Map(); // url -> { label, isHls, url, referer, origin }

    // Known ad keywords and domains to strictly ignore
    const AD_BLACKLIST = [
        '/ads/', '/ad/', 'adrolls', 'preroll', 'pauseroll', 'postroll',
        'trafficjunky', 'tjassets', 'etahub', 'ero-advertising', 'exoclick',
        'doubleclick', 'googlesyndication', 'syndication', 'magsrv', 'happyleaf',
        'gmxes', 'mayzaent', 'awdeliverynet', 'eunow4u', 'gentlefield',
        'spotx', 'popads', 'adzone', 'ad_unit', 'creative', '_ad.mp4'
    ];

    function isAdUrl(url) {
        if (!url || typeof url !== 'string') return true;
        const lower = url.toLowerCase();
        return AD_BLACKLIST.some(keyword => lower.includes(keyword));
    }

    function addCapturedStream(url, hint = 'Video Stream') {
        if (!url || typeof url !== 'string') return;
        if (url.startsWith('blob:') || url.startsWith('data:')) return;

        // Strictly ignore all ad URLs
        if (isAdUrl(url)) {
            console.log('[Stream Sniffer] 🚫 Ignored Ad Stream:', url);
            return;
        }

        const isM3u8 = url.includes('.m3u8');
        const isMp4 = url.includes('.mp4');
        const isWebm = url.includes('.webm');
        const isTs = url.includes('.ts');

        // Ignore small individual TS chunk fragments
        if (isTs && !isM3u8) return;

        if (isM3u8 || isMp4 || isWebm || url.includes('/get_file/') || (url.includes('phncdn.com') && url.includes('/videos/')) || url.includes('videoUrl')) {
            let label = hint;
            if (url.includes('1080P') || url.includes('1080p') || url.includes('1080')) label = '1080p (FHD)';
            else if (url.includes('720P') || url.includes('720p') || url.includes('720')) label = '720p (HD)';
            else if (url.includes('480P') || url.includes('480p') || url.includes('480')) label = '480p (SD)';
            else if (url.includes('240P') || url.includes('240p')) label = '240p';
            else if (isM3u8) label = 'Master HLS Stream';
            else if (isMp4) label = 'Direct MP4 Stream';

            const referer = location.href;
            const origin = location.origin;

            if (!capturedStreams.has(url)) {
                capturedStreams.set(url, { label, isHls: isM3u8, url, referer, origin });
                console.log('[Stream Sniffer] ✅ Captured REAL Video Stream:', label, url);
                updateFloatingBadgeUI();
            }
        }
    }

    /* ==========================================================
       1. AUTO-DEFUSE PRE-ROLL ADS IN PLAYER OBJECTS
       ========================================================== */
    function stripPlayerAds() {
        for (const key in window) {
            if (key.startsWith('flashvars_') && window[key]) {
                const fv = window[key];
                // Disable pre-roll and pause-roll ads in player config
                fv.adConfig = null;
                fv.adrolls = [];
                fv.htmlPauseRoll = "false";
                fv.htmlPostRoll = "false";
                fv.adConfigUrl = "";
            }
        }
    }

    /* ==========================================================
       2. NETWORK INTERCEPTORS (fetch & XHR)
       ========================================================== */
    const originalFetch = window.fetch;
    window.fetch = async function (...args) {
        try {
            const reqUrl = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url ? args[0].url : '');
            if (!isAdUrl(reqUrl)) {
                addCapturedStream(reqUrl, 'Stream (Fetch)');
            }
        } catch (e) {}
        return originalFetch.apply(this, args);
    };

    const originalOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (method, url, ...rest) {
        try {
            if (!isAdUrl(url)) {
                addCapturedStream(url, 'Stream (XHR)');
            }
        } catch (e) {}
        return originalOpen.call(this, method, url, ...rest);
    };

    /* ==========================================================
       3. VIDEO PLAYER EVENT HOOKS
       ========================================================== */
    function hookVideoElement(video) {
        if (!video || video.dataset.xvSniffHooked === 'true') return;
        video.dataset.xvSniffHooked = 'true';

        function inspect() {
            if (video.currentSrc && !isAdUrl(video.currentSrc)) addCapturedStream(video.currentSrc, 'Active Player Stream');
            if (video.src && !isAdUrl(video.src)) addCapturedStream(video.src, 'Player Source');
            const sources = video.querySelectorAll('source');
            sources.forEach(s => {
                if (s.src && !isAdUrl(s.src)) addCapturedStream(s.src, s.getAttribute('label') || 'Source');
            });
        }

        video.addEventListener('play', inspect);
        video.addEventListener('playing', inspect);
        video.addEventListener('loadedmetadata', inspect);
        video.addEventListener('loadstart', inspect);
        video.addEventListener('canplay', inspect);

        inspect();
    }

    /* ==========================================================
       4. SITE OBJECT SCANNER
       ========================================================== */
    function scanPageObjects() {
        stripPlayerAds();

        for (const key in window) {
            if (key.startsWith('flashvars_') && window[key] && window[key].mediaDefinitions) {
                const defs = window[key].mediaDefinitions || [];
                defs.forEach(d => {
                    if (d.videoUrl && !isAdUrl(d.videoUrl)) {
                        addCapturedStream(d.videoUrl, d.quality ? `${d.quality}p` : 'HLS Stream');
                    }
                });
            }
        }

        if (window.player_obj && window.player_obj.conf) {
            const conf = window.player_obj.conf;
            if (conf.video_url && !isAdUrl(conf.video_url)) {
                addCapturedStream(conf.video_url, conf.video_url_fhd ? '1080p FHD' : 'HD (MP4)');
            }
            if (conf.video_alt_url && !isAdUrl(conf.video_alt_url)) {
                addCapturedStream(conf.video_alt_url, 'SD (MP4)');
            }
        }

        const scripts = document.querySelectorAll('script:not([src])');
        for (const s of scripts) {
            const text = s.textContent;
            if (text.includes('mediaDefinitions') || text.includes('video_url')) {
                const m3u8Matches = text.match(/https?:\/\/[^"'\s]+\.m3u8[^"'\s]*/g);
                if (m3u8Matches) m3u8Matches.forEach(u => addCapturedStream(u.replace(/\\/g, ''), 'HLS Master'));

                const mp4Matches = text.match(/https?:\/\/[^"'\s]+\.mp4[^"'\s]*/g);
                if (mp4Matches) mp4Matches.forEach(u => addCapturedStream(u.replace(/\\/g, ''), 'MP4 Stream'));
            }
        }
    }

    /* ==========================================================
       5. UI & STYLES
       ========================================================== */
    const STYLES = `
        .xv-sniffer-float-btn {
            position: absolute !important;
            top: 14px !important;
            right: 14px !important;
            z-index: 2147483647 !important;
            min-width: 44px !important;
            height: 42px !important;
            padding: 0 14px !important;
            border-radius: 24px !important;
            background: rgba(18, 18, 18, 0.94) !important;
            backdrop-filter: blur(8px) !important;
            -webkit-backdrop-filter: blur(8px) !important;
            border: 1.5px solid #e50914 !important;
            color: #ffffff !important;
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            gap: 7px !important;
            cursor: pointer !important;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.85) !important;
            transition: all 0.2s ease !important;
            text-decoration: none !important;
            opacity: 0.95 !important;
            pointer-events: auto !important;
            box-sizing: border-box !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
            font-size: 13px !important;
            font-weight: 700 !important;
        }

        .xv-sniffer-float-btn.active-stream {
            background: #e50914 !important;
            box-shadow: 0 0 16px rgba(229, 9, 20, 0.8) !important;
            border-color: #ffffff !important;
        }

        .xv-sniffer-float-btn:hover {
            transform: scale(1.06) !important;
        }

        .xv-sniffer-float-btn svg {
            width: 17px !important;
            height: 17px !important;
            fill: #ffffff !important;
            flex-shrink: 0 !important;
        }

        .xv-stream-count-badge {
            background: #ffffff !important;
            color: #e50914 !important;
            font-size: 11px !important;
            font-weight: 800 !important;
            padding: 1px 6px !important;
            border-radius: 10px !important;
            margin-left: 2px !important;
        }

        .xv-sniffer-dropdown {
            display: none;
            position: absolute !important;
            top: 60px !important;
            right: 14px !important;
            background: #141414 !important;
            border: 1px solid #333333 !important;
            border-radius: 8px !important;
            box-shadow: 0 12px 36px rgba(0, 0, 0, 0.95) !important;
            z-index: 2147483647 !important;
            min-width: 290px !important;
            max-width: 90vw !important;
            overflow: hidden !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
        }

        .xv-sniffer-dropdown.show {
            display: block !important;
        }

        .xv-dropdown-header {
            padding: 10px 14px !important;
            font-size: 11px !important;
            text-transform: uppercase !important;
            letter-spacing: 0.5px !important;
            color: #888888 !important;
            border-bottom: 1px solid #242424 !important;
            background: #181818 !important;
        }

        .xv-dropdown-item {
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            padding: 11px 14px !important;
            font-size: 13px !important;
            font-weight: 600 !important;
            color: #eeeeee !important;
            text-decoration: none !important;
            cursor: pointer !important;
            border-bottom: 1px solid #222222 !important;
            transition: background 0.15s ease !important;
        }

        .xv-dropdown-item:last-child {
            border-bottom: none !important;
        }

        .xv-dropdown-item:hover {
            background: #e50914 !important;
            color: #ffffff !important;
        }

        .xv-dropdown-item span.action-hint {
            font-size: 11px !important;
            opacity: 0.85 !important;
            background: rgba(0,0,0,0.35) !important;
            padding: 2px 7px !important;
            border-radius: 4px !important;
        }

        .xv-universal-toast {
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
            max-width: 90vw !important;
            pointer-events: none !important;
            animation: xvUniversalFade 0.25s ease-out !important;
        }

        @keyframes xvUniversalFade {
            from { opacity: 0; transform: translate(-50%, 12px); }
            to { opacity: 1; transform: translate(-50%, 0); }
        }
    `;

    function injectStyles() {
        if (document.getElementById('xv-sniffer-styles')) return;
        const style = document.createElement('style');
        style.id = 'xv-sniffer-styles';
        style.textContent = STYLES;
        (document.head || document.documentElement).appendChild(style);
    }

    function showToast(msg, duration = 3500) {
        const old = document.querySelector('.xv-universal-toast');
        if (old) old.remove();
        const toast = document.createElement('div');
        toast.className = 'xv-universal-toast';
        toast.textContent = msg;
        (document.body || document.documentElement).appendChild(toast);
        setTimeout(() => toast.remove(), duration);
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

    function updateFloatingBadgeUI() {
        const btn = document.querySelector('.xv-sniffer-float-btn');
        if (!btn) return;

        const count = capturedStreams.size;
        let badge = btn.querySelector('.xv-stream-count-badge');
        let label = btn.querySelector('.xv-btn-label');

        if (count > 0) {
            btn.classList.add('active-stream');
            if (label) label.textContent = 'Download Video';
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'xv-stream-count-badge';
                btn.appendChild(badge);
            }
            badge.textContent = count;
        }
    }

    function renderDropdown(menu) {
        const streams = Array.from(capturedStreams.values());

        if (streams.length === 0) {
            menu.innerHTML = `
                <div class="xv-dropdown-header">Stream Status</div>
                <div class="xv-dropdown-item" style="cursor: default; opacity: 0.7;">
                    <span>▶️ Press Play on video to sniff real stream...</span>
                </div>
            `;
            return;
        }

        let html = `<div class="xv-dropdown-header">Real Video Streams (${streams.length})</div>`;

        // 1. Send stream with Referer to Downie
        const bestStream = streams[0];
        const encodedDownieUrl = `downie://${bestStream.url}?referer=${encodeURIComponent(bestStream.referer)}`;

        html += `
            <div class="xv-dropdown-item xv-downie-item" data-downie-url="${encodedDownieUrl}">
                <span>🚀 Send to Downie (+ Referer)</span>
                <span class="action-hint">1-Click App</span>
            </div>
            <div class="xv-dropdown-item xv-copy-ytdlp-item" data-stream-url="${bestStream.url}" data-referer="${bestStream.referer}">
                <span>⚡ Copy yt-dlp Command</span>
                <span class="action-hint">Full Headers</span>
            </div>
        `;

        // 2. List all detected non-ad quality streams
        streams.forEach(s => {
            html += `
                <div class="xv-dropdown-item xv-stream-row" data-stream-url="${s.url}" data-referer="${s.referer}" data-hls="${s.isHls}">
                    <span>${s.label}</span>
                    <span class="action-hint">${s.isHls ? '📋 Copy HLS' : '⬇️ Download MP4'}</span>
                </div>
            `;
        });

        menu.innerHTML = html;

        menu.querySelector('.xv-downie-item').addEventListener('click', (e) => {
            e.stopPropagation();
            const downieUri = menu.querySelector('.xv-downie-item').getAttribute('data-downie-url');
            showToast('🚀 Sending real video stream + Referer to Downie...');
            window.location.href = downieUri;
            menu.classList.remove('show');
        });

        menu.querySelector('.xv-copy-ytdlp-item').addEventListener('click', (e) => {
            e.stopPropagation();
            const rawUrl = menu.querySelector('.xv-copy-ytdlp-item').getAttribute('data-stream-url');
            const ref = menu.querySelector('.xv-copy-ytdlp-item').getAttribute('data-referer');
            const cmd = `yt-dlp --referer "${ref}" "${rawUrl}"`;
            copyToClipboard(cmd);
            showToast('📋 Copied real video yt-dlp command!');
            menu.classList.remove('show');
        });

        menu.querySelectorAll('.xv-stream-row').forEach(row => {
            row.addEventListener('click', (e) => {
                e.stopPropagation();
                const rawUrl = row.getAttribute('data-stream-url');
                const isHls = row.getAttribute('data-hls') === 'true';

                if (isHls) {
                    copyToClipboard(rawUrl);
                    showToast(`📋 Copied real ${row.querySelector('span').textContent} stream URL!`);
                } else {
                    const a = document.createElement('a');
                    a.href = rawUrl;
                    a.download = (document.title || 'video').replace(/[/\\?%*:|"<>]/g, '_') + '.mp4';
                    a.target = '_blank';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    showToast('⬇️ Starting direct MP4 download...');
                }
                menu.classList.remove('show');
            });
        });
    }

    function attachFloatingButton(targetContainer) {
        if (!targetContainer || targetContainer.querySelector('.xv-sniffer-float-btn')) return;

        injectStyles();

        const compPos = window.getComputedStyle(targetContainer).position;
        if (compPos === 'static') {
            targetContainer.style.position = 'relative';
        }

        const btn = document.createElement('div');
        btn.className = 'xv-sniffer-float-btn';
        btn.innerHTML = `
            <svg viewBox="0 0 24 24"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z"/></svg>
            <span class="xv-btn-label">Waiting for Play...</span>
        `;

        const menu = document.createElement('div');
        menu.className = 'xv-sniffer-dropdown';

        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            scanPageObjects();
            renderDropdown(menu);
            menu.classList.toggle('show');
        });

        document.addEventListener('click', () => menu.classList.remove('show'));

        targetContainer.appendChild(btn);
        targetContainer.appendChild(menu);
        updateFloatingBadgeUI();
    }

    function run() {
        injectStyles();
        scanPageObjects();

        const phPlayer = document.getElementById('player') ||
                         document.querySelector('.player-container') ||
                         document.querySelector('.mgp_container');
        if (phPlayer) attachFloatingButton(phPlayer);

        const xvPlayer = document.getElementById('kt_player') ||
                         document.querySelector('.player-holder');
        if (xvPlayer) attachFloatingButton(xvPlayer);

        const videos = document.querySelectorAll('video');
        videos.forEach(v => {
            hookVideoElement(v);
            if (v.offsetWidth > 100 || v.offsetHeight > 80 || v.readyState > 0 || !v.offsetWidth) {
                let container = v.parentElement;
                if (container && container.offsetWidth < 60 && container.parentElement) {
                    container = container.parentElement;
                }
                if (container && !container.querySelector('.xv-sniffer-float-btn')) {
                    attachFloatingButton(container);
                }
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', run);
    } else {
        run();
    }

    const observer = new MutationObserver(run);
    observer.observe(document.documentElement, { childList: true, subtree: true });
    setInterval(run, 1500);

})();
