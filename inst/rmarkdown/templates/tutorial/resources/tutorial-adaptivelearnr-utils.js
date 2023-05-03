// Utility functions for adaptivelearnr javascript code.


/**
 * Extend JQuery with a function to get URL parameters.
 */
$.urlParam = function(name, url) {
    if (!url) {
     url = window.location.href;
    }
    var results = new RegExp('[\\?&]' + name + '=([^&#]*)').exec(url);
    if (!results) {
        return undefined;
    }
    return results[1] || undefined;
}


/**
 * Helper function to turn an element into a XPath string.
 */
function getXPathForElement(element) {
    const idx = (sib, name) => sib
        ? idx(sib.previousElementSibling, name||sib.localName) + (sib.localName == name)
        : 1;
    const segs = elm => !elm || elm.nodeType !== 1
        ? ['']
        : elm.id && document.getElementById(elm.id) === elm
            ? [`id("${elm.id}")`]
            : [...segs(elm.parentNode), `${elm.localName.toLowerCase()}[${idx(elm)}]`];
    return segs(element).join('/');
}


/**
 * Current time in ISO format, corrected for local timezone.
 */
function nowISO() {
    return new Date().toISOString();
}


/**
 * Send a POST request with `data` via `fetch` to the API `endpoint`. Optionally authenticate via `authtoken`.
 */
function postJSON(endpoint, data, authtoken, extras) {
    let headers = {
        "Content-type": "application/json; charset=UTF-8",
        "X-CSRFToken": Cookies.get("csrftoken")
    };

    if (authtoken !== undefined) {
        headers.Authorization = "Token " + sessdata.user_code;
    }

    let options = {
        method: "POST",
        body: JSON.stringify(data),
        headers: headers
    }

    if (extras !== undefined) {
        options = {...options, ...extras};
    }

    return fetch(apiserver + endpoint, options);
}
