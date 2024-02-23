#' Use this package in a shiny app
#'
#' Enables the tracking functionality in a shiny app.
#'
#' @export
#'
#' @param consentmodal either logical value or string pointing to an HTML file for a "data protection consent" modal
#' @param dataprotectmodal either logical value or string pointing to an HTML file for a "data protection license" modal
#'
#' @return tag list with sources to include
use_learnrextra <- function(consentmodal = TRUE, dataprotectmodal = TRUE) {
    dependencies <- list()

    al_config <- list(
        apiserver = getOption("learnrextra.apiserver", NULL)
    )

    dependencies <- append_html_dependencies(dependencies, doc_config = al_config, introjs = FALSE,
                                             consentmodal = consentmodal, dataprotectmodal = dataprotectmodal)

    shiny::tagList(
        dependencies
    )
}


#' Display information such as login state and a data protection information button.
#'
#' @export
#'
#' @param login show login information
#' @param dataprotection_label label for link to data protection notice; if empty/NULL, don't show the link
#'
#' @return tag list HTML elements
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
