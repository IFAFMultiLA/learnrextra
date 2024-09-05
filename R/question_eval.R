#' Create an answer checking function that retains its environment
#'
#' Evaluate the users's submission to determine correctness and to return feedback using a function `fn` which
#' expects as only argument the user's input as character string. Any atomic objects from `fn`'s environment are
#' retained.
#'
#' @param fn Function for checking the user's input; must provide one argument (user input).
#' @param label Optional answer label.
#' @return Object of class `tutorial_question_answer` with the answer function's code as `value`.
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

#' Quiz questions accepting mathematical expressions
#'
#' Create a quiz question that allows to provide an answer with a simple mathematical expression
#' that is being evaluated and checked against `expected_result`.
#'
#' By default, only summation, difference, multiplication, division and power operators are allowed, along with
#' parentheses. This can be controlled via `allowed_chars`. The default behavior allows users to provide answers
#' like `3 * 1.14 + 1/(2^3)` being evaluated and check against the correct result. At the same time, this prevents
#' possible security issues as it is not possible to call any R functions besides the mentioned algebraic operators.
#'
#' When expecting the input to be a probability, you can use `question_mathexpression_probability`. This function
#' additional checks for the entered result being in range \eqn{[0, 1]} and gives respective hints if not.
#' The function `question_mathexpression_percentage()` also allows users to use the "%" character in the input.
#'
#' @examples
#' question_mathexpression(
#'     "What's the sum of the first 5 natural numbers?",
#'     15
#' )
#'
#' question_mathexpression_probability(
#'     "What's the probability of getting two times \"head\" when flipping a fair coin twice?",
#'     1/4
#' )
#'
#' question_mathexpression_percentage(
#'     "What's the probability of getting two times \"head\" when flipping a fair coin twice? Give the answer in per cent.",
#'     25,
#'     min_value = 0,
#'     max_value = 100
#' )
#'
#'
#' @inheritParams learnr::question_text
#' @param expected_result Expected result (numeric).
#' @param allowed_chars Allowed characters in user input.
#' @param allowed_max_length Allowed max. number of characters in user input.
#' @param tolerance Maximum absolute difference between user's result and expected result.
#' @param min_value Optional minimum value for user input.
#' @param max_value Optional maximum value for user input.
#' @param handle_comma_in_input Options to handle commas in input (important for languages where comma is used for
#'                              decimal point). `FALSE`: No special behavior (will trigger `incorrect_invalid_chars`
#'                              message); `TRUE`: Replace comma by decimal point; character string: message to display
#'                              when input contains a comma.
#' @param rm_percentage_symbol If TRUE, remove all "%" from user's input.
#' @param correct_repeat_result Either logical or a printf format string; if TRUE or string, repeat the correct result.
#' @param incorrect_too_long Message when the input is too long.
#' @param incorrect_invalid_chars Message when the input contains invalid characters.
#' @param incorrect_cannot_evaluate Message when the input cannot be evaluated.
#' @param incorrect_out_of_range Message when the evaluated input is outside the `[min_value, max_value]` range.
#' @param incorrect_out_of_range_min Message when the evaluated input is smaller than `min_value`.
#' @param incorrect_out_of_range_max Message when the evaluated input is greater than `max_value`.
#' @inherit learnr::question_text return
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
        handle_comma_in_input = FALSE,
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

        if (isTRUE(handle_comma_in_input)) {
            input <- gsub(",", ".", input, fixed = TRUE)
        } else if (is.character(handle_comma_in_input)) {
            checkmate::assert_string(handle_comma_in_input)   # check that it's a scalar
            if (grepl(",", input, fixed = TRUE)) {
                return(learnr::incorrect(handle_comma_in_input))
            }
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

#' @rdname question_mathexpression
#' @export
question_mathexpression_probability <- function(
        text,
        expected_result,
        placeholder = "Enter a mathematical expression that evaluates to a probability ...",
        ...
) {
    question_mathexpression(text, expected_result, min_value = 0, max_value = 1, placeholder = placeholder, ...)
}

#' @rdname question_mathexpression
#' @export
question_mathexpression_percentage <- function(
        text,
        expected_result,
        placeholder = "Enter a mathematical expression that evaluates to a percentage ...",
        ...
) {
    question_mathexpression(text, expected_result, rm_percentage_symbol = TRUE, placeholder = placeholder, ...)
}

#' Quiz questions with custom answer checking function that retains its environment
#'
#' Create a text-based quiz question that allows to check the answer using a custom answer checking
#' function `answer_fn`. Contrary to [learnr::question_text()], all atomic objects in `answer_fn`'s environment
#' are retained.
#'
#' @param answer_fn Function for checking the user's input; must provide one argument (user input).
#' @inheritParams learnr::question_text
#' @inherit learnr::question_text return
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

#' Helper function to inject variables of `fn`'s environment into function body text
#'
#' This function is used to inject variables of `fn`'s environment directly into the function body of `fn`
#' and return the function's code as text. Only atomic objects from `fn`'s environment are
#' considered.
#'
#' @param fn Function to turn into code text.
#'
#' @return Code of `fn` injected with the function's environment variables.
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
