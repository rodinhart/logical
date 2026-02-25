import { test } from "./lang.js"
import { prn, read } from "./lisp.js"
import { cons, nil } from "./list.js"

test(() => read("42"), 42)

test(() => read("x"), Symbol.for("x"))
test(() => read('"x"'), "x")
test(() => read("(a 1)"), cons(Symbol.for("a"), cons(1, nil)))
test(
  () => read("(a b . c)"),
  cons(Symbol.for("a"), cons(Symbol.for("b"), Symbol.for("c"))),
)
test(() => read("; ignored\n42"), 42)

test(() => prn(42), "42")
test(() => prn("x"), '"x"')
test(() => prn(Symbol.for("x")), "x")
test(() => prn(cons(Symbol.for("a"), cons(1, nil))), "(a 1)")
test(() => prn(cons(Symbol.for("a"), Symbol.for("b"))), "(a . b)")
