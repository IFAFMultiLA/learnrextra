# Get value for key `k` from list `l`. If `k` doesn't exist in `l`, return `default`.
getval <- function(l, k, default) {
    v <- l[[k]]
    if (is.null(v)) {
        default
    } else {
        v
    }
}
