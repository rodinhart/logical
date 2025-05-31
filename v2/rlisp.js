import { egal, thread, type } from "./lang.js"
import { filter, flatmap, map } from "./list.js"

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

// query the db
export const query = (pattern, db, dicts = [{}, null]) => {
  if (!dicts) {
    return null
  }

  if (pattern[0] === Symbol.for("AND")) {
    const t = query(pattern[1][0], db, dicts)

    return query(pattern[1][1][0], db, t)
  }

  const hostOps = {
    [Symbol.for("<")]: (t) =>
      Number.isFinite(t[1][0]) &&
      Number.isFinite(t[1][1][0]) &&
      t[1][0] < t[1][1][0],

    [Symbol.for("number?")]: (t) => Number.isFinite(t[1][0]),

    [Symbol.for("symbol?")]: (t) => typeof t[1][0] === "symbol",
  }

  if (hostOps[pattern[0]]) {
    return thread(
      dicts,

      map((dict) => {
        const t = resolve(pattern, dict)

        return hostOps[pattern[0]](t) ? dict : null
      }),

      filter((x) => x !== null)
    )
  }

  return thread(
    db,

    flatmap((entry) => {
      if (entry[0] === Symbol.for("RULE")) {
        const genned = resolve(entry, {
          "??a": gen(),
          "??x": gen(),
          "??b": gen(),
          "??y": gen(),
          "??z": gen(),
        })

        const head = genned[1][0]
        const body = genned[1][1]?.[0]

        const matchRule = unify(head, pattern, {})
        if (!matchRule) {
          return null
        }

        const subs = !body
          ? [matchRule, null]
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
    const r = unify(pattern[0], entry[0], dict)

    return r !== null ? unify(pattern[1], entry[1], r) : null
  }

  return null
}
