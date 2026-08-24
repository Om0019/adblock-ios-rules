# Adblock iOS Rules

A collection of highly optimized, modular adblock rules for iOS, designed to provide the best and fastest browsing experience without affecting website loading or layout. Equipped with cutting-edge defenses against SSAI, WebSockets, CNAME Cloaking, and Shadow DOM ads.

## The Rulesets (Copy these URLs)

Add the following raw URLs directly into your adblocker's Custom Filters section:

### 1. General Ads & Pre-rolls
Safely blocks standard ad servers, trackers, and in-video pre-roll ads (JWPlayer/VideoJS XMLs). Focuses on not breaking page layouts.
```text
https://raw.githubusercontent.com/Om0019/adblock-ios-rules/main/general_ads.txt
```

### 2. Pop-unders & Redirect Hijackers
Blocks aggressive ads that open in new tabs (pop-unders), steal focus, or forcibly redirect the current page. Includes scriptlet defusers to intercept hijacked clicks.
```text
https://raw.githubusercontent.com/Om0019/adblock-ios-rules/main/popups_and_redirects.txt
```

### 3. Anti-Adblock Defusers
Prevents sites from detecting your adblocker. It injects mock responses for standard ad requests (tricking sites into thinking ads loaded) and hides common anti-adblock warning modals.
```text
https://raw.githubusercontent.com/Om0019/adblock-ios-rules/main/anti_adblock.txt
```

### 4. iOS Annoyances (Highly Recommended)
Wipes out non-ad clutter. Automatically hides giant "Open in App" Safari Smart Banners, GDPR Cookie Consent Pop-ups, and Newsletter/Login overlays that darken your screen.
```text
https://raw.githubusercontent.com/Om0019/adblock-ios-rules/main/annoyances.txt
```

### 5. Privacy Trackers (The Ghost List)
Blocks invisible trackers, social media widgets (like Meta/Facebook Pixel), and device fingerprinting scripts. Dramatically speeds up page loading and saves battery on mobile.
```text
https://raw.githubusercontent.com/Om0019/adblock-ios-rules/main/privacy_trackers.txt
```

## How to Setup (AdGuard for iOS)

1. Open the AdGuard app and go to **Protection** -> **Filters** -> **Custom**.
2. Tap **Add custom filter**.
3. Paste a URL from above and hit Next.
4. Repeat for all 5 URLs. (The app will automatically sync updates from this repository).

*Note: These lists use standard EasyList / Adblock Plus / uBlock Origin syntax.*
