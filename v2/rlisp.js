import { egal, test, thread, type } from "./lang.js"
import { prn, r, read } from "./lisp.js"
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
    console.log("CIRCULAR", val)

    return null
  }

  return {
    ...dict,
    [n(varr)]: val,
  }
}

// test whether value is a var
const isVar = (x) => type(x) === "Symbol" && Symbol.keyFor(x)[0] === "?"

const collectVars = (x) => {
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

const n = (x) => Symbol.keyFor(x)

// query the db
export const query = (pattern, db, dicts = [{}, null]) => {
  if (!dicts) {
    return null
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
        : reduce(
            (r, clause) => query(clause, db, r),
            [{}, nil],
          )(resolve(body, matchRule))

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

// tests

// collect vars
test(() => collectVars(r`?x`), new Set(["?x"]))
test(() => collectVars(r`(foo bar)`), new Set())
test(() => collectVars(r`(?a ?b ?a . ?c)`), new Set(["?a", "?b", "?c"]))
test(() => collectVars(r`((?x . ?y) (?z) . ?x)`), new Set(["?x", "?y", "?z"]))

// resolve
test(
  () =>
    resolve(r`(?a ?b ?a . ?c)`, {
      "?a": r`1`,
      "?b": r`2`,
      "?c": r`(3 4)`,
    }),
  r`(1 2 1 3 4)`,
)

test(() => resolve(r`?a`, { "?a": r`?b`, "?b": r`42` }), r`42`)
test(() => resolve(r`?x`, {}), r`?x`)
test(() => resolve(r`42`, { "?x": r`1` }), r`42`)
test(() => resolve(r`(?a ?b)`, { "?a": r`1` }), r`(1 ?b)`)
test(() => resolve(r`?a`, { "?a": r`?b` }), r`?b`)
test(
  () =>
    resolve(r`(?a (?b . ?c) . ?d)`, {
      "?a": r`1`,
      "?b": r`2`,
      "?c": r`(3)`,
      "?d": r`(4 5)`,
    }),
  r`(1 (2 3) 4 5)`,
)
test(() => resolve(r`(())`, {}), r`(())`)

// unify
test(() => unify(r`?x`, r`42`, {}), { "?x": r`42` })
test(() => unify(r`?x`, r`42`, { "?y": r`20` }), { "?y": r`20`, "?x": r`42` })
test(() => unify(r`?x`, r`42`, { "?x": r`20` }), null)
test(() => unify(r`(?x ?y ?x)`, r`(2 3 2)`, {}), { "?x": r`2`, "?y": r`3` })
test(() => unify(r`(?x ?y ?x)`, r`(2 3 3)`, { "?x": r`2`, "?y": r`3` }), null)

test(() => unify(r`(42 ?x)`, r`(??y ??y)`, {}), { "?x": r`42`, "??y": r`42` })
test(() => unify(r`(?x 42)`, r`(??y ??y)`, {}), { "?x": r`??y`, "??y": r`42` })

test(() => unify(r`(?x ?y . ?z)`, r`(1 2 3 4 5)`, {}), {
  "?x": r`1`,
  "?y": r`2`,
  "?z": r`(3 4 5)`,
})

test(() => unify(r`(() ??y ??y)`, r`(() (2 3) ??z)`, {}), {
  "??y": r`(2 3)`,
  "??z": r`(2 3)`,
})

test(() => unify(r`(() ??y ??y)`, r`(() ??z (2 3))`, {}), {
  "??y": r`??z`,
  "??z": r`(2 3)`,
})

test(() => unify(r`((?a . ?x) (?b . ?y))`, r`((1 3) (2 4))`, {}), {
  "?a": r`1`,
  "?x": r`(3)`,
  "?b": r`2`,
  "?y": r`(4)`,
})

test(() => unify(r`()`, r`(1)`, {}), null)

test(() => unify(r`?x`, r`(?x)`, {}), null)
test(() => unify(r`?x`, r`42`, { "?x": r`42` }), { "?x": r`42` })
test(() => unify(r`?x`, r`?y`, { "?y": r`42` }), { "?y": r`42`, "?x": r`42` })
test(() => unify(r`()`, r`()`, {}), {})
test(() => unify(r`foo`, r`42`, {}), null)

test(() => unify(r`?x`, r`?y`, {}), { "?x": r`?y` })

// simple queries
let db = read(`
(
  (creator "clojure" ("Rich" "Hickey"))
  (creator "lisp" ("John" "McCarthy"))
  (creator "c" ("Dennis" "Ritchie"))
  (creator "apl" ("Kenneth" "Iverson"))
  (created "clojure" 2007)
  (created "c" 1972)
  (created "lisp" 1960)
  (influenced "lisp" "clojure")

  (
    (old ?lang ?year)
    (created ?source ?year)
    (influenced ?source ?lang))
)
  `)

// query
test(
  () => take(100)(query(r`(creator "clojure" ?person)`, db)),
  [
    {
      "?person": r`("Rich" "Hickey")`,
    },
    null,
  ],
)

test(
  () => take(100)(query(r`(created "clojure" ?year)`, db)),
  [
    {
      "?year": r`2007`,
    },
    null,
  ],
)

test(
  () =>
    take(100)(
      query(
        r`(AND (creator ?lang ("Rich" "Hickey")) (created ?lang ?year))`,
        db,
      ),
    ),
  [
    {
      "?lang": r`"clojure"`,
      "?year": r`2007`,
    },
    null,
  ],
)

test(() => take(100)(query(r`(< 2 3)`, db)), [{}, null])

test(
  () => take(100)(query(r`(old ?lang ?year)`, db)),
  [{ "?lang": r`"clojure"`, "?year": r`1960` }, null],
)

// merge
db = read(`
(
  (
    (merge () ?y ?y))

  (
    (merge ?x () ?x))

  (
    (merge (?a . ?x) (?b . ?y) (?a . ?z))
    (merge ?x (?b . ?y) ?z)
    (< ?a ?b))

  (
    (merge (?a . ?x) (?b . ?y) (?b . ?z))
    (merge (?a . ?x) ?y ?z)
    (< ?b ?a))
)
`)

test(
  () => take(100)(query(r`(merge () (1 2) ?r)`, db)),
  [{ "?r": r`(1 2)` }, null],
)
test(
  () => take(100)(query(r`(merge () ?r (1 2))`, db)),
  [{ "?r": r`(1 2)` }, null],
)

test(
  () => take(100)(query(r`(merge ?r () (1 2))`, db)),
  [{ "?r": r`(1 2)` }, null],
)
test(
  () => take(100)(query(r`(merge (1 2) () ?r)`, db)),
  [{ "?r": r`(1 2)` }, null],
)

test(
  () => take(100)(query(r`(merge (1) (2 3) ?r)`, db)),
  [{ "?r": r`(1 2 3)` }, null],
)
test(
  () => take(100)(query(r`(merge (1 2) (3 4) ?r)`, db)),
  [{ "?r": r`(1 2 3 4)` }, null],
)

test(
  () => take(100)(query(r`(merge (1 3) (2) ?r)`, db)),
  [{ "?r": r`(1 2 3)` }, null],
)
test(
  () => take(100)(query(r`(merge (1 3) (2 4) ?r)`, db)),
  [{ "?r": r`(1 2 3 4)` }, null],
)

test(
  () => take(100)(query(r`(merge (1 3) ?r (1 3))`, db)),
  [{ "?r": r`()` }, null],
)
test(
  () => take(100)(query(r`(merge (1 3) ?r (1 2 3 4))`, db)),
  [{ "?r": r`(2 4)` }, null],
)

// dict

db = r`
(
  (
    (get (?key ?val . ?rest) ?key ?val))

  (
    (get (?k ?v . ?rest) ?key ?val)
    (get ?rest ?key ?val))
)`

test(
  () => take(100)(query(r`(get (a 2 b 3 a 5) b ?r)`, db)),
  [{ "?r": 3 }, null],
)
test(() => take(100)(query(r`(get (a 2 b 3 a 5) d ?r)`, db)), null)
test(
  () => take(100)(query(r`(get (a 2 b 3 a 5) a ?r)`, db)),
  [{ "?r": 2 }, [{ "?r": 5 }, null]],
)
test(
  () => take(100)(query(r`(get (a 2 b 3 a 5) ?key 3)`, db)),
  [{ "?key": r`b` }, null],
)

const stripGen = (x) => {
  if (isVar(x)) {
    return Symbol.for(/^(\?[a-zA-Z]+)[0-9]*$/.exec(n(x))[1])
  }

  if (type(x) === "Array") {
    return cons(stripGen(car(x)), stripGen(cdr(x)))
  }

  if (type(x) === "Object") {
    return Object.fromEntries(
      Object.entries(x).map(([k, v]) => [k, stripGen(v)]),
    )
  }

  return x
}

test(
  () => stripGen(take(2)(query(r`(get ?env foo 10)`, db))),
  [
    { "?env": r`(foo 10 . ?rest)` },
    [{ "?env": r`(?k ?v foo 10 . ?rest)` }, null],
  ],
)

// append

db = read(`(
  (
    (append () ?y ?y))

  (
    (append (?a . ?x) ?y (?a . ?z))
    (append ?x ?y ?z))
 )`)

test(
  () => take(100)(query(r`(append () (1 2) ?r)`, db)),
  [{ "?r": r`(1 2)` }, null],
)
test(
  () => take(100)(query(r`(append (1 2) () ?r)`, db)),
  [{ "?r": r`(1 2)` }, null],
)
test(
  () => take(100)(query(r`(append (1 2) (3 4) ?r)`, db)),
  [{ "?r": r`(1 2 3 4)` }, null],
)
test(
  () => take(100)(query(r`(append (1 2) ?r (1 2 3 4))`, db)),
  [{ "?r": r`(3 4)` }, null],
)
test(
  () => take(100)(query(r`(append ?r (3 4) (1 2 3 4))`, db)),
  [{ "?r": r`(1 2)` }, null],
)

test(
  () => take(100)(query(r`(append ?x ?y (1 2 3))`, db)),
  [
    { "?x": null, "?y": r`(1 2 3)` },
    [
      { "?x": r`(1)`, "?y": r`(2 3)` },
      [
        { "?x": r`(1 2)`, "?y": r`(3)` },
        [{ "?x": r`(1 2 3)`, "?y": r`()` }, null],
      ],
    ],
  ],
)

// eval
db = r`(
  (
    (get (?key ?val . ?rest) ?key ?val))

  (
    (get (?y ?z . ?rest) ?key ?val)
    (get ?rest ?key ?val))

  ((set ?map ?key ?val (?key ?val . ?map)))

  (
    (eval ?x ?env ?x)
    (number? ?x))

  (
    (eval ?x ?env ?val)
    (symbol? ?x)
    (get ?env ?x ?val))

  ;;((eval (lambda (?param) ?body) ?env (closure (?param) ?body ?env)))

  ;;((eval (?rator ?rand) ?env ?res)
  ;; (eval ?rator ?env (closure (?param) ?body ?env2))
  ;; (eval ?rand ?env ?arg)
  ;; (set ?env2 ?param ?arg ?env-new)
  ;; (eval ?body ?env-new ?res))
)`

test(() => take(100)(query(r`(eval 42 () ?r)`, db)), [{ "?r": 42 }, null])
test(() => take(100)(query(r`(eval ?x () 42)`, db)), [{ "?x": 42 }, null])

test(
  () => take(100)(query(r`(eval foo (foo 10) ?r)`, db)),
  [{ "?r": 10 }, null],
)
test(() => take(1)(query(r`(eval foo () ?r)`, db)), null)
// test(() => take(5)(query(r`(eval foo ?r 10)`, db)), null)
// test(() => query(r`(eval ?x (foo 10) 10)`, db), null, [{ "?x": 10 }, null])

// test(() => query(r`(eval foo (x 10 foo 20 y 30) ?r)`, db), [{ "?r": 20 }, null])
// test(() => query(r`(eval bar (x 10 foo 20 y 30) ?r)`, db), null)
// test(
//   () => query(r`(eval ((lambda (x) x) 3) () ?res)`, db),
//   [{ "?res": 3 }, null],
// )
// test(
//   () => query(r`(eval ((lambda (x) y) 3) (y 4) ?res)`, db),
//   [{ "?res": 4 }, null]
// )
