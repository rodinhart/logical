// append two lists
export const append = (xs, ys) =>
  isEmpty(xs) ? ys : cons(car(xs), () => append(cdr(xs), ys))

export const car = (xs) => xs[0]

export const cdr = (xs) => {
  if (typeof xs[1] === "function") {
    xs[1] = xs[1]()
  }

  return xs[1]
}

export const cons = (x, y) => [x, y]

// filter a list
export const filter = (p, xs) =>
  isEmpty(xs)
    ? nil
    : p(car(xs))
      ? cons(car(xs), () => filter(p, cdr(xs)))
      : filter(p, cdr(xs))

// flatmap over list
export const flatmap = (f, xs) => cat(map(f, xs))

const cat = (xs, ys = nil, zs = nil) => {
  if (!isEmpty(ys)) {
    return cons(car(ys), () => cat(xs, cdr(ys), zs))
  }

  if (!isEmpty(zs)) {
    return cat(cdr(zs))
  }

  if (!isEmpty(xs)) {
    return cat(xs, car(xs), xs)
  }

  return nil
}

export const isEmpty = (xs) => !Array.isArray(xs)

// array to linked list
export const list = (xs) => {
  let r = nil
  for (let i = xs.length - 1; i >= 0; i--) {
    r = cons(xs[i], r)
  }

  return r
}

// map over list
export const map = (f, xs) =>
  isEmpty(xs) ? nil : cons(f(car(xs)), () => map(f, cdr(xs)))

export const nil = null

export const reduce = (rf, init, xs) =>
  isEmpty(xs) ? init : reduce(rf, rf(init, car(xs)), cdr(xs))

export const take = (n, xs) =>
  n > 0 && !isEmpty(xs) ? cons(car(xs), take(n - 1, cdr(xs))) : nil

export const ones = cons(1, () => ones)

export const length = (xs) => (isEmpty(xs) ? 0 : 1 + length(cdr(xs)))
