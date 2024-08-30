source("helpers.R")


check_survey_result <- function(res, args, likert = FALSE) {
    expect_type(res, "list")
    expect_s3_class(res, "tutorial_quiz")
    expect_equal(as.character(res$caption), getval(args, "caption", "Survey"))
    expect_type(res$questions, "list")
    expect_equal(length(res$questions), length(args$items))

    if (length(res$questions) > 0) {
        for (i in 1:length(res$questions)) {
            qdef <- args$items[[i]]
            q <- res$questions[[i]]

            expect_type(q, "list")
            expect_s3_class(q, "tutorial_question")
            qtype <- if (likert) "learnr_radio" else getval(qdef, "type", "learnr_radio")
            expect_s3_class(q, qtype)
            expect_equal(as.character(q$messages$correct), getval(args, "message", "Thank you."))
            expect_type(q$answers, "list")

            if (is.list(qdef) && !is.null(qdef$question_args)) {
                if (!is.null(qdef$question_args$allow_retry)) {
                    expect_equal(q$allow_retry, qdef$question_args$allow_retry)
                }

                if (!is.null(qdef$question_args$min)) {
                    expect_equal(q$options$min, qdef$question_args$min)
                }

                if (!is.null(qdef$question_args$max)) {
                    expect_equal(q$options$max, qdef$question_args$max)
                }
            }

            if (qtype == "learnr_text") {
                expect_length(q$answers, 1)
                a <- q$answers[[1]]
                expect_type(a, "list")
                expect_s3_class(a, "tutorial_question_answer")
                lbl <- getval(qdef, "label", NULL)
                if (is.null(lbl)) {
                    expect_null(a$label)
                } else {
                    expect_equal(as.character(a$label), lbl)
                }
                expect_equal(a$type, "function")
                expect_equal(a$value,
                             "function (messages = NULL) \n{\n    mark_as(correct = TRUE, messages = messages)\n}")
            } else if (qtype == "learnr_numeric") {
                expect_length(q$answers, 1)
                a <- q$answers[[1]]
                expect_type(a, "list")
                expect_s3_class(a, "tutorial_question_answer")
                lbl <- getval(qdef, "label", NULL)
                if (is.null(lbl)) {
                    expect_null(a$label)
                } else {
                    expect_equal(as.character(a$label), lbl)
                }
                expect_equal(a$type, "function")
                expect_equal(a$value,
                             "function (messages = NULL) \n{\n    mark_as(correct = TRUE, messages = messages)\n}")
            } else {
                expect_equal(as.character(q$messages$incorrect), getval(args, "message", "Thank you."))

                qlabel <- NULL
                if (likert) {
                    if (!is.null(names(args$items))) {
                        qlabel <- names(args$items)[i]
                    }

                    alabels <- if (is.list(args$levels)) args$levels[[i]] else args$levels
                    avalues <- names(alabels)
                    if (is.null(avalues)) {
                        avalues <- as.character(1:length(alabels))
                    }
                } else {
                    if (!is.null(qdef$label)) {
                        qlabel <- qdef$label
                    }
                    alabels <- qdef$answers
                    avalues <- names(alabels)
                }

                if (!is.null(qlabel)) {
                    expect_equal(q$label, qlabel)
                    expect_equal(q$ids, list(
                        answer = paste0(qlabel, "-answer"),
                        question = qlabel
                    ))
                }

                expect_equal(length(q$answers), length(alabels))

                for (j in 1:length(q$answers)) {
                    a <- q$answers[[j]]
                    alabel <- unname(alabels[j])

                    expect_type(a, "list")
                    expect_s3_class(a, "tutorial_question_answer")
                    expect_equal(as.character(a$label), alabel)

                    if (is.null(avalues)) {
                        expect_equal(a$value, alabel)
                    } else {
                        expect_equal(a$value, avalues[j])
                    }
                }
            }
        }
    }
}

test_that("survey() generates correct output object for different parameters", {
    list_of_args <- list(
        list(items = list()),
        list(items = list(), caption = "Foo"),
        list(items = list(list(text = "foo1", answers = c("one", "two")))),
        list(items = list(list(text = "foo2", answers = c("one", "two"))), message = "msg"),
        list(items = list(list(text = "foo3", answers = c("one", "two"),
                               question_args = list(allow_retry = TRUE)))),
        list(items = list(list(text = "foo4", type = "learnr_checkbox", answers = c("one", "two")))),
        list(items = list(list(text = "foo5", type = "learnr_text"))),
        list(items = list(list(text = "foo6", type = "learnr_text", label = "boo"))),
        list(items = list(list(text = "foo7", type = "learnr_numeric"))),
        list(items = list(list(text = "foo8", type = "learnr_numeric", label = "boo"))),
        list(items = list(list(text = "foo9", type = "learnr_numeric",
                               question_args = list(min = 1, max = 5))))
    )

    for (args in list_of_args) {
        res <- do.call(survey, args)
        check_survey_result(res, args)
    }
})

test_that("survey_likert() generates correct output object for different parameters", {
    list_of_args <- list(
        list(items = character(), levels = character(), error = "Must have length >= 1"),
        list(items = character(), levels = list(), error = "Must have length >= 1"),
        list(items = c("item 1"), levels = character(), error = "Must have length >= 1"),
        list(items = character(), levels = c("level 1"), error = "Must have length >= 1"),
        list(items = c("item 1"), levels = c("level 1")),
        list(items = c("item 1", "item 2"), levels = c("level 1", "level 2", "level 3")),
        list(items = c("item 1", "item 2"), levels = c("l1" = "level 1", "l2" = "level 2", "l3" = "level 3")),
        list(items = c("item 1", "item 2"), levels = list(c("level 1", "level 2", "level 3")),
             error = "number of levels must match number of items if `levels` is passed as list"),
        list(items = c("item 1", "item 2"), levels = list(
                c("level 1", "level 2", "level 3"),
                c("foo", "bar")
            )
        ),
        list(items = c("item 1", "item 2"), levels = list(
                c("level 1", "level 2", "level 3"),
                c("F" = "foo", "B" = "bar")
            )
        ),
        list(items = c("it1" = "item 1", "it2" = "item 2"), levels = list(
                c("level 1", "level 2", "level 3"),
                c("F" = "foo", "B" = "bar")
            )
        )
    )

    for (args in list_of_args) {
        if (!is.null(args$error)) {
            msg <- args$error
            args$error <- NULL
            expect_error(do.call(survey_likert, args), msg)
        } else {
            res <- do.call(survey_likert, args)
            check_survey_result(res, args, likert = TRUE)
        }
    }
})
