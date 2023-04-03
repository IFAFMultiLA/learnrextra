// disable "$(document).ready()" for all scripts to make sure that the
// setup function below is always executed first
$.holdReady(true);


/**
 * Global variables
 */

var sess = null;   // session ID
var apiserver = 'http://localhost:8000/';   // TODO: make this configurable
var sessdata = {};      // session data
var tracking_session_id = null;


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
    console.log("received session configuration for session", sess_config.sess_code,
                "with auth mode", sess_config.auth_mode);

    if (sess_config.auth_mode == "none") {
        sessdata.user_code = sess_config.user_code;
        sessdata.app_config = sess_config.config;
        console.log("received user code", sessdata.user_code);
    } else {
        // show modal
        $("authmodal").modal();
    }
}


/**
 * Set up the application.
 */
function appSetup(fullsessdata) {
    fullsessdata[sess] = sessdata;
    Cookies.set('sessdata', btoa(JSON.stringify(fullsessdata)));

    var config = sessdata.app_config;

    // handling excluding elements by selector
    if (config.hasOwnProperty('exclude')) {
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
    }

    // load additional JS files
    if (config.hasOwnProperty('js')) {
        config.js.forEach(function(jsfile) {
            console.log("loading additional JS file", jsfile);
            $.getScript("./www/" + jsfile, function() {
                console.log("done loading JS file", jsfile);
            });
        });
    }

    // load additional CSS files
    if (config.hasOwnProperty('css')) {
        config.css.forEach(function(cssfile) {
            console.log("loading additional CSS file", cssfile);
            $('head').append('<link rel="stylesheet" type="text/css" href="./www/' +  cssfile + '">');
        });
    }

    // re-enable $(document).ready() for all scripts so that the
    // usual initialization takes place
    $.holdReady(false);

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
            "Authorization": "Token " + sessdata.user_code
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
                "Authorization": "Token " + sessdata.user_code
            },
            keepalive: true
        });

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
                "Authorization": "Token " + sessdata.user_code
            },
            credentials: 'same-origin'
        });
    });
}


/**
 * Initialize the application when the HTML document along with all remote elements
 * (images, scripts, etc) was fully loaded.
 */
$(window).on("load", function() {
    // get session ID
    if ($.urlParam('sess') !== undefined) {
        sess = $.urlParam('sess');
        Cookies.set('sess', sess);
    } else {
        sess = Cookies.get('sess');
    }

    if (sess !== undefined) {
        console.log("using session ID", sess);

        var fullsessdata = {};
        if (Cookies.get('sessdata') !== undefined) {
            fullsessdata = $.parseJSON(atob(Cookies.get('sessdata')));
        }

        if (fullsessdata.hasOwnProperty(sess)) {
            sessdata = fullsessdata[sess];
        } else {
            sessdata = {
                user_code: null,
                app_config: null
            }
        }

        if (sessdata.user_code === undefined || sessdata.app_config === null) {
            // start an application session
            fetch(apiserver + 'session/?sess=' + sess)
                .then((response) => response.json())
                .then((config) => sessionSetup(config))
                .then(() => appSetup(fullsessdata));
        } else {
            console.log('loaded user code from cookies:', sessdata.user_code);
            console.log('loaded app config from cookies');
            appSetup(fullsessdata);
        }
    }
});

