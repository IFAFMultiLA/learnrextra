source("helpers.R")


test_that("fn_text_with_envvars_injected() works with one-liner function", {
    a <- 1L
    b <- TRUE
    c <- c(3.14, 15.9)
    d <- c("some", "text")
    e <- matrix(1.23)
    x <- "dismiss me"

    fn <- function(x)  x + c

    txt <- fn_text_with_envvars_injected(fn)
    expect_type(txt, "character")

    res <- eval(parse(text = txt), envir = rlang::base_env())(5)
    expect_equal(res, c + 5)
    expect_equal(txt, "function (x) \n{\na <- 1L\nb <- TRUE\nc <- c(3.14, 15.9)\nd <- c(\"some\", \"text\")\ne <- structure(1.23, dim = c(1L, 1L))\nx + c\n}")
})

test_that("fn_text_with_envvars_injected() works with more complex function", {
    a <- 1L
    foo <- function(x) { x }

    fn <- function(j, k = 1) {
        a <- a + 1
        k * (j + a)
    }

    txt <- fn_text_with_envvars_injected(fn)
    expect_type(txt, "character")

    res <- eval(parse(text = txt), envir = rlang::base_env())(2, 3)
    expect_equal(res, 12)

    res <- eval(parse(text = txt), envir = rlang::base_env())(2)
    expect_equal(res, 4)
})

test_that("fn_text_with_envvars_injected() works with function without arguments", {
    a <- 1L

    fn <- function() {
        a <- 2 * a
        a
    }

    txt <- fn_text_with_envvars_injected(fn)
    expect_type(txt, "character")

    res <- eval(parse(text = txt), envir = rlang::base_env())()
    expect_equal(res, 2)
})

test_that("fn_text_with_envvars_injected() works with function without arguments and function body", {
    a <- 1L

    fn <- function() { }

    txt <- fn_text_with_envvars_injected(fn)
    expect_type(txt, "character")

    res <- eval(parse(text = txt), envir = rlang::base_env())()
    expect_null(res)
})

test_that("answer_fn_with_env() works", {
    a <- 1L
    foo <- function(x) { x }

    fn <- function(j, k = 1) {
        a <- a + 1
        k * (j + a)
    }

    answ <- answer_fn_with_env(fn)
    expect_type(answ, "list")
    expect_setequal(class(answ), c("tutorial_question_answer", "tutorial_quiz_answer"))
    expect_equal(answ$type, "function")

    expect_type(answ$value, "character")

    res <- eval(parse(text = answ$value), envir = rlang::base_env())(2, 3)
    expect_equal(res, 12)

    res <- eval(parse(text = answ$value), envir = rlang::base_env())(2)
    expect_equal(res, 4)
})

