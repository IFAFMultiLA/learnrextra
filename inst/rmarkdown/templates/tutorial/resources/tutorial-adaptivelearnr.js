// Main adaptivelearnr javascript code.
// Requires tutorial-adaptivelearnr-utils.js to be included before.
//
// Additionally, an adapted version of the "mus.js" JavaScript library is used (see
// https://github.com/IFAFMultiLA/musjs).
//
//


// disable "$(document).ready()" for all scripts to make sure that the
// setup function below is always executed first
$.holdReady(true);


/**
 * Global variables and constants
 */

// mouse tracking update interval in ms (if enabled by app config); set to 0 to disable generally
const MOUSE_TRACK_UPDATE_INTERVAL = 10000;
// debounce time in ms for window resize tracking
const WINDOW_RESIZE_TRACKING_DEBOUNCE = 500;

var config = null;  // will be set when it is loaded

var sess = null;   // session ID
var apiserver = null;     // base URL to API server; will be loaded from config
var fullsessdata = {};    // session data for all sessions saved to cookies
var sessdata = {};        // session data for this specific session
var tracking_session_id = null;     // tracking session ID for the current session
var mus = null;                     // mus.js mouse tracking instance
var mouse_track_interval = null;    // mouse tracking interval timer ID


/**
 * Perform a user login.
 */
function userLogin(sess, email, password) {
    postJSON('session_login/', {
            sess: sess,
            email: email,
            password: password
    })
    .then((response) => {
        if (!response.ok) {
            $('#register-login-fail-alert').text("Login failed.").show();
            throw new Error("login failed");
        } else {
            return response.json();
        }
    })
    .then(function (response) {
        $('#register-login-fail-alert').text("").hide();
        $('#authmodal').modal('hide');
        sessdata.user_code = response.user_code;
        sessdata.app_config = response.config;
        sessdata.user_email = email;
        console.log("received user code", sessdata.user_code);
        appSetup();
    });
}


/**
 * Perform a user logout.
 */
function userLogout() {
    Cookies.remove('sessdata');
    window.location.reload();   // should automatically close the tracking session
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
        sessdata.user_email = null;
        console.log("received user code", sessdata.user_code);
        return true;
    } else {
        // set up authentication modal dialog
        $("#login-btn").on("click", function() {
            // log in an already registered user
            console.log("logging in ...");

            var email = $("#email").val();
            var password = $("#password").val();

            userLogin(sess, email, password);
        });

        $("#register-btn").on("click", function() {
            // register a new user and log in that user
            console.log("registering ...");

            let email = $("#email").val();
            let password = $("#password").val();

            postJSON('register_user/', {
                sess: sess,
                email: email,
                password: password
            })
            .then(response => {
                if (Number(response.headers.get("content-length")) > 0) {
                    return response.json();  // got valid answer
                } else {
                    return {};
                }
            })
            .then(resp_data => {
                if (resp_data.hasOwnProperty('error')) {    // failure registering user
                    let alert_box = $('#register-login-fail-alert');
                    let error_type = 'unknown';

                    if (resp_data.hasOwnProperty('error')) {
                        error_type = resp_data.error;
                        alert_box.text(resp_data.message);
                    } else {
                        alert_box.text("Failed to register.");
                    }

                    alert_box.show();
                } else {    // success registering user
                    $('#register-login-fail-alert').text("").hide();
                    $('#authmodal').modal('hide');

                    // log in the new user
                    userLogin(sess, email, password);
                }
            });
        });

        // show modal
        $("#authmodal").modal('show');
        return false;
    }
}


/**
 * Continues to render the page and shows all initially hidden elements.
 */
function showPage() {
    $('#doc-metadata').show();

    // re-enable $(document).ready() for all scripts so that the
    // usual initialization takes place
    $.holdReady(false);
}


/**
 * Prepare application session with obtained application session code `obtained_sess_code`.
 */
async function prepareSession(obtained_sess_code) {
    sess = obtained_sess_code;

    if (sess === undefined) {
        // no session ID was passed
        console.warn("no session ID passed as URL parameter");
        // we continue showing the page – tracking will be disabled
        showPage();
    } else {
        // a session ID was passed
        console.log("using session ID", sess);

        // get existing sessions from cookie storage
        if (Cookies.get('sessdata') !== undefined) {
            fullsessdata = $.parseJSON(atob(Cookies.get('sessdata')));
        }

        // check if data for this session ID exists in the cookie
        if (fullsessdata.hasOwnProperty(sess)) {
            // use the session data from the cookie
            sessdata = fullsessdata[sess];
        } else {
            // create new, empty session data
            sessdata = {
                user_code: null,
                user_email: null,
                app_config: null
            }
        }

        if (sessdata.user_code === undefined || sessdata.app_config === null) {
            // no user auth. token and/or application configuration –  start an application session to fetch this
            // information
            try {
                await fetch(apiserver + 'session/?sess=' + sess)
                    .then((response) => response.json())
                    .then((config) => sessionSetup(config) && appSetup());
            } catch (err) {
                console.error("fetch failed:", err);
                console.log("setting up app without user token code")
                config = {
                    sess_code: sess,
                    user_code: null,
                    auth_mode: "none",
                    config: {}
                }
                sessionSetup(config);
                appSetup();
            }
        } else {
            // user auth token and application configuration already present (from cookie)
            console.log('loaded user code from cookies:', sessdata.user_code);
            console.log('loaded app config from cookies');
            appSetup();
        }
    }
}


