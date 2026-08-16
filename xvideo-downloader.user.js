// ==UserScript==
// @name         Universal Floating Video Downloader & Stream Extractor
// @namespace    https://github.com/Om0019/adblock-ios-rules
// @version      8.0.0
// @description  Adds a floating download button over any video player across the web (Pornhub, X-Video, tube sites, streaming, HTML5 players)
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
        /* =========================================
           UNIVERSAL FLOATING VIDEO DOWNLOAD BUTTON
           ========================================= */
        .xv-universal-float-btn {
            position: absolute !important;
            top: 14px !important;
            right: 14px !important;
            z-index: 2147483647 !important;
            width: 40px !important;
            height: 40px !important;
            border-radius: 50% !important;
            background: rgba(18, 18, 18, 0.88) !important;
            backdrop-filter: blur(8px) !important;
            -webkit-backdrop-filter: blur(8px) !important;
            border: 1.5px solid #e50914 !important;
            color: #ffffff !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            cursor: pointer !important;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.75) !important;
            transition: transform 0.2s ease, background 0.2s ease !important;
            text-decoration: none !important;
            padding: 0 !important;
            margin: 0 !important;
            opacity: 0.9 !important;
            pointer-events: auto !important;
            box-sizing: border-box !important;
        }

        .xv-universal-float-btn:hover {
            opacity: 1 !important;
            transform: scale(1.12) !important;
            background: #e50914 !important;
            border-color: #ffffff !important;
            box-shadow: 0 6px 20px rgba(229, 9, 20, 0.6) !important;
        }

        .xv-universal-float-btn svg {
            width: 19px !important;
            height: 19px !important;
            fill: #ffffff !important;
            pointer-events: none !important;
        }

        /* Quality Dropdown Menu */
        .xv-universal-quality-menu {
            display: none;
            position: absolute !important;
            top: 58px !important;
            right: 14px !important;
            background: #141414 !important;
            border: 1px solid #333333 !important;
            border-radius: 8px !important;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.95) !important;
            z-index: 2147483647 !important;
            min-width: 200px !important;
            overflow: hidden !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
        }

        .xv-universal-quality-menu.show {
            display: block !important;
        }

        .xv-quality-item {
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            padding: 10px 14px !important;
            font-size: 13px !important;
            font-weight: 600 !important;
            color: #eeeeee !important;
            text-decoration: none !important;
            cursor: pointer !important;
            border-bottom: 1px solid #242424 !important;
            transition: background 0.15s ease !important;
        }

        .xv-quality-item:last-child {
            border-bottom: none !important;
        }

        .xv-quality-item:hover {
            background: #e50914 !important;
            color: #ffffff !important;
        }

        /* Toast notifications */
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

    function getCleanFilename(title) {
        const t = (title || document.title || 'video').replace(/[/\\?%*:|"<>]/g, '_').trim();
        return t.substring(0, 80) + '.mp4';
    }

    /* ==========================================================
       SITE-SPECIFIC ADAPTERS (Pornhub, X-Video, etc.)
       ========================================================== */

    // Pornhub Extractor
    function extractPornhubData() {
        if (!location.hostname.includes('pornhub.com')) return null;

        const results = {
            title: document.title.replace(/ - Pornhub\.com.*$/i, '').trim(),
            sources: []
        };

        // 1. Check window.flashvars_*
        for (const key in window) {
            if (key.startsWith('flashvars_') && window[key] && window[key].mediaDefinitions) {
                const fv = window[key];
                if (fv.video_title) results.title = fv.video_title;
                const defs = fv.mediaDefinitions || [];

                defs.forEach(d => {
                    if (d.videoUrl && (d.format === 'hls' || d.format === 'mp4')) {
                        const quality = d.quality ? `${d.quality}p` : (d.height ? `${d.height}p` : d.format.toUpperCase());
                        results.sources.push({
                            label: `${quality} (${d.format.toUpperCase()})`,
                            url: d.videoUrl,
                            isHls: d.format === 'hls'
                        });
                    }
                });
                break;
            }
        }

        // 2. Scan inline scripts if window variables are sandboxed
        if (results.sources.length === 0) {
            const scripts = document.querySelectorAll('script:not([src])');
            for (const s of scripts) {
                const text = s.textContent;
                if (text.includes('mediaDefinitions') && text.includes('flashvars_')) {
                    const mediaMatch = text.match(/"mediaDefinitions"\s*:\s*(\[[^\]]+\])/);
                    const titleMatch = text.match(/"video_title"\s*:\s*"([^"]+)"/);
                    if (titleMatch) results.title = titleMatch[1];
                    if (mediaMatch) {
                        try {
                            const defs = JSON.parse(mediaMatch[1]);
                            defs.forEach(d => {
                                if (d.videoUrl) {
                                    const quality = d.quality ? `${d.quality}p` : (d.height ? `${d.height}p` : 'HD');
                                    results.sources.push({
                                        label: `${quality} (${(d.format || 'HLS').toUpperCase()})`,
                                        url: d.videoUrl,
                                        isHls: d.format === 'hls'
                                    });
                                }
                            });
                        } catch (e) {}
                    }
                    break;
                }
            }
        }

        return results.sources.length > 0 ? results : null;
    }

    // X-Video Tube Extractor
    function extractXVideoData() {
        if (!location.hostname.includes('x-video.tube')) return null;

        const results = {
            title: document.title.replace(/ - Free porn tube.*$/i, '').trim(),
            sources: []
        };

        try {
            if (window.player_obj && window.player_obj.conf) {
                const conf = window.player_obj.conf;
                if (conf.video_title) results.title = conf.video_title;
                if (conf.video_url) {
                    results.sources.push({
                        label: conf.video_url_fhd ? '1080p FHD (MP4)' : 'HD Quality (MP4)',
                        url: conf.video_url
                    });
                }
                if (conf.video_alt_url) {
                    results.sources.push({
                        label: 'SD Quality (MP4)',
                        url: conf.video_alt_url
                    });
                }
            }
        } catch (e) {}

        if (results.sources.length === 0) {
            const scripts = document.querySelectorAll('script:not([src])');
            for (const s of scripts) {
                const text = s.textContent;
                if (text.includes('video_url')) {
                    const urlMatch = text.match(/video_url:\s*['"]([^'"]+)['"]/);
                    const titleMatch = text.match(/video_title:\s*['"]([^'"]+)['"]/);
                    if (titleMatch) results.title = titleMatch[1];
                    if (urlMatch) {
                        results.sources.push({
                            label: text.includes("video_url_fhd: '1'") ? '1080p FHD (MP4)' : 'HD (MP4)',
                            url: urlMatch[1]
                        });
                    }
                    break;
                }
            }
        }

        return results.sources.length > 0 ? results : null;
    }

    /* ==========================================================
       GENERIC HTML5 VIDEO SOURCE EXTRACTOR
       ========================================================== */
    function getGenericVideoSource(videoEl) {
        if (!videoEl) return null;

        // 1. Direct src
        if (videoEl.currentSrc && !videoEl.currentSrc.startsWith('blob:')) {
            return [{ label: 'Direct Video Stream', url: videoEl.currentSrc }];
        }
        if (videoEl.src && !videoEl.src.startsWith('blob:')) {
            return [{ label: 'Direct Video Stream', url: videoEl.src }];
        }

        // 2. Child source tags
        const sources = videoEl.querySelectorAll('source');
        const list = [];
        sources.forEach(s => {
            const src = s.getAttribute('src');
            if (src && !src.startsWith('blob:')) {
                const res = s.getAttribute('size') || s.getAttribute('res') || s.getAttribute('type') || 'Video';
                list.push({ label: `${res}`, url: src });
            }
        });

        if (list.length > 0) return list;

        // 3. Fallback to currentSrc/src
        if (videoEl.currentSrc) return [{ label: 'Video Stream', url: videoEl.currentSrc }];
        if (videoEl.src) return [{ label: 'Video Stream', url: videoEl.src }];

        return null;
    }

    /* ==========================================================
       FLOATING BUTTON ATTACHER
       ========================================================== */
    function attachFloatingButton(targetContainer, videoData) {
        if (!targetContainer || targetContainer.querySelector('.xv-universal-float-btn')) return;

        injectStyles();

        const compPos = window.getComputedStyle(targetContainer).position;
        if (compPos === 'static') {
            targetContainer.style.position = 'relative';
        }

        const btn = document.createElement('div');
        btn.className = 'xv-universal-float-btn';
        btn.title = 'Download Video / Copy Stream Link';
        btn.innerHTML = `
            <svg viewBox="0 0 24 24"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z"/></svg>
        `;

        // If multiple qualities or HLS streams, create popup dropdown menu
        const menu = document.createElement('div');
        menu.className = 'xv-universal-quality-menu';

        function updateMenu(sources) {
            menu.innerHTML = sources.map(s => `
                <div class="xv-quality-item" data-url="${s.url}" data-hls="${s.isHls ? 'true' : 'false'}">
                    <span>${s.label}</span>
                    <span>${s.isHls ? '🔗 Copy HLS' : '⬇️ Download'}</span>
                </div>
            `).join('');

            menu.querySelectorAll('.xv-quality-item').forEach(item => {
                item.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const url = item.getAttribute('data-url');
                    const isHls = item.getAttribute('data-hls') === 'true';

                    if (isHls) {
                        copyToClipboard(url);
                        showToast('📋 Copied HLS Stream URL! Paste in VLC/Infuse/Downie to download.');
                    } else {
                        triggerDownload(url, videoData ? videoData.title : null);
                    }
                    menu.classList.remove('show');
                });
            });
        }

        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            // Refresh video sources dynamically
            let currentSources = [];
            const ph = extractPornhubData();
            const xv = extractXVideoData();

            if (ph && ph.sources.length > 0) currentSources = ph.sources;
            else if (xv && xv.sources.length > 0) currentSources = xv.sources;
            else {
                const videoEl = targetContainer.querySelector('video') || targetContainer;
                const gen = getGenericVideoSource(videoEl);
                if (gen) currentSources = gen;
            }

            if (currentSources.length === 0) {
                showToast('⚠️ Searching video stream...');
                return;
            }

            if (currentSources.length === 1 && !currentSources[0].isHls) {
                triggerDownload(currentSources[0].url, videoData ? videoData.title : null);
            } else {
                updateMenu(currentSources);
                menu.classList.toggle('show');
            }
        });

        // Right-click or long-press to instantly copy stream URL
        btn.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const src = (videoData && videoData.sources && videoData.sources[0]) ? videoData.sources[0].url : null;
            if (src) {
                copyToClipboard(src);
                showToast('📋 Direct video URL copied to clipboard!');
            }
        });

        document.addEventListener('click', () => menu.classList.remove('show'));

        targetContainer.appendChild(btn);
        targetContainer.appendChild(menu);
    }

    function triggerDownload(url, title) {
        const filename = getCleanFilename(title);
        showToast('⬇️ Starting video download...');
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    /* ==========================================================
       MAIN SCANNER & OBSERVER
       ========================================================== */
    function scanAndAttach() {
        // 1. Pornhub specific player container
        const phPlayer = document.getElementById('player') ||
                         document.querySelector('.player-container') ||
                         document.querySelector('.mgp_container');
        if (phPlayer && location.hostname.includes('pornhub.com')) {
            const phData = extractPornhubData();
            attachFloatingButton(phPlayer, phData);
        }

        // 2. X-Video Tube player container
        const xvPlayer = document.getElementById('kt_player') ||
                         document.querySelector('.player-holder');
        if (xvPlayer && location.hostname.includes('x-video.tube')) {
            const xvData = extractXVideoData();
            attachFloatingButton(xvPlayer, xvData);
        }

        // 3. Generic HTML5 <video> elements on ANY site
        const videos = document.querySelectorAll('video');
        videos.forEach(v => {
            if (v.offsetWidth > 100 || v.offsetHeight > 80 || v.readyState > 0 || !v.offsetWidth) {
                let container = v.parentElement;
                if (container && container.offsetWidth < 60 && container.parentElement) {
                    container = container.parentElement;
                }
                if (container && !container.querySelector('.xv-universal-float-btn')) {
                    const sources = getGenericVideoSource(v);
                    attachFloatingButton(container, { title: document.title, sources: sources || [] });
                }
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', scanAndAttach);
    } else {
        scanAndAttach();
    }

    const observer = new MutationObserver(scanAndAttach);
    observer.observe(document.documentElement, { childList: true, subtree: true });
    setInterval(scanAndAttach, 2000);

})();
