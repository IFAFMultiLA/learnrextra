// Main learnrextra javascript code.
// Requires tutorial-learnrextra-utils.js to be included before.
//
// Additionally, an adapted version of the "mus.js" JavaScript library is used (see
// directory `learnrextra-js/musjs/`).
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
const INPUT_TRACKING_DEBOUNCE = 50;

// default cookie options (expires in half a year, valid for current path)
const COOKIE_DEFAULT_OPTS = {
    expires: 183,
    path: ''
};

const TRACKING_CONFIG_DEFAULTS = {
    'mouse': true,
    'inputs': true,
    'attribute_changes': false,
    'chapters': true
};

var config = null;  // document config (configuration from the Rmd document); will be set when it is loaded

var replay = false;  // replay mode
var sess = null;     // session ID
var apiserver = null;       // base URL to API server; will be loaded from document config
var apiserver_url = null;   // base URL to API server as URL object
var fullsessdata = {};    // session data for all sessions saved to cookies
var sessdata = {};        // session data for this specific session
var userfeedback =  {};   // user feedback data; maps section ID to feedback object {score: <int>, comment: <str>}
var tracking_session_id = null;     // tracking session ID for the current session
var tracking_config = {};           // tracking configuration
var mus = null;                     // mus.js mouse tracking instance
var mouse_track_interval = null;    // mouse tracking interval timer ID
var content_scroll_frames = null;   // additional scroll events for main content div


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
        tracking_config = _.defaults(sessdata.app_config.tracking, TRACKING_CONFIG_DEFAULTS);
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
        } else {  // no replay
            // show consent modal to inform about usage of cookies
            if ($("#consentmodal").length > 0 && Cookies.get("consent") !== "restricted") {
                $("#restricted-consent-btn").on("click", function() {
                    $("#consentmodal").modal("hide");
                    Cookies.set("consent", "restricted", COOKIE_DEFAULT_OPTS);
                    showPage();
                });

                $("#consentmodal .text-restricted").show();
                $("#consentmodal").modal('show');
            } else {
                showPage();
            }
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

        let sess_config = null;

        if (sessdata.app_config === null) {
            // no application configuration –  start an application session to fetch this information
            try {
                await fetch(apiserver + 'session/?sess=' + sess)
                    .then((response) => response.json())
                    .then((response_data) => {
                        sess_config = response_data;
                        sessdata.app_config = sess_config.config;
                    });
            } catch (err) {
                console.error("fetch failed:", err);
                console.log("setting up app without user token code")
                sess_config = {
                    sess_code: sess,
                    user_code: null,
                    auth_mode: "none",
                    config: {}
                }
            }
        } else {
            // user auth token and application configuration already present (from cookie)
            console.log('loaded user code from cookies:', sessdata.user_code);
            console.log('loaded app config from cookies');
        }

        // handling tracking configuration
        if (sessdata.app_config === undefined || sessdata.app_config === null) {
            tracking_config = TRACKING_CONFIG_DEFAULTS;
        } else {
            tracking_config = _.defaults(sessdata.app_config.tracking, TRACKING_CONFIG_DEFAULTS);
        }

        if ($("#consentmodal").length > 0) {
            // show consent modal
            if (Cookies.get("consent") === undefined || Cookies.get("consent") !== "full-yes") {
                $("#consent-btn").on("click", function() {
                    $("#consentmodal").modal("hide");
                    Cookies.set("consent", "full-yes", COOKIE_DEFAULT_OPTS);
                    prepareSessionWithTracking(sess_config);
                });

                $("#no-consent-btn").on("click", function() {
                    $("#consentmodal").modal("hide");
                    Cookies.set("consent", "full-no", COOKIE_DEFAULT_OPTS);
                    console.log("tracking disabled");
                    showPage();
                });

                // show/hide items in tracking data list depending on configuration
                for (let k in tracking_config) {
                    if (tracking_config.hasOwnProperty(k)) {
                        let item = $("#consentmodal .trackingdata-" + k);
                        if (tracking_config[k] === true) {
                            item.show();
                        } else {
                            item.hide();
                        }
                    }
                }

                $("#consentmodal .text-full").show();
                $("#consentmodal").modal('show');
            } else if (Cookies.get("consent") === "full-yes") {
                prepareSessionWithTracking(sess_config);
            } else {   // consent is "full-no" -> disable tracking
                console.log("tracking disabled");
                showPage();
            }
        } else {
            // no need to get consent
            prepareSessionWithTracking(sess_config);
        }
    }
}

/**
 * Prepare a session with tracking enabled (consent given).
 */
