#' Generate a survey to be used inside a learnr tutorial
#'
#' Create a survey via `survey()` from item definitions passed as nested list `items` or use the
#' helper function `survey_likert()` for items with Likert scale answers.
#'
#' Item definitions `items` for `survey()` must be a list, where each list element in turn is a
#' list that defines a survey item. The survey item list must contain a `text` key (question text)
#' and the following optional keys:
#'
#' - `label` for an item identifier
#' - `type` for the answer type (one of `"learnr_radio", "learnr_checkbox", "learnr_text", "learnr_numeric"`)
#' - `question_args` as list of optional arguments passed to `learnr::question`
#' - `answer_fn` as answer function (only considered in case of `"learnr_numeric"` type)
#' - `answers` as character vector of answer options (only considered in case of `"learnr_radio"` or
#'    `"learnr_checkbox"` type).
#'
#' The `answers` vector can be named so that the vector names represent the answer option value.
#'
#' Item definitions `items` for `survey_likert()` must be a character vector with item questions.
#' It can be a named vector – in this case the names are taken as labels (identifiers) for the survey items.
#' The item levels `levels` can be a character vector or a list. If it is a character vector, we assume that
#' `levels` defines the same Likert scale levels for *all* survey items. Then this vector represents
#' the answer options. It can be a named vector, in which case the names represent the answer values.
#' If no names are given, values from 1 to `length(levels)` are generated. If this parameter is a list
#' it must have the same length as `items` and hence represents the answer options *per survey item*.
#' In this case each list entry must be a (optionally named) character vector.
#'
#' @examples
#' # The following code shows an example code chunk with the four types of
#' # survey items that can be created with the survey() function: single-choice, multiple-choice,
#' # numeric input and free text input. The survey items definition must be passed as a nested
#' # list, where each list entry corresponds to an item.
#'
#' survey(
#'     list(
#'         list(
#'             text = "Is this just a test?",
#'             answers = c("Yes", "No")
#'         ),
#'         list(
#'             text = "Here comes a question with labelled answers:",
#'             answers = c("a" = "Option 1",     #' use named vectors
#'                         "b" = "Option 2",     #' to denote
#'                         "c" = "Option 2")     #' answer labels
#'         ),
#'         list(
#'             text = "This is a multiple choice question:",
#'             answers = c("a" = "Option A",
#'                         "b" = "Option B",
#'                         "c" = "Option C"),
#'             type = "learnr_checkbox"
#'         ),
#'         list(
#'             text = "What's your age?",
#'             label = "survey-age",    #' you can also set custom labels for questions
#'             type = "learnr_numeric",
#'             question_args = list(    #' pass additional options
#'                 min = 18,
#'                 max = 100,
#'                 step = 1
#'             )
#'         ),
#'         list(
#'             text = "What do you think about this app?",
#'             label = "survey-comment",
#'             type = "learnr_text"
#'         )
#'     ),
#'     caption = "Survey",
#'     message = "Thank you."
#' )
#'
#' # The following code shows how to use the survey_likert() function. You pass a (named) character
#' # vector of questions and, corresponding to each question, a list of answer options:
#'
#' survey_likert(
#'     items = c(
#'         "use_during_lessons" = "We should use such apps more during the lessons.",
#'         "app_general" = "In general, I find this app ...",
#'         "recommend" = "I would recommend this app to others."
#'     ),
#'     levels = list(
#'         c("fully disagree", "rather disagree", "neutral", "rather agree", "fully agree"),
#'         paste0("... ", c("very bad", "rather bad", "mediocre", "rather good", "very good"), "."),
#'         c("yes", "no", "don't know")
#'     ),
#'     caption = "Survey",
#'     message = "Thank you."
#' )
#'
#' # If all items should have the same answer options, you can simplify the levels parameter:
#'
#' survey_likert(
#'     items = c(
#'         "use_during_lessons" = "We should use such apps more during the lessons.",
#'         "app_general" = "In general, I find this app really good.",
#'         "recommend" = "I would recommend this app to others."
#'     ),
#'     levels = c("fully disagree", "rather disagree", "neutral", "rather agree", "fully agree")
#' )
#'
#'
#' @param items Item definitions. See details section.
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

            question_args <- utils::modifyList(answ_args, list(
                text = it$text,
                correct = message,
                incorrect = message,
                type = itemtype,
                allow_retry = FALSE
            ))
            question_fn <- learnr::question
        }

        q <- do.call(question_fn,
                     utils::modifyList(question_args, if (is.null(it$question_args)) list() else it$question_args))

        if (!is.null(it$label)) {
            q$label <- it$label
            q$ids <- list(
                answer = paste0(it$label, "-answer"),
                question = it$label
            )
        } else if (!is.null(q$label)) {
            label <- paste(q$label, index, sep="-")
            q$label <- label
            q$ids$answer <- shiny::NS(label)("answer")
            q$ids$question <- label
            index <<- index + 1
        }

        q
    })

    caption <-
        if (rlang::is_missing(caption)) {
            learnr:::i18n_span("text.quiz", "Survey")
        } else if (!is.null(caption)) {
            learnr:::quiz_text(caption)
        }

    ret <- list(caption = caption, questions = questions)
    class(ret) <- "tutorial_quiz"
    ret
}

#' @rdname survey
#' @param levels Likert scale levels. Can be a character vector or list. See details section.
#'
#' @export
survey_likert <- function(items, levels, caption = "Survey", message = "Thank you.") {
    checkmate::assert_character(items, min.len = 1)

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
        checkmate::assert_character(levels, min.len = 1)
        get_level_labels(levels)
    } else {
        checkmate::assert_list(levels)
        if (length(levels) != n_items) stop("number of levels must match number of items if `levels` is passed as list")
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

        checkmate::assert_character(answers, min.len = 1)

        list(
            text = it,
            label = if (is.null(item_labels)) NULL else paste0(chunk_label, item_labels[i]),
            answers = answers
        )
    })

    survey(itemdefs, caption = caption, message = message)
}
