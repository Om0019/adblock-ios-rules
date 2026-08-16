// ==UserScript==
// @name         X-Video Tube Video Downloader & Stream Extractor
// @namespace    https://github.com/Om0019/adblock-ios-rules
// @version      3.0.0
// @description  High-speed video downloader, direct stream link extractor, and multi-threaded chunk downloader for x-video.tube
// @author       Antigravity
// @match        https://x-video.tube/*
// @match        https://*.x-video.tube/*
// @icon         https://x-video.tube/favicon-32x32.png
// @grant        GM_xmlhttpRequest
// @grant        GM.xmlHttpRequest
// @grant        GM_setClipboard
// @connect      x-video.tube
// @connect      *.x-video.tube
// @connect      *
// @run-at       document-end
// ==/UserScript==

(function () {
    'use strict';

    const THREAD_COUNT = 4;

    const STYLES = `
        .xv-download-btn-wrapper {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            margin-left: 10px;
            position: relative;
            vertical-align: middle;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
        }
        .xv-btn {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: linear-gradient(135deg, #e50914, #b80710);
            color: #ffffff !important;
            font-weight: 700;
            font-size: 13px;
            padding: 8px 14px;
            border-radius: 4px;
            text-decoration: none !important;
            border: none;
            cursor: pointer;
            box-shadow: 0 2px 8px rgba(229, 9, 20, 0.4);
            transition: all 0.2s ease;
            position: relative;
            overflow: hidden;
            white-space: nowrap;
        }
        .xv-btn:hover {
            background: linear-gradient(135deg, #ff1a25, #d60813);
            box-shadow: 0 4px 12px rgba(229, 9, 20, 0.6);
            transform: translateY(-1px);
        }
        .xv-btn-copy {
            background: #2a2a2a !important;
            border: 1px solid #444 !important;
            box-shadow: none !important;
            color: #eee !important;
        }
        .xv-btn-copy:hover {
            background: #3a3a3a !important;
            border-color: #666 !important;
        }
        .xv-btn.downloading {
            background: #1e1e1e !important;
            border: 1px solid #e50914;
            cursor: wait;
            transform: none !important;
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
        .xv-toast {
            position: fixed;
            bottom: 24px;
            right: 24px;
            background: #111111;
            color: #ffffff;
            border: 1px solid #e50914;
            padding: 12px 20px;
            border-radius: 6px;
            box-shadow: 0 8px 24px rgba(0,0,0,0.8);
            font-size: 14px;
            z-index: 999999;
            animation: xvSlideIn 0.3s ease-out;
        }
        @keyframes xvSlideIn {
            from { transform: translateY(20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
    `;

    function injectStyles() {
        if (document.getElementById('xv-downloader-styles')) return;
        const style = document.createElement('style');
        style.id = 'xv-downloader-styles';
        style.textContent = STYLES;
        document.head.appendChild(style);
    }

    function showToast(msg, duration = 3500) {
        const old = document.querySelector('.xv-toast');
        if (old) old.remove();
        const toast = document.createElement('div');
        toast.className = 'xv-toast';
        toast.textContent = msg;
        document.body.appendChild(toast);
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

    function extractVideoData() {
        const videoData = {
            title: document.title.replace(/ - Free porn tube.*$/i, '').trim() || 'video',
            url: null,
            fhd: false
        };

        try {
            if (window.player_obj && window.player_obj.conf) {
                const conf = window.player_obj.conf;
                if (conf.video_title) videoData.title = conf.video_title;
                if (conf.video_url) videoData.url = conf.video_url;
                if (conf.video_url_fhd) videoData.fhd = true;
            }
        } catch (e) {}

        if (!videoData.url) {
            const scripts = document.querySelectorAll('script:not([src])');
            for (const script of scripts) {
                const text = script.textContent;
                if (text.includes('video_url')) {
                    const urlMatch = text.match(/video_url:\s*['"]([^'"]+)['"]/);
                    const titleMatch = text.match(/video_title:\s*['"]([^'"]+)['"]/);
                    if (titleMatch && titleMatch[1]) videoData.title = titleMatch[1];
                    if (urlMatch && urlMatch[1]) videoData.url = urlMatch[1];
                    if (text.includes("video_url_fhd: '1'")) videoData.fhd = true;
                    break;
                }
            }
        }

        if (!videoData.url) {
            const videoEl = document.querySelector('video[src]');
            if (videoEl) videoData.url = videoEl.src;
        }

        return videoData;
    }

    function makeRequest(url, headers = {}) {
        const gmReq = (typeof GM_xmlhttpRequest !== 'undefined') ? GM_xmlhttpRequest :
                      (typeof GM !== 'undefined' && GM.xmlHttpRequest) ? GM.xmlHttpRequest : null;

        if (gmReq) {
            return new Promise((resolve, reject) => {
                gmReq({
                    method: 'GET',
                    url: url,
                    headers: headers,
                    responseType: 'arraybuffer',
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
                            reject(new Error(`Server returned HTTP ${res.status}`));
                        }
                    },
                    onerror: (e) => reject(new Error('Network error (CORS or Blocked)')),
                    ontimeout: () => reject(new Error('Connection timed out'))
                });
            });
        }

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

    async function downloadWithChunks(url, filename, progressCb) {
        const probe = await makeRequest(url, { 'Range': 'bytes=0-0' });
        const cr = probe.headers.get('Content-Range');
        let totalBytes = 0;
        if (cr) {
            const match = cr.match(/\/(\d+)/);
            if (match) totalBytes = parseInt(match[1], 10);
        }

        if (!totalBytes) throw new Error('Could not get total video size.');

        const chunkSize = Math.ceil(totalBytes / THREAD_COUNT);
        const chunks = new Array(THREAD_COUNT);
        let downloaded = 0;

        const promises = [];
        for (let i = 0; i < THREAD_COUNT; i++) {
            const s = i * chunkSize;
            const e = Math.min(s + chunkSize - 1, totalBytes - 1);
            promises.push((async () => {
                const res = await makeRequest(url, { 'Range': `bytes=${s}-${e}` });
                chunks[i] = res.response;
                downloaded += (e - s + 1);
                progressCb(downloaded, totalBytes);
            })());
        }

        await Promise.all(promises);

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

    function initButtons() {
        if (document.getElementById('xv-download-container')) return;

        const target = document.querySelector('.info-bar .vote-block') ||
                       document.querySelector('.info-bar') ||
                       document.querySelector('.player-holder');

        if (!target) return;

        const data = extractVideoData();
        if (!data.url) {
            setTimeout(initButtons, 800);
            return;
        }

        injectStyles();

        const container = document.createElement('div');
        container.className = 'xv-download-btn-wrapper';
        container.id = 'xv-download-container';

        const safeTitle = data.title.replace(/[/\\?%*:|"<>]/g, '_') + '.mp4';

        // 1. Download Button
        const dlBtn = document.createElement('button');
        dlBtn.className = 'xv-btn';
        dlBtn.type = 'button';
        dlBtn.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z"/></svg>
            <span class="xv-txt">Download MP4</span>
            <div class="xv-progress-bar"></div>
        `;

        // 2. Copy Direct Link Button (For Downloader Apps like Downie / Documents / VLC / aria2)
        const copyBtn = document.createElement('button');
        copyBtn.className = 'xv-btn xv-btn-copy';
        copyBtn.type = 'button';
        copyBtn.title = 'Copy direct unthrottled stream URL for external download managers';
        copyBtn.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
            <span>Copy Stream URL</span>
        `;

        let isRunning = false;
        dlBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            if (isRunning) return;
            isRunning = true;
            dlBtn.classList.add('downloading');
            const txt = dlBtn.querySelector('.xv-txt');
            const bar = dlBtn.querySelector('.xv-progress-bar');

            try {
                await downloadWithChunks(data.url, safeTitle, (done, total) => {
                    const pct = Math.round((done / total) * 100);
                    txt.textContent = `Downloading ${pct}%...`;
                    bar.style.width = `${pct}%`;
                });
                txt.textContent = '✅ Saved!';
                showToast('✅ Video downloaded successfully!');
                setTimeout(() => {
                    txt.textContent = 'Download MP4';
                    bar.style.width = '0%';
                    dlBtn.classList.remove('downloading');
                    isRunning = false;
                }, 3000);
            } catch (err) {
                console.warn('In-browser chunk failed, using direct download:', err);
                showToast('⚡ Opening direct high-speed video stream...');
                txt.textContent = 'Starting download...';

                // Direct download trigger
                const a = document.createElement('a');
                a.href = data.url;
                a.download = safeTitle;
                a.target = '_blank';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);

                setTimeout(() => {
                    txt.textContent = 'Download MP4';
                    dlBtn.classList.remove('downloading');
                    isRunning = false;
                }, 2500);
            }
        });

        copyBtn.addEventListener('click', (e) => {
            e.preventDefault();
            copyToClipboard(data.url);
            showToast('📋 Direct video stream URL copied to clipboard!');
        });

        container.appendChild(dlBtn);
        container.appendChild(copyBtn);
        target.appendChild(container);
    }

    function run() {
        if (location.pathname.includes('/video/') || document.getElementById('kt_player')) {
            initButtons();
            setTimeout(initButtons, 1000);
            setTimeout(initButtons, 2500);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', run);
    } else {
        run();
    }

    let last = location.href;
    new MutationObserver(() => {
        if (location.href !== last) {
            last = location.href;
            run();
        }
    }).observe(document, { subtree: true, childList: true });

})();
