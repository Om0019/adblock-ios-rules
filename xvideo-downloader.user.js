// ==UserScript==
// @name         Universal Video Downloader (1-Click Downie & Web MP4)
// @namespace    https://github.com/Om0019/adblock-ios-rules
// @version      11.0.0
// @description  Universal floating download button that extracts the ACTUAL video/m3u8 stream URL (not the webpage link) and feeds it to Downie / clipboard
// @author       Antigravity
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// @grant        GM.xmlHttpRequest
// @grant        GM_setClipboard
// @grant        GM_openInTab
// @connect      *
// @run-at       document-end
// ==/UserScript==

(function () {
    'use strict';

    if (window.self !== window.top) {
        if (window.innerWidth < 120 || window.innerHeight < 120) return;
    }

    const STYLES = `
        .xv-universal-float-btn {
            position: absolute !important;
            top: 14px !important;
            right: 14px !important;
            z-index: 2147483647 !important;
            min-width: 42px !important;
            height: 42px !important;
            padding: 0 12px !important;
            border-radius: 24px !important;
            background: rgba(18, 18, 18, 0.92) !important;
            backdrop-filter: blur(8px) !important;
            -webkit-backdrop-filter: blur(8px) !important;
            border: 1.5px solid #e50914 !important;
            color: #ffffff !important;
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            gap: 6px !important;
            cursor: pointer !important;
            box-shadow: 0 4px 18px rgba(0, 0, 0, 0.85) !important;
            transition: all 0.2s ease !important;
            text-decoration: none !important;
            opacity: 0.94 !important;
            pointer-events: auto !important;
            box-sizing: border-box !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
            font-size: 13px !important;
            font-weight: 700 !important;
            overflow: hidden !important;
        }

        .xv-universal-float-btn:hover {
            opacity: 1 !important;
            transform: scale(1.06) !important;
            background: #e50914 !important;
            border-color: #ffffff !important;
            box-shadow: 0 6px 22px rgba(229, 9, 20, 0.65) !important;
        }

        .xv-universal-float-btn svg {
            width: 18px !important;
            height: 18px !important;
            fill: #ffffff !important;
            flex-shrink: 0 !important;
            pointer-events: none !important;
        }

        .xv-universal-quality-menu {
            display: none;
            position: absolute !important;
            top: 60px !important;
            right: 14px !important;
            background: #141414 !important;
            border: 1px solid #333333 !important;
            border-radius: 8px !important;
            box-shadow: 0 12px 36px rgba(0, 0, 0, 0.95) !important;
            z-index: 2147483647 !important;
            min-width: 250px !important;
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
            padding: 11px 14px !important;
            font-size: 13px !important;
            font-weight: 600 !important;
            color: #eeeeee !important;
            text-decoration: none !important;
            cursor: pointer !important;
            border-bottom: 1px solid #222222 !important;
            transition: background 0.15s ease !important;
        }

        .xv-quality-item:last-child {
            border-bottom: none !important;
        }

        .xv-quality-item:hover {
            background: #e50914 !important;
            color: #ffffff !important;
        }

        .xv-quality-item span.action-hint {
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
        if (document.getElementById('xv-universal-styles')) return;
        const style = document.createElement('style');
        style.id = 'xv-universal-styles';
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

    // Send the direct raw video stream URL (not webpage) to Downie
    function sendStreamToDownie(rawStreamUrl) {
        if (!rawStreamUrl) {
            showToast('⚠️ No direct video stream URL found yet.');
            return;
        }
        showToast('🚀 Sending direct video stream URL to Downie...');
        window.location.href = `downie://${rawStreamUrl}`;
    }

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

        // 2. Scan inline scripts for flashvars if window variable is sandboxed
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

        // Sort so highest resolution (1080p -> 720p -> 480p) is first
        results.sources.sort((a, b) => {
            const qa = parseInt(a.label, 10) || 0;
            const qb = parseInt(b.label, 10) || 0;
            return qb - qa;
        });

        return results.sources.length > 0 ? results : null;
    }

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
                        label: conf.video_url_fhd ? '1080p FHD (MP4)' : 'HD (MP4)',
                        url: conf.video_url,
                        isHls: false
                    });
                }
                if (conf.video_alt_url) {
                    results.sources.push({
                        label: 'SD Quality (MP4)',
                        url: conf.video_alt_url,
                        isHls: false
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
                            url: urlMatch[1],
                            isHls: false
                        });
                    }
                    break;
                }
            }
        }

        return results.sources.length > 0 ? results : null;
    }

    function getGenericVideoSource(videoEl) {
        if (!videoEl) return null;
        const src = videoEl.currentSrc || videoEl.src;
        if (src && !src.startsWith('blob:')) {
            return [{ label: 'Direct Stream', url: src, isHls: src.includes('.m3u8') }];
        }
        return null;
    }

    function attachFloatingButton(targetContainer, videoData) {
        if (!targetContainer || targetContainer.querySelector('.xv-universal-float-btn')) return;

        injectStyles();

        const compPos = window.getComputedStyle(targetContainer).position;
        if (compPos === 'static') {
            targetContainer.style.position = 'relative';
        }

        const btn = document.createElement('div');
        btn.className = 'xv-universal-float-btn';
        btn.innerHTML = `
            <svg viewBox="0 0 24 24"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z"/></svg>
            <span>Download</span>
        `;

        const menu = document.createElement('div');
        menu.className = 'xv-universal-quality-menu';

        function updateMenu(sources, title) {
            const bestStreamUrl = sources.length > 0 ? sources[0].url : '';

            let html = `
                <div class="xv-quality-item xv-downie-item" data-best-url="${bestStreamUrl}">
                    <span>🚀 Open Stream in Downie</span>
                    <span class="action-hint">Direct Video</span>
                </div>
            `;

            sources.forEach(s => {
                html += `
                    <div class="xv-quality-item" data-url="${s.url}" data-hls="${s.isHls}">
                        <span>${s.label}</span>
                        <span class="action-hint">${s.isHls ? '📋 Copy Stream URL' : '⬇️ Download MP4'}</span>
                    </div>
                `;
            });

            menu.innerHTML = html;

            // 1. Send the ACTUAL raw video stream to Downie (not location.href)
            menu.querySelector('.xv-downie-item').addEventListener('click', (e) => {
                e.stopPropagation();
                const streamToOpen = menu.querySelector('.xv-downie-item').getAttribute('data-best-url');
                sendStreamToDownie(streamToOpen);
                menu.classList.remove('show');
            });

            // 2. Stream items click (copies raw stream URL or downloads MP4)
            menu.querySelectorAll('.xv-quality-item[data-url]').forEach(item => {
                item.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const directVideoUrl = item.getAttribute('data-url');
                    const isHls = item.getAttribute('data-hls') === 'true';

                    if (isHls) {
                        copyToClipboard(directVideoUrl);
                        showToast(`📋 Copied raw ${item.querySelector('span').textContent} stream URL!`);
                    } else {
                        const a = document.createElement('a');
                        a.href = directVideoUrl;
                        a.download = (title || 'video') + '.mp4';
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

        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            let currentSources = [];
            let currentTitle = document.title;

            const ph = extractPornhubData();
            const xv = extractXVideoData();

            if (ph && ph.sources.length > 0) {
                currentSources = ph.sources;
                currentTitle = ph.title;
            } else if (xv && xv.sources.length > 0) {
                currentSources = xv.sources;
                currentTitle = xv.title;
            } else {
                const videoEl = targetContainer.querySelector('video') || targetContainer;
                const gen = getGenericVideoSource(videoEl);
                if (gen) currentSources = gen;
            }

            if (currentSources.length === 0) {
                showToast('⚠️ Searching video stream...');
                return;
            }

            updateMenu(currentSources, currentTitle);
            menu.classList.toggle('show');
        });

        document.addEventListener('click', () => menu.classList.remove('show'));

        targetContainer.appendChild(btn);
        targetContainer.appendChild(menu);
    }

    function scanAndAttach() {
        const phPlayer = document.getElementById('player') ||
                         document.querySelector('.player-container') ||
                         document.querySelector('.mgp_container');
        if (phPlayer && location.hostname.includes('pornhub.com')) {
            const phData = extractPornhubData();
            attachFloatingButton(phPlayer, phData);
        }

        const xvPlayer = document.getElementById('kt_player') ||
                         document.querySelector('.player-holder');
        if (xvPlayer && location.hostname.includes('x-video.tube')) {
            const xvData = extractXVideoData();
            attachFloatingButton(xvPlayer, xvData);
        }

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
