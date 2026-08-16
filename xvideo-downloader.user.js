// ==UserScript==
// @name         Pornhub Mobile 2-Column Grid & Bulk Downloader
// @namespace    https://github.com/Om0019/adblock-ios-rules
// @version      23.0.0
// @description  Flawless multi-section handling (Most Recent + Uploaded), bulletproof infinite scroll, and bulk downloader.
// @author       Antigravity
// @match        *://*.pornhub.com/*
// @match        *://pornhub.com/*
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

    const selectedVideos = new Map();
    let isFetchingNextPage = false;
    let noMorePages = false;

    /* ==========================================================
       1. STYLES (Multi-Section Safe Mobile Grid)
       ========================================================== */
    const STYLES = `
        @media (max-width: 768px) {
            /* 📱 Force grid ONLY on the main video lists, but allow Shorties/Most Recent to stay normal if needed */
            ul.videoList,
            ul.videos,
            ul#showAllChanelVideos,
            ul#videoCategory {
                display: grid !important;
                grid-template-columns: repeat(2, 1fr) !important;
                gap: 8px !important;
                padding: 8px !important;
                margin: 0 !important;
                width: 100% !important;
                box-sizing: border-box !important;
            }

            /* Make "Most Recent" span full width since it's only 1 video usually */
            ul.modelShorties__recent__videos {
                display: block !important;
                padding: 8px !important;
            }

            /* Each individual video list item */
            ul.videoList > li,
            ul.videos > li,
            li.videoBox, 
            li.videoblock {
                width: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                display: flex !important;
                flex-direction: column !important;
                height: auto !important;
                float: none !important;
            }

            /* The internal wrapper for the video content */
            .videoWrapper,
            .wrapVideoBlock {
                display: flex !important;
                flex-direction: column !important;
                width: 100% !important;
                flex-grow: 1 !important;
            }

            /* The image container */
            .singleVideo,
            .phimage,
            a.imageLink,
            a.img {
                width: 100% !important;
                height: auto !important;
                aspect-ratio: 16/9 !important;
                position: relative !important;
                overflow: hidden !important;
                border-radius: 6px !important;
                display: block !important;
                background: #111 !important;
            }

            .singleVideo img,
            .phimage img,
            a.imageLink img,
            a.img img {
                width: 100% !important;
                height: 100% !important;
                object-fit: cover !important;
                position: absolute !important;
                top: 0 !important;
                left: 0 !important;
            }

            /* The title container */
            .underThumb,
            .vidTitleWrapper,
            .thumbnail-info-wrapper {
                padding: 6px 0 !important;
                width: 100% !important;
                display: flex !important;
                flex-direction: column !important;
            }

            .underThumb-info {
                width: 100% !important;
            }

            .title a, .title, .thumbnailTitle {
                font-size: 11px !important;
                font-weight: 600 !important;
                color: #fff !important;
                line-height: 1.3 !important;
                margin: 0 !important;
                white-space: normal !important;
                display: -webkit-box !important;
                -webkit-line-clamp: 2 !important;
                -webkit-box-orient: vertical !important;
                overflow: hidden !important;
                text-decoration: none !important;
            }

            /* Hide clutter elements (views, more button, etc) */
            .views, .added, .moreActionKebabMenuButton, .video-actions, .rating-container {
                display: none !important;
            }
        }

        /* 🔘 Checkboxes on video thumbnails */
        .xv-card-checkbox-wrapper {
            position: absolute !important;
            top: 4px !important;
            left: 4px !important;
            z-index: 2147483647 !important;
            cursor: pointer !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            width: 32px !important;
            height: 32px !important;
            border-radius: 6px !important;
            background: rgba(0, 0, 0, 0.75) !important;
            border: 2px solid rgba(255, 255, 255, 0.95) !important;
            box-shadow: 0 4px 12px rgba(0,0,0,0.9) !important;
            transition: all 0.2s ease !important;
            backdrop-filter: blur(4px) !important;
            -webkit-backdrop-filter: blur(4px) !important;
        }

        .xv-card-checkbox-wrapper.checked {
            background: #e50914 !important;
            border-color: #ffffff !important;
            box-shadow: 0 0 16px rgba(229, 9, 20, 0.9) !important;
            transform: scale(1.1) !important;
        }

        .xv-card-checkbox-wrapper svg {
            width: 20px !important;
            height: 20px !important;
            fill: none !important;
            stroke: #ffffff !important;
            stroke-width: 3 !important;
            stroke-linecap: round !important;
            stroke-linejoin: round !important;
            opacity: 0 !important;
            transition: opacity 0.2s ease !important;
        }

        .xv-card-checkbox-wrapper.checked svg {
            opacity: 1 !important;
        }

        /* 🚀 Floating Bottom Dock */
        .xv-bulk-dock {
            position: fixed !important;
            bottom: 24px !important;
            left: 50% !important;
            transform: translateX(-50%) translateY(150px) !important;
            background: rgba(20, 20, 20, 0.95) !important;
            backdrop-filter: blur(16px) !important;
            -webkit-backdrop-filter: blur(16px) !important;
            border: 1px solid rgba(229, 9, 20, 0.5) !important;
            border-radius: 30px !important;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.9) !important;
            padding: 8px 16px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            gap: 12px !important;
            z-index: 2147483647 !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
            width: 90vw !important;
            max-width: 400px !important;
            transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) !important;
        }

        .xv-bulk-dock.show {
            transform: translateX(-50%) translateY(0) !important;
        }

        .xv-dock-count {
            color: #ffffff !important;
            font-size: 14px !important;
            font-weight: 700 !important;
            background: #e50914 !important;
            padding: 6px 12px !important;
            border-radius: 16px !important;
            display: flex !important;
            align-items: center !important;
            gap: 6px !important;
        }

        .xv-dock-btn {
            background: #ffffff !important;
            color: #e50914 !important;
            border: none !important;
            border-radius: 20px !important;
            padding: 8px 16px !important;
            font-size: 14px !important;
            font-weight: 800 !important;
            cursor: pointer !important;
            display: inline-flex !important;
            align-items: center !important;
            gap: 6px !important;
        }

        .xv-dock-btn.secondary {
            background: transparent !important;
            color: #aaaaaa !important;
            padding: 8px !important;
            font-size: 13px !important;
        }

        .xv-bulk-toast {
            position: fixed !important;
            bottom: 90px !important;
            left: 50% !important;
            transform: translateX(-50%) !important;
            background: rgba(16, 16, 16, 0.95) !important;
            color: #ffffff !important;
            border: 1px solid #e50914 !important;
            padding: 12px 24px !important;
            border-radius: 30px !important;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.9) !important;
            font-size: 14px !important;
            font-weight: 600 !important;
            z-index: 2147483647 !important;
            text-align: center !important;
            pointer-events: none !important;
            opacity: 0 !important;
            transition: opacity 0.3s ease !important;
        }

        .xv-bulk-toast.show {
            opacity: 1 !important;
        }

        .xv-infinite-loader {
            width: 100% !important;
            text-align: center !important;
            padding: 30px 0 !important;
            color: #ffffff !important;
            font-weight: 700 !important;
            font-size: 14px !important;
            grid-column: 1 / -1 !important;
        }
    `;

    function injectStyles() {
        if (document.getElementById('xv-bulk-styles')) return;
        const style = document.createElement('style');
        style.id = 'xv-bulk-styles';
        style.textContent = STYLES;
        (document.head || document.documentElement).appendChild(style);
    }

    function showToast(msg, duration = 3000) {
        let toast = document.getElementById('xv-bulk-toast-msg');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'xv-bulk-toast-msg';
            toast.className = 'xv-bulk-toast';
            document.body.appendChild(toast);
        }
        
        toast.classList.remove('show');
        void toast.offsetWidth;
        toast.innerHTML = msg;
        toast.classList.add('show');

        if (toast.hideTimeout) clearTimeout(toast.hideTimeout);
        toast.hideTimeout = setTimeout(() => toast.classList.remove('show'), duration);
    }

    function copyToClipboard(text) {
        if (typeof GM_setClipboard !== 'undefined') {
            GM_setClipboard(text);
        } else {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
        }
    }

    /* ==========================================================
       2. STREAM EXTRACTOR
       ========================================================== */
    async function extractRealStreamFromPage(videoPageUrl) {
        try {
            const res = await fetch(videoPageUrl, { headers: { 'Referer': location.href } });
            const html = await res.text();

            const flashvarsMatch = html.match(/var flashvars_\d+\s*=\s*({.*?});/);
            if (flashvarsMatch) {
                try {
                    const data = JSON.parse(flashvarsMatch[1]);
                    const defs = (data.mediaDefinitions || []).filter(d => d.videoUrl && !d.videoUrl.includes('/ads/'));
                    if (defs.length > 0) {
                        defs.sort((a, b) => (parseInt(b.quality, 10) || 0) - (parseInt(a.quality, 10) || 0));
                        return defs[0].videoUrl;
                    }
                } catch (e) {
                    console.error('JSON parse error:', e);
                }
            }

            const m3u8Match = html.match(/https?:\/\/[^"'\s]+\.m3u8[^"'\s]*/);
            if (m3u8Match && !m3u8Match[0].includes('/ads/')) return m3u8Match[0].replace(/\\/g, '');
        } catch (e) {
            console.error('Fetch error:', e);
        }
        return null;
    }

    /* ==========================================================
       3. FLOATING DOCK UI
       ========================================================== */
    function updateDockUI() {
        let dock = document.getElementById('xv-bulk-action-dock');
        const count = selectedVideos.size;

        if (!dock) {
            dock = document.createElement('div');
            dock.className = 'xv-bulk-dock';
            dock.id = 'xv-bulk-action-dock';
            
            dock.innerHTML = `
                <div class="xv-dock-count">🛒 <span>0</span></div>
                <div style="display:flex; gap:10px;">
                    <button class="xv-dock-btn" id="xv-bulk-copy-btn">🚀 Copy Links</button>
                    <button class="xv-dock-btn secondary" id="xv-bulk-clear-btn">Clear</button>
                </div>
            `;
            
            document.body.appendChild(dock);

            dock.querySelector('#xv-bulk-copy-btn').addEventListener('click', async (e) => {
                const btn = e.target;
                if (selectedVideos.size === 0) return;
                
                btn.disabled = true;
                const items = Array.from(selectedVideos.values());
                const extractedUrls = [];

                showToast(`⏳ Extracting ${items.length} videos...`);

                for (let i = 0; i < items.length; i++) {
                    btn.textContent = `${i + 1}/${items.length}`;
                    const streamUrl = await extractRealStreamFromPage(items[i].url);
                    if (streamUrl) extractedUrls.push(streamUrl);
                }

                if (extractedUrls.length > 0) {
                    copyToClipboard(extractedUrls.join('\n'));
                    btn.textContent = '✅ Done';
                    showToast(`✅ Copied ${extractedUrls.length} links!`);
                    setTimeout(() => dock.querySelector('#xv-bulk-clear-btn').click(), 2000);
                } else {
                    showToast('❌ Failed to extract streams.');
                    btn.textContent = '🚀 Copy Links';
                }
                btn.disabled = false;
            });

            dock.querySelector('#xv-bulk-clear-btn').addEventListener('click', () => {
                selectedVideos.clear();
                document.querySelectorAll('.xv-card-checkbox-wrapper.checked').forEach(cb => cb.classList.remove('checked'));
                updateDockUI();
            });
        }

        if (count > 0) {
            dock.querySelector('.xv-dock-count span').textContent = count;
            dock.querySelector('#xv-bulk-copy-btn').textContent = '🚀 Copy Links';
            dock.classList.add('show');
        } else {
            dock.classList.remove('show');
        }
    }

    /* ==========================================================
       4. ATTACH CHECKBOXES TO CARDS
       ========================================================== */
    function scanCards() {
        injectStyles();

        // Get mobile list items (which don't have videoBox class) and desktop list items
        const cards = document.querySelectorAll('ul.videoList > li, ul.videos > li, li.videoBox, li.videoblock, li.pcVideoListItem');

        cards.forEach(card => {
            if (card.dataset.xvHasBulkCheckbox === 'true') return;

            const link = card.querySelector('a[href*="viewkey="]');
            if (!link) return;

            const href = link.getAttribute('href');
            const fullUrl = href.startsWith('http') ? href : (window.location.origin + href);
            const title = (card.querySelector('.title a, .title') || link).textContent.trim() || 'video';

            card.dataset.xvHasBulkCheckbox = 'true';

            // IMPORTANT: Inject checkbox directly into the top image wrapper
            const injectTarget = card.querySelector('.singleVideo, .phimage, a.imageLink, a.img') || card.querySelector('.videoWrapper') || card;
            if (window.getComputedStyle(injectTarget).position === 'static') {
                injectTarget.style.position = 'relative';
            }

            const checkbox = document.createElement('div');
            checkbox.className = 'xv-card-checkbox-wrapper';
            if (selectedVideos.has(fullUrl)) checkbox.classList.add('checked');
            
            checkbox.innerHTML = `<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>`;

            checkbox.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                if (checkbox.classList.contains('checked')) {
                    checkbox.classList.remove('checked');
                    selectedVideos.delete(fullUrl);
                } else {
                    checkbox.classList.add('checked');
                    selectedVideos.set(fullUrl, { title, url: fullUrl });
                }

                updateDockUI();
            });

            injectTarget.appendChild(checkbox);
        });
    }

    /* ==========================================================
       5. INFINITE SCROLL (MULTI-SECTION AWARE)
       ========================================================== */
    let currentNextUrl = null;
    let initializedPagination = false;

    async function loadNextPage() {
        if (isFetchingNextPage || noMorePages) return;

        // Initialize the first next page URL on the very first trigger
        if (!initializedPagination) {
            const firstNext = document.querySelector('link[rel="next"]');
            currentNextUrl = firstNext ? firstNext.href : null;
            initializedPagination = true;
        }

        if (!currentNextUrl) {
            noMorePages = true;
            return;
        }

        isFetchingNextPage = true;
        
        // Find container to append to: Must be the MAIN uploaded videos list, which is the LAST ul.videoList on the page
        const lists = document.querySelectorAll('ul.videoList, ul.videos');
        if (lists.length === 0) {
            isFetchingNextPage = false;
            return;
        }
        
        const container = lists[lists.length - 1]; // Always target the last list (Uploaded Videos)
        
        const loader = document.createElement('div');
        loader.className = 'xv-infinite-loader';
        loader.innerHTML = `⏳ Loading more videos...`;
        container.parentElement.appendChild(loader);

        try {
            const res = await fetch(currentNextUrl);
            const html = await res.text();
            
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            // Extract the new video list from the fetched page
            const newLists = doc.querySelectorAll('ul.videoList, ul.videos');
            if (newLists.length > 0) {
                // Grab items only from the main paginated list of the fetched page
                const newContainer = newLists[newLists.length - 1];
                const newCards = newContainer.querySelectorAll(':scope > li');
                
                newCards.forEach(card => container.appendChild(card));
                
                // Update our state with the next page's "Next" link
                const newNextLink = doc.querySelector('link[rel="next"]');
                if (newNextLink && newNextLink.href) {
                    currentNextUrl = newNextLink.href;
                } else {
                    currentNextUrl = null;
                    noMorePages = true;
                    
                    const endMsg = document.createElement('div');
                    endMsg.className = 'xv-infinite-loader';
                    endMsg.innerHTML = `✅ All videos loaded`;
                    container.parentElement.appendChild(endMsg);
                }
                
                // Attach checkboxes to the newly injected cards
                scanCards();
            } else {
                noMorePages = true;
            }
        } catch (e) {
            console.error('Infinite scroll fetch error:', e);
        } finally {
            loader.remove();
            isFetchingNextPage = false;
        }
    }

    function checkScroll() {
        if (noMorePages || isFetchingNextPage) return;
        
        // 800px threshold is safer for mobile screens to prevent endless loops
        if ((window.scrollY + window.innerHeight) >= (document.documentElement.scrollHeight - 800)) {
            loadNextPage();
        }
    }

    function run() {
        injectStyles();
        scanCards();
        updateDockUI();

        window.addEventListener('scroll', checkScroll, { passive: true });
        
        document.querySelectorAll('.pagination3, .pagination').forEach(p => p.style.display = 'none');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', run);
    } else {
        run();
    }

    const observer = new MutationObserver(() => scanCards());
    observer.observe(document.documentElement, { childList: true, subtree: true });

})();
