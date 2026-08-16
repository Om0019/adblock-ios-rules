// ==UserScript==
// @name         X-Video Tube Video Downloader (Turbo Multi-Threaded)
// @namespace    https://github.com/Om0019/adblock-ios-rules
// @version      2.1.0
// @description  High-speed multi-threaded MP4 video downloader for x-video.tube with parallel chunk acceleration & CORS bypass
// @author       Antigravity
// @match        https://x-video.tube/*
// @match        https://*.x-video.tube/*
// @icon         https://x-video.tube/favicon-32x32.png
// @grant        GM_xmlhttpRequest
// @grant        GM.xmlHttpRequest
// @connect      x-video.tube
// @connect      *.x-video.tube
// @connect      *
// @run-at       document-end
// ==/UserScript==

(function () {
    'use strict';

    const THREAD_COUNT = 6; // Number of parallel chunk connections

    // UI Styles
    const STYLES = `
        .xv-download-btn-wrapper {
            display: inline-flex;
            align-items: center;
            margin-left: 10px;
            position: relative;
            vertical-align: middle;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
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
            position: relative;
            overflow: hidden;
        }
        .xv-download-btn:hover {
            background: linear-gradient(135deg, #ff1a25, #d60813);
            box-shadow: 0 4px 12px rgba(229, 9, 20, 0.6);
            transform: translateY(-1px);
        }
        .xv-download-btn.downloading {
            background: #222222 !important;
            border: 1px solid #e50914;
            cursor: wait;
            transform: none !important;
        }
        .xv-download-btn svg {
            width: 16px;
            height: 16px;
            fill: currentColor;
            flex-shrink: 0;
        }
        .xv-progress-bar {
            position: absolute;
            bottom: 0;
            left: 0;
            height: 4px;
            background: #00ff66;
            width: 0%;
            transition: width 0.2s ease;
        }
        .xv-quality-badge {
            background: rgba(0, 0, 0, 0.4);
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
            min-width: 220px;
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
            cursor: pointer;
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

    // CORS-Bypassing HTTP Request Wrapper
    function makeRequest(url, headers = {}, responseType = 'arraybuffer') {
        const gmReq = (typeof GM_xmlhttpRequest !== 'undefined') ? GM_xmlhttpRequest :
                      (typeof GM !== 'undefined' && GM.xmlHttpRequest) ? GM.xmlHttpRequest : null;

        if (gmReq) {
            return new Promise((resolve, reject) => {
                gmReq({
                    method: 'GET',
                    url: url,
                    headers: headers,
                    responseType: responseType,
                    onload: (res) => {
                        if (res.status >= 200 && res.status < 400) {
                            resolve({
                                status: res.status,
                                response: res.response,
                                headers: {
                                    get: (h) => {
                                        const match = res.responseHeaders.match(new RegExp('^' + h + ':\\s*(.*)$', 'im'));
                                        return match ? match[1].trim() : null;
                                    }
                                }
                            });
                        } else {
                            reject(new Error(`HTTP ${res.status}: ${res.statusText}`));
                        }
                    },
                    onerror: (err) => reject(err),
                    ontimeout: () => reject(new Error('Request timed out'))
                });
            });
        }

        // Standard fetch fallback
        return fetch(url, { headers: headers }).then(async (res) => {
            if (!res.ok && res.status !== 206) throw new Error(`HTTP ${res.status}`);
            const buf = await res.arrayBuffer();
            return {
                status: res.status,
                response: buf,
                headers: res.headers
            };
        });
    }

    // Extract video stream metadata
    function extractVideoData() {
        const videoData = {
            title: document.title.replace(/ - Free porn tube.*$/i, '').trim() || 'video',
            sources: []
        };

        try {
            if (window.player_obj && window.player_obj.conf) {
                const conf = window.player_obj.conf;
                if (conf.video_title) videoData.title = conf.video_title;
                if (conf.video_url) {
                    videoData.sources.push({
                        label: conf.video_url_fhd ? '1080p FHD (Turbo)' : 'HD Quality (Turbo)',
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

        if (videoData.sources.length === 0) {
            const scripts = document.querySelectorAll('script:not([src])');
            for (const script of scripts) {
                const text = script.textContent;
                if (text.includes('video_url')) {
                    const urlMatch = text.match(/video_url:\s*['"]([^'"]+)['"]/);
                    const titleMatch = text.match(/video_title:\s*['"]([^'"]+)['"]/);
                    const altMatch = text.match(/video_alt_url:\s*['"]([^'"]+)['"]/);
                    const isFhd = text.includes("video_url_fhd: '1'") || text.includes('video_url_fhd: "1"');

                    if (titleMatch && titleMatch[1]) videoData.title = titleMatch[1];
                    if (urlMatch && urlMatch[1]) {
                        videoData.sources.push({
                            label: isFhd ? '1080p FHD (Turbo)' : 'HD Quality (Turbo)',
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

    // High-Speed Multi-Threaded Parallel Chunk Downloader
    async function turboDownload(url, filename, progressCallback) {
        // Step 1: Probe total file size
        const probe = await makeRequest(url, { 'Range': 'bytes=0-0' });
        let totalBytes = 0;
        const cr = probe.headers.get('Content-Range');
        if (cr) {
            const match = cr.match(/\/(\d+)/);
            if (match) totalBytes = parseInt(match[1], 10);
        }

        if (!totalBytes) {
            throw new Error('Unable to determine video size for multi-threading');
        }

        const chunkSize = Math.ceil(totalBytes / THREAD_COUNT);
        const chunks = new Array(THREAD_COUNT);
        let downloadedBytes = 0;

        progressCallback(0, totalBytes);

        // Fetch each segment in parallel
        const promises = [];
        for (let i = 0; i < THREAD_COUNT; i++) {
            const start = i * chunkSize;
            const end = Math.min(start + chunkSize - 1, totalBytes - 1);

            promises.push((async (index, s, e) => {
                const res = await makeRequest(url, { 'Range': `bytes=${s}-${e}` });
                chunks[index] = res.response;
                downloadedBytes += (e - s + 1);
                progressCallback(downloadedBytes, totalBytes);
            })(i, start, end));
        }

        await Promise.all(promises);

        // Build Blob and trigger download
        const blob = new Blob(chunks, { type: 'video/mp4' });
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
    }

    // Inject UI on Video Page
    function initVideoPageDownloader() {
        if (document.getElementById('xv-download-button')) return;

        const targetContainer = document.querySelector('.info-bar .vote-block') ||
                                document.querySelector('.info-bar') ||
                                document.querySelector('.player-holder') ||
                                document.querySelector('.headline');

        if (!targetContainer) return;

        const videoData = extractVideoData();
        if (!videoData.sources || videoData.sources.length === 0) {
            setTimeout(initVideoPageDownloader, 800);
            return;
        }

        injectStyles();

        const wrapper = document.createElement('div');
        wrapper.className = 'xv-download-btn-wrapper';
        wrapper.id = 'xv-download-button';

        const mainSource = videoData.sources[0];
        const safeTitle = (videoData.title || 'video').replace(/[/\\?%*:|"<>]/g, '_') + '.mp4';

        wrapper.innerHTML = `
            <button class="xv-download-btn" type="button">
                <svg viewBox="0 0 24 24">
                    <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z"/>
                </svg>
                <span class="xv-btn-text">⚡ Turbo Download</span>
                <span class="xv-quality-badge">${mainSource.label}</span>
                <div class="xv-progress-bar"></div>
            </button>
        `;

        if (videoData.sources.length > 1) {
            const dropdown = document.createElement('div');
            dropdown.className = 'xv-download-dropdown';
            dropdown.innerHTML = videoData.sources.map(s => `
                <div class="xv-download-item" data-url="${s.url}">
                    <span>${s.label}</span>
                    <span>⚡ Turbo</span>
                </div>
            `).join('') + `
                <a href="${mainSource.url}" class="xv-download-item" target="_blank" download="${safeTitle}">
                    <span>Standard Direct Download</span>
                    <span>🔗</span>
                </a>
            `;

            wrapper.appendChild(dropdown);
            wrapper.addEventListener('mouseenter', () => dropdown.classList.add('show'));
            wrapper.addEventListener('mouseleave', () => dropdown.classList.remove('show'));

            dropdown.querySelectorAll('.xv-download-item[data-url]').forEach(item => {
                item.addEventListener('click', () => {
                    startDownload(item.getAttribute('data-url'));
                });
            });
        }

        const btn = wrapper.querySelector('.xv-download-btn');
        const btnText = wrapper.querySelector('.xv-btn-text');
        const progressBar = wrapper.querySelector('.xv-progress-bar');
        let isDownloading = false;

        async function startDownload(targetUrl) {
            if (isDownloading) return;
            isDownloading = true;
            btn.classList.add('downloading');

            try {
                await turboDownload(targetUrl || mainSource.url, safeTitle, (received, total) => {
                    const pct = Math.min(100, Math.round((received / total) * 100));
                    const mbReceived = (received / (1024 * 1024)).toFixed(1);
                    const mbTotal = (total / (1024 * 1024)).toFixed(1);
                    btnText.textContent = `⚡ Downloading ${pct}% (${mbReceived}/${mbTotal}MB)`;
                    progressBar.style.width = `${pct}%`;
                });
                btnText.textContent = '✅ Download Complete!';
                setTimeout(() => {
                    btnText.textContent = '⚡ Turbo Download';
                    btn.classList.remove('downloading');
                    progressBar.style.width = '0%';
                    isDownloading = false;
                }, 3500);
            } catch (err) {
                console.error('Turbo download error:', err);
                btnText.textContent = 'Standard Download...';
                const a = document.createElement('a');
                a.href = targetUrl || mainSource.url;
                a.download = safeTitle;
                a.target = '_blank';
                a.click();
                setTimeout(() => {
                    btnText.textContent = '⚡ Turbo Download';
                    btn.classList.remove('downloading');
                    isDownloading = false;
                }, 2000);
            }
        }

        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            startDownload(mainSource.url);
        });

        targetContainer.appendChild(wrapper);
    }

    function run() {
        if (window.location.pathname.includes('/video/') || document.querySelector('#kt_player')) {
            initVideoPageDownloader();
            setTimeout(initVideoPageDownloader, 1000);
            setTimeout(initVideoPageDownloader, 2500);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', run);
    } else {
        run();
    }

    let lastUrl = location.href;
    new MutationObserver(() => {
        const url = location.href;
        if (url !== lastUrl) {
            lastUrl = url;
            run();
        }
    }).observe(document, { subtree: true, childList: true });

})();
