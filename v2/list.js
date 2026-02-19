import { test } from "./lang.js"

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
export const filter = (p) => (xs) =>
  isEmpty(xs)
    ? nil
    : p(car(xs))
      ? cons(car(xs), () => filter(p)(cdr(xs)))
      : filter(p)(cdr(xs))

// flatmap over list
export const flatmap = (f) => (xs) => cat(map(f)(xs))

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

export const reduce = (rf, init) => (xs) =>
  isEmpty(xs) ? init : reduce(rf, rf(init, car(xs)))(cdr(xs))

export const take = (n) => (xs) =>
  n > 0 && !isEmpty(xs) ? cons(car(xs), take(n - 1)(cdr(xs))) : nil

const ones = cons(1, () => ones)

// tests
test(() => append(list(1, 2, 3), list(4, 5, 6)), list(1, 2, 3, 4, 5, 6))

test(() => flatmap((x) => list([x, x]))(list(1, 2, 3)), list(1, 1, 2, 2, 3, 3))

test(() => take(100)(map((x) => x * 2)(list([1, 2, 3]))), list([2, 4, 6]))
test(
  () => take(100)(filter((x) => x % 2 === 0)(list([1, 2, 3, 4]))),
  list([2, 4]),
)
test(() => reduce((acc, x) => acc + x, 0)(list([1, 2, 3, 4])), 10)

test(() => take(2)(list([1, 2, 3, 4])), list([1, 2]))
test(() => take(0)(list([1, 2, 3, 4])), nil)
test(() => take(10)(list([1, 2, 3])), list([1, 2, 3]))

test(() => take(5)(flatmap(() => ones)(ones)), list([1, 1, 1, 1, 1]))
