import { test } from "./lang.js"
import { r, read } from "./lisp.js"
import { append, flatmap, list, take } from "./list.js"
import { query, resolve, unify } from "./rlisp.js"

// list
test(() => append(r`(1 2 3)`, r`(4 5 6)`), r`(1 2 3 4 5 6)`)

test(() => flatmap((x) => list([x, x]))(r`(1 2 3)`), r`(1 1 2 2 3 3)`)

// resolve
test(
  () =>
    resolve(r`(?a ?b . ?c)`, {
      "?a": r`1`,
      "?b": r`2`,
      "?c": r`(3 4)`,
    }),
  r`(1 2 3 4)`
)

test(() => resolve(r`?a`, { "?a": r`?b`, "?b": r`42` }), r`42`)

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

const db = read(Deno.readTextFileSync("./db.clj"))

// query
test(
  () => query(r`(creator "clojure" ?person)`, db),
  [
    {
      "?person": r`("Rich" "Hickey")`,
    },
    null,
  ]
)

test(
  () => query(r`(created "clojure" ?year)`, db),
  [
    {
      "?year": r`2007`,
    },
    null,
  ]
)

test(
  () =>
    query(r`(AND (creator ?lang ("Rich" "Hickey")) (created ?lang ?year))`, db),
  [
    {
      "?lang": r`"clojure"`,
      "?year": r`2007`,
    },
    null,
  ]
)

test(() => query(r`(< 2 3)`, db), [{}, null])

test(
  () => query(r`(old ?lang ?year)`, db),
  [{ "?lang": r`"clojure"`, "?year": r`1960` }, null]
)

test(() => query(r`(merge () (1 2) ?r)`, db), [{ "?r": r`(1 2)` }, null])
test(() => query(r`(merge () ?r (1 2))`, db), [{ "?r": r`(1 2)` }, null])

test(() => query(r`(merge ?r () (1 2))`, db), [{ "?r": r`(1 2)` }, null])
test(() => query(r`(merge (1 2) () ?r)`, db), [{ "?r": r`(1 2)` }, null])

test(() => query(r`(merge (1) (2 3) ?r)`, db), [{ "?r": r`(1 2 3)` }, null])
test(() => query(r`(merge (1 2) (3 4) ?r)`, db), [{ "?r": r`(1 2 3 4)` }, null])

test(() => query(r`(merge (1 3) (2) ?r)`, db), [{ "?r": r`(1 2 3)` }, null])
test(() => query(r`(merge (1 3) (2 4) ?r)`, db), [{ "?r": r`(1 2 3 4)` }, null])

test(() => query(r`(merge (1 3) ?r (1 3))`, db), [{ "?r": r`()` }, null])
test(() => query(r`(merge (1 3) ?r (1 2 3 4))`, db), [{ "?r": r`(2 4)` }, null])

// interpreter
test(() => query(r`(eval 42 () ?r)`, db), [{ "?r": 42 }, null])
test(() => take(1)(query(r`(eval ?x () 10)`, db)), [{ "?x": 10 }, null])
test(() => query(r`(eval foo () ?r)`, db), null)

test(() => query(r`(get (a 2 b 3 a 5) b ?r)`, db), [{ "?r": 3 }, null])
test(() => query(r`(get (a 2 b 3 a 5) d ?r)`, db), null)

test(
  () => query(r`(set (b 3 c 5) a 2 ?r)`, db),
  [{ "?r": r`(a 2 b 3 c 5)` }, null]
)

test(() => query(r`(eval foo (x 10 foo 20 y 30) ?r)`, db), [{ "?r": 20 }, null])
test(() => query(r`(eval bar (x 10 foo 20 y 30) ?r)`, db), null)
test(
  () => query(r`(eval ((lambda (x) x) 3) () ?res)`, db),
  [{ "?res": 3 }, null]
)
// test(
//   () => query(r`(eval ((lambda (x) y) 3) (y 4) ?res)`, db),
//   [{ "?res": 4 }, null]
// )
