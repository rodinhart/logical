import { test, type } from "./lang.js"
import { r, read } from "./lisp.js"
import { car, cdr, cons, take } from "./list.js"
import { collectVars, isVar, n, query, resolve, run, unify } from "./rlisp.js"

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

test(() => run(100, r`(get (a 2 b 3 a 5) b ?r)`, db), [{ "?r": 3 }, null])
test(() => run(100, r`(get (a 2 b 3 a 5) d ?r)`, db), null)
test(
  () => run(100, r`(get (a 2 b 3 a 5) a ?r)`, db),
  [{ "?r": 2 }, [{ "?r": 5 }, null]],
)
test(
  () => run(100, r`(get (a 2 b 3 a 5) ?key 3)`, db),
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
  () => stripGen(run(2, r`(get ?env foo 10)`, db)),
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
    (get (?k ?v . ?rest) ?key ?val)
    (get ?rest ?key ?val))

  (
    (eval ?x ?env ?x)
    (number? ?x))

  (
    (eval ?x ?env ?val)
    (symbol? ?x)
    (get ?env ?x ?val))

  ((eval (lambda (?param) ?body) ?env (closure (?param) ?body ?env)))

  ((eval (?rator ?rand) ?env ?res)
   (eval ?rator ?env (closure (?param) ?body ?env2))
   (eval ?rand ?env ?arg)
   (get ?env-new ?param ?arg)
   (eval ?body ?env-new ?res)
  )
)`

test(() => take(100)(query(r`(eval 42 () ?r)`, db)), [{ "?r": 42 }, null])
// debug = 30
test(
  () => stripGen(take(2)(query(r`(eval ?x () 42)`, db))),
  [
    { "?x": 42 },
    [{ "?x": r`((lambda (?param) 42) (lambda (?param) ?body))` }, null],
  ],
)

// test(
//   () => take(100)(query(r`(eval foo (foo 10) ?r)`, db)),
//   [{ "?r": 10 }, null],
// )
// test(() => take(1)(query(r`(eval foo () ?r)`, db)), null)
// test(
//   () => stripGen(take(1)(query(r`(eval foo ?r 10)`, db))),
//   [{ "?r": r`(foo 10 . ?rest)` }, null],
// )
// test(
//   () => take(2)(query(r`(eval ?x (foo 10) 10)`, db)),
//   [{ "?x": 10 }, [{ "?x": r`foo` }, null]],
// ) // could be take 3

// test(
//   () => take(1)(query(r`(eval ((lambda (x) x) 3) () ?r)`, db)),
//   [{ "?r": 3 }, null],
// )

// test(
//   () => query(r`(eval ((lambda (x) y) 3) (y 4) ?res)`, db),
//   [{ "?res": 4 }, null]
// )
