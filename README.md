# AdBlock Filter & iOS DNS Rules

Custom adblocking rules and EasyList-compatible filter subscription for **x-video.tube** and related adult ad networks.

---

## 🎯 1. EasyList Filter Subscription (uBlock Origin, AdGuard, Safari, Brave)

This filter list blocks network requests **AND** hides in-page banner elements, fake buttons, and popunder triggers.

### 📥 Direct Subscription URL
```
https://raw.githubusercontent.com/Om0019/adblock-ios-rules/main/filters.txt
```

### 🛠️ How to Subscribe:
- **uBlock Origin**: Dashboard > **Filter lists** > Scroll to bottom > **Import** > Paste URL > **Apply changes**.
- **AdGuard (iOS / Mac / Windows / Android)**: Settings > **Filters** > **Custom** > **Add custom filter** > Paste URL.
- **Brave Browser**: `brave://settings/shields/filters` > **Add custom filter list** > Paste URL.
- **AdBlock Plus**: Settings > **Advanced** > **Filter lists** > **Add a filter list via URL**.

---

## 📱 2. iOS AdBlock DNS Proxy Rules (FutureMind AdBlock)

For network-wide DNS-level blocking on iOS via the AdBlock DNS proxy.

### 📥 DNS Rules Raw URL
```
https://raw.githubusercontent.com/Om0019/adblock-ios-rules/main/ios-dns-rules.adblock
```

### 🛠️ How to Import:
1. Open **AdBlock** on iOS.
2. Go to **Settings** → **Import DNS rules**.
3. Paste the URL above and import to the **`0.0.0.0, ::`** group.

---

## 🛡️ Summary of Blocked Targets

| Target Network / Element | Type | Purpose |
| :--- | :--- | :--- |
| `magsrv.com`, `happyleafmotion.com`, `exacdn.com` | Network | ExoClick banner / video ads |
| `gmxes.com` | Network | TrafficStars popunder / push notifications |
| `awdeliverynet.com` | Network | VAST video pre-roll ad delivery |
| `mayzaent.com`, `gentlefieldpattern.com`, `eunow4u.com` | Network | Smartpop / CTA redirect links |
| `mc.yandex.ru`, `counter.yadro.ru` | Network | User tracking & telemetry |
| `.xv-topbar-flare-final`, `.top-sites-bar` | Cosmetic | Top sticky promotional banner bars |
| `li.clkbat`, `.tg-holder` | Cosmetic | Fake menu buttons & telegram overlays |
| `.fancybox-overlay-fixed` | Cosmetic | Pop-up modal dialogs |
