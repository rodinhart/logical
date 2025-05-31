// append two lists
export const append = (xs, ys) =>
  isEmpty(xs) ? ys : cons(xs[0], () => append(xs[1], ys))

export const car = (xs) => xs[0]

export const cdr = (xs) => {
  if (typeof xs[1] === "function") {
    xs[1] = xs[1]()
  }

  return xs[1]
}

export const cons = (x, y) => [x, y]

// filter a list
export const filter = (p) => (xs) =>
  isEmpty(xs)
    ? nil
    : p(car(xs))
    ? cons(car(xs), () => filter(p)(cdr(xs)))
    : filter(p)(cdr(xs))

// flatmap over list
export const flatmap = (f) => (xs) =>
  isEmpty(xs) ? nil : append(f(car(xs)), flatmap(f)(cdr(xs)))

export const isEmpty = (xs) => !Array.isArray(xs)

export const length = (xs) => (isEmpty(xs) ? 0 : 1 + length(cdr(xs)))

// array to linked list
export const list = (xs) => {
  let r = nil
  for (let i = xs.length - 1; i >= 0; i--) {
    r = cons(xs[i], r)
  }

  return r
}

// map over list
export const map = (f) => (xs) =>
  isEmpty(xs) ? nil : cons(f(car(xs)), () => map(f)(cdr(xs)))

export const nil = null

export const take = (n) => (xs) =>
  n > 0 && !isEmpty(xs) ? cons(car(xs), take(n - 1)(cdr(xs))) : nil