check_question_mathexpression_result <- function(
        res,
        args,
        placeholder_default = "Enter a mathematical expression or number ...",
        min_value_default = NULL,
        max_value_default = NULL,
        rm_percentage_symbol_default = FALSE
) {
    expect_type(res, "list")
    expect_setequal(class(res), c("learnr_text", "tutorial_question"))
    expect_equal(res$type, "learnr_text")
    expect_equal(res$label, NULL)
    expect_equal(as.character(res$question), args$text)
    expect_length(res$answers, 1)
    expect_equal(res$answers[[1]]$type, "function")
    expect_true(startsWith(res$answers[[1]]$value, "function (input)"))
    expect_true(grepl(sprintf("expected_result <- %s", as.character(args$expected_result)),
                      res$answers[[1]]$value,
                      fixed = TRUE))
    expect_true(grepl(gsub("\\",
                           "\\\\",
                           sprintf("allowed_chars <- \"%s\"", getval(args, "allowed_chars", "0123456789\\.\\+\\*/\\(\\)\\^-")),
                           fixed = TRUE),
                      res$answers[[1]]$value,
                      fixed = TRUE))
    expect_true(grepl(sprintf("allowed_max_length <- %s", as.character(getval(args, "allowed_max_length", 128))),
                      res$answers[[1]]$value,
                      fixed = TRUE))
    expect_true(grepl(sprintf("tolerance <- %s", as.character(getval(args, "tolerance", 1e-4))),
                      res$answers[[1]]$value,
                      fixed = TRUE))
    expect_true(grepl(sprintf("min_value <- %s",
                              as.character(getval(args, "min_value",
                                                  ifelse(is.null(min_value_default), "NULL", min_value_default)))),
                      res$answers[[1]]$value,
                      fixed = TRUE))
    expect_true(grepl(sprintf("max_value <- %s",
                              as.character(getval(args, "max_value",
                                                  ifelse(is.null(max_value_default), "NULL", max_value_default)))),
                      res$answers[[1]]$value,
                      fixed = TRUE))
    expect_true(grepl(sprintf("rm_percentage_symbol <- %s", as.character(getval(args, "rm_percentage_symbol",
                                                                                rm_percentage_symbol_default))),
                      res$answers[[1]]$value,
                      fixed = TRUE))
    handle_comma_in_input <- getval(args, "handle_comma_in_input", FALSE)
    handle_comma_in_input_str <- if (is.logical(handle_comma_in_input))
        sprintf("handle_comma_in_input <- %s", as.character(handle_comma_in_input)) else
            sprintf("handle_comma_in_input <- \"%s\"", handle_comma_in_input)
    expect_true(grepl(handle_comma_in_input_str, res$answers[[1]]$value, fixed = TRUE))

    correct_repeat_result <- getval(args, "correct_repeat_result", FALSE)
    if (typeof(correct_repeat_result) == "character") {
        expect_true(grepl(sprintf("correct_repeat_result <- \"%s\"", correct_repeat_result),
                          res$answers[[1]]$value,
                          fixed = TRUE))
    } else {
        expect_true(grepl(sprintf("correct_repeat_result <- %s", as.character(correct_repeat_result)),
                          res$answers[[1]]$value,
                          fixed = TRUE))
    }

    expect_true(grepl(sprintf("incorrect_too_long <- \"%s\"",
                              getval(args, "incorrect_too_long", "The provided answer is too long.")),
                      res$answers[[1]]$value,
                      fixed = TRUE))
    expect_true(grepl(sprintf("incorrect_invalid_chars <- \"%s\"",
                              getval(args, "incorrect_invalid_chars", "The provided answer contains invalid characters. Only the following characters are possible: ")),
                      res$answers[[1]]$value,
                      fixed = TRUE))
    expect_true(grepl(sprintf("incorrect_cannot_evaluate <- \"%s\"",
                              getval(args, "incorrect_cannot_evaluate", "Your answer cannot be evaluated as mathematical expression.")),
                      res$answers[[1]]$value,
                      fixed = TRUE))
    expect_true(grepl(sprintf("incorrect_out_of_range <- \"%s\"",
                              getval(args, "incorrect_out_of_range", "The result is expected to be between %f and %f, but your answer is %f.")),
                      res$answers[[1]]$value,
                      fixed = TRUE))
    expect_true(grepl(sprintf("incorrect_out_of_range_min <- \"%s\"",
                              getval(args, "incorrect_out_of_range_min", "The result is expected to be %f or greater, but your answer is %f.")),
                      res$answers[[1]]$value,
                      fixed = TRUE))
    expect_true(grepl(sprintf("incorrect_out_of_range_max <- \"%s\"",
                              getval(args, "incorrect_out_of_range_max", "The result is expected to be %f or smaller, but your answer is %f.")),
                      res$answers[[1]]$value,
                      fixed = TRUE))

    expect_equal(res$random_answer_order, getval(args, "random_answer_order", FALSE))
    expect_equal(res$allow_retry, getval(args, "allow_retry", FALSE))
    expect_equal(res$options$placeholder, getval(args, "placeholder", placeholder_default))
    expect_equal(res$options$trim, getval(args, "trim", TRUE))

    answ_check_fn <- eval(parse(text = res$answers[[1]]$value), envir = rlang::base_env())
    answ <- answ_check_fn(as.character(args$expected_result))
    expect_type(answ, "list")
    expect_equal(class(answ), "learnr_mark_as")
    expect_true(answ$correct)    # we passed the expected result above, so this should always be correct
    expect_length(answ$messages, 1)
    correct_msg <- getval(args, "correct", "Correct!")
    if (isFALSE(correct_repeat_result)) {
        expect_equal(answ$messages, correct_msg)
    } else {
        expect_true(startsWith(answ$messages, correct_msg))
        expect_true(grepl(as.character(args$expected_result), answ$messages))
    }
}

