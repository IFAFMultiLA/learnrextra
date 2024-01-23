#' Append necessary HTML dependencies (JS, CSS)
#'
#' Appends all necessary HTML dependencies (JS libraries, CSS, etc.) to the list of existing HTML dependencies
#' given as `html_dependencies`.
#'
#' @keywords internal
#'
#' @param html_dependencies list of existing HTML dependencies
#' @param doc_config configuration options that will be embedded as JSON in the document
#' @param introjs if TRUE, include the intro.js library
#'
#' @return updated list of HTML dependencies
append_html_dependencies <- function(html_dependencies, doc_config, introjs = FALSE) {
    html_dependencies <- append(
        list(
            htmltools::htmlDependency(
                name = "js-cookie",
                version = "3.0.1",
                src = system.file("rmarkdown/templates/tutorial/resources", package = "learnrextra"),
                script = "js.cookie.min.js"
            ),
            htmltools::htmlDependency(
                name = "lodash",
                version = "4.17.15",
                src = system.file("rmarkdown/templates/tutorial/resources", package = "learnrextra"),
                script = "lodash.min.js"
            ),
            htmltools::htmlDependency(
                name = "mus",
                version = "1.1.0",
                src = system.file("rmarkdown/templates/tutorial/resources", package = "learnrextra"),
                script = "mus.min.js"
            )
        ),
        html_dependencies
    )

    if (introjs) {
        html_dependencies <- append(
            list(
                htmltools::htmlDependency(
                    name = "intro.js",
                    version = "7.2.0",
                    src = system.file("rmarkdown/templates/tutorial/resources", package = "learnrextra"),
                    script = "intro.min.js",
                    stylesheet = "introjs.min.css"
                )
            ),
            html_dependencies
        )
    }

    html_dependencies <- append(
        list(
            htmltools::htmlDependency(
                name = "tutorial-learnrextra",
                version = utils::packageVersion("learnrextra"),
                src = system.file("rmarkdown/templates/tutorial/resources", package = "learnrextra"),
                script = c("tutorial-learnrextra-utils.js",
                           "tutorial-learnrextra-replay.js",
                           "tutorial-learnrextra.js"),
                stylesheet = "tutorial-learnrextra.css",
                head = format(htmltools::tags$script(
                    id = "learnrextra-config",
                    type = "application/json",
                    htmltools::HTML(jsonlite::toJSON(doc_config, auto_unbox = TRUE))    # include config as JSON
                ))
            )
        ),
        html_dependencies
    )

    html_dependencies
}

#' Get HTML files (HTML snippets) to include
#'
#' @keywords internal
#'
#' @param consentmodal either logical value or string pointing to an HTML file for a "data protection consent" modal
#' @param dataprotectmodal either logical value or string pointing to an HTML file for a "data protection license" modal
#' @param feedback either logical value or string pointing to an HTML file for a feedback element
#'
#' @return list with includes
get_includes <- function(consentmodal = TRUE, dataprotectmodal = TRUE, feedback = TRUE) {
    rootpath <- "rmarkdown/templates/tutorial/resources/includes/"
    includes <-system.file(paste0(rootpath, "authmodal.html"), package = "learnrextra")

    if (isTRUE(consentmodal)) {
        includes <- c(includes, system.file(paste0(rootpath, "consentmodal.html"), package = "learnrextra"))
    } else if (is.character(consentmodal)) {
        includes <- c(includes, consentmodal)
    }

    if (isTRUE(dataprotectmodal)) {
        includes <- c(includes, system.file(paste0(rootpath, "dataprotectmodal.html"), package = "learnrextra"))
    } else if (is.character(dataprotectmodal)) {
        includes <- c(includes, dataprotectmodal)
    }

    if (isTRUE(feedback)) {
        includes <- c(includes, system.file(paste0(rootpath, "feedback.html"), package = "learnrextra"))
    } else if (is.character(feedback)) {
        includes <- c(includes, feedback)
    }

    includes
}