async function prepareSessionWithTracking(sess_config) {
    if (sess_config === null) {
        appSetup();
    } else {
        sessionSetup(sess_config) && appSetup();
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
        $('#doc-metadata-additional .logininfo').html("Logged in as " + sessdata.user_email +
            " – <a href='#' id='logout-link'>Logout</a>").show();
        $('#logout-link').on('click', userLogout);
    } else {
        $('#doc-metadata-additional .logininfo').text("").hide();
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
        const main_content_elem = $('#learnr-tutorial-content').parent();
        const start_data = {
            sess: sess,
            start_time: nowISO(),
            device_info: {
                form_factor: detectFormFactor(),
                window_size: getWindowSize(),
                user_agent: navigator.userAgent,
                main_content_viewsize: [main_content_elem.width(), main_content_elem.height()],
                main_content_scrollsize: [main_content_elem.prop('scrollWidth'), main_content_elem.prop('scrollHeight')]
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
        const main_content_elem = $('#learnr-tutorial-content').parent();

        postEvent(sess, tracking_session_id, sessdata.user_code, "device_info_update", {
            window_size: getWindowSize(),
            main_content_viewsize: [main_content_elem.width(), main_content_elem.height()],
            main_content_scrollsize: [main_content_elem.prop('scrollWidth'), main_content_elem.prop('scrollHeight')]
        }, nowISO());
    }, WINDOW_RESIZE_TRACKING_DEBOUNCE));

    if (tracking_config.chapters) {
        // define a function that returns a chapter tracking function
        function getChapterTrackingFn(elem) {
            return function(input_elem_unused) {
                //console.log("chapter index change ", $('#tutorial-topic ul li.current').index());

                return {
                    element: elem,
                    chapter_title: $('#tutorial-topic ul li.current a').text(),
                    chapter_id: $('#tutorial-topic ul li.current a').attr('href').slice(1),
                    chapter_index: $('#tutorial-topic ul li.current').index()
                }
            }
        }

        // clicks on "previous chapter" button
        registerInputTracking(
            '.topicActions .btn-default',
            sess, tracking_session_id, sessdata.user_code,
            'click',
            getChapterTrackingFn('btn_prev'),
            'chapter'
        );

        // clicks on "next chapter" button
        registerInputTracking(
            '.topicActions .btn-primary',
            sess, tracking_session_id, sessdata.user_code,
            'click',
            getChapterTrackingFn('btn_next'),
            'chapter'
        );

        // clicks on navigation sidebar links
        registerInputTracking(
            '#tutorial-topic ul li a',
            sess, tracking_session_id, sessdata.user_code,
            'click',
            getChapterTrackingFn('nav'),
            'chapter'
        );

        // send initial chapter
        const eventval = {
            'id': null,
            'xpath': null,
            'csspath': null,
            'value': getChapterTrackingFn(null)(null)
        };
        postEvent(sess, tracking_session_id, sessdata.user_code, "chapter", eventval);
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

        content_scroll_frames = [];   // initialize additional scroll data
        $('#learnr-tutorial-content').parent().on("scroll", function() {   // set listener for content scroll
            content_scroll_frames.push(
                ["S", this.scrollLeft, this.scrollTop, new Date().getTime() - (mus.startedAt * 1000)]
            );
        });

        // send mouse tracking data collected within time chunks
        mouse_track_interval = setInterval(mouseTrackingUpdate, MOUSE_TRACK_UPDATE_INTERVAL);

        const main_content_elem = $('#learnr-tutorial-content').parent();

        $(window).on("hashchange", function() {        // also send mouse data update on chapter change
            mouseTrackingUpdate();

            // content size may change on chapter change -> post update
            postEvent(sess, tracking_session_id, sessdata.user_code, "device_info_update", {
                main_content_viewsize: [main_content_elem.width(), main_content_elem.height()],
                main_content_scrollsize: [main_content_elem.prop('scrollWidth'), main_content_elem.prop('scrollHeight')]
            });
        });

        // send initial main content sizes
        postEvent(sess, tracking_session_id, sessdata.user_code, "device_info_update", {
                main_content_viewsize: [main_content_elem.width(), main_content_elem.height()],
                main_content_scrollsize: [main_content_elem.prop('scrollWidth'), main_content_elem.prop('scrollHeight')]
        });
    }

    // user feedback
    if (_.defaults(sessdata.app_config, {feedback: true}).feedback) {
        // add the HTML chunk underneath each section
        $('.section.level2 .topicActions').prepend($('.feedback-container').clone());
        let fbcontainers_per_section = $('.section.level2 .topicActions > .feedback-container');

        fbcontainers_per_section.each(function() {
            let fbcontainer = $(this);
            fbcontainer.show();

            // scoring event handlers
            let stars = fbcontainer.find('.score li');
            stars.on('mouseenter', function() {
                setClassForElementsUntilIndex(stars, $(this).index());
            }).on('mouseleave', function() {
                let section = $(this).parents('.section.level2').attr('id');
                let sectionfb = _.defaults(userfeedback[section], {score: 0, comment: ''});
                setClassForElementsUntilIndex(stars, sectionfb.score-1);
            }).on('click', function() {
                let i = $(this).index();
                let section = $(this).parents('.section.level2').attr('id');
                let sectionfb = _.defaults(userfeedback[section], {score: 0, comment: ''});
                sectionfb.score = i+1;
                userfeedback[section] = sectionfb;

                // send feedback data to the API
                postUserFeedback(sess, tracking_session_id, sessdata.user_code,
                    '#' + section, sectionfb.score, sectionfb.comment);
            });

            // comment event handlers
            let comment_input = fbcontainer.find('.comment_submit input');
            comment_input.on('focus', function () {
                if (comment_input.val() === 'Ihr Kommentar...') {
                    comment_input.val('');
                }
            });
            let comment_submit = fbcontainer.find('.comment_submit button');
            comment_submit.on('click', function () {
                comment_submit.prop('disabled', true);
                comment_submit.html('Danke!');

                let section = $(this).parents('.section.level2').attr('id');
                let sectionfb = _.defaults(userfeedback[section], {score: 0, comment: ''});
                sectionfb.comment = comment_input.val() === 'Ihr Kommentar...' ? '' : comment_input.val();
                userfeedback[section] = sectionfb;

                // send feedback data to the API
                postUserFeedback(sess, tracking_session_id, sessdata.user_code,
                    '#' + section, sectionfb.score, sectionfb.comment);

                setTimeout(function() {
                    comment_submit.prop('disabled', false);
                    comment_submit.html("Aktualisieren");
                }, 3000);
            });
        });

        // get already existing feedback (if any)
        try {
            fetch(apiserver + 'user_feedback/?sess=' + sess, {
                headers: {
                    "X-CSRFToken": Cookies.get("csrftoken"),
                    Authorization: "Token " + sessdata.user_code
                }
            }).then((response) => response.json())
            .then(function (response_data) {
                response_data.user_feedback.forEach(function (fbitem) {
                    let fbcontainer = $(fbitem.content_section).find('.feedback-container');
                    let stars = fbcontainer.find('.score li');
                    let comment_input = fbcontainer.find('.comment_submit input');
                    let section = fbitem.content_section.substr(1);

                    userfeedback[section] = {score: fbitem.score, comment: fbitem.text};
                    setClassForElementsUntilIndex(stars, fbitem.score-1);
                    comment_input.val(fbitem.text);
                });
            });
        } catch (err) {
            console.error("fetch failed trying to get existing user feedback:", err);
        }
    }
}


