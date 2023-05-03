// Main adaptivelearnr javascript code.
// Requires tutorial-adaptivelearnr-utils.js to be included before.


// disable "$(document).ready()" for all scripts to make sure that the
// setup function below is always executed first
$.holdReady(true);


/**
 * Global variables
 */

var config = null;  // will be set when it is loaded

var sess = null;   // session ID
var apiserver = null;     // base URL to API server; will be loaded from config
var fullsessdata = {};    // session data for all sessions saved to cookies
var sessdata = {};        // session data for this specific session
var tracking_session_id = null;     // tracking session ID for the current session


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
            console.log("logging in...");

            var email = $("#email").val();
            var password = $("#password").val();

            userLogin(sess, email, password);
        });

        $("#register-btn").on("click", function() {
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
                    return response.json();
                } else {
                    return {};
                }
            })
            .then(resp_data => {
                if (resp_data.hasOwnProperty('error')) {    // failure
                    let alert_box = $('#register-login-fail-alert');
                    let error_type = 'unknown';

                    if (resp_data.hasOwnProperty('error')) {
                        error_type = resp_data.error;
                        alert_box.text(resp_data.message);
                    } else {
                        alert_box.text("Failed to register.");
                    }

                    alert_box.show();
                } else {    // success
                    $('#register-login-fail-alert').text("").hide();
                    $('#authmodal').modal('hide');

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
function prepareSession(obtained_sess_code) {
    sess = obtained_sess_code;

    if (sess === undefined) {
        console.warn("no session ID passed as URL parameter");
        showPage();
    } else {
        console.log("using session ID", sess);

        if (Cookies.get('sessdata') !== undefined) {
            fullsessdata = $.parseJSON(atob(Cookies.get('sessdata')));
        }

        if (fullsessdata.hasOwnProperty(sess)) {
            sessdata = fullsessdata[sess];
        } else {
            sessdata = {
                user_code: null,
                user_email: null,
                app_config: null
            }
        }

        if (sessdata.user_code === undefined || sessdata.app_config === null) {
            // start an application session
            fetch(apiserver + 'session/?sess=' + sess)
                .then((response) => response.json())
                .then((config) => sessionSetup(config) && appSetup());
        } else {
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
    fullsessdata[sess] = sessdata;
    Cookies.set('sessdata', btoa(JSON.stringify(fullsessdata)));

    if (sessdata.user_email !== null) {
        $('#messages-container .alert-info').html("Logged in as " + sessdata.user_email +
            " – <a href='#' id='logout-link'>Logout</a>").show();
        $('#logout-link').on('click', userLogout);
    } else {
        $('#messages-container .alert-info').text("").hide();
    }

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

    // continue rendering normally
    showPage();

    // start a tracking session
    postJSON('start_tracking/', {sess: sess, start_time: nowISO()}, sessdata.user_code)
    .then((response) => response.json())
    .then(function (response) {
        tracking_session_id = response.tracking_session_id;
        console.log("received tracking session ID", tracking_session_id);
    });

    // set a handler for stopping the tracking session
    $(window).on('beforeunload', function() {
        postJSON('stop_tracking/', {
            sess: sess,
            tracking_session_id: tracking_session_id,
            end_time: nowISO()
        }, sessdata.user_code, {keepalive: true});

        return null;
    });

    // set a handler for tracking click events
    $(document).on('click', function(event) {
        var target = getXPathForElement(event.target);
        postJSON('track_event/', {
            sess: sess,
            tracking_session_id: tracking_session_id,
            event: {
                time: nowISO(),
                type: "click",
                value: target
            }}, sessdata.user_code
        );
    });
}


/**
 * Initialize the application when the HTML document along with all remote elements
 * (images, scripts, etc) was fully loaded.
 */
$(window).on("load", function() {
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
            fetch(apiserver + 'session/')
                .then((response) => response.json())
                .then((response) => prepareSession(response.sess_code));
        } catch (err) {
            prepareSession();   // prepare without session code
        }
    } else {
        prepareSession(sess);
    }
});

