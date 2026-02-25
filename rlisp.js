import { egal, thread, type } from "./lang.js"
import { prn } from "./lisp.js"
import {
  car,
  cdr,
  cons,
  filter,
  flatmap,
  isEmpty,
  map,
  nil,
  reduce,
  take,
} from "./list.js"

let debug = -1

// extend a dict
const extend = (varr, val, dict) => {
  if (n(varr) in dict) {
    return unify(dict[n(varr)], val, dict)
  }

  if (isVar(val) && n(val) in dict) {
    return unify(varr, dict[n(val)], dict)
  }

  // check depends
  const depends = (exp) => {
    if (exp === varr) {
      return true
    }

    if (isVar(exp)) {
      if (n(exp) in dict) {
        return depends(dict[n(exp)])
      } else {
        return false
      }
    }

    if (type(exp) === "Array") {
      return depends(car(exp)) || depends(cdr(exp))
    }

    return false
  }

  if (depends(val)) {
    // console.log("CIRCULAR", val)

    return null
  }

  return {
    ...dict,
    [n(varr)]: val,
  }
}

// test whether value is a var
export const isVar = (x) => type(x) === "Symbol" && Symbol.keyFor(x)[0] === "?"

export const collectVars = (x) => {
  if (isVar(x)) {
    return new Set([Symbol.keyFor(x)])
  }

  if (type(x) === "Array") {
    return new Set([...collectVars(car(x)), ...collectVars(cdr(x))])
  }

  return new Set()
}

const gen = (() => {
  let i = 1

  return (prefix = "?G") => Symbol.for(`${prefix}${i++}`)
})()

export const n = (x) => Symbol.keyFor(x)

// query the db
export const query = (pattern, db, dicts = [{}, null], depth = 1) => {
  if (!dicts) {
    return null
  }

  if (debug > 0) {
    console.log(prn(pattern))
    debug--
  } else if (debug === 0) {
    throw new Error("Prevent")
  }

  if (pattern[0] === Symbol.for("AND")) {
    const t = query(car(cdr(pattern)), db, dicts, depth)

    return query(car(cdr(cdr(pattern))), db, t, depth)
  }

  const hostOps = {
    [Symbol.for("<")]: (t) =>
      Number.isFinite(car(cdr(t))) &&
      Number.isFinite(car(cdr(cdr(t)))) &&
      car(cdr(t)) < car(cdr(cdr(t))),

    [Symbol.for("number?")]: (t) => Number.isFinite(car(cdr(t))),

    [Symbol.for("symbol?")]: (t) =>
      typeof car(cdr(t)) === "symbol" && !isVar(car(cdr(t))),
  }

  if (hostOps[car(pattern)]) {
    return thread(
      dicts,

      map((dict) => {
        const t = resolve(pattern, dict)

        return hostOps[car(pattern)](t) ? dict : null
      }),

      filter((x) => x !== null),
    )
  }

  return thread(
    db,

    flatmap((entry) => {
      const fresh = resolve(
        entry,
        Object.fromEntries(
          [...collectVars(car(entry))].map((varr) => [varr, gen(varr)]),
        ),
      )
      const head = Array.isArray(car(fresh)) ? car(fresh) : fresh
      const body = Array.isArray(car(fresh)) ? cdr(fresh) : null

      const matchRule = unify(head, pattern, {})
      if (!matchRule) {
        return null
      }

      const subs = isEmpty(body)
        ? cons(matchRule, nil)
        : depth < 10
          ? reduce(
              (r, clause) => query(clause, db, r, depth + 1),
              [{}, nil],
            )(resolve(body, matchRule))
          : nil

      return flatmap((sub) => {
        const headP = resolve(head, matchRule)
        const resolved = resolve(headP, sub)

        return map((dict) => unify(pattern, resolved, dict))(dicts)
      })(subs)
    }),

    filter((x) => x !== null),
  )
}

// resolve var to values
export const resolve = (pattern, dict) => {
  if (isVar(pattern) && n(pattern) in dict) {
    return resolve(dict[n(pattern)], dict)
  }

  if (type(pattern) === "Array") {
    return [resolve(car(pattern), dict), resolve(cdr(pattern), dict)]
  }

  return pattern
}

// unify two patterns
export const unify = (pattern, entry, dict) => {
  if (egal(pattern, entry)) {
    return dict
  }

  if (isVar(pattern)) {
    return extend(pattern, entry, dict)
  }

  if (isVar(entry)) {
    return extend(entry, pattern, dict)
  }

  if (type(pattern) === type(entry) && type(pattern) === "Array") {
    const r = unify(car(pattern), car(entry), dict)

    return r !== null ? unify(cdr(pattern), cdr(entry), r) : null
  }

  return null
}

export const run = (n, pattern, db) => take(n)(query(pattern, db))