check_question_mathexpression_evaluation <- function(res, args, input) {
    correct_repeat_result <- getval(args, "correct_repeat_result", FALSE)

    answ_check_fn <- eval(parse(text = res$answers[[1]]$value), envir = rlang::base_env())
    answ <- answ_check_fn(input$str)

    expect_type(answ, "list")
    expect_equal(class(answ), "learnr_mark_as")
    expect_equal(answ$correct, input$correct)
    expect_length(answ$messages, 1)

    if (input$correct) {
        correct_msg <- getval(args, "correct", "Correct!")
        if (isFALSE(correct_repeat_result)) {
            expect_equal(answ$messages, correct_msg)
        } else {
            expect_true(startsWith(answ$messages, correct_msg))
            expect_true(grepl(as.character(args$expected_result), answ$messages))
        }
    } else {
        if (is.null(input$failmsg_regexp)) {
            expect_equal(answ$messages, getval(args, "incorrect", "Incorrect"))
        } else {
            expect_true(grepl(input$failmsg_regexp, answ$messages))
        }
    }
}

test_that("question_mathexpression() returns correct result list depending on passed arguments", {
    list_of_args <- list(
        list(text = "foo1", expected_result = 3.14),
        list(text = "foo1b", expected_result = 3.14, placeholder = "foo"),
        list(text = "foo2", expected_result = 3.14, allowed_chars = "134\\."),
        list(text = "foo3", expected_result = -3, allowed_max_length = 30),
        list(text = "foo4", expected_result = -3, tolerance = 0.1),
        list(text = "foo5", expected_result = 123, min_value = 123),
        list(text = "foo6", expected_result = 456.78, max_value = 456.78),
        list(text = "foo7", expected_result = 1e-3, handle_comma_in_input = TRUE),
        list(text = "foo7b", expected_result = 1e-3, handle_comma_in_input = "oops, comma in input"),
        list(text = "foo7c", expected_result = 1e-3, rm_percentage_symbol = TRUE),
        list(text = "foo8", expected_result = 1e-3, correct_repeat_result = TRUE),
        list(text = "foo9", expected_result = 1e-3, correct_repeat_result = "yeah %f"),
        list(text = "foo10", expected_result = 1e-3, incorrect_too_long = "too long"),
        list(text = "foo11", expected_result = 1e-3, incorrect_invalid_chars = "invalid chars"),
        list(text = "foo12", expected_result = 1e-3, incorrect_cannot_evaluate = "invalid expr"),
        list(text = "foo13", expected_result = 1e-3, incorrect_out_of_range = "between %f and %f, but your answer is %f"),
        list(text = "foo14", expected_result = 1e-3, incorrect_out_of_range_min = ">= %f, but your answer is %f"),
        list(text = "foo15", expected_result = 1e-3, incorrect_out_of_range_max = "<= %f, but your answer is %f")
    )

    for (args in list_of_args) {
        res <- do.call(question_mathexpression, args)
        check_question_mathexpression_result(res, args)
    }
})

test_that("question_mathexpression() aborts when expected result is not within min_value / max_value bounds", {
    list_of_args <- list(
        list(text = "foo1", expected_result = 122, min_value = 123,
             expect_error = "`expected_result` is less than `min_value`"),
        list(text = "foo2", expected_result = 457, max_value = 456.78,
             expect_error = "`expected_result` is greater than `max_value`"),
        list(text = "foo3", expected_result = -10.01, min_value = -10, max_value = 100,
             expect_error = "`expected_result` is less than `min_value`")
    )

    for (args in list_of_args) {
        expect_msg <- args$expect_error
        args$expect_error <- NULL
        expect_error(do.call(question_mathexpression, args), expect_msg)
    }
})

