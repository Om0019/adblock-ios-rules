// ==UserScript==
// @name         X-Video Tube Video Downloader (Mobile Responsive)
// @namespace    https://github.com/Om0019/adblock-ios-rules
// @version      4.0.0
// @description  Mobile-optimized video downloader and direct stream extractor for x-video.tube
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

    const STYLES = `
        /* Responsive Mobile Container */
        .xv-action-bar {
            display: flex;
            align-items: stretch;
            justify-content: space-between;
            gap: 10px;
            width: 100%;
            box-sizing: border-box;
            margin: 12px 0;
            padding: 0;
            clear: both;
        }

        .xv-action-btn {
            flex: 1 1 0;
            min-width: 0;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            padding: 10px 12px;
            font-size: 13px;
            font-weight: 700;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            text-decoration: none !important;
            border-radius: 6px;
            border: none;
            cursor: pointer;
            text-align: center;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            box-sizing: border-box;
            transition: all 0.2s ease;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        }

        .xv-btn-download {
            background: linear-gradient(135deg, #e50914, #b80710);
            color: #ffffff !important;
        }

        .xv-btn-download:hover, .xv-btn-download:active {
            background: linear-gradient(135deg, #ff1a25, #d60813);
        }

        .xv-btn-copy {
            background: #252525;
            color: #eeeeee !important;
            border: 1px solid #3d3d3d;
        }

        .xv-btn-copy:hover, .xv-btn-copy:active {
            background: #333333;
            border-color: #555555;
            color: #ffffff !important;
        }

        .xv-action-btn svg {
            width: 15px;
            height: 15px;
            fill: currentColor;
            flex-shrink: 0;
        }

        /* Unlocked Native Site Download Icon */
        .info-bar__button.xv-unlocked {
            color: #e50914 !important;
        }

        /* Toast notification */
        .xv-toast {
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(18, 18, 18, 0.95);
            color: #ffffff;
            border: 1px solid #e50914;
            padding: 10px 18px;
            border-radius: 30px;
            box-shadow: 0 6px 20px rgba(0,0,0,0.8);
            font-size: 13px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            z-index: 9999999;
            text-align: center;
            max-width: 90vw;
            pointer-events: none;
            animation: xvFade 0.25s ease-out;
        }

        @keyframes xvFade {
            from { opacity: 0; transform: translate(-50%, 10px); }
            to { opacity: 1; transform: translate(-50%, 0); }
        }

        /* Compact styling for small screens */
        @media (max-width: 480px) {
            .xv-action-bar {
                gap: 6px;
                margin: 8px 0;
            }
            .xv-action-btn {
                font-size: 12px;
                padding: 9px 8px;
                gap: 4px;
            }
        }
    `;

    function injectStyles() {
        if (document.getElementById('xv-downloader-styles')) return;
        const style = document.createElement('style');
        style.id = 'xv-downloader-styles';
        style.textContent = STYLES;
        document.head.appendChild(style);
    }

    function showToast(msg) {
        const old = document.querySelector('.xv-toast');
        if (old) old.remove();
        const toast = document.createElement('div');
        toast.className = 'xv-toast';
        toast.textContent = msg;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
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

    function initUI() {
        if (document.getElementById('xv-action-bar-container')) return;

        const infoBar = document.querySelector('.info-bar');
        if (!infoBar) return;

        const data = extractVideoData();
        if (!data.url) {
            setTimeout(initUI, 700);
            return;
        }

        injectStyles();

        const safeTitle = data.title.replace(/[/\\?%*:|"<>]/g, '_') + '.mp4';

        // 1. Unlock the native download icon in the header info-bar
        const nativeDlBtn = infoBar.querySelector('a[title="Download"]');
        if (nativeDlBtn && !nativeDlBtn.classList.contains('xv-unlocked')) {
            nativeDlBtn.classList.add('xv-unlocked');
            nativeDlBtn.removeAttribute('data-action');
            nativeDlBtn.setAttribute('href', data.url);
            nativeDlBtn.setAttribute('download', safeTitle);
            nativeDlBtn.setAttribute('target', '_blank');
            nativeDlBtn.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }

        // 2. Insert Mobile-Responsive Action Bar directly below .info-bar
        const actionBar = document.createElement('div');
        actionBar.className = 'xv-action-bar';
        actionBar.id = 'xv-action-bar-container';

        // Direct Download Button
        const dlBtn = document.createElement('a');
        dlBtn.className = 'xv-action-btn xv-btn-download';
        dlBtn.href = data.url;
        dlBtn.download = safeTitle;
        dlBtn.target = '_blank';
        dlBtn.innerHTML = `
            <svg viewBox="0 0 24 24"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z"/></svg>
            <span>Download MP4</span>
        `;
        dlBtn.addEventListener('click', () => {
            showToast('⬇️ Starting MP4 download...');
        });

        // Copy Stream URL Button
        const copyBtn = document.createElement('button');
        copyBtn.className = 'xv-action-btn xv-btn-copy';
        copyBtn.type = 'button';
        copyBtn.innerHTML = `
            <svg viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
            <span>Copy Stream URL</span>
        `;
        copyBtn.addEventListener('click', (e) => {
            e.preventDefault();
            copyToClipboard(data.url);
            showToast('📋 Stream URL copied to clipboard!');
        });

        actionBar.appendChild(dlBtn);
        actionBar.appendChild(copyBtn);

        // Insert after info-bar without disturbing layout
        infoBar.parentNode.insertBefore(actionBar, infoBar.nextSibling);
    }

    function run() {
        if (location.pathname.includes('/video/') || document.getElementById('kt_player')) {
            initUI();
            setTimeout(initUI, 1000);
            setTimeout(initUI, 2500);
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
