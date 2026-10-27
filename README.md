# kooba-helper
For a better kooba<=>abook experience.


## Description:
* This adds "Copy Title" to Abook forum code boxes and post titles
* This adds search links to Abook forums code boxes that use [code] search strings.
* Search engines added are NZBIndex, BinSearch, NZBKing
* This adds NZBDonkey support


## Notice:
* This tool is not affiliated with the forum, other than the fact that it was written to be used on it.
* It is an independent tool.
* If you run into any trouble, please contact me and do not contact the forum staff about it.


## Maintained/Created By:
* [Shrek] BTC: 1ANyHwihu9dL2CZ9LUZ48FdYTzyz8CCCFf
* rhymesagainsthumanity
* pushr (original creator of the chrome extension)


## Installation:
1. Install TamperMonkey from your Browser's Add-on/Extension site
1. Visit https://exquisiteskink.github.io/kooba-helper-updated/kooba-helper.user.js
1. Hit the Install button
1. Maybe give TamperMonkey permission for Incognito/Private browsing mode if you use that
1. To update, just visit the user.js page mentioned above and click the update button.
   (The script uses TamperMonkey's built-in update check.)


## Bookmarklet:
* This is not the recommended way to use the tool.
* If you don't want to install TamperMonkey, a bookmarklet is available.
   * Drag the "kooba helper" link below to your bookmarks bar.
   * Click it on any Abook page you want to use it on (it does not auto-run).
* The bookmarklet is generated from the same source as the userscript and
  works in Chromium, Brave and Firefox.
* Get the bookmarklet at https://exquisiteskink.github.io/kooba-helper-updated/bookmarklet.html


## What's different from the upstream version
* Cross-browser safe DOM handling (`.codeheader` discovery, `BR` vs text-node
  handling, `querySelector('#author')` guards) so it reliably runs in
  Chromium, Brave and Firefox.
* New Zealand Donkey integration: the block is now formatted so that
  NZBDonkey's "Get NZB File" (select/text) path can parse it reliably:
  first line = topic title, then `Header:` and `Password:` lines.
* "Copy Title" uses the modern Clipboard API with a legacy
  `execCommand('copy')` textarea fallback for Firefox.
* Inline `oncontextmenu`/`onclick` selection handlers were replaced with
  CSS `user-select: all` plus a click handler, so right-clicking and
  selecting text works as expected in all three browsers.
* Dynamically added posts in a thread are picked up via a
  `MutationObserver`, and the "thank-you" click button is detoured so a
  newly posted topic still gets the search links and NZBDonkey block.
* Styles are injected once and the script is only applied to pages matched
  by `@match *://abook.link/*` (plus `@include` for Greasemonkey compat).
