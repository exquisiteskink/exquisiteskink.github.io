// ==UserScript==
// @name         kooba-helper
// @namespace    kooba-helper@shrek
// @description  For a better kooba<=>abook experience. Adds search links to Abook forums code boxes, a "Copy Title" link, and NZBDonkey highlight text.
// @author       Shrek, rhymesagainsthumanity, pushr (original creator)
// @version      2023.10.27.1
// @updateURL    https://exquisiteskink.github.io/kooba-helper-updated/kooba-helper.meta.js
// @downloadURL  https://exquisiteskink.github.io/kooba-helper-updated/kooba-helper.user.js
// @supportURL   https://abook.link/book/index.php?topic=54768
// @include      *://abook.link/*
// @match        *://abook.link/*
// @run-at       document-end
// @grant        none
// ==/UserScript==


/**
 * Clean a raw code string for use as a query / display value.
 * Strips the "abook/..." URL-style prefixes, quotes and repeated backslashes.
 *
 * @param {string} code
 * @returns {string}
 */
function sanitizeCommon(code) {
    if (!code) return '';
    let cleaned = code.replace(/(?:abook|kooba)\.*(?:to|link|ws)*\s*(?:-|\||~)*\s*/gi, '');
    cleaned = cleaned.replace(/['"]+/g, ' ');
    cleaned = cleaned.replace(/\\&+/g, ' ');
    return cleaned.trim();
}

/**
 * Resolve the text that actually belongs to a `.codeheader` element.
 *
 * Kooba/abook forum builds differ in how they lay out the codebox after a
 * `.codeheader`:
 *   - PostBot style has a `<br>` between the header and the codebox;
 *   - some builds insert a whitespace text node between the header and the
 *     codebox;
 *   - others place the codebox directly after the header.
 *
 * Whitespace text nodes are skipped so a stray newline never becomes the
 * "code" value. The first `.bbc_code` inside the following codebox is used
 * as the header text.
 *
 * @param {Element} header
 * @returns {string}
 */
function extractCodeText(header) {
    // Find the first non-header node that directly follows the .codeheader.
    // Forums commonly emit a whitespace text node between the header and the
    // codebox, so advance past any whitespace text nodes.
    let probe = header.nextSibling;
    while (probe && probe.nodeType === 3 && /\s/.test(probe.textContent)) {
        probe = probe.nextSibling || probe.parentNode.nextSibling;
    }
    if (!probe) return '';

    const nodeName = probe.nodeName && probe.nodeName.toUpperCase();

    if (nodeName === 'BR') {
        // PostBot style: <br> is followed by the codebox. Walk past any
        // whitespace text nodes to find the actual code element.
        let node = probe.nextSibling;
        while (node) {
            if (node.nodeType === 3) {
                // Skip whitespace-only text nodes; take the first text node
                // that actually contains the code.
                const text = node.textContent.replace(/\s+/g, ' ').trim();
                if (text) return text;
            } else if (node.nodeType === 1) {
                const firstCode = node.querySelector ? node.querySelector('.bbc_code') : null;
                if (firstCode) {
                    return (firstCode.textContent || '').trim();
                }
                return (node.textContent || '').trim();
            }
            node = node.nextSibling;
        }
        return '';
    }

    // New style: header immediately followed by a text node containing the code.
    if (probe.nodeType === 3) {
        return probe.textContent.trim();
    }

    // If the forum inserts a whitespace text node between the header and the
    // codebox, use the following element instead of the text node.
    const direct = probe.nextElementSibling;
    if (direct) {
        const firstCode = direct.querySelector('.bbc_code');
        if (firstCode) {
            return (firstCode.textContent || '').trim();
        }
        return (direct.textContent || '').trim();
    }
    return probe.textContent.trim();
}

/**
 * Read the topic title from the `#author` block.
 *
 * @returns {string|null}
 */
function getTopicTitle() {
    const author = document.querySelector('#author');
    if (!author) return null;

    // In modern Kooba the `<a name="author">` element is followed by a text
    // node ("Topic: ...") and then by the topic summary link.
    let node = author.nextSibling;
    if (node && node.nodeType === 3) {
        const match = node.textContent.match(/Topic:(.*?)(?:\(Read)/i);
        if (match && match[1]) {
            return match[1].replace(/\[spot\]/gi, '').trim();
        }
    }

    // Fallback: look for any visible "Topic: ..." text in the author block.
    const text = author.textContent || '';
    const match = text.match(/Topic:(.*?)(?:\(Read)/i);
    if (match && match[1]) {
        return match[1].replace(/\[spot\]/gi, '').trim();
    }
    return null;
}

const indexers = [
    {
        name: 'NZBIndex',
        url: 'https://DoNotRefer.Me/#https://nzbindex.com/search?max=25&minage=&maxage=&hidespam=1&hidepassword=0&sort=agedesc&minsize=&maxsize=&complete=0&hidecross=0&hasNFO=0&poster=&q={query}',
        codeFn: function (code) { return sanitizeCommon(code); }
    },
    {
        name: 'BinSearch',
        url: 'https://DoNotRefer.Me/#https://www.binsearch.info/?max=1000&adv_age=&adv_sort=date&server=2&q={query}',
        codeFn: function (code) { return sanitizeCommon(code); }
    },
    {
        name: 'BinSearch-Abook',
        url: 'https://DoNotRefer.Me/#https://www.binsearch.info/?max=100&adv_g=alt.binaries.mp3.abooks&adv_age=&adv_sort=date&q={query}',
        codeFn: function (code) { return sanitizeCommon(code); }
    },
    {
        name: 'NZBKing',
        url: 'https://DoNotRefer.Me/#http://nzbking.com/search/?q=%22{query}%22',
        codeFn: function (code) { return sanitizeCommon(code); }
    }
];

/**
 * Build the HTML list of search-engine links for a piece of code.
 *
 * @param {string} code
 * @returns {string}
 */
function buildSearchLinks(code) {
    if (!code) return '';
    let list = '';
    indexers.forEach(function (indexer) {
        const query = encodeURIComponent(indexer.codeFn(code));
        const link = indexer.url.replace(/{query}/g, query);
        list +=
            '<li>' +
            '<a rel="noreferrer" rel="noopener" target="_blank" href="' + link + '">' +
            indexer.name +
            '</a>' +
            '</li>';
    });
    return list;
}

/**
 * A header is treated as a "password label" when one of its previous
 * siblings says "password".
 *
 * @param {Element} header
 * @returns {boolean}
 */
function isLikelyPasswordLabel(header) {
    let sibling = header.previousSibling;
    let count = 0;
    while (sibling && count < 3) {
        const text = sibling.textContent || '';
        if (text.toLowerCase().includes('password')) {
            return true;
        }
        sibling = sibling.previousSibling;
        count++;
    }
    return false;
}

/**
 * A code block is treated as a password when it itself contains the word
 * "password" (i.e. the code box literally holds a password).
 *
 * @param {string} code
 * @returns {boolean}
 */
function isPasswordCode(code) {
    return code.toLowerCase().includes('password');
}

/**
 * Create a "Copy Title" link and wire clipboard copy.
 *
 * @param {string} title
 * @param {Element} reference
 */
function createCopyTitleLink(title, reference) {
    const link = document.createElement('a');
    link.id = 'kooba-title-copy';
    link.className = 'kooba-title-copy';
    link.dataset.cipboard = title;
    link.title = 'Copy "' + title + '" to clipboard';
    link.textContent = ' [Copy]';
    link.addEventListener('click', function (event) {
        event.preventDefault();
        copyTextToClipboard(title);
    });
    if (reference) {
        reference.parentNode.insertBefore(link, reference.nextSibling);
    }
}

/**
 * Render the generated HTML into the DOM without blowing up on stray
 * whitespace text nodes.
 *
 * @param {Element} anchor
 * @param {string} html
 */
function appendHtmlToAnchor(anchor, html) {
    const template = document.createElement('template');
    template.innerHTML = html;
    while (template.content.firstChild) {
        anchor.appendChild(template.content.firstChild);
    }
}

/**
 * The block NZBDonkey uses when it offers "Get NZB File" for a selection.
 *
 * NZBDonkey's best-practice rules are:
 *   1. Title on the first line;
 *   2. "Header: ..." line;
 *   3. "Password: ..." line (omitted when there is no password).
 *
 * The div is given `user-select: all` so a single click also selects the
 * whole block in Chromium/Brave/Firefox.
 *
 * @param {string} title
 * @param {string} header
 * @param {string} password
 * @returns {string}
 */
function buildNzbdonkeyBlock(title, header, password) {
    const lines = [];
    lines.push(title);
    const headerLine = sanitizeCommon(header);
    const passwordLine = sanitizeCommon(password);

    if (headerLine) {
        lines.push('Header: ' + headerLine);
    }
    if (passwordLine) {
        lines.push('Password: ' + passwordLine);
    }
    const body = lines.join('\n');

    return (
        '<div class="kooba-nzbdonkey">' +
        '<div class="kooba-nzbdonkey-title">NZBDonkey Highlight Text ' +
        '<a class="kooba-nzbdonkey-help" target="_blank" href="https://tensai75.github.io/NZBDonkey/" ' +
        'title="This extension lets you right-click the text below and choose \'Get NZB File\' to ' +
        'automatically find and process the NZB. Another extension is required.">?</a></div>' +
        '<div class="kooba-nzbdonkey-text" ' +
        'data-nzbdonkey-title="' + encodeURIComponent(title) + '" ' +
        'data-nzbdonkey-header="' + encodeURIComponent(headerLine) + '" ' +
        'data-nzbdonkey-password="' + encodeURIComponent(passwordLine) + '" ' +
        'title="' + body + '">' +
        body +
        '</div>' +
        '</div>'
    );
}

/**
 * Inject the stylesheet once.
 */
function injectStyle() {
    if (document.getElementById('kooba-style')) return;
    const style = document.createElement('style');
    style.id = 'kooba-style';
    style.textContent =
        '.kooba-search-links, .kooba-search-links span, .kooba-search-links ul, .kooba-search-links li {' +
        '  display: inline-block;' +
        '}' +
        '.kooba-search-links span {' +
        '  margin-left: .5em;' +
        '}' +
        '.kooba-search-links ul {' +
        '  list-style: none;' +
        '  margin: 0;' +
        '  padding-left: 0;' +
        '}' +
        '.kooba-search-links li {' +
        '  margin: 0;' +
        '  padding: 0;' +
        '}' +
        '.kooba-search-links li:not(:last-child):after {' +
        '  color: #ccc;' +
        '  content: "|";' +
        '}' +
        '.kooba-search-links a {' +
        '  margin: 0;' +
        '  padding: 0 .5em;' +
        '}' +
        '.kooba-title-copy {' +
        '  color: #57aad2;' +
        '}' +
        '.kooba-title-copy:hover {' +
        '  text-decoration: underline;' +
        '}' +
        '.kooba-title-copy2 {' +
        '  margin-left: 30px;' +
        '  color: #9383e0;' +
        '  font-weight: normal;' +
        '}' +
        '.kooba-title-copy2:hover {' +
        '  text-decoration: underline;' +
        '}' +
        '.kooba-nzbdonkey {' +
        '  margin-top: 20px;' +
        '  border: 1px dotted yellow;' +
        '  padding: 10px;' +
        '}' +
        '.kooba-nzbdonkey-title {' +
        '  font-weight: bold;' +
        '  color: red;' +
        '}' +
        'a.kooba-nzbdonkey-help {' +
        '  text-decoration: none;' +
        '  color: #2196f3;' +
        '  border-bottom: 1px dotted #2196f3;' +
        '}' +
        '.kooba-nzbdonkey-text {' +
        '  font-size: 10px;' +
        '  font-weight: normal;' +
        '  font-family: monospace;' +
        '  color: #bb96e0;' +
        '  padding-left: 30px;' +
        '  user-select: all;' +
        '  -moz-user-select: all;' +
        '  cursor: text;' +
        '}';
    document.head.appendChild(style);
}

/**
 * Copy a string to the clipboard with a modern API fallback so it works in
 * Chromium, Brave and Firefox.
 *
 * @param {string} text
 */
function copyTextToClipboard(text) {
    // Modern secure-context API (user gesture required).
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).catch(function () {
            // fall through to the legacy fallback below
        });
    }

    // Legacy fallback (works in all major desktop/portable browsers).
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'absolute';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    try {
        document.execCommand('copy');
    } catch (err) {
        // no-op – the modern API path above already ran
    }
    document.body.removeChild(textarea);
}

/**
 * Create the copy-button inside a search-links block.
 */
function makeCopyButton(title) {
    const link = document.createElement('a');
    link.className = 'kooba-title-copy2';
    link.dataset.cipboard = title;
    link.title = 'Copy "' + title + '" to clipboard';
    link.textContent = ' [Copy Title]';
    link.addEventListener('click', function (event) {
        event.preventDefault();
        copyTextToClipboard(title);
    });
    return link;
}

/**
 * Build and inject the Kooba block into a single `.codeheader`.
 */
function buildKoobaBlock(header) {
    const code = extractCodeText(header);
    const pageTitle = getTopicTitle();

    // Skip password-only headers (a header whose text itself is a password).
    if (isLikelyPasswordLabel(header)) {
        header.classList.add('kooba_crunched');
        return;
    }

    // Determine the "password" block. Kooba/abook threads put the NZB header
    // in the first .bbc_code and the password in the second one. We only
    // accept a later codebox as the password when it *is* a password, rather
    // than picking up any random trailing code text.
    let password = '';
    const parent = header.parentElement;
    const codeboxes = parent ? parent.querySelectorAll('.bbc_code') : [];
    if (codeboxes.length >= 2) {
        for (let i = 1; i < codeboxes.length; i++) {
            const second = codeboxes[i];
            const secondText = (second ? second.textContent : '').trim();
            if (isPasswordCode(secondText)) {
                password = secondText;
                break;
            }
        }
    }

    // Skip the search-links block when this header's code is itself a
    // password (short, alphanumeric-ish) — search engines don't benefit
    // from indexing a password string.
    const passwordLike = isPasswordCode(code) && code.length < 200;
    const searchHtml =
        '<div class="kooba-search-links">' +
        '<span>Search:</span>' +
        (passwordLike ? '' : '<ul>' + buildSearchLinks(code) + '</ul>') +
        '</div>';

    const copyButton = makeCopyButton(pageTitle || 'Untitled topic');
    const donkeyBlock = buildNzbdonkeyBlock(
        pageTitle || 'Untitled topic',
        code,
        password
    );

    header.classList.add('kooba_crunched');
    appendHtmlToAnchor(header, searchHtml);
    // Insert copy button and NZBDonkey block after the header content.
    header.insertAdjacentElement('beforeend', copyButton);
    header.parentElement.insertAdjacentHTML('beforeend', donkeyBlock);
}

/**
 * Find and process every `.codeheader` on the page exactly once.
 */
function processKoobaSearch() {
    const headers = document.querySelectorAll('.codeheader');
    headers.forEach(function (header) {
        if (header.classList.contains('kooba_crunched')) return;
        buildKoobaBlock(header);
    });
}

/**
 * Re-run once the page has finished loading, and watch for changes so that
 * dynamically injected content keeps working in Brave/Chromium/Firefox.
 */
function initKoobaHelper() {
    // The immediate run-at=document-end already fired; just patch the DOM now.
    processKoobaSearch();

    // Watch for any post/topic content that is added after page load.
    if (window.MutationObserver) {
        const observer = new MutationObserver(function () {
            processKoobaSearch();
        });
        // Observe thematic containers that Kooba uses for posts/threads.
        document.querySelectorAll('body').forEach(function (body) {
            // Observe everything under the forum for simplicity and speed.
            observer.observe(body, { childList: true, subtree: true });
        });
    } else {
        // Fallback for very old browsers: poll every few seconds.
        setInterval(processKoobaSearch, 5000);
    }
}

/**
 * Expose helpers for the thank-you detour and for bookmarklet consumers.
 */
window.koobaCopyClipboardStr = function (str) {
    copyTextToClipboard(str);
};
window.koobaCopyClipboardData = function (obj) {
    copyTextToClipboard(obj ? obj.dataset.cipboard : '');
    showCopiedFeedback(obj);
};
window.koobaInsertAfter = function (newNode, existingNode) {
    if (!existingNode || !existingNode.parentNode) return;
    existingNode.parentNode.insertBefore(newNode, existingNode.nextSibling);
};
window.injectKoobaTitleCopy = function () {
    if (document.getElementById('kooba-title-copy')) return;
    const pageTitle = getTopicTitle();
    if (!pageTitle) return;
    createCopyTitleLink(pageTitle, document.querySelector('#author'));
};
window.injectKoobaStyle = function () {
    injectStyle();
};
window.injectKoobaSearch = function () {
    processKoobaSearch();
};

function showCopiedFeedback(obj) {
    const existing = document.querySelector('.kooba-copied-feedback');
    if (existing) {
        existing.remove();
    }
    const div = document.createElement('div');
    div.className = 'kooba-copied-feedback';
    div.textContent = 'Copied to clipboard';
    div.style.position = 'fixed';
    div.style.top = '10px';
    div.style.right = '10px';
    div.style.background = 'rgba(0,0,0,0.75)';
    div.style.color = 'yellow';
    div.style.padding = '6px 10px';
    div.style.borderRadius = '4px';
    div.style.fontFamily = 'sans-serif';
    div.style.zIndex = '99999';
    document.body.appendChild(div);
    setTimeout(function () {
        div.remove();
    }, 2000);
}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

(function () {
    injectKoobaStyle();
    initKoobaHelper();

    // Restore "Copy Title" on the Kooba index pages that have a static
    // "Copy"/"Copy Title" button.
    window.addEventListener('load', function () {
        injectKoobaTitleCopy();
    }, { once: true });

    // Detour the thank-you button so the block is re-rendered after a new
    // post is added to a thread.
    const sayThanks = window.saythanks;
    if (sayThanks && sayThanks.prototype && sayThanks.prototype.handleThankClick) {
        const original = sayThanks.prototype.handleThankClick;
        sayThanks.prototype.handleThankClick = function (oInput) {
            // Call the original handler (it is preserved above).
            if (typeof original === 'function') {
                original.call(this, oInput);
            }
            // Re-process in case a new topic/codes were added.
            setTimeout(processKoobaSearch, 250);
            setTimeout(processKoobaSearch, 1000);
            setTimeout(processKoobaSearch, 3000);
            setTimeout(processKoobaSearch, 8000);
        };
    }
})();
