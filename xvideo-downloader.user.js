// ==UserScript==
// @name         Pornhub & Model Profile Bulk Video Stream Grabber
// @namespace    https://github.com/Om0019/adblock-ios-rules
// @version      16.0.0
// @description  Adds checkboxes to video cards on model profiles/search pages to bulk extract & copy real HLS/MP4 video stream URLs (one per line) directly to your clipboard.
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

    const selectedVideos = new Map(); // viewkey/url -> { title, url, cardEl }

    const STYLES = `
        /* Floating Bottom Action Dock */
        .xv-bulk-dock {
            position: fixed !important;
            bottom: 24px !important;
            left: 50% !important;
            transform: translateX(-50%) !important;
            background: rgba(18, 18, 18, 0.95) !important;
            backdrop-filter: blur(12px) !important;
            -webkit-backdrop-filter: blur(12px) !important;
            border: 1.5px solid #e50914 !important;
            border-radius: 36px !important;
            box-shadow: 0 10px 36px rgba(0, 0, 0, 0.9) !important;
            padding: 8px 18px !important;
            display: flex !important;
            align-items: center !important;
            gap: 12px !important;
            z-index: 2147483647 !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
            box-sizing: border-box !important;
            animation: xvSlideUp 0.3s ease-out !important;
        }

        @keyframes xvSlideUp {
            from { transform: translate(-50%, 40px); opacity: 0; }
            to { transform: translate(-50%, 0); opacity: 1; }
        }

        .xv-dock-count {
            color: #ffffff !important;
            font-size: 13px !important;
            font-weight: 700 !important;
            white-space: nowrap !important;
        }

        .xv-dock-count span {
            color: #e50914 !important;
            font-size: 15px !important;
            font-weight: 800 !important;
        }

        .xv-dock-btn {
            background: linear-gradient(135deg, #e50914, #b80710) !important;
            color: #ffffff !important;
            border: none !important;
            border-radius: 20px !important;
            padding: 8px 16px !important;
            font-size: 13px !important;
            font-weight: 700 !important;
            cursor: pointer !important;
            display: inline-flex !important;
            align-items: center !important;
            gap: 6px !important;
            box-shadow: 0 2px 8px rgba(229, 9, 20, 0.5) !important;
            transition: all 0.2s ease !important;
            white-space: nowrap !important;
        }

        .xv-dock-btn:hover {
            transform: scale(1.05) !important;
            background: #ff1a25 !important;
        }

        .xv-dock-btn.secondary {
            background: #2a2a2a !important;
            color: #dddddd !important;
            border: 1px solid #444444 !important;
            box-shadow: none !important;
            padding: 7px 12px !important;
            font-size: 12px !important;
        }

        .xv-dock-btn.secondary:hover {
            background: #3a3a3a !important;
            color: #ffffff !important;
        }

        /* Checkbox on each video thumbnail card */
        .xv-card-checkbox-wrapper {
            position: absolute !important;
            top: 8px !important;
            left: 8px !important;
            z-index: 9999 !important;
            cursor: pointer !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            width: 28px !important;
            height: 28px !important;
            border-radius: 6px !important;
            background: rgba(15, 15, 15, 0.8) !important;
            border: 2px solid rgba(255, 255, 255, 0.7) !important;
            transition: all 0.15s ease !important;
            backdrop-filter: blur(4px) !important;
            box-sizing: border-box !important;
        }

        .xv-card-checkbox-wrapper:hover {
            border-color: #e50914 !important;
            transform: scale(1.1) !important;
        }

        .xv-card-checkbox-wrapper.checked {
            background: #e50914 !important;
            border-color: #ffffff !important;
            box-shadow: 0 0 10px rgba(229, 9, 20, 0.8) !important;
        }

        .xv-card-checkbox-wrapper svg {
            display: none;
            width: 16px;
            height: 16px;
            fill: #ffffff;
        }

        .xv-card-checkbox-wrapper.checked svg {
            display: block;
        }

        /* Toast notification */
        .xv-bulk-toast {
            position: fixed !important;
            bottom: 85px !important;
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
            animation: xvFade 0.25s ease-out !important;
        }

        @keyframes xvFade {
            from { opacity: 0; transform: translate(-50%, 10px); }
            to { opacity: 1; transform: translate(-50%, 0); }
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
        const old = document.querySelector('.xv-bulk-toast');
        if (old) old.remove();
        const toast = document.createElement('div');
        toast.className = 'xv-bulk-toast';
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

    /* ==========================================================
       REAL STREAM EXTRACTOR FOR A GIVEN VIDEO URL
       ========================================================== */
    async function extractRealStreamFromPage(videoPageUrl) {
        try {
            const res = await fetch(videoPageUrl, {
                headers: { 'Referer': location.href }
            });
            const html = await res.text();

            // 1. Check flashvars in HTML
            const lines = html.split('\n');
            for (const line of lines) {
                if (line.includes('var flashvars_') && line.includes('=')) {
                    const jsonPart = line.split('=', 1)[1].trim().replace(/;$/, '');
                    try {
                        const data = JSON.parse(jsonPart);
                        const defs = (data.mediaDefinitions || []).filter(d => d.videoUrl && !d.videoUrl.includes('/ads/'));
                        if (defs.length > 0) {
                            // Sort for highest quality (1080p -> 720p -> 480p)
                            defs.sort((a, b) => (parseInt(b.quality || b.height, 10) || 0) - (parseInt(a.quality || a.height, 10) || 0));
                            return defs[0].videoUrl;
                        }
                    } catch (e) {}
                }
            }

            // 2. Regex fallback for master.m3u8
            const m3u8Match = html.match(/https?:\/\/[^"'\s]+\.m3u8[^"'\s]*/);
            if (m3u8Match && !m3u8Match[0].includes('/ads/')) {
                return m3u8Match[0].replace(/\\/g, '');
            }

            // 3. Fallback to video_url
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

        if (count === 0) {
            if (dock) dock.style.display = 'none';
            return;
        }

        if (!dock) {
            dock = document.createElement('div');
            dock.className = 'xv-bulk-dock';
            dock.id = 'xv-bulk-action-dock';
            document.body.appendChild(dock);
        }

        dock.style.display = 'flex';
        dock.innerHTML = `
            <div class="xv-dock-count">Selected: <span>${count}</span></div>
            <button class="xv-dock-btn" id="xv-bulk-copy-btn" type="button">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
                <span>Copy All Stream URLs</span>
            </button>
            <button class="xv-dock-btn secondary" id="xv-bulk-select-all-btn" type="button">Select All</button>
            <button class="xv-dock-btn secondary" id="xv-bulk-clear-btn" type="button">Clear</button>
        `;

        // 1. Copy All Stream URLs Action
        const copyBtn = dock.querySelector('#xv-bulk-copy-btn');
        copyBtn.addEventListener('click', async () => {
            copyBtn.disabled = true;
            const btnSpan = copyBtn.querySelector('span');
            const items = Array.from(selectedVideos.values());
            const total = items.length;
            const extractedUrls = [];

            showToast(`⚡ Extracting streams for ${total} selected videos...`);

            for (let i = 0; i < total; i++) {
                btnSpan.textContent = `Extracting ${i + 1}/${total}...`;
                const item = items[i];
                const streamUrl = await extractRealStreamFromPage(item.url);
                if (streamUrl) {
                    extractedUrls.push(streamUrl);
                }
            }

            if (extractedUrls.length > 0) {
                const outputText = extractedUrls.join('\n');
                copyToClipboard(outputText);
                btnSpan.textContent = '✅ Copied!';
                showToast(`✅ Copied ${extractedUrls.length} stream URLs (one per line) to clipboard!`);
            } else {
                showToast('❌ Could not extract stream URLs.');
            }

            setTimeout(() => {
                btnSpan.textContent = 'Copy All Stream URLs';
                copyBtn.disabled = false;
            }, 3000);
        });

        // 2. Select All
        dock.querySelector('#xv-bulk-select-all-btn').addEventListener('click', () => {
            document.querySelectorAll('.xv-card-checkbox-wrapper:not(.checked)').forEach(cb => cb.click());
        });

        // 3. Clear
        dock.querySelector('#xv-bulk-clear-btn').addEventListener('click', () => {
            selectedVideos.clear();
            document.querySelectorAll('.xv-card-checkbox-wrapper.checked').forEach(cb => cb.classList.remove('checked'));
            updateDockUI();
        });
    }

    /* ==========================================================
       ATTACH CHECKBOXES TO VIDEO THUMBNAIL CARDS
       ========================================================== */
    function scanCards() {
        injectStyles();

        // Targets: Pornhub & tube video blocks
        const cardSelectors = [
            'li.videoblock',
            'li.pcVideoListItem',
            '.phimage',
            '.videoBox',
            '.item.thumb--videos',
            '.item.thumb'
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
            checkbox.title = 'Select video for bulk stream copy';
            checkbox.innerHTML = `
                <svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
            `;

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

    function run() {
        scanCards();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', run);
    } else {
        run();
    }

    const observer = new MutationObserver(scanCards);
    observer.observe(document.documentElement, { childList: true, subtree: true });
    setInterval(scanCards, 1500);

})();