test_that("question_mathexpression() correctly evaluates inputs", {
    list_of_args <- list(
        # inputs are fine
        list(
            args = list(text = "foo1", expected_result = 3.14),
            input = list(str = "3.14", correct = TRUE)
        ),
        list(
            args = list(text = "foo2", expected_result = 3.14, correct_repeat_result = TRUE),
            input = list(str = "314/100", correct = TRUE)
        ),
        list(
            args = list(text = "foo3", expected_result = 3.14),
            input = list(str = "314/200*2.0000001", correct = TRUE)   # tolerance
        ),
        list(
            args = list(text = "foo4", expected_result = 3.14),
            input = list(str = "314/200*2.01", correct = FALSE)
        ),
        list(
            args = list(text = "foo5", expected_result = 0, incorrect = "boooh!"),
            input = list(str = "-3 + 3.14", correct = FALSE)
        ),
        list(
            args = list(text = "foo5b", expected_result = 3.1415, handle_comma_in_input = TRUE),
            input = list(str = "3,1415", correct = TRUE)
        ),
        # inputs are not valid
        list(
            args = list(text = "foo6", expected_result = 0),
            input = list(str = "system('echo \"test\"')", correct = FALSE,
                         failmsg_regexp = "^The provided answer contains invalid characters.")
        ),
        list(
            args = list(text = "foo6b", expected_result = 3.14),
            input = list(str = "3,14", correct = FALSE,
                         failmsg_regexp = "^The provided answer contains invalid characters.")
        ),
        list(
            args = list(text = "foo7", expected_result = 0),
            input = list(str = "*3/2", correct = FALSE,
                         failmsg_regexp = "^Your answer cannot be evaluated as mathematical expression.$")
        ),
        list(
            args = list(text = "foo8", expected_result = 0, allowed_max_length = 3),
            input = list(str = "1234", correct = FALSE,
                         failmsg_regexp = "^The provided answer is too long.$")
        ),
        list(
            args = list(text = "foo9", expected_result = 0, min_value = -1, max_value = 1),
            input = list(str = "-2", correct = FALSE,
                         failmsg_regexp = "^The result is expected to be between ")
        ),
        list(
            args = list(text = "foo10", expected_result = 0, min_value = -1, max_value = 1),
            input = list(str = "-2", correct = FALSE,
                         failmsg_regexp = "^The result is expected to be between ")
        ),
        list(
            args = list(text = "foo11", expected_result = 0, min_value = -100),
            input = list(str = "-100000", correct = FALSE,
                         failmsg_regexp = " or greater, but your answer is ")
        ),
        list(
            args = list(text = "foo11", expected_result = -100, max_value = -100),
            input = list(str = "0", correct = FALSE,
                         failmsg_regexp = " or smaller, but your answer is ")
        ),
        list(
            args = list(text = "foo12", expected_result = 3.1415, handle_comma_in_input = "oops, comma in input"),
            input = list(str = "3,1415", correct = FALSE,
                         failmsg_regexp = "oops, comma in input")
        )
    )

    for (args_and_input in list_of_args) {
        res <- do.call(question_mathexpression, args_and_input$args)
        check_question_mathexpression_evaluation(res, args_and_input$args, args_and_input$input)
    }
})

test_that("question_mathexpression_probability() returns correct result list depending on passed arguments", {
    placeholder_default = "Enter a mathematical expression that evaluates to a probability ..."

    list_of_args <- list(
        list(text = "foo1", expected_result = 0.1),
        list(text = "foo2", expected_result = 1.0),
        list(text = "foo3", expected_result = 0),
        list(text = "foo4", expected_result = 0, placeholder = "foo")
    )

    for (args in list_of_args) {
        res <- do.call(question_mathexpression_probability, args)
        check_question_mathexpression_result(res,
                                             args,
                                             placeholder_default = placeholder_default,
                                             min_value_default = 0,
                                             max_value_default = 1)
    }
})

test_that("question_mathexpression_probability() aborts when expected result is not within min_value / max_value bounds", {
    list_of_args <- list(
        list(text = "foo1", expected_result = -0.1, expect_error = "`expected_result` is less than `min_value`"),
        list(text = "foo2", expected_result = 1.1, expect_error = "`expected_result` is greater than `max_value`")
    )

    for (args in list_of_args) {
        expect_msg <- args$expect_error
        args$expect_error <- NULL
        expect_error(do.call(question_mathexpression_probability, args), expect_msg)
    }
})

test_that("question_mathexpression_percentage() returns correct result list depending on passed arguments", {
    placeholder_default = "Enter a mathematical expression that evaluates to a percentage ..."

    list_of_args <- list(
        list(text = "foo1", expected_result = 0.1),
        list(text = "foo2", expected_result = 1.0),
        list(text = "foo3", expected_result = 0),
        list(text = "foo4", expected_result = 0, placeholder = "foo")
    )

    for (args in list_of_args) {
        res <- do.call(question_mathexpression_percentage, args)
        check_question_mathexpression_result(res,
                                             args,
                                             placeholder_default = placeholder_default,
                                             rm_percentage_symbol_default = TRUE)
    }
})

