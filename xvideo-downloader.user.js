// ==UserScript==
// @name         Pornhub & Model Profile Bulk Downloader (Infinite Scroll + Mobile Grid)
// @namespace    https://github.com/Om0019/adblock-ios-rules
// @version      18.0.0
// @description  Mobile 2-column grid view, Infinite scrolling on profiles, beautiful bulk selection UI, and 1-click master stream extraction.
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
       PREMIUM STYLES & MOBILE GRID INJECTION
       ========================================================== */
    const STYLES = `
        /* 📱 Mobile 2-Column Grid Layout Override */
        @media (max-width: 768px) {
            ul#showAllChanelVideos,
            ul#videoCategory,
            ul.videos,
            .videoUList,
            .container.videos,
            #mostRecentVideosSection,
            .videos-list,
            .videoWrapper {
                display: grid !important;
                grid-template-columns: repeat(2, 1fr) !important;
                gap: 8px !important;
                padding: 4px !important;
                margin: 0 !important;
            }
            
            /* Make each video block take exactly its cell space */
            li.videoblock,
            li.pcVideoListItem,
            .videoBox,
            .wrapVideoBlock,
            li.video-item {
                width: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                float: none !important;
                display: flex !important;
                flex-direction: column !important;
            }

            .phimage,
            .img-holder {
                width: 100% !important;
                height: auto !important;
                aspect-ratio: 16/9 !important;
            }

            .phimage img,
            .img-holder img {
                width: 100% !important;
                height: 100% !important;
                object-fit: cover !important;
            }

            /* Hide unnecessary UI elements on mobile to keep the grid clean */
            .marker-overlays,
            .video-duration,
            .views,
            .added,
            .rating-container {
                font-size: 10px !important;
            }
            .title, .thumbnailTitle {
                font-size: 11px !important;
                line-height: 1.2 !important;
                margin-top: 4px !important;
                white-space: nowrap !important;
                overflow: hidden !important;
                text-overflow: ellipsis !important;
            }
        }

        /* Checkbox on each video thumbnail card */
        .xv-card-checkbox-wrapper {
            position: absolute !important;
            top: 4px !important;
            left: 4px !important;
            z-index: 99 !important;
            cursor: pointer !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            width: 32px !important;
            height: 32px !important;
            border-radius: 50% !important;
            background: rgba(18, 18, 18, 0.5) !important;
            border: 2px solid rgba(255, 255, 255, 0.8) !important;
            transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) !important;
            backdrop-filter: blur(8px) !important;
            -webkit-backdrop-filter: blur(8px) !important;
            box-sizing: border-box !important;
            box-shadow: 0 4px 12px rgba(0,0,0,0.5) !important;
        }

        @media (min-width: 769px) {
            .xv-card-checkbox-wrapper {
                top: 8px !important;
                left: 8px !important;
                width: 36px !important;
                height: 36px !important;
            }
        }

        .xv-card-checkbox-wrapper:hover {
            border-color: #ffffff !important;
            background: rgba(18, 18, 18, 0.9) !important;
            transform: scale(1.1) !important;
        }

        .xv-card-checkbox-wrapper.checked {
            background: #e50914 !important;
            border-color: #e50914 !important;
            box-shadow: 0 4px 16px rgba(229, 9, 20, 0.7) !important;
            transform: scale(1.15) !important;
        }

        .xv-card-checkbox-wrapper svg {
            width: 18px !important;
            height: 18px !important;
            fill: none !important;
            stroke: #ffffff !important;
            stroke-width: 3 !important;
            stroke-linecap: round !important;
            stroke-linejoin: round !important;
            stroke-dasharray: 24 !important;
            stroke-dashoffset: 24 !important;
            transition: stroke-dashoffset 0.4s ease-out !important;
        }

        .xv-card-checkbox-wrapper.checked svg {
            stroke-dashoffset: 0 !important;
        }

        /* Floating Bottom Action Dock */
        .xv-bulk-dock {
            position: fixed !important;
            bottom: 24px !important;
            left: 50% !important;
            transform: translateX(-50%) translateY(150px) !important;
            background: rgba(18, 18, 18, 0.9) !important;
            backdrop-filter: blur(20px) saturate(200%) !important;
            -webkit-backdrop-filter: blur(20px) saturate(200%) !important;
            border: 1px solid rgba(255, 255, 255, 0.1) !important;
            border-radius: 40px !important;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.9), 0 0 0 1px rgba(255,255,255,0.05) inset !important;
            padding: 10px 16px !important;
            display: flex !important;
            align-items: center !important;
            gap: 12px !important;
            z-index: 2147483647 !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, sans-serif !important;
            box-sizing: border-box !important;
            transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) !important;
            pointer-events: auto !important;
            width: 92vw !important;
            max-width: 480px !important;
            justify-content: space-between !important;
        }

        .xv-bulk-dock.show {
            transform: translateX(-50%) translateY(0) !important;
        }

        .xv-dock-count {
            color: #aaaaaa !important;
            font-size: 13px !important;
            font-weight: 500 !important;
            white-space: nowrap !important;
            display: flex !important;
            align-items: center !important;
            gap: 6px !important;
        }

        .xv-dock-count span {
            color: #ffffff !important;
            background: #e50914 !important;
            font-size: 13px !important;
            font-weight: 700 !important;
            padding: 2px 8px !important;
            border-radius: 10px !important;
        }

        .xv-dock-btn {
            background: linear-gradient(135deg, #e50914, #b80710) !important;
            color: #ffffff !important;
            border: none !important;
            border-radius: 20px !important;
            padding: 10px 14px !important;
            font-size: 13px !important;
            font-weight: 700 !important;
            cursor: pointer !important;
            display: inline-flex !important;
            align-items: center !important;
            gap: 6px !important;
            box-shadow: 0 4px 12px rgba(229, 9, 20, 0.4) !important;
            transition: all 0.2s ease !important;
            white-space: nowrap !important;
        }

        .xv-dock-btn:hover {
            transform: translateY(-2px) scale(1.02) !important;
            background: linear-gradient(135deg, #ff1a25, #d60812) !important;
        }

        .xv-dock-btn svg {
            width: 15px !important;
            height: 15px !important;
            fill: #ffffff !important;
        }

        .xv-dock-btn.secondary {
            background: rgba(255, 255, 255, 0.08) !important;
            color: #dddddd !important;
            border: 1px solid rgba(255, 255, 255, 0.1) !important;
            box-shadow: none !important;
            padding: 8px 12px !important;
            border-radius: 18px !important;
            font-size: 12px !important;
        }

        .xv-dock-btn.secondary:hover {
            background: rgba(255, 255, 255, 0.15) !important;
            color: #ffffff !important;
        }

        .xv-dock-actions {
            display: flex !important;
            gap: 8px !important;
        }

        /* Toast notification */
        .xv-bulk-toast {
            position: fixed !important;
            bottom: 100px !important;
            left: 50% !important;
            transform: translateX(-50%) translateY(20px) !important;
            background: rgba(20, 20, 20, 0.96) !important;
            backdrop-filter: blur(8px) !important;
            -webkit-backdrop-filter: blur(8px) !important;
            color: #ffffff !important;
            border: 1px solid rgba(229, 9, 20, 0.5) !important;
            padding: 12px 24px !important;
            border-radius: 30px !important;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.8) !important;
            font-size: 13px !important;
            font-weight: 600 !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
            z-index: 2147483647 !important;
            text-align: center !important;
            pointer-events: none !important;
            opacity: 0 !important;
            transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) !important;
            display: flex !important;
            align-items: center !important;
            gap: 8px !important;
        }

        .xv-bulk-toast.show {
            transform: translateX(-50%) translateY(0) !important;
            opacity: 1 !important;
        }

        .xv-spinner {
            display: inline-block !important;
            width: 20px !important;
            height: 20px !important;
            border: 3px solid rgba(229, 9, 20, 0.3) !important;
            border-radius: 50% !important;
            border-top-color: #e50914 !important;
            animation: xvSpin 1s ease-in-out infinite !important;
        }

        @keyframes xvSpin {
            to { transform: rotate(360deg); }
        }
        
        .xv-infinite-loader {
            width: 100% !important;
            text-align: center !important;
            padding: 30px 0 !important;
            color: #aaaaaa !important;
            font-weight: 600 !important;
            clear: both !important;
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

    function showToast(msg, duration = 3500) {
        let toast = document.getElementById('xv-bulk-toast-msg');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'xv-bulk-toast-msg';
            toast.className = 'xv-bulk-toast';
            document.body.appendChild(toast);
        }
        
        toast.classList.remove('show');
        void toast.offsetWidth; // trigger reflow
        
        toast.innerHTML = msg;
        toast.classList.add('show');

        if (toast.hideTimeout) clearTimeout(toast.hideTimeout);
        toast.hideTimeout = setTimeout(() => {
            toast.classList.remove('show');
        }, duration);
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
       REAL STREAM EXTRACTOR FOR A GIVEN VIDEO URL
       ========================================================== */
    async function extractRealStreamFromPage(videoPageUrl) {
        try {
            const res = await fetch(videoPageUrl, {
                headers: { 'Referer': location.href }
            });
            const html = await res.text();

            const lines = html.split('\n');
            for (const line of lines) {
                if (line.includes('var flashvars_') && line.includes('=')) {
                    const jsonPart = line.split('=', 1)[1].trim().replace(/;$/, '');
                    try {
                        const data = JSON.parse(jsonPart);
                        const defs = (data.mediaDefinitions || []).filter(d => d.videoUrl && !d.videoUrl.includes('/ads/'));
                        if (defs.length > 0) {
                            defs.sort((a, b) => (parseInt(b.quality || b.height, 10) || 0) - (parseInt(a.quality || a.height, 10) || 0));
                            return defs[0].videoUrl;
                        }
                    } catch (e) {}
                }
            }

            const m3u8Match = html.match(/https?:\/\/[^"'\s]+\.m3u8[^"'\s]*/);
            if (m3u8Match && !m3u8Match[0].includes('/ads/')) {
                return m3u8Match[0].replace(/\\/g, '');
            }

            const vurlMatch = html.match(/video_url:\s*['"]([^'"]+)['"]/);
            if (vurlMatch && !vurlMatch[1].includes('/ads/')) {
                return vurlMatch[1];
            }
        } catch (e) {
            console.error('Error fetching stream for:', videoPageUrl, e);
        }
        return null;
    }

    /* ==========================================================
       FLOATING BULK DOCK UI
       ========================================================== */
    function updateDockUI() {
        let dock = document.getElementById('xv-bulk-action-dock');
        const count = selectedVideos.size;

        if (!dock) {
            dock = document.createElement('div');
            dock.className = 'xv-bulk-dock';
            dock.id = 'xv-bulk-action-dock';
            
            dock.innerHTML = `
                <div class="xv-dock-count">Selected <span>0</span></div>
                <div class="xv-dock-actions">
                    <button class="xv-dock-btn" id="xv-bulk-copy-btn" type="button">
                        <svg viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
                        <span class="btn-label">Copy All</span>
                    </button>
                    <button class="xv-dock-btn secondary" id="xv-bulk-clear-btn" type="button">Clear</button>
                </div>
            `;
            
            document.body.appendChild(dock);

            const copyBtn = dock.querySelector('#xv-bulk-copy-btn');
            copyBtn.addEventListener('click', async () => {
                if (selectedVideos.size === 0) return;
                
                copyBtn.disabled = true;
                const btnLabel = copyBtn.querySelector('.btn-label');
                const items = Array.from(selectedVideos.values());
                const total = items.length;
                const extractedUrls = [];

                showToast(`<div class="xv-spinner" style="width:14px;height:14px;border-width:2px"></div> Extracting ${total} videos...`);

                for (let i = 0; i < total; i++) {
                    btnLabel.textContent = `${i + 1}/${total}...`;
                    const item = items[i];
                    const streamUrl = await extractRealStreamFromPage(item.url);
                    if (streamUrl) {
                        extractedUrls.push(streamUrl);
                    }
                }

                if (extractedUrls.length > 0) {
                    const outputText = extractedUrls.join('\n');
                    copyToClipboard(outputText);
                    btnLabel.textContent = '✅ Copied!';
                    showToast(`✅ Copied ${extractedUrls.length} links!`);
                    
                    setTimeout(() => {
                        dock.querySelector('#xv-bulk-clear-btn').click();
                    }, 2000);
                } else {
                    showToast('❌ Could not extract stream URLs.');
                    btnLabel.textContent = 'Copy All';
                }

                copyBtn.disabled = false;
            });

            dock.querySelector('#xv-bulk-clear-btn').addEventListener('click', () => {
                selectedVideos.clear();
                document.querySelectorAll('.xv-card-checkbox-wrapper.checked').forEach(cb => cb.classList.remove('checked'));
                updateDockUI();
            });
        }

        if (count > 0) {
            dock.querySelector('.xv-dock-count span').textContent = count;
            dock.querySelector('.btn-label').textContent = 'Copy All';
            dock.classList.add('show');
        } else {
            dock.classList.remove('show');
        }
    }

    /* ==========================================================
       ATTACH CHECKBOXES TO VIDEO THUMBNAIL CARDS
       ========================================================== */
    function scanCards() {
        injectStyles();

        // Target every video card/wrapper across desktop & mobile
        const cardSelectors = [
            'li.videoblock',
            'li.pcVideoListItem',
            '.videoBox',
            '.wrapVideoBlock',
            'li.video-item'
        ];

        const cards = document.querySelectorAll(cardSelectors.join(', '));

        cards.forEach(card => {
            if (card.dataset.xvHasBulkCheckbox === 'true') return;

            const link = card.querySelector('a[href*="/view_video.php?viewkey="], a[href*="/video/"]');
            if (!link) return;

            const href = link.getAttribute('href');
            const fullUrl = href.startsWith('http') ? href : (window.location.origin + href);
            const title = (link.getAttribute('title') || card.querySelector('.title, .thumbnailTitle')?.textContent || 'video').trim();

            card.dataset.xvHasBulkCheckbox = 'true';

            // Find image wrapper
            const imgHolder = card.querySelector('.phimage, .img-holder, .thumb, .preview, a.linkVideoThumb') || card;
            if (window.getComputedStyle(imgHolder).position === 'static') {
                imgHolder.style.position = 'relative';
            }

            const checkbox = document.createElement('div');
            checkbox.className = 'xv-card-checkbox-wrapper';
            if (selectedVideos.has(fullUrl)) checkbox.classList.add('checked');
            
            checkbox.title = 'Select video for bulk stream copy';
            checkbox.innerHTML = `<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>`;

            checkbox.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                if (checkbox.classList.contains('checked')) {
                    checkbox.classList.remove('checked');
                    selectedVideos.delete(fullUrl);
                } else {
                    checkbox.classList.add('checked');
                    selectedVideos.set(fullUrl, { title, url: fullUrl, cardEl: card });
                }

                updateDockUI();
            });

            imgHolder.appendChild(checkbox);
        });
    }

    /* ==========================================================
       UNIVERSAL INFINITE SCROLL (MOBILE & DESKTOP)
       ========================================================== */
    async function loadNextPage() {
        if (isFetchingNextPage || noMorePages) return;

        // Find Next Page Link
        const nextLink = document.querySelector('link[rel="next"]') || 
                         document.querySelector('li.page_next a') || 
                         document.querySelector('.pagination-next a');
                         
        if (!nextLink || !nextLink.href) {
            noMorePages = true;
            return;
        }

        isFetchingNextPage = true;
        const nextPageUrl = nextLink.href;
        
        // Find main container to append to
        let container = document.querySelector('ul#showAllChanelVideos') || 
                        document.querySelector('ul#videoCategory') || 
                        document.querySelector('ul.videos') || 
                        document.querySelector('.videoUList') ||
                        document.querySelector('.container.videos') ||
                        document.querySelector('#mostRecentVideosSection');
                        
        if (!container) {
            const anyCard = document.querySelector('li.videoblock, .videoBox');
            if (anyCard) container = anyCard.parentElement;
        }
        
        if (!container) {
            isFetchingNextPage = false;
            return;
        }
        
        const loader = document.createElement('div');
        loader.className = 'xv-infinite-loader';
        loader.innerHTML = `<div class="xv-spinner" style="width:20px;height:20px;border-width:2px;vertical-align:middle;margin-right:8px;"></div> Loading more videos...`;
        container.appendChild(loader);

        try {
            const res = await fetch(nextPageUrl);
            const html = await res.text();
            
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            // Extract new video blocks
            const newCards = doc.querySelectorAll('li.videoblock, li.pcVideoListItem, .videoBox, .wrapVideoBlock, li.video-item');
            if (newCards.length > 0) {
                newCards.forEach(card => {
                    container.appendChild(card);
                });
                
                // Update pagination
                const newNextLink = doc.querySelector('link[rel="next"]') || doc.querySelector('li.page_next a') || doc.querySelector('.pagination-next a');
                if (newNextLink) {
                    if (document.querySelector('link[rel="next"]')) {
                        document.querySelector('link[rel="next"]').href = newNextLink.href;
                    }
                    if (document.querySelector('li.page_next a')) {
                        document.querySelector('li.page_next a').href = newNextLink.href;
                    }
                } else {
                    noMorePages = true;
                }

                scanCards();
            } else {
                noMorePages = true;
            }
        } catch (e) {
            console.error('Infinite scroll error:', e);
        } finally {
            loader.remove();
            isFetchingNextPage = false;
        }
    }

    function checkScroll() {
        if (noMorePages || isFetchingNextPage) return;
        
        const scrollY = window.scrollY || window.pageYOffset;
        const windowHeight = window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight;

        if (scrollY + windowHeight >= documentHeight - 1600) {
            loadNextPage();
        }
    }

    function run() {
        injectStyles();
        scanCards();
        updateDockUI();

        window.addEventListener('scroll', checkScroll, { passive: true });
        
        const paginations = document.querySelectorAll('.pagination3, .pagination, .pagination-container');
        paginations.forEach(p => p.style.display = 'none');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', run);
    } else {
        run();
    }

    const observer = new MutationObserver(() => {
        scanCards();
        const paginations = document.querySelectorAll('.pagination3, .pagination, .pagination-container');
        paginations.forEach(p => p.style.display = 'none');
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });

})();
