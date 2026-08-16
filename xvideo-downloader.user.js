// ==UserScript==
// @name         X-Video Tube Video Downloader & Model Video Search
// @namespace    https://github.com/Om0019/adblock-ios-rules
// @version      5.0.0
// @description  Mobile-optimized video downloader, direct stream extractor, and instant search filter for model video pages on x-video.tube
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
        /* =========================================
           1. MODEL VIDEO SEARCH BAR STYLES
           ========================================= */
        .xv-model-search-container {
            width: 100%;
            box-sizing: border-box;
            margin: 12px 0 16px 0;
            padding: 0;
            display: flex;
            flex-direction: column;
            gap: 8px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
        }

        .xv-model-search-row {
            display: flex;
            align-items: center;
            gap: 8px;
            width: 100%;
            box-sizing: border-box;
        }

        .xv-search-input-wrapper {
            position: relative;
            flex: 1 1 auto;
            display: flex;
            align-items: center;
        }

        .xv-search-input-wrapper svg.search-icon {
            position: absolute;
            left: 12px;
            width: 16px;
            height: 16px;
            fill: #888888;
            pointer-events: none;
        }

        .xv-model-search-input {
            width: 100%;
            box-sizing: border-box;
            background: #181818;
            border: 1px solid #333333;
            border-radius: 6px;
            color: #ffffff;
            font-size: 14px;
            padding: 10px 36px 10px 38px;
            outline: none;
            transition: border-color 0.2s, box-shadow 0.2s;
        }

        .xv-model-search-input:focus {
            border-color: #e50914;
            box-shadow: 0 0 0 2px rgba(229, 9, 20, 0.25);
            background: #202020;
        }

        .xv-model-search-clear {
            position: absolute;
            right: 10px;
            background: none;
            border: none;
            color: #888888;
            cursor: pointer;
            font-size: 16px;
            line-height: 1;
            padding: 4px 6px;
            display: none;
        }
        .xv-model-search-clear:hover {
            color: #ffffff;
        }

        .xv-search-load-all-btn {
            background: #2a2a2a;
            color: #dddddd;
            border: 1px solid #444444;
            border-radius: 6px;
            padding: 10px 14px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            white-space: nowrap;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            transition: all 0.2s ease;
        }

        .xv-search-load-all-btn:hover {
            background: #383838;
            color: #ffffff;
            border-color: #666666;
        }

        .xv-search-status-bar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-size: 12px;
            color: #999999;
            padding: 0 4px;
        }

        .xv-search-match-count {
            color: #e50914;
            font-weight: 700;
        }

        /* =========================================
           2. VIDEO DOWNLOAD ACTION BAR STYLES
           ========================================= */
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

        .info-bar__button.xv-unlocked {
            color: #e50914 !important;
        }

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

        @media (max-width: 480px) {
            .xv-model-search-row {
                flex-direction: column;
                align-items: stretch;
            }
            .xv-search-load-all-btn {
                justify-content: center;
            }
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
        if (document.getElementById('xv-core-styles')) return;
        const style = document.createElement('style');
        style.id = 'xv-core-styles';
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

    /* ==========================================================
       MODEL VIDEOS INSTANT SEARCH & MULTI-PAGE FETCHER
       ========================================================== */
    function initModelPageSearch() {
        if (document.getElementById('xv-model-search-box')) return;

        // Target: #list_videos_common_videos_list or .thumbs container
        const listContainer = document.getElementById('list_videos_common_videos_list') ||
                              document.querySelector('.main_column .thumbs');
        if (!listContainer) return;

        const thumbsList = listContainer.querySelector('.thumbs__list');
        if (!thumbsList) return;

        injectStyles();

        const searchContainer = document.createElement('div');
        searchContainer.className = 'xv-model-search-container';
        searchContainer.id = 'xv-model-search-box';

        searchContainer.innerHTML = `
            <div class="xv-model-search-row">
                <div class="xv-search-input-wrapper">
                    <svg class="search-icon" viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
                    <input type="text" class="xv-model-search-input" placeholder="Search this model's videos by title/tags..." />
                    <button class="xv-model-search-clear" type="button" title="Clear">✕</button>
                </div>
                <button class="xv-search-load-all-btn" type="button" title="Fetch all paginated videos into this view for searching">
                    <span>⚡ Load All Pages</span>
                </button>
            </div>
            <div class="xv-search-status-bar">
                <span class="xv-search-count-info">Showing all videos</span>
                <span class="xv-search-pages-info"></span>
            </div>
        `;

        // Insert before thumbs list (or right under heading)
        const heading = listContainer.querySelector('.heading');
        if (heading && heading.nextSibling) {
            heading.parentNode.insertBefore(searchContainer, heading.nextSibling);
        } else {
            listContainer.insertBefore(searchContainer, thumbsList);
        }

        const input = searchContainer.querySelector('.xv-model-search-input');
        const clearBtn = searchContainer.querySelector('.xv-model-search-clear');
        const loadAllBtn = searchContainer.querySelector('.xv-search-load-all-btn');
        const countInfo = searchContainer.querySelector('.xv-search-count-info');
        const pagesInfo = searchContainer.querySelector('.xv-search-pages-info');

        function filterVideos() {
            const query = input.value.trim().toLowerCase();
            clearBtn.style.display = query ? 'block' : 'none';

            const items = thumbsList.querySelectorAll('.item.thumb--videos');
            let visibleCount = 0;

            items.forEach(item => {
                const titleEl = item.querySelector('a[title]') || item.querySelector('.title') || item;
                const titleText = (titleEl.getAttribute('title') || titleEl.textContent || '').toLowerCase();
                
                if (!query || titleText.includes(query)) {
                    item.style.display = '';
                    visibleCount++;
                } else {
                    item.style.display = 'none';
                }
            });

            if (query) {
                countInfo.innerHTML = `Found <span class="xv-search-match-count">${visibleCount}</span> of ${items.length} videos matching "<em>${escapeHTML(query)}</em>"`;
            } else {
                countInfo.textContent = `Showing all ${items.length} videos`;
            }
        }

        input.addEventListener('input', filterVideos);
        clearBtn.addEventListener('click', () => {
            input.value = '';
            filterVideos();
            input.focus();
        });

        // Load all pagination pages dynamically
        let isLoadingPages = false;
        loadAllBtn.addEventListener('click', async () => {
            if (isLoadingPages) return;
            isLoadingPages = true;
            loadAllBtn.disabled = true;

            const pagination = document.querySelector('.pagination-holder ul') || document.querySelector('.pagination ul');
            if (!pagination) {
                showToast('ℹ️ All videos are already on this page.');
                loadAllBtn.style.display = 'none';
                return;
            }

            // Find all page links
            const links = Array.from(pagination.querySelectorAll('a[href]'))
                               .map(a => a.getAttribute('href'))
                               .filter(h => h && h.match(/\/videos\/\d+\//));
            
            const uniquePageHrefs = [...new Set(links)];

            if (uniquePageHrefs.length === 0) {
                showToast('ℹ️ No additional pages found.');
                loadAllBtn.style.display = 'none';
                return;
            }

            let loaded = 0;
            const total = uniquePageHrefs.length;

            loadAllBtn.innerHTML = `<span>⏳ Loading 0/${total} pages...</span>`;

            for (const href of uniquePageHrefs) {
                try {
                    const fullUrl = href.startsWith('http') ? href : window.location.origin + href;
                    const res = await fetch(fullUrl);
                    const html = await res.text();
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(html, 'text/html');

                    const newItems = doc.querySelectorAll('#list_videos_common_videos_list .thumbs__list .item.thumb--videos, .thumbs__list .item.thumb--videos');
                    newItems.forEach(item => {
                        // Prevent duplicate IDs
                        const link = item.querySelector('a[href]');
                        if (link && !thumbsList.querySelector(`a[href="${link.getAttribute('href')}"]`)) {
                            thumbsList.appendChild(document.importNode(item, true));
                        }
                    });

                    loaded++;
                    loadAllBtn.innerHTML = `<span>⏳ Loading ${loaded}/${total} pages...</span>`;
                } catch (e) {
                    console.error('Error fetching page:', href, e);
                }
            }

            loadAllBtn.innerHTML = `<span>✅ All Pages Loaded (${thumbsList.querySelectorAll('.item.thumb--videos').length} total)</span>`;
            pagesInfo.textContent = `All ${total + 1} pages combined`;
            showToast(`✅ Loaded all videos! You can now search across every page.`);
            filterVideos();
        });
    }

    function escapeHTML(str) {
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    /* ==========================================================
       VIDEO DOWNLOAD ACTION BAR (SINGLE VIDEO PAGES)
       ========================================================== */
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

    function initVideoDownloadUI() {
        if (document.getElementById('xv-action-bar-container')) return;

        const infoBar = document.querySelector('.info-bar');
        if (!infoBar) return;

        const data = extractVideoData();
        if (!data.url) {
            setTimeout(initVideoDownloadUI, 700);
            return;
        }

        injectStyles();

        const safeTitle = data.title.replace(/[/\\?%*:|"<>]/g, '_') + '.mp4';

        // 1. Unlock native site download icon
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

        // 2. Insert mobile-responsive action bar
        const actionBar = document.createElement('div');
        actionBar.className = 'xv-action-bar';
        actionBar.id = 'xv-action-bar-container';

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

        infoBar.parentNode.insertBefore(actionBar, infoBar.nextSibling);
    }

    /* ==========================================================
       MAIN RUNNER
       ========================================================== */
    function run() {
        if (location.pathname.includes('/models/') || document.getElementById('list_videos_common_videos_list')) {
            initModelPageSearch();
            setTimeout(initModelPageSearch, 800);
        }
        if (location.pathname.includes('/video/') || document.getElementById('kt_player')) {
            initVideoDownloadUI();
            setTimeout(initVideoDownloadUI, 800);
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