test_that("question_mathexpression_percentage() aborts when expected result is not within
          min_value / max_value bounds", {
    list_of_args <- list(
        list(text = "foo1", expected_result = -0.1, min_value = 0, max_value = 100,
             expect_error = "`expected_result` is less than `min_value`"),
        list(text = "foo2", expected_result = 100.001, min_value = 0, max_value = 100,
             expect_error = "`expected_result` is greater than `max_value`")
    )

    for (args in list_of_args) {
        expect_msg <- args$expect_error
        args$expect_error <- NULL
        expect_error(do.call(question_mathexpression_percentage, args), expect_msg)
    }
})

test_that("question_mathexpression_percentage() correctly evaluates inputs", {
    list_of_args <- list(
        # inputs are fine
        list(
            args = list(text = "foo1", expected_result = 3.14),
            input = list(str = "3.14", correct = TRUE)
        ),
        list(
            args = list(text = "foo2", expected_result = 3.14),
            input = list(str = "3.14%", correct = TRUE)
        ),
        list(
            args = list(text = "foo2b", expected_result = 314),
            input = list(str = "314%", correct = TRUE)
        ),
        list(
            args = list(text = "foo2c", expected_result = 3.14, handle_comma_in_input = TRUE),
            input = list(str = "3,14%", correct = TRUE)
        ),
        list(
            args = list(text = "foo3", expected_result = 3.14),
            input = list(str = "314/200% *2.0000001", correct = TRUE)   # tolerance
        ),
        # inputs are not valid
        list(
            args = list(text = "foo6", expected_result = 0),
            input = list(str = "system('echo \"test\"')", correct = FALSE,
                         failmsg_regexp = "^The provided answer contains invalid characters.")
        ),
        list(
            args = list(text = "foo7", expected_result = 0),
            input = list(str = "*%", correct = FALSE,
                         failmsg_regexp = "^Your answer cannot be evaluated as mathematical expression.$")
        ),
        list(
            args = list(text = "foo9", expected_result = 0, min_value = 0, max_value = 100),
            input = list(str = "-2", correct = FALSE,
                         failmsg_regexp = "^The result is expected to be between ")
        ),
        list(
            args = list(text = "foo10", expected_result = 0, min_value = 0, max_value = 100),
            input = list(str = "102%", correct = FALSE,
                         failmsg_regexp = "^The result is expected to be between ")
        )
    )

    for (args_and_input in list_of_args) {
        res <- do.call(question_mathexpression_percentage, args_and_input$args)
        check_question_mathexpression_evaluation(res, args_and_input$args, args_and_input$input)
    }
})


test_that("question_text_custom_answer_fn() returns correct result list depending on passed arguments", {
    placeholder_default = "Provide your answer here ..."

    check_fn_wrapper <- function(expected_result, correct_msg, incorrect_msg) {
        check_fn <- function(input) {
            if (input == expected_result) {
                learnr::correct(correct_msg)
            } else {
                learnr::incorrect(incorrect_msg)
            }
        }
    }

    list_of_args <- list(
        list(text = "foo1", answer_fn = check_fn_wrapper(1, "yeah", "booh")),
        list(text = "foo2", answer_fn = check_fn_wrapper(1, "yeah", "booh"), placeholder = "foo"),
        list(text = "foo3", answer_fn = check_fn_wrapper(1, "yeah", "booh"), trim = FALSE),
        list(text = "foo4", answer_fn = check_fn_wrapper(2, "yeah", "booh"))
    )

    for (args in list_of_args) {
        res <- do.call(question_text_custom_answer_fn, args)

        expect_type(res, "list")
        expect_setequal(class(res), c("learnr_text", "tutorial_question"))
        expect_equal(res$type, "learnr_text")
        expect_equal(res$label, NULL)
        expect_equal(as.character(res$question), args$text)
        expect_length(res$answers, 1)
        expect_equal(res$answers[[1]]$type, "function")
        expect_true(startsWith(res$answers[[1]]$value, "function (input)"))
        expect_equal(res$options$placeholder, getval(args, "placeholder", placeholder_default))
        expect_equal(res$options$trim, getval(args, "trim", TRUE))

        answ_check_fn <- eval(parse(text = res$answers[[1]]$value), envir = rlang::base_env())
        answ <- answ_check_fn("1")
        expect_type(answ, "list")
        expect_equal(class(answ), "learnr_mark_as")
        if (args$text == "foo4") {
            expect_false(answ$correct)
            expect_length(answ$messages, 1)
            expect_equal(answ$messages, "booh")
        } else {
            expect_true(answ$correct)
            expect_length(answ$messages, 1)
            expect_equal(answ$messages, "yeah")
        }
    }
})
