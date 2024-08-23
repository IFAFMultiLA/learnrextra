#' Evaluate the users's submission to determine correctness and to return feedback using a function `fn` which
#' expects as only argument the user's input as character string. Any atomic objects from `fn`'s environment are
#' retained.
#'
#' @param fn function for checking the user's input; must provide one argument (user input)
#' @param label optional answer label
#'
#' @export
answer_fn_with_env <- function(fn, label = NULL) {
    checkmate::assert_function(fn)
    if (!rlang::has_length(rlang::fn_fmls(fn))) {
        rlang::abort("`answer_fn()` requires a function with at least 1 argument.")
    }
    fn_text <- fn_text_with_envvars_injected(fn)

    # `correct` and `message` will be provided by the function
    learnr:::answer_new(
        value = fn_text,
        label = label,
        type = "function"
    )
}

#' Quiz question that allows to provide an answer with a simple mathematical expression
#' that is being evaluated and checked against `expected_result`.
#'
#' @inheritParams learnr::question_text
#' @param expected_result expected result (numeric)
#' @param allowed_chars allowed characters in user input
#' @param allowed_max_length allowed max. number of characters in user input
#' @param tolerance maximum absolute difference between user's result and expected result
#' @param min_value optional minimum value for user input
#' @param max_value optional maximum value for user input
#' @param rm_percentage_symbol if TRUE, remove all "\%" from user's input
#' @param correct_repeat_result either logical or a printf format string; if TRUE or string, repeat the correct result
#' @param incorrect_too_long message when the input is too long
#' @param incorrect_invalid_chars message when the input contains invalid characters
#' @param incorrect_cannot_evaluate message when the input cannot be evaluated
#' @param incorrect_out_of_range message when the evaluated input is outside the [min_value, max_value] range
#' @param incorrect_out_of_range_min message when the evaluated input is smaller than `min_value`
#' @param incorrect_out_of_range_max message when the evaluated input is greater than `max_value`
#'
#' @export
question_mathexpression <- function(
        text,
        expected_result,
        allowed_chars = "0123456789\\.\\+\\*/\\(\\)\\^-",
        allowed_max_length = 128,
        tolerance = 1e-4,
        min_value = NULL,
        max_value = NULL,
        rm_percentage_symbol = FALSE,
        correct = "Correct!",
        correct_repeat_result = FALSE,
        incorrect = "Incorrect",
        incorrect_too_long = "The provided answer is too long.",
        incorrect_invalid_chars =
            "The provided answer contains invalid characters. Only the following characters are possible: ",
        incorrect_cannot_evaluate = "Your answer cannot be evaluated as mathematical expression.",
        incorrect_out_of_range = "The result is expected to be between %f and %f, but your answer is %f.",
        incorrect_out_of_range_min = "The result is expected to be %f or greater, but your answer is %f.",
        incorrect_out_of_range_max = "The result is expected to be %f or smaller, but your answer is %f.",
        placeholder = "Enter a mathematical expression or number ...",
        trim = TRUE,
        ...
) {
    if (!is.null(min_value) && expected_result < min_value) {
        rlang::abort(sprintf("`expected_result` is less than `min_value` (`min_value` argument is set to %f, but
                             `expected_result` is %f)", min_value, expected_result))
    }

    if (!is.null(max_value) && expected_result > max_value) {
        rlang::abort(sprintf("`expected_result` is greater than `max_value` (`max_value` argument is set to %f, but
                             `expected_result` is %f)", max_value, expected_result))
    }

    answ <- answer_fn_with_env(function(input) {
        if (trim) {
            input <- trimws(input)
        }

        if (rm_percentage_symbol) {
            input <- gsub("%", "", input, fixed = TRUE)
        }

        if (!is.null(allowed_max_length) && nchar(input) > allowed_max_length) {
            return(learnr::incorrect(incorrect_too_long))
        }

        if (!is.null(allowed_chars) && grepl(paste0("[^ ", allowed_chars, "]"), input)) {
            return(learnr::incorrect(paste0(incorrect_invalid_chars, gsub("\\", "", allowed_chars, fixed = TRUE))))
        }

        result <- NULL
        try({ result <- eval(parse(text = input), envir = new.env()) }, silent = TRUE)

        ret <- NULL
        if (is.null(result)) {
            ret <- learnr::incorrect(incorrect_cannot_evaluate)
        } else {
            if (abs(result - expected_result) <= tolerance) {
                additional_msg <- character()
                if (inherits(correct_repeat_result, "character")) {
                    additional_msg <- sprintf(correct_repeat_result, result)
                } else if (isTRUE(correct_repeat_result)) {
                    additional_msg <- sprintf("The result is %f.", result)
                }

                ret <- learnr::correct(paste(c(correct, additional_msg), collapse = "\n"))
            } else {
                if (inherits(incorrect_out_of_range, "character")) {
                    min_given <- !is.null(min_value)
                    max_given <- !is.null(max_value)
                    if ((min_given && result < min_value) || (max_given && result > max_value)) {
                        if (min_given && max_given) {
                            msg <- sprintf(incorrect_out_of_range, min_value, max_value, result)
                        } else if (min_given && !max_given) {
                            msg <- sprintf(incorrect_out_of_range_min, min_value, result)
                        } else {
                            msg <- sprintf(incorrect_out_of_range_max, max_value, result)
                        }
                        ret <- learnr::incorrect(msg)
                    }
                }
            }
        }

        if (is.null(ret)) {
            learnr::incorrect(incorrect)
        } else {
            ret
        }
    })

    learnr::question_text(
        text,
        answ,
        ...,
        trim = trim,
        placeholder = placeholder,
        correct = NULL,
        incorrect = NULL
    )
}

#' Quiz question that allows to provide an answer with a simple mathematical expression
#' that is being evaluated and checked against `expected_result`. Expect a probability as answer.
#'
#' @inheritParams question_mathexpression
#'
#' @export
question_mathexpression_probability <- function(
        text,
        expected_result,
        placeholder = "Enter a mathematical expression that evaluates to a probability ...",
        ...
) {
    question_mathexpression(text, expected_result, min_value = 0, max_value = 1, placeholder = placeholder, ...)
}

#' Quiz question that allows to provide an answer with a simple mathematical expression
#' that is being evaluated and checked against `expected_result`. Expect a percentage as answer.
#'
#' @inheritParams question_mathexpression
#'
#' @export
question_mathexpression_percentage <- function(
        text,
        expected_result,
        placeholder = "Enter a mathematical expression that evaluates to a percentage ...",
        ...
) {
    question_mathexpression(text, expected_result, min_value = 0, max_value = 100, rm_percentage_symbol = TRUE,
                            placeholder = placeholder, ...)
}

#' Text-based quiz question that allows to check the answer using a custom answer function `answer_fn`.
#' Contrary to `learnr::question_text`, all atomic objects in `answer_fn`'s environment are retained.
#'
#' @param answer_fn function for checking the user's input; must provide one argument (user input)
#' @inheritParams learnr::question_text
#'
#' @export
question_text_custom_answer_fn <- function(
        text,
        answer_fn,
        placeholder = "Provide your answer here ...",
        trim = TRUE,
        ...
) {
    learnr::question_text(
        text,
        answer_fn_with_env(answer_fn),
        ...,
        trim = trim,
        placeholder = placeholder,
        correct = NULL,
        incorrect = NULL
    )
}

#' Helper function to inject variables of `fn`'s environment directly into the function body of `fn`
#' and return the function's code as text. Only atomic objects from `fn`'s environment are
#' considered.
#'
#' @param fn function to turn into code text
#'
#' @return code of `fn` injected with the function's environment variables.
fn_text_with_envvars_injected <- function(fn) {
    fn_env <- environment(fn)
    fn_envvars <- as.list(fn_env)
    fn_args <- rlang::fn_fmls_names(fn)

    # build code that sets variables from fn's environment as assignments
    inject_code <- sapply(names(fn_envvars), function(varname) {
        val <- fn_envvars[[varname]]
        # skip env. vars with the same name as function arguments (would otherwise shadow the arguments)
        # also only use atomic variable types and skip types like lists, functions, etc.
        if (!(varname %in% fn_args)
                && all(class(val) %in% c("logical", "integer", "numeric", "character", "matrix", "array", "NULL"))) {
            paste(varname, "<-", rlang::expr_text(val))
        } else {
            NA_character_
        }
    }) |> stats::na.omit() |> paste(collapse = "\n")

    # deparse the function to text and get the function head and body
    fn_text <- rlang::expr_text(fn)
    fn_text_split <- strsplit(fn_text, "\n", fixed = TRUE)[[1]]
    checkmate::assert_true(length(fn_text_split) > 1)
    fn_head <- fn_text_split[1]
    checkmate::assert_true(startsWith(fn_head, "function"))
    fn_nlines <- length(fn_text_split)

    if (fn_nlines > 2) {
        if (fn_nlines == 3) {   # empty function body
            checkmate::assert_true(all(fn_text_split[2:3] == c("{", "}")))
            fn_body <- "NULL"
        } else {
            fn_body <- fn_text_split[3:(fn_nlines-1)]   # discard curly brackets
        }
    } else {
        fn_body <- fn_text_split[2]
    }

    # build the new function code including the injected env. variables
    paste(c(fn_head, "{", inject_code, trimws(fn_body), "}"), collapse = "\n")
}
