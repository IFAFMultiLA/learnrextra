#' Adaptive tutorial document format derived from learnr tutorial format.
#'
#' @inheritParams learnr::tutorial
#'
#' @return An [rmarkdown::output_format()] for adaptive \pkg{learnr} tutorials.
#' @export
tutorial <- function(...) {
    args <- list(...)

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
                script = c("tutorial-adaptivelearnr-utils.js", "tutorial-adaptivelearnr.js"),
                stylesheet = "tutorial-adaptivelearnr.css"
            )
        ),
        args$extra_dependencies
    )

    # call the original learnr tutorial format function
    do.call(learnr::tutorial, args)
}