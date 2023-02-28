// disable "$(document).ready()" for all scripts to make sure that the
// setup function below is always executed first
$.holdReady(true);

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
 * Set up the application using the configuration object `config`.
 */
function setup(config) {
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
 * Global variables
 */

var sess = null;   // session ID

/**
 * Initialize the application when the HTML document along with all remote elements
 * (images, scripts, etc) was fully loaded.
 */
$(window).on( "load", function() {
    // get session ID
    if ($.urlParam('sess') !== undefined) {
        sess = $.urlParam('sess');
        console.log("using session ID", sess);
    }

    // load config from JSON
    fetch('./www/config.json')
        .then((response) => response.json())
        .then((config) => setup(config));
});