function showDataProtectionModal(from_consent) {
    from_consent = from_consent === undefined ? false : from_consent;

    if (from_consent) {
        // hide the consent modal but go back to it once the data protection model was closed
        $("#consentmodal").modal("hide");
        $('#dataprotectmodal').on('hidden.bs.modal', function (e) {
            $("#consentmodal").modal("show");
        });
    } else {

    }

    $('#dataprotectmodal button').on('click', () => $("#dataprotectmodal").modal('hide'));
    $("#dataprotectmodal").modal('show');
}


/**
 * Initialize the application when the HTML document along with all remote elements
 * (images, scripts, etc) was fully loaded.
 */
$(window).on("load", async function() {
    // load configuration
    config = JSON.parse(document.getElementById('learnrextra-config').textContent);
    apiserver = config.apiserver;
    if (!apiserver.endsWith("/")) {
        apiserver += "/";
    }
    apiserver_url = new URL(config.apiserver);

    console.log("API server set to", apiserver);

    // check if we're in replay mode
    if ($.urlParam('replay') !== undefined) {
        let replay_state = Number($.urlParam('replay'));
        console.log("replay mode enabled with replay state ", replay_state);
        replay = true;
        mus = new Mus();
        mus.setTimePoint(true);    // replay in realtime

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
        //console.debug("received learnr event:", data);

        if (tracking_session_id !== null) {
            let etype = data.event_type;
            delete data.event_type;
            postEvent(sess, tracking_session_id, sessdata.user_code, "learnr_event_" + etype, data);
        }
    });
})
