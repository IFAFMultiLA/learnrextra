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
append_html_dependencies <- function(html_dependencies, doc_config, introjs = FALSE,
                                     consentmodal = TRUE, dataprotectmodal = TRUE) {
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

    translations <- jsonlite::read_json(system.file("rmarkdown/templates/tutorial/resources/translations.json",
                                                    package = "learnrextra"))

    html_includes <- c("authmodal", "feedback")

    if (consentmodal) {
        html_includes <- c(html_includes, "consentmodal")
    }

    if (dataprotectmodal) {
        html_includes <- c(html_includes, "dataprotectmodal")
    }

    head_includes <- sapply(html_includes, function(inc) {
        inctext <- readLines(system.file(sprintf("rmarkdown/templates/tutorial/resources/includes/%s.html", inc),
                                         package = "learnrextra"))
        format(htmltools::tags$script(id = paste0("learnrextra-", inc),
                                      type = "text/html",
                                      paste(inctext, collapse = "\n")))
    })

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
                head = c(
                    format(htmltools::tags$script(
                        id = "learnrextra-config",
                        type = "application/json",
                        htmltools::HTML(jsonlite::toJSON(doc_config, auto_unbox = TRUE))    # include config as JSON
                    )),
                    format(htmltools::tags$script(
                        id = "learnrextra-translations",
                        type = "application/json",
                        htmltools::HTML(jsonlite::toJSON(translations, auto_unbox = TRUE))    # include translations as JSON
                    )),
                    head_includes
                )
            )
        ),
        html_dependencies
    )

    html_dependencies
}
