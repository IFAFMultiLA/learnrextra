// disable "$(document).ready()" for all scripts to make sure that the
// setup function below is always executed first
$.holdReady(true);


/**
 * Global variables
 */

var sess = null;   // session ID
var apiserver = 'http://localhost:8000/';   // TODO: make this configurable
var user_code = null;               // user token after authentication
var tracking_session_id = null;     // tracking ID once a tracking session started


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
 * Set up a session.
 */
function sessionSetup(sess_config) {
    console.log("received session configuration for session ", sess_config.sess_code, " with auth mode", sess_config.auth_mode);

    if (sess_config.auth_mode == "none") {
        user_code = sess_config.user_code;
        console.log("received user code", user_code);
        Cookies.set('user_code', user_code);
        Cookies.set('app_config', btoa(JSON.stringify(sess_config.config)));
    } else {
        console.log("this auth mode is not supported so far");  // TODO
    }

    // continue with application configuration
    appSetup(sess_config.config);
}


/**
 * Set up the application using the configuration object `config`.
 */
function appSetup(config) {
    // handling excluding elements by selector
    config.exclude.forEach(function(selector) {
        // hide element
        $(selector).remove();

        // hide main navigation menu item
        $('#tutorial-topic ul li a').each(function() {
            var link = $(this);
            if (link.attr('href') == selector) {
                link.parent().remove();
            }
        });
    });

    // load additional JS files
    config.js.forEach(function(jsfile) {
        console.log("loading additional JS file", jsfile);
        $.getScript("./www/" + jsfile, function() {
            console.log("done loading JS file", jsfile);
        });
    });

    // load additional CSS files
    config.css.forEach(function(cssfile) {
        console.log("loading additional CSS file", cssfile);
        $('head').append('<link rel="stylesheet" type="text/css" href="./www/' +  cssfile + '">');
    });

    // re-enable $(document).ready() for all scripts so that the
    // usual initialization takes place
    $.holdReady(false);
}


/**
 * Initialize the application when the HTML document along with all remote elements
 * (images, scripts, etc) was fully loaded.
 */
$(window).on( "load", function() {
    // get session ID
    if ($.urlParam('sess') !== undefined) {
        var sess = $.urlParam('sess');
        var cookies_sess = Cookies.get('sess');
        if (cookies_sess !== undefined && cookies_sess !== sess) {
            Cookies.remove('user_code');
            Cookies.remove('app_config');
        }

        Cookies.set('sess', sess);
    } else {
        sess = Cookies.get('sess');
    }

    if (sess !== undefined) {
        console.log("using session ID", sess);

        user_code = Cookies.get('user_code');
        var app_config = null;
        if (Cookies.get('app_config') !== undefined) {
            app_config = $.parseJSON(atob(Cookies.get('app_config')));
        }

        if (user_code === undefined && app_config === null) {
            // start an application session
            fetch(apiserver + 'session/?sess=' + sess)
                .then((response) => response.json())
                .then((config) => sessionSetup(config));
        } else {
            console.log('loaded user code from cookies', user_code);
            appSetup(app_config);
        }

        // start a tracking session
        fetch(apiserver + 'start_tracking/', {
            method: "POST",
            body: JSON.stringify({
                sess: sess,
                start_time: new Date().toISOString()
            }),
            headers: {
                "Content-type": "application/json; charset=UTF-8",
                "X-CSRFToken": Cookies.get("csrftoken"),
                "Authorization": "Token " + user_code
            }
        })
            .then((response) => response.json())
            .then(function (response) { tracking_session_id = response.tracking_session_id; });

        // set a handler for stopping the tracking session
        $(window).on('beforeunload', function() {
            fetch(apiserver + 'stop_tracking/', {
                method: "POST",
                body: JSON.stringify({
                    sess: sess,
                    tracking_session_id: tracking_session_id,
                    end_time: new Date().toISOString()
                }),
                headers: {
                    "Content-type": "application/json; charset=UTF-8",
                    "X-CSRFToken": Cookies.get("csrftoken"),
                    "Authorization": "Token " + user_code
                },
                keepalive: true
            })
                .then((response) => response.json())
                .then(function (response) { tracking_session_id = response.tracking_session_id; });

            return null;
        });

        // set a handler for tracking click events
        $(document).on('click', function(event) {
            var target = getXPathForElement(event.target);
            fetch(apiserver + 'track_event/', {
                method: "POST",
                body: JSON.stringify({
                    sess: sess,
                    tracking_session_id: tracking_session_id,
                    event: {
                        time: new Date().toISOString(),
                        type: "click",
                        value: target
                    }
                }),
                headers: {
                    "Content-type": "application/json; charset=UTF-8",
                    "X-CSRFToken": Cookies.get("csrftoken"),
                    "Authorization": "Token " + user_code
                },
                credentials: 'same-origin'
            });
        });
    }
});

