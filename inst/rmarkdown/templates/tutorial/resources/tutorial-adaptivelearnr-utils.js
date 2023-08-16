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
 * Set a class to all elements in `elems` until including the `i`th element.
 */
function setClassForElementsUntilIndex(elems, i) {
    elems.each(function(j) {
        let item = $(this);
        if (j <= i) {
            item.addClass('active');
        } else {
            item.removeClass('active');
        }
    });
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

    //console.debug('sending data to endpoint ' + endpoint + ':', data);

    return fetch(apiserver + endpoint, options);
}


/**
 * Shortcut for posting event data to the API.
 */
function postEvent(sess, tracking_session_id, authtoken, eventtype, eventval) {
    if (replay) {
        return null;
    }

    return postJSON('track_event/', {
            sess: sess,
            tracking_session_id: tracking_session_id,
            event: {
                time: nowISO(),
                type: eventtype,
                value: eventval
            }
        },
        authtoken
    );
}


/**
 * Shortcut for posting user feedback data to the API.
 */
function postUserFeedback(sess, tracking_session_id, authtoken, content_section, score, comment) {
    if (replay) {
        return null;
    }

    return postJSON('user_feedback/', {
            sess: sess,
            tracking_session: tracking_session_id,
            content_section: content_section,
            score: score,
            text: comment
        },
        authtoken
    );
}


/**
 * Detect device form factor (tablet, phone or desktop).
 *
 * Taken and adapted from https://abdessalam.dev/blog/detect-device-type-javascript/.
 */
function detectFormFactor() {
  const ua = navigator.userAgent;
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return "tablet";
  }
  if (
    /Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(
      ua
    )
  ) {
    return "phone";
  }
  return "desktop";
};


/**
 * Get the current view port size (window size) as array [width, height].
 *
 * Requires jQuery.
 */
function getWindowSize() {
    return [$(window).width(), $(window).height()];
}


/**
 * Send collected mouse tracking data to the API.
 */
function mouseTrackingUpdate() {
    // get the data so far and reset it so we will continue with a fresh batch on the next update
    mus.finishedAt = new Date().getTime() / 1000;
    let data = mus.getData();
    mus.frames = [];
    mus.finishedAt = 0;

    if (data.frames.length > 0) {
        // only post when we have recorded data
        postEvent(sess, tracking_session_id, sessdata.user_code, "mouse", data);
    }
}


/**
 * Register an input element that is selectable via `selector` for tracking its changes by listening to the event
 * `listen_event` (default: `"change"`). Extract the updated value of the input element by applying the function
 * `extract_val_fn` which takes the jQuery element object as parameter (default: `(input_elem) => input_elem.val()`).
 */
function registerInputTracking(selector, sess, tracking_session_id, authtoken, listen_event, extract_val_fn, event_type)
{
    listen_event = listen_event === undefined ? 'change' : listen_event;
    extract_val_fn = extract_val_fn === undefined ? (input_elem) => input_elem.val() : extract_val_fn;
    event_type = event_type === undefined ? 'input_change' : event_type;

    $(selector).on(listen_event, _.debounce(function() {
        let $this = $(this);
        let eventval = {
            'id': $this.prop('id'),
            'xpath': getXPathForElement(this),
            'value': extract_val_fn($this)
        };
        //console.log(event_type, eventval);
        postEvent(sess, tracking_session_id, authtoken, event_type, eventval);
    }, INPUT_TRACKING_DEBOUNCE));
}

/**
 * Send a message of type `msgtype` to the parent window.
 *
 * This is used when the app is embedded as iframe (e.g. in "replay mode").
 */
function messageToParentWindow(msgtype, data) {
    window.parent.postMessage({"msgtype": msgtype, "data": data}, apiserver_url.origin);
}

