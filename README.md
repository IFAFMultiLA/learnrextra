# learnrextra R package

The *learnrextra* R package is a central part of the [MultiLA software platform](https://ifafmultila.github.io/). It's an extension to the [learnr package](https://rstudio.github.io/learnr/) to create learning applications that allow to anonymously track interaction data and collect this data via the [MultiLA web API](https://ifafmultila.github.io/devguide.html). It furthermore provides some extra features to learnr such as:

- an optional summary panel,
- the ability to create several variants of a single base learning application via configurations,
- the ability to embed surveys in the learning applications via the `survey()` and `survey_likert()` functions,
- a new question type that allows to provide answers as mathematical expressions via the family of `question_mathexpression()` functions.

See the R documentation of the respective functions for details.

## Installation

- install [renv](https://rstudio.github.io/renv/index.html) if you haven't yet
- then install all R dependencies via `renv::restore()`
- run "Check" in the RStudio "Build" panel or via `devtools::check()` command to check if R package building works
- also install [NodeJS](https://nodejs.org/) and the [Node package manager (npm)](https://www.npmjs.com/)
- then run `npm install` to install all JavaScript dependencies
- run `npm run build` to check if building the JavaScript sources works

## Development

For local development, it's recommended that you clone this repository on your machine. Then, either create a new learning application or use the [test application](https://github.com/IFAFMultiLA/learnrextra_testapp). However, make sure that you install learnrextra in your learning application from the local path of the cloned repository (``renv::install("<LOCAL PATH TO REPOSITORY>")``).

### Build Javascript dependencies

JavaScript code in folder `learnrextra-js` needs to be build using `npm` with the following command:

```bash
npm run build
```

The generated JS files are then placed in the folder `inst/rmarkdown/templates/tutorial/resources/`.

### Build documentation

```r
devtools::document()
```

### Run tests

```r
devtools::test()
```

### Run R CMD check

```r
devtools::check()
```



