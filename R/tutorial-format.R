#' Adaptive tutorial document format derived from learnr tutorial format.
#'
#' @inheritParams learnr::tutorial
#'
#' @return An [rmarkdown::output_format()] for adaptive \pkg{learnr} tutorials.
#' @export
tutorial <- function(...) {
    args <- list(...)

    # configuration options specific to adaptivelearnr
    al_config <- list(
        apiserver = args$apiserver
    )

    # additional HTML to include at the start of the body tag
    args$includes <- append(
        list(before_body = system.file("rmarkdown/templates/tutorial/resources/before_body_includes.htm",
                                       package = "adaptivelearnr")),
        args$includes
    )

    # prepend JS and CSS as extra dependencies
    args$extra_dependencies <- append(
        list(
            htmltools::htmlDependency(
                name = "js-cookie",
                version = "3.0.1",
                src = system.file("rmarkdown/templates/tutorial/resources", package = "adaptivelearnr"),
                script = "js.cookie.min.js"
            ),
            htmltools::htmlDependency(
                name = "lodash",
                version = "4.17.15",
                src = system.file("rmarkdown/templates/tutorial/resources", package = "adaptivelearnr"),
                script = "lodash.min.js"
            ),
            htmltools::htmlDependency(
                name = "mus",
                version = "1.1.0",
                src = system.file("rmarkdown/templates/tutorial/resources", package = "adaptivelearnr"),
                script = "mus.min.js"
            )
        ),
        args$extra_dependencies
    )
    args$extra_dependencies <- append(
        list(
            htmltools::htmlDependency(
                name = "tutorial-adaptivelearnr",
                version = utils::packageVersion("adaptivelearnr"),
                src = system.file("rmarkdown/templates/tutorial/resources", package = "adaptivelearnr"),
                script = c("tutorial-adaptivelearnr-utils.js",
                           "tutorial-adaptivelearnr-replay.js",
                           "tutorial-adaptivelearnr.js"),
                stylesheet = "tutorial-adaptivelearnr.css",
                head = format(htmltools::tags$script(
                    id = "adaptivelearnr-config",
                    type = "application/json",
                    htmltools::HTML(jsonlite::toJSON(al_config, auto_unbox = TRUE))    # include config as JSON
                ))
            )
        ),
        args$extra_dependencies
    )

    # call internal event handler reset function
    learnr:::event_handlers_reset()

    # register event handler for events triggered by users while interacting with the app
    learnr_events <- c(
        "exercise_hint",
        "exercise_submitted",
        "exercise_result",
        "question_submission",
        "video_progress"    # ,
#        "section_skipped", # already covered via JS events (more reliable)
#        "section_viewed"   # already covered via JS events (more reliable)
#        "session_start",   # already covered via tracking session start
#        "session_stop"     # already covered via tracking session end
    )

    for (e in learnr_events) {
        learnr::event_register_handler(e, function(session, event, data) {
            # send this event along with the collected data to the JavaScript side which in turn sends it to the
            # web API
            #message("received event ", event, " with data ", names(data))
            data$event_type <- event
            session$sendCustomMessage("learnr_event", data)
        })
    }

    # call the original learnr tutorial format function
    do.call(learnr::tutorial, args)
}
