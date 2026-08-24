# Adblock iOS Rules

A collection of highly optimized adblock rules for iOS, designed to provide the best browsing experience without affecting website loading or layout.

## Structure

The rules are divided into separate lists so you can enable or disable them independently depending on your needs:

* **[general_ads.txt](general_ads.txt)**
  Safely blocks standard ad servers and trackers. Focuses on not breaking page layouts.

* **[popups_and_redirects.txt](popups_and_redirects.txt)**
  Blocks aggressive ads that open in new tabs (pop-unders), steal focus, or forcibly redirect the current page.

* **[anti_adblock.txt](anti_adblock.txt)**
  Prevents sites from detecting your adblocker. It includes defusers to trick scripts into thinking ads are loading normally, and hides common anti-adblock warning modals.

## How to Use

If you are using an iOS adblocker that supports custom filter lists (like **AdGuard for iOS** or **uBlock Origin** through Orion Browser), you can add the raw links to these text files as Custom Filters:

1. Copy the RAW URL of the list you want to use.
2. Go to your Adblocker's settings -> Custom Filters / Filter Lists.
3. Add the URL and enable it.

*Note: These lists use standard EasyList / Adblock Plus / uBlock Origin syntax.*
