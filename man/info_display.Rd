% Generated by roxygen2: do not edit by hand
% Please edit documentation in R/shiny.R
\name{info_display}
\alias{info_display}
\title{Display information such as login state and a data protection information button.}
\usage{
info_display(login = TRUE, dataprotection_label = "Data protection notice")
}
\arguments{
\item{login}{show login information}

\item{dataprotection_label}{label for link to data protection notice; if empty/NULL, don't show the link}
}
\value{
tag list HTML elements
}
\description{
Display information such as login state and a data protection information button.
}
