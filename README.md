# learnrextra R package

The *learnrextra* R package is a central part of the [MultiLA software platform](https://ifafmultila.github.io/). It's an extension to the [learnr package](https://rstudio.github.io/learnr/) to create learning applications that allow to anonymously track usage data and collect this data via the [MultiLA web API](https://ifafmultila.github.io/devguide.html). It furthermore provides some extra features to learnr such as an optional summary panel and the ability to create several variants of a single base learning application via configurations.

For local development, it's recommended that you clone this repository on your machine. Then, either create a new learning application or use the [test application](https://github.com/IFAFMultiLA/learnrextra_testapp). However, make sure that you install learnrextra in your learning application from the local path of the cloned repository (``renv::install("<LOCAL PATH TO REPOSITORY>")``).

## Installation

- install [renv](https://rstudio.github.io/renv/index.html) if you haven't yet
- then install all R dependencies via `renv::restore()`
- run "Check" in the RStudio "Build" panel to check if R package building works
- also install [NodeJS](https://nodejs.org/) and the [Node package manager (npm)](https://www.npmjs.com/)
- then run `npm install` to install all JavaScript dependencies
- run `npm run build` to check if building the JavaScript sources works

## Build Javascript dependencies

```bash
npm run build
```

## Build documentation

```r
devtools::document()
```
