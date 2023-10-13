#' Adaptive tutorial document format derived from learnr tutorial format.
#'
#' @inheritParams learnr::tutorial
#'
#' @return An [rmarkdown::output_format()] for adaptive \pkg{learnr} tutorials.
#' @export


tutorial <- function(
        fig_width = 6.5,
        fig_height = 4,
        fig_retina = 2,
        fig_caption = TRUE,
        progressive = FALSE,
        allow_skip = FALSE,
        dev = "png",
        df_print = "paged",
        smart = TRUE,
        theme = "rstudio",
        highlight = "textmate",
        ace_theme = "textmate",
        mathjax = "default",
        extra_dependencies = NULL,
        css = NULL,
        includes = NULL,
        md_extensions = NULL,
        pandoc_args = NULL,
        language = "en",
        lib_dir = NULL,
        apiserver = NULL,
        ...
) {
    if ("anchor_sections" %in% names(list(...))) {
        stop("learnr tutorials do not support the `anchor_sections` option.")
    }

    # configuration options specific to adaptivelearnr, loaded from the document
    doc_config <- list(
        apiserver = apiserver
    )

    # base pandoc options
    args <- c()

    # use section divs
    args <- c(args, "--section-divs")

    # footnotes are scoped to the block
    args <- c(args, "--reference-location=section")

    # template
    args <- c(args, "--template", rmarkdown::pandoc_path_arg(
        system.file("rmarkdown/templates/tutorial/resources/tutorial-parallel-format.htm",
                    package = "adaptivelearnr")
    ))

    # content includes
    if (is.null(includes)) {
        # set default includes
        includes <- rmarkdown::includes(before_body = get_includes())
    } else {
        # merge given includes and default includes
        std_includes <- rmarkdown::includes(before_body = get_includes())
        tmp_includes <- includes
        includes <- list()

        for (k in c("in_header", "before_body", "after_body")) {
            if (is.null(tmp_includes[[k]])) {
                includes[[k]] <- std_includes[[k]]
            } else {
                includes[[k]] <- tmp_includes[[k]]
            }
        }

        includes <- tmp_include
    }

    args <- c(args, rmarkdown::includes_to_pandoc_args(includes))

    # prepend JS and CSS as extra dependencies
    extra_dependencies <- append_html_dependencies(extra_dependencies, doc_config = doc_config, introjs = TRUE)

    # pagedtables
    if (identical(df_print, "paged")) {
        extra_dependencies <- append(extra_dependencies,
                                     list(rmarkdown::html_dependency_pagedtable()))
    }

    # highlight
    rmarkdown_pandoc_html_highlight_args <- getFromNamespace("pandoc_html_highlight_args", "rmarkdown")
    rmarkdown_is_highlightjs <- getFromNamespace("is_highlightjs", "rmarkdown")
    args <- c(args, rmarkdown_pandoc_html_highlight_args("default", highlight))
    # add highlight.js html_dependency if required
    if (rmarkdown_is_highlightjs(highlight)) {
        extra_dependencies <- append(extra_dependencies, list(rmarkdown::html_dependency_highlightjs(highlight)))
    }

    # ace theme
    if (!identical(ace_theme, "textmate")) {
        ace_theme <- match.arg(ace_theme, ACE_THEMES)
        args <- c(args, "--variable", paste0("ace-theme=", ace_theme))
    }

    extra_dependencies <- append(extra_dependencies, list(
        htmltools::htmlDependency(
            name = "tutorial-parallel-format",
            version = utils::packageVersion("adaptivelearnr"),
            src = system.file("rmarkdown/templates/tutorial/resources", package = "adaptivelearnr"),
            stylesheet = "tutorial-parallel-format.css"
        )
    ))

    # resolve theme (ammend base stylesheet for "rstudio" theme
    stylesheets <- NULL
    if (identical(theme, "rstudio")) {
        stylesheets <- "rstudio-theme.css"
        theme <- "cerulean"
    }

    extra_dependencies <- append(extra_dependencies, list(
        htmltools::htmlDependency(
            name = "tutorial-format",
            version = utils::packageVersion("learnr"),
            src = system.file("rmarkdown/templates/tutorial/resources", package = "learnr"),
            stylesheet = stylesheets
        )
    ))

    # additional tutorial-format js and css. note that we also include the
    # tutorial_html_dependency() within our list of dependencies to ensure that
    # tutorial.js (and the API it provides) is always loaded prior to our
    # tutorial-format.js file.
    extra_dependencies <- append(extra_dependencies, list(
        learnr:::tutorial_html_dependency(),
        learnr:::tutorial_i18n_html_dependency(language),
        htmltools::htmlDependency(
            name = "adaptivelearnr-tutorial-format",
            version = utils::packageVersion("adaptivelearnr"),
            src = system.file("rmarkdown/templates/tutorial/resources", package = "adaptivelearnr"),
            script = "tutorial-format.js"
        )
    ))

    # additional pandoc variables specific to learnr
    jsbool <- function(value) ifelse(value, "true", "false")
    args <- c(
        args,
        rmarkdown::pandoc_variable_arg("progressive", jsbool(progressive)),
        rmarkdown::pandoc_variable_arg("allow-skip", jsbool(allow_skip)),
        rmarkdown::pandoc_variable_arg("learnr-version", utils::packageVersion("learnr"))
    )

    # knitr and pandoc options
    knitr_options <- rmarkdown::knitr_options_html(fig_width, fig_height, fig_retina, keep_md = FALSE , dev)
    pandoc_options <- rmarkdown::pandoc_options(to = "html4",
                                                from = rmarkdown::from_rmarkdown(fig_caption, md_extensions),
                                                args = args,
                                                ext = ".html")

    tutorial_opts <- learnr:::tutorial_knitr_options()
    knitr_options <- utils::modifyList(knitr_options, tutorial_opts)

    # set 1000 as the default maximum number of rows in paged tables
    knitr_options$opts_chunk$max.print <- 1000

    # create base document format using standard html_document
    base_format <- rmarkdown::html_document(
        smart = smart,
        theme = theme,
        mathjax = mathjax,
        pandoc_args = pandoc_args,
        template = "default",
        extra_dependencies = extra_dependencies,
        bootstrap_compatible = TRUE,
        anchor_sections = FALSE,
        css = css,
        ...
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

    # return new output format
    rmarkdown::output_format(knitr = knitr_options,
                             pandoc = pandoc_options,
                             clean_supporting = FALSE,
                             df_print = df_print,
                             base_format = base_format)
}
