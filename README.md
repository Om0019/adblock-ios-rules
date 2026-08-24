# Adblock iOS Rules

A collection of highly optimized, modular adblock rules for iOS, designed to provide the best and fastest browsing experience without affecting website loading or layout. 

## The Rulesets

The rules are divided into separate lists so you have total control over your browsing experience. Mix and match these depending on your needs:

*   **[general_ads.txt](general_ads.txt)**
    Safely blocks standard ad servers, trackers, and in-video pre-roll ads (JWPlayer/VideoJS XMLs). Focuses on not breaking page layouts.

*   **[popups_and_redirects.txt](popups_and_redirects.txt)**
    Blocks aggressive ads that open in new tabs (pop-unders), steal focus, or forcibly redirect the current page. Includes scriptlet defusers to intercept hijacked clicks.

*   **[anti_adblock.txt](anti_adblock.txt)**
    Prevents sites from detecting your adblocker. It injects mock responses for standard ad requests (tricking sites into thinking ads loaded) and hides common anti-adblock warning modals.

*   **[annoyances.txt](annoyances.txt)**
    ***(Highly Recommended for iOS)*** Wipes out non-ad clutter. Automatically hides giant "Open in App" Safari Smart Banners, GDPR Cookie Consent Pop-ups, and Newsletter/Login overlays that darken your screen.

*   **[privacy_trackers.txt](privacy_trackers.txt)**
    The "Ghost" list. Blocks invisible trackers, social media widgets (like Meta/Facebook Pixel), and device fingerprinting scripts. Dramatically speeds up page loading and saves battery on mobile.

## How to Use

If you are using an iOS adblocker that supports custom filter lists (like **AdGuard for iOS** or **uBlock Origin** through Orion Browser), you can add the raw links to these text files as Custom Filters:

1. Copy the RAW URL of the list you want to use.
2. Go to your Adblocker's settings -> Custom Filters / Filter Lists.
3. Add the URL and enable it.

*Note: These lists use standard EasyList / Adblock Plus / uBlock Origin syntax.*
