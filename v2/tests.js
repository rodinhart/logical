import { test } from "./lang.js"
import { r, read } from "./lisp.js"
import { append, flatmap, list, take } from "./list.js"
import { query, resolve, unify } from "./rlisp.js"

const db = read(Deno.readTextFileSync("./db.clj"))

// interpreter
test(() => query(r`(eval 42 () ?r)`, db), [{ "?r": 42 }, null])
test(() => take(1)(query(r`(eval ?x () 10)`, db)), [{ "?x": 10 }, null])
test(() => query(r`(eval foo () ?r)`, db), null)

test(() => query(r`(eval foo (x 10 foo 20 y 30) ?r)`, db), [{ "?r": 20 }, null])
test(() => query(r`(eval bar (x 10 foo 20 y 30) ?r)`, db), null)
test(
  () => query(r`(eval ((lambda (x) x) 3) () ?res)`, db),
  [{ "?res": 3 }, null],
)
// test(
//   () => query(r`(eval ((lambda (x) y) 3) (y 4) ?res)`, db),
//   [{ "?res": 4 }, null]
// )
