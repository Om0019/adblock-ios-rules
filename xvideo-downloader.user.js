// ==UserScript==
// @name         Universal Floating Video Downloader & HLS Stream Grabber
// @namespace    https://github.com/Om0019/adblock-ios-rules
// @version      9.0.0
// @description  Universal floating video downloader with in-browser multi-threaded HLS/M3U8 segment merger & MP4 downloader (Pornhub, X-Video, tube & streaming sites)
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

    const CONCURRENCY = 5; // Simultaneous chunk downloads

    const STYLES = `
        /* =========================================
           FLOATING BUTTON & QUALITY MENU
           ========================================= */
        .xv-universal-float-btn {
            position: absolute !important;
            top: 14px !important;
            right: 14px !important;
            z-index: 2147483647 !important;
            min-width: 40px !important;
            height: 40px !important;
            padding: 0 10px !important;
            border-radius: 20px !important;
            background: rgba(18, 18, 18, 0.9) !important;
            backdrop-filter: blur(8px) !important;
            -webkit-backdrop-filter: blur(8px) !important;
            border: 1.5px solid #e50914 !important;
            color: #ffffff !important;
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            gap: 6px !important;
            cursor: pointer !important;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.8) !important;
            transition: all 0.2s ease !important;
            text-decoration: none !important;
            opacity: 0.92 !important;
            pointer-events: auto !important;
            box-sizing: border-box !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
            font-size: 12px !important;
            font-weight: 700 !important;
            overflow: hidden !important;
        }

        .xv-universal-float-btn:hover {
            opacity: 1 !important;
            transform: scale(1.06) !important;
            background: #e50914 !important;
            border-color: #ffffff !important;
            box-shadow: 0 6px 20px rgba(229, 9, 20, 0.6) !important;
        }

        .xv-universal-float-btn.downloading {
            background: #181818 !important;
            border-color: #00ff66 !important;
            cursor: wait !important;
            transform: none !important;
        }

        .xv-universal-float-btn svg {
            width: 18px !important;
            height: 18px !important;
            fill: #ffffff !important;
            flex-shrink: 0 !important;
            pointer-events: none !important;
        }

        .xv-btn-progress-bar {
            position: absolute !important;
            bottom: 0 !important;
            left: 0 !important;
            height: 3px !important;
            background: #00ff66 !important;
            width: 0% !important;
            transition: width 0.2s ease !important;
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
            box-shadow: 0 10px 32px rgba(0, 0, 0, 0.95) !important;
            z-index: 2147483647 !important;
            min-width: 220px !important;
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

        .xv-quality-item span.action-hint {
            font-size: 11px !important;
            opacity: 0.8 !important;
            background: rgba(0,0,0,0.3) !important;
            padding: 2px 6px !important;
            border-radius: 4px !important;
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

    function makeRequest(url, headers = {}, responseType = 'arraybuffer') {
        const defaultHeaders = Object.assign({
            'Referer': location.href,
            'Origin': location.origin
        }, headers);

        const gmReq = (typeof GM_xmlhttpRequest !== 'undefined') ? GM_xmlhttpRequest :
                      (typeof GM !== 'undefined' && GM.xmlHttpRequest) ? GM.xmlHttpRequest : null;

        if (gmReq) {
            return new Promise((resolve, reject) => {
                gmReq({
                    method: 'GET',
                    url: url,
                    headers: defaultHeaders,
                    responseType: responseType,
                    onload: (res) => {
                        if (res.status >= 200 && res.status < 400) {
                            resolve(res.response);
                        } else {
                            reject(new Error(`HTTP ${res.status}`));
                        }
                    },
                    onerror: (e) => reject(new Error('Network error')),
                    ontimeout: () => reject(new Error('Timeout'))
                });
            });
        }

        return fetch(url, { headers: defaultHeaders }).then(async (res) => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return responseType === 'text' ? res.text() : res.arrayBuffer();
        });
    }

    /* ==========================================================
       HLS (M3U8) IN-BROWSER CHUNK DOWNLOADER & MERGER
       ========================================================== */
    async function downloadHlsStream(m3u8Url, filename, progressCb) {
        // Step 1: Fetch master or index m3u8
        const initialText = await makeRequest(m3u8Url, {}, 'text');
        let playlistText = initialText;
        let baseUrl = m3u8Url.substring(0, m3u8Url.lastIndexOf('/') + 1);

        // If it's a master playlist, find the sub-playlist index
        if (initialText.includes('#EXT-X-STREAM-INF') || initialText.includes('.m3u8')) {
            const lines = initialText.split('\n');
            for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed && !trimmed.startsWith('#') && trimmed.includes('.m3u8')) {
                    const subUrl = trimmed.startsWith('http') ? trimmed : (baseUrl + trimmed);
                    playlistText = await makeRequest(subUrl, {}, 'text');
                    baseUrl = subUrl.substring(0, subUrl.lastIndexOf('/') + 1);
                    break;
                }
            }
        }

        // Step 2: Extract all segment URLs
        const segmentLines = playlistText.split('\n')
            .map(l => l.trim())
            .filter(l => l && !l.startsWith('#'));

        if (segmentLines.length === 0) {
            throw new Error('No video segments found in playlist.');
        }

        const segmentUrls = segmentLines.map(line => {
            return line.startsWith('http') ? line : (baseUrl + line);
        });

        const total = segmentUrls.length;
        const chunks = new Array(total);
        let completed = 0;

        // Step 3: Multi-threaded parallel segment fetching
        let queueIndex = 0;
        async function worker() {
            while (queueIndex < total) {
                const idx = queueIndex++;
                const segUrl = segmentUrls[idx];
                try {
                    const buf = await makeRequest(segUrl, {}, 'arraybuffer');
                    chunks[idx] = buf;
                    completed++;
                    progressCb(completed, total);
                } catch (e) {
                    console.warn(`Retry segment ${idx}:`, e);
                    // Single retry
                    const retryBuf = await makeRequest(segUrl, {}, 'arraybuffer');
                    chunks[idx] = retryBuf;
                    completed++;
                    progressCb(completed, total);
                }
            }
        }

        const workers = [];
        for (let i = 0; i < Math.min(CONCURRENCY, total); i++) {
            workers.push(worker());
        }
        await Promise.all(workers);

        // Step 4: Concatenate all MPEG-TS segments into a single file Blob
        const fullBlob = new Blob(chunks, { type: 'video/mp4' });
        const blobUrl = URL.createObjectURL(fullBlob);

        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
    }

    function getCleanFilename(title) {
        const t = (title || document.title || 'video').replace(/[/\\?%*:|"<>]/g, '_').trim();
        return t.substring(0, 80) + '.mp4';
    }

    /* ==========================================================
       SITE EXTRACTORS
       ========================================================== */
    function extractPornhubData() {
        if (!location.hostname.includes('pornhub.com')) return null;

        const results = {
            title: document.title.replace(/ - Pornhub\.com.*$/i, '').trim(),
            sources: []
        };

        for (const key in window) {
            if (key.startsWith('flashvars_') && window[key] && window[key].mediaDefinitions) {
                const fv = window[key];
                if (fv.video_title) results.title = fv.video_title;
                const defs = fv.mediaDefinitions || [];

                defs.forEach(d => {
                    if (d.videoUrl && (d.format === 'hls' || d.format === 'mp4')) {
                        const quality = d.quality ? `${d.quality}p` : (d.height ? `${d.height}p` : d.format.toUpperCase());
                        results.sources.push({
                            label: `${quality}`,
                            url: d.videoUrl,
                            isHls: d.format === 'hls'
                        });
                    }
                });
                break;
            }
        }

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
                                        label: `${quality}`,
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
                        label: conf.video_url_fhd ? '1080p FHD' : 'HD Quality',
                        url: conf.video_url,
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
                            label: text.includes("video_url_fhd: '1'") ? '1080p FHD' : 'HD',
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
            return [{ label: 'Direct MP4', url: src, isHls: src.includes('.m3u8') }];
        }
        return null;
    }

    /* ==========================================================
       FLOATING UI ATTACHER
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
        btn.innerHTML = `
            <svg viewBox="0 0 24 24"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z"/></svg>
            <span class="xv-btn-label">Download</span>
            <div class="xv-btn-progress-bar"></div>
        `;

        const menu = document.createElement('div');
        menu.className = 'xv-universal-quality-menu';

        const btnLabel = btn.querySelector('.xv-btn-label');
        const progressBar = btn.querySelector('.xv-btn-progress-bar');
        let isDownloading = false;

        async function startHlsDownload(m3u8Url, title) {
            if (isDownloading) return;
            isDownloading = true;
            btn.classList.add('downloading');
            const safeName = getCleanFilename(title);

            showToast('⚡ Starting multi-threaded HLS video download...');

            try {
                await downloadHlsStream(m3u8Url, safeName, (done, total) => {
                    const pct = Math.round((done / total) * 100);
                    btnLabel.textContent = `⬇️ ${pct}% (${done}/${total})`;
                    progressBar.style.width = `${pct}%`;
                });
                btnLabel.textContent = '✅ Complete!';
                showToast('✅ Video downloaded & saved as MP4!');
                setTimeout(() => {
                    btnLabel.textContent = 'Download';
                    btn.classList.remove('downloading');
                    progressBar.style.width = '0%';
                    isDownloading = false;
                }, 3500);
            } catch (err) {
                console.error('HLS Download failed:', err);
                showToast('⚠️ Direct stream link copied to clipboard!');
                copyToClipboard(m3u8Url);
                btnLabel.textContent = 'Download';
                btn.classList.remove('downloading');
                isDownloading = false;
            }
        }

        function updateMenu(sources, title) {
            menu.innerHTML = sources.map(s => `
                <div class="xv-quality-item" data-url="${s.url}" data-hls="${s.isHls}">
                    <span>${s.label}</span>
                    <span class="action-hint">${s.isHls ? '⚡ Download MP4' : '⬇️ Download'}</span>
                </div>
            `).join('') + `
                <div class="xv-quality-item xv-copy-stream-item">
                    <span>📋 Copy Stream URL</span>
                    <span class="action-hint">For VLC/Downie</span>
                </div>
            `;

            menu.querySelectorAll('.xv-quality-item[data-url]').forEach(item => {
                item.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const url = item.getAttribute('data-url');
                    const isHls = item.getAttribute('data-hls') === 'true';

                    if (isHls) {
                        startHlsDownload(url, title);
                    } else {
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = getCleanFilename(title);
                        a.target = '_blank';
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        showToast('⬇️ Starting direct MP4 download...');
                    }
                    menu.classList.remove('show');
                });
            });

            const copyItem = menu.querySelector('.xv-copy-stream-item');
            if (copyItem) {
                copyItem.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const firstUrl = sources[0] ? sources[0].url : location.href;
                    copyToClipboard(firstUrl);
                    showToast('📋 Stream URL copied to clipboard! (Paste in VLC/Infuse)');
                    menu.classList.remove('show');
                });
            }
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
                showToast('⚠️ Video stream is initializing...');
                return;
            }

            // Open quality / download selection menu
            updateMenu(currentSources, currentTitle);
            menu.classList.toggle('show');
        });

        document.addEventListener('click', () => menu.classList.remove('show'));

        targetContainer.appendChild(btn);
        targetContainer.appendChild(menu);
    }

    /* ==========================================================
       OBSERVER & RUNNER
       ========================================================== */
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
