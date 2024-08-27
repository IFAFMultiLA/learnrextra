#' @export
survey <- function(items, caption = "Survey", message = "Thank you.") {
    checkmate::assert_list(items)

    quiz_args <- lapply(items, function (it) {
        checkmate::assert_list(it)
        #checkmate::assert_string(it$label, null.ok = TRUE)
        checkmate::assert_string(it$text)
        checkmate::assert_choice(it$type, c("learnr_radio", "learnr_checkbox", "learnr_text", "learnr_numeric"),
                                 null.ok = TRUE)
        checkmate::assert_list(it$question_args, null.ok = TRUE)

        itemtype <- if (is.null(it$type)) "learnr_radio" else it$type

        if (itemtype == "learnr_text") {
            checkmate::assert_string(it$label, null.ok = TRUE)

            question_args <- c(list(
                it$text,
                learnr::answer_fn(learnr::correct, label = it$label),
                allow_retry = FALSE,
                placeholder = "",
                correct = message
            ), it$question_args)
            question_fn <- learnr::question_text
        } else if (itemtype == "learnr_numeric") {
            checkmate::assert_string(it$label, null.ok = TRUE)
            checkmate::assert_function(it$answer_fn, nargs = 1, null.ok = TRUE)

            answer_fn <- if (is.null(it$answer_fn))
                learnr::answer_fn(learnr::correct, label = it$label)
                else it$answer_fn

            question_args <- c(list(
                it$text,
                answer_fn,
                allow_retry = TRUE,
                correct = message
            ), it$question_args)
            question_fn <- learnr::question_numeric
        } else {
            # itemtype %in% c("learnr_radio", "learnr_checkbox")
            checkmate::assert_list(it$answers)

            answ_args <- lapply(it$answers, function(answ) {
                checkmate::assert_string(it$text)
                checkmate::assert_string(it$label, null.ok = TRUE)
                learnr::answer(answ$text, correct = TRUE, label = if (is.null(answ$label)) answ$text else answ$label)
            })

            question_args <- c(answ_args, list(
                text = it$text,
                correct = message,
                type = itemtype,
                allow_retry = FALSE
            ), it$question_args)
            question_fn <- learnr::question
        }

        do.call(question_fn, question_args)
    })

    do.call(learnr::quiz, c(
        quiz_args,
        list(caption = caption)
    ))
}

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


    itemdefs <- lapply(1:n_items, function (i) {
        it <- items[[i]]
        if (same_levels_for_all_items) {
            lvls <- levels
            lvl_lbls <- level_lbls
        } else {
            lvls <- levels[[i]]
            lvl_lbls <- get_level_labels(lvls)
        }

        answers <- lapply(1:length(lvls), function(j) {
            list(
                text = lvl_lbls[j],
                label = lvls[j]
            )
        })

        list(
            text = it,
            answers = answers
        )
    })

    survey(itemdefs, caption = caption, message = message)
}