/**
 * Set up the application.
 */
function appSetup() {
    // retain session data via cookie
    if (sessdata.user_code !== null) {
        fullsessdata[sess] = sessdata;
        Cookies.set('sessdata', btoa(JSON.stringify(fullsessdata)));
    }

    // show "logged in as ..." message in page header
    if (sessdata.user_email !== null) {
        $('#messages-container .alert-info').html("Logged in as " + sessdata.user_email +
            " – <a href='#' id='logout-link'>Logout</a>").show();
        $('#logout-link').on('click', userLogout);
    } else {
        $('#messages-container .alert-info').text("").hide();
    }

    // set up the app according to the app configuration
    let config = sessdata.app_config;

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

    // continue rendering normally
    showPage();

    // start a tracking session
    if (sessdata.user_code === null) {
        console.log("skipping tracking")
    } else {
        // send "tracking session started" information and obtain a tracking session ID
        let start_data = {
            sess: sess,
            start_time: nowISO(),
            device_info: {
                form_factor: detectFormFactor(),
                window_size: getWindowSize(),
                user_agent: navigator.userAgent
            }
        }

        postJSON('start_tracking/', start_data, sessdata.user_code)
            .then((response) => response.json())
            .then(function (response) {
                tracking_session_id = response.tracking_session_id;
                console.log("received tracking session ID", tracking_session_id);

                // set up the tracking with the obtained tracking session ID
                setupTracking();
            });

        // set a handler for stopping the tracking session when the page is closed
        $(window).on('beforeunload', function() {
            // stop the mouse tracking
            clearInterval(mouse_track_interval);
            mouse_track_interval = null;
            mouseTrackingUpdate();
            mus.stop();

            // send "tracking session ended" information
            postJSON('stop_tracking/', {
                    sess: sess,
                    tracking_session_id: tracking_session_id,
                    end_time: nowISO()
                },
                sessdata.user_code,
                {keepalive: true}
            );

            return null;
        });
    }
}

/**
 * Set up tracking.
 */
function setupTracking() {
    // set a handler for tracking window resize events
    $(window).on('resize', _.debounce(function(event) {  // use "debounce" to prevent sending too much information
        postEvent(sess, tracking_session_id, sessdata.user_code, "device_info_update", {window_size: getWindowSize()});
    }, WINDOW_RESIZE_TRACKING_DEBOUNCE));

    // handling tracking configuration
    let tracking_config = _.defaults(sessdata.app_config.tracking, {'mouse': true});

    // mouse tracking
    if (tracking_config.mouse && MOUSE_TRACK_UPDATE_INTERVAL > 0) {
        mus = new Mus();
        mus.setTimePoint(true);  // records time elapsed for each point for a precise data recording
        mus.setRecordCurrentElem(true);
        //mus.setRecordInputs(false);
        mus.record();  // start recording
        mouse_track_interval = setInterval(mouseTrackingUpdate, MOUSE_TRACK_UPDATE_INTERVAL);
    }
}


/**
 * Initialize the application when the HTML document along with all remote elements
 * (images, scripts, etc) was fully loaded.
 */
$(window).on("load", async function() {
    // load configuration
    config = JSON.parse(document.getElementById('adaptivelearnr-config').textContent);
    apiserver = config.apiserver;

    console.log("API server set to", apiserver);

    // get session ID
    if ($.urlParam('sess') !== undefined) {
        sess = $.urlParam('sess');
        Cookies.set('sess', sess);
    } else {
        sess = Cookies.get('sess');
    }

    if (sess === undefined) {
        console.log("trying to obtain session code via default application session");
        try {
            await fetch(apiserver + 'session/')
                .then((response) => response.json())
                .then((response) => prepareSession(response.sess_code));
        } catch (err) {
            console.error("fetch failed:", err);
            console.log("preparing session without session code")
            prepareSession();   // prepare without session code
        }
    } else {
        prepareSession(sess);
    }
});

/**
 * Initialize event handlers for custom messages coming from the Shiny server backend.
 */
$(document).on("shiny:connected", function() {
    // receive learnr events like exercise submissions
    Shiny.addCustomMessageHandler("learnr_event", function(data) {
        let etype = data.event_type;
        delete data.event_type;
        postEvent(sess, tracking_session_id, sessdata.user_code, "learnr_event_" + etype, data);
    });
})
