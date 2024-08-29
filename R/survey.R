#' Generate a survey from survey item definitions passed as list `items`.
#'
#' @param items Item definitions. Must be a list, where each list element in turn is a list that defines a survey item.
#'              The survey item list must contain a `text` key (question text) and the following optional keys:
#'              `label` for an item identifier; `type` for the answer type (one of
#'              `"learnr_radio", "learnr_checkbox", "learnr_text", "learnr_numeric"`); `question_args` as list of
#'              optional arguments passed to `learnr::question`; `answer_fn` as answer function (only considered
#'              in case of `"learnr_numeric"` type); `answers` as character vector of answer options (only considered
#'              in case of `"learnr_radio"` or `"learnr_checkbox"` type). The `answers` vector can be named so that the
#'              vector names represent the answer option value.
#' @param caption Optional survey caption (defaults to "Survey")
#' @param message Optional message to display when survey item was submitted (defaults to "Thank you.")
#' @return A survey as `tutorial_quiz` class list.
#'
#' @export
survey <- function(items, caption = "Survey", message = "Thank you.") {
    checkmate::assert_list(items)

    index <- 1
    questions <- lapply(items, function (it) {
        checkmate::assert_list(it)
        checkmate::assert_string(it$label, null.ok = TRUE)
        checkmate::assert_string(it$text)
        checkmate::assert_choice(it$type, c("learnr_radio", "learnr_checkbox", "learnr_text", "learnr_numeric"),
                                 null.ok = TRUE)
        checkmate::assert_list(it$question_args, null.ok = TRUE)

        itemtype <- if (is.null(it$type)) "learnr_radio" else it$type

        if (itemtype == "learnr_text") {
            question_args <- list(
                it$text,
                learnr::answer_fn(learnr::correct, label = it$label),
                allow_retry = FALSE,
                placeholder = "",
                correct = message
            )
            question_fn <- learnr::question_text
        } else if (itemtype == "learnr_numeric") {
            checkmate::assert_function(it$answer_fn, nargs = 1, null.ok = TRUE)

            answer_fn <- if (is.null(it$answer_fn))
                learnr::answer_fn(learnr::correct, label = it$label)
                else it$answer_fn

            question_args <- list(
                it$text,
                answer_fn,
                allow_retry = TRUE,
                correct = message
            )
            question_fn <- learnr::question_numeric
        } else {
            # itemtype %in% c("learnr_radio", "learnr_checkbox")
            checkmate::assert_character(it$answers, min.len = 1)
            answ_values <- names(it$answers)

            answ_args <- lapply(1:length(it$answers), function(i) {
                learnr::answer(text = if (is.null(answ_values)) it$answers[i] else answ_values[i],
                               correct = TRUE,
                               label = it$answers[i])
            })

            question_args <- modifyList(answ_args, list(
                text = it$text,
                correct = message,
                incorrect = message,
                type = itemtype,
                allow_retry = FALSE
            ))
            question_fn <- learnr::question
        }

        q <- do.call(question_fn, modifyList(question_args, it$question_args %||% list()))

        if (!is.null(it$label)) {
            q$label <- it$label
            q$ids <- list(
                answer = paste0(it$label, "-answer"),
                question = it$label
            )
        } else if (!is.null(q$label)) {
            label <- paste(q$label, index, sep="-")
            q$label <- label
            q$ids$answer <- NS(label)("answer")
            q$ids$question <- label
            index <<- index + 1
        }

        q
    })

    caption <-
        if (rlang::is_missing(caption)) {
            i18n_span("text.quiz", "Survey")
        } else if (!is.null(caption)) {
            learnr:::quiz_text(caption)
        }

    ret <- list(caption = caption, questions = questions)
    class(ret) <- "tutorial_quiz"
    ret
}

#' Generate a survey with Likert scale type answers.
#'
#' @param items A character vector with item questions. Can be a named vector – in this case the names are taken as
#'              labels (identifiers) for the survey items.
#' @param levels Likert scale levels. Can be a character vector or list. If it is a character vector, we assume that
#'               `levels` defines the same Likert scale levels for *all* survey items. Then this vector represents
#'               the answer options. It can be a named vector, in which case the names represent the answer values.
#'               If no names are given, values from 1 to `length(levels)` are generated. If this parameter is a list
#'               it must have the same length as `items` and hence represents the answer options *per survey item*.
#'               In this case each list entry must be a (optionally named) character vector.
#' @inheritParams survey
#' @return A survey as `tutorial_quiz` class list.
#'
#' @export
survey_likert <- function(items, levels, caption = "Survey", message = "Thank you.") {
    checkmate::assert_character(items)

    get_level_labels <- function(levels) {
        level_labels <- names(levels)
        if (is.null(level_labels)) {
            level_labels <- as.character(1:length(levels))
        }
        level_labels
    }

    n_items <- length(items)
    same_levels_for_all_items <- inherits(levels, "character")

    level_lbls <- if (same_levels_for_all_items) {
        get_level_labels(levels)
    } else {
        checkmate::assert_list(levels)
        if (length(levels) != n_items) stop("number of levels must much number of items if `levels` is passed as list")
        NULL
    }

    item_labels <- names(items)
    chunk_label <- knitr::opts_current$get('label')
    chunk_label <- if (is.null(chunk_label)) "" else paste0(chunk_label, "-")

    itemdefs <- lapply(1:n_items, function (i) {
        it <- items[i]

        if (same_levels_for_all_items) {
            answers <- levels
            names(answers) <- level_lbls
        } else {
            answers <- levels[[i]]
            names(answers) <- get_level_labels(levels[[i]])
        }

        list(
            text = it,
            label = if (is.null(item_labels)) NULL else paste0(chunk_label, item_labels[i]),
            answers = answers
        )
    })

    survey(itemdefs, caption = caption, message = message)
}
