#' Use learnrextra in a shiny app
#'
#' Enables the tracking functionality in a shiny app via `use_learnrextra()` function. Add `info_display()` to
#' display information such as login state and a data protection information button.
#'
#' You should also set the `"learnrextra.apiserver"` and the `"learnrextra.language"` options as shown in the
#' example. The former must be an URL pointing to the MultiLA backend API, the latter a language ISO code (only "en"
#' and "de" are supported so far). For details about how to create a learning application with the MultiLA software
#' plattform, see the [MultiLA documentation](https://ifafmultila.github.io/learning_apps.html).
#'
#' @examples
#' \dontrun{
#' library(Shiny)
#' library(learnrextra)
#' options("learnrextra.apiserver" = "http://localhost:8000")
#' options("learnrextra.language" = "en")
#'
#' ui <- fluidPage(
#'     # set up learnrextra; optionally point to HTML files with tracking consent and data protection notes
#'     use_learnrextra(consentmodal = "www/trackingconsent.html", dataprotectmodal = "www/dataprotect.html"),
#'
#'     fluidRow(
#'         column(
#'             width = 12,
#'             info_display()   # show link for data protection and optional login information
#'         )
#'     ),
#'
#'     # ... all other UI code
#' )
#' }
#'
#' @export
#'
#' @param consentmodal Either logical value or string pointing to an HTML file for a "data protection consent" modal
#' @param dataprotectmodal Either logical value or string pointing to an HTML file for a "data protection license" modal
#'
#' @return Tag list with sources to include
use_learnrextra <- function(consentmodal = TRUE, dataprotectmodal = TRUE) {
    dependencies <- list()

    al_config <- list(
        apiserver = getOption("learnrextra.apiserver", NULL),
        language = getOption("learnrextra.language", "en")
    )

    dependencies <- append_html_dependencies(dependencies, doc_config = al_config, introjs = FALSE,
                                             consentmodal = consentmodal, dataprotectmodal = dataprotectmodal)

    shiny::tagList(
        dependencies
    )
}

#' @export
#'
#' @rdname use_learnrextra
#'
#' @param login Show login information
#' @param dataprotection_label Label for link to data protection notice; if empty/NULL, don't show the link
#'
#' @return Tag list with HTML elements
info_display <- function(login = TRUE, dataprotection_label = "Data protection notice") {
    output <- list(
        shiny::div(
            id = "messages-container",
            style = "display:inline",
            shiny::div(class = "logininfo", style = "display:inline")
        )
    )

    if (shiny::isTruthy(dataprotection_label)) {
        output <- append(
            list(shiny::actionLink("dataprotection", dataprotection_label, onclick = "showDataProtectionModal()")),
            output
        )
    }

    do.call(shiny::tagList, output)
}
