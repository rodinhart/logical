// append two lists
export const append = (xs, ys) =>
  !Array.isArray(xs) ? ys : [xs[0], append(xs[1], ys)]

// filter a list
export const filter = (p) => (xs) =>
  !Array.isArray(xs)
    ? null
    : p(xs[0])
    ? [xs[0], filter(p)(xs[1])]
    : filter(p)(xs[1])

// flatmap over list
export const flatmap = (f) => (xs) =>
  !Array.isArray(xs) ? null : append(f(xs[0]), flatmap(f)(xs[1]))

// array to linked list
export const list = (xs) => {
  let r = null
  for (let i = xs.length - 1; i >= 0; i--) {
    r = [xs[i], r]
  }

  return r
}

// map over list
export const map = (f) => (xs) =>
  !Array.isArray(xs) ? null : [f(xs[0]), map(f)(xs[1])]

export const take = (n) => (xs) =>
  n > 0 && Array.isArray(xs) ? [xs[0], take(n - 1)(xs[1])] : null
