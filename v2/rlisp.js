import { egal, thread, type } from "./lang.js"
import { prn } from "./lisp.js"
import { car, cdr, cons, filter, flatmap, isEmpty, map, nil } from "./list.js"

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
      return depends(exp[0]) || depends(exp[1])
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
const isVar = (x) => type(x) === "Symbol" && Symbol.keyFor(x)[0] === "?"

const gen = (() => {
  let i = 1

  return () => Symbol.for(`??G${i++}`)
})()

const n = (x) => Symbol.keyFor(x)

let debug = 30
const counts = new Map()

// query the db
export const query = (pattern, db, dicts = [{}, null]) => {
  if (!dicts) {
    return null
  }

  if (debug > 0) {
    debug--
    const hash = prn(pattern)
    if (!hash.includes("AND")) {
      if (!counts.has(hash)) {
        counts.set(hash, 1)
      } else {
        counts.set(hash, counts.get(hash) + 1)
      }

      console.log(prn(cons(pattern, dicts)))
    }
  } else if (debug !== -1) {
    // console.log(counts)
    throw new Error(`LOOP!`)
  }

  if (pattern[0] === Symbol.for("AND")) {
    const t = query(car(cdr(pattern)), db, dicts)

    return query(car(cdr(cdr(pattern))), db, t)
  }

  const hostOps = {
    [Symbol.for("<")]: (t) =>
      Number.isFinite(car(cdr(t))) &&
      Number.isFinite(car(cdr(cdr(t)))) &&
      car(cdr(t)) < car(cdr(cdr(t))),

    [Symbol.for("number?")]: (t) => Number.isFinite(car(cdr(t))),

    [Symbol.for("symbol?")]: (t) => typeof car(cdr(t)) === "symbol",
  }

  if (hostOps[car(pattern)]) {
    return thread(
      dicts,

      map((dict) => {
        const t = resolve(pattern, dict)

        return hostOps[car(pattern)](t) ? dict : null
      }),

      filter((x) => x !== null)
    )
  }

  return thread(
    db,

    flatmap((entry) => {
      if (car(entry) === Symbol.for("RULE")) {
        const genned = resolve(entry, {
          "??a": gen(),
          "??x": gen(),
          "??b": gen(),
          "??y": gen(),
          "??z": gen(),
          "??env": gen(),
          "??val": gen(),
          "??params": gen(),
          "??body": gen(),
          "??rator": gen(),
          "??rand": gen(),
          "??env2": gen(),
          "??new-env": gen(),
          "??res": gen(),
          "??key": gen(),
          "??map": gen(),
          "??rest": gen(),
        })

        const head = car(cdr(genned))
        const body = isEmpty(cdr(cdr(genned))) ? nil : car(cdr(cdr(genned)))

        const matchRule = unify(head, pattern, {})
        if (!matchRule) {
          return null
        }

        const subs = !body
          ? cons(matchRule, nil)
          : query(resolve(body, matchRule), db)

        return thread(
          subs,

          flatmap((sub) => {
            const headP = resolve(head, matchRule)
            const resolved = resolve(headP, sub)

            return map((dict) => unify(pattern, resolved, dict))(dicts)
          })
        )
      }

      return map((dict) => unify(pattern, entry, dict))(dicts)
    }),

    filter((x) => x !== null)
  )
}

// resolve var to values
export const resolve = (pattern, dict) => {
  if (isVar(pattern) && n(pattern) in dict) {
    return resolve(dict[n(pattern)], dict)
  }

  if (type(pattern) === "Array") {
    return [resolve(pattern[0], dict), resolve(pattern[1], dict)]
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
