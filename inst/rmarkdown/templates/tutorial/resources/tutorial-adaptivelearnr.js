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
// input tracking time in ms
const INPUT_TRACKING_DEBOUNCE = 250;

// default cookie options (expires in half a year, valid for current path)
const COOKIE_DEFAULT_OPTS = {
    expires: 183,
    path: ''
};

var config = null;  // will be set when it is loaded

var replay = false;  // replay mode
var sess = null;     // session ID
var apiserver = null;       // base URL to API server; will be loaded from document config
var apiserver_url = null;   // base URL to API server as URL object
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
    Cookies.remove('sessdata', COOKIE_DEFAULT_OPTS);
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
async function prepareSession(obtained_sess_code, app_config_for_replay) {
    sess = obtained_sess_code;

    if (sess === undefined || replay) {
        // we continue showing the page – tracking will be disabled
        console.log("tracking disabled");

        if (replay) {
            console.log("preparing session in replay mode");

            if (app_config_for_replay === undefined) {
                console.error("replay mode but app_config_for_replay is undefined")
            }
            if (sess === undefined) {
                console.error("replay mode but sess is undefined")
            }

            config = {
                sess_code: sess,
                user_code: null,
                auth_mode: "none",
                config: app_config_for_replay
            }
            sessionSetup(config);
            appSetup();

            // initial data pull
            messageToParentWindow("pulldata", {i: 0});
        } else {
            showPage();
        }
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
        Cookies.set('sessdata', btoa(JSON.stringify(fullsessdata)), COOKIE_DEFAULT_OPTS);
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
    let tracking_config = _.defaults(sessdata.app_config.tracking, {'mouse': true, 'inputs': true, 'chapters': true});

    if (tracking_config.chapters) {
        // clicks on "previous chapter" button
        registerInputTracking(
            '.topicActions .btn-default',
            sess, tracking_session_id, sessdata.user_code,
            'click',
            function (input_elem) {
                return {
                    element: 'btn_prev',
                    chapter_title: $('#tutorial-topic ul li.current a').text(),
                    chapter_id: $('#tutorial-topic ul li.current a').attr('href').slice(1),
                    chapter_index: $('#tutorial-topic ul li.current').index()
                }
            },
            'chapter'
        );

        // clicks on "next chapter" button
        registerInputTracking(
            '.topicActions .btn-primary',
            sess, tracking_session_id, sessdata.user_code,
            'click',
            function (input_elem) {
                return {
                    element: 'btn_next',
                    chapter_title: $('#tutorial-topic ul li.current a').text(),
                    chapter_id: $('#tutorial-topic ul li.current a').attr('href').slice(1),
                    chapter_index: $('#tutorial-topic ul li.current').index()
                }
            },
            'chapter'
        );

        // clicks on navigation sidebar links
        registerInputTracking(
            '#tutorial-topic ul li a',
            sess, tracking_session_id, sessdata.user_code,
            'click',
            function (input_elem) {
                return {
                    element: 'nav',
                    chapter_title: $('#tutorial-topic ul li.current a').text(),
                    chapter_id: $('#tutorial-topic ul li.current a').attr('href').slice(1),
                    chapter_index: $('#tutorial-topic ul li.current').index()
                }
            },
            'chapter'
        );
    }

    // shiny inputs tracking
    if (tracking_config.inputs) {
        // checkboxes
        registerInputTracking(
            'input.shiny-bound-input[type=checkbox]',
            sess, tracking_session_id, sessdata.user_code,
            'change',
            (input_elem) => input_elem.prop('checked')
        );

        // dates
        registerInputTracking('.shiny-bound-input input[type=text]', sess, tracking_session_id, sessdata.user_code);

        // numeric inputs
        registerInputTracking(
            'input.shiny-bound-input[type=number]',
            sess, tracking_session_id, sessdata.user_code,
            'input'
        );

        // radio buttons
        registerInputTracking('.shiny-options-group input[type=radio]', sess, tracking_session_id, sessdata.user_code);

        // select inputs
        registerInputTracking('select.shiny-bound-input', sess, tracking_session_id, sessdata.user_code);

        // sliders
        registerInputTracking('.js-range-slider', sess, tracking_session_id, sessdata.user_code);

        // text input
        registerInputTracking(
            '.shiny-input-container input[type=text]',
            sess, tracking_session_id, sessdata.user_code,
            'input'
        );

        // text area input
        registerInputTracking(
            'textarea.shiny-bound-input',
            sess, tracking_session_id, sessdata.user_code,
            'input'
        );
    }

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
    apiserver_url = new URL(config.apiserver);

    console.log("API server set to", apiserver);

    // check if we're in replay mode
    if ($.urlParam('replay') !== undefined) {
        let replay_state = Number($.urlParam('replay'));
        console.log("replay mode enabled with replay state ", replay_state);
        replay = true;
        mus = new Mus();

        sess = $.urlParam('sess');
        if (sess === undefined) {
            console.warn("session code not passed");
        }

        if (replay_state === 1) {
            showPage();

            setTimeout(function() {
                tutorial.$removeState(function () {
                    tutorial.$serverRequest('remove_state', null, function () {
                        let url_params = window.location.search.replace("replay=1", "replay=2");
                        window.location.replace(window.location.origin + window.location.pathname + url_params);
                    })
                });
            }, 1000);
        } else if (replay_state === 2) {
            window.addEventListener('message', replayMessageReceived);
            messageToParentWindow("init");
        }
    } else {
        // get session ID
        if ($.urlParam('sess') !== undefined) {
            sess = $.urlParam('sess');
            Cookies.set('sess', sess, COOKIE_DEFAULT_OPTS);
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
    }
});

/**
 * Initialize event handlers for custom messages coming from the Shiny server backend.
 */
$(document).on("shiny:connected", function() {
    // receive learnr events like exercise submissions
    Shiny.addCustomMessageHandler("learnr_event", function(data) {
        console.debug("received learnr event:", data);

        if (tracking_session_id !== null) {
            let etype = data.event_type;
            delete data.event_type;
            postEvent(sess, tracking_session_id, sessdata.user_code, "learnr_event_" + etype, data);
        }
    });
})
