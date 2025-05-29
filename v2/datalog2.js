// @ts-nocheck

let debug = 0

// array to linked list
export const list = (xs) => {
  let r = null
  for (let i = xs.length - 1; i >= 0; i--) {
    r = [xs[i], r]
  }

  return r
}

const thread = (x, ...fns) => fns.reduce((r, fn) => fn(r), x)

// lisp reader
const read = (s) => {
  let i = 0

  const ws = () => {
    while (i < s.length && s.charCodeAt(i) <= 32) {
      i++
    }
  }

  const exp = () => {
    ws()

    if (i >= s.length) {
      throw new Error(`Expected expression but found EOF`)
    }

    if (s[i] === "(") {
      i++
      const r = [null, null]
      let c = r
      ws()
      while (i < s.length && s[i] !== ")" && s[i] !== ".") {
        c[1] = [exp(), null]
        c = c[1]
        ws()
      }

      if (s[i] === ".") {
        i++
        ws()
        c[1] = exp()
      }

      if (s[i++] !== ")") {
        throw new Error(`Expected closing ) but found ${s[i - 1] ?? "EOF"}`)
      }

      return r[1]
    }

    if (s[i] === '"') {
      i++
      let r = ""
      while (i < s.length && s[i] !== '"') {
        r += s[i++]
      }

      if (s[i++] !== '"') {
        throw new Error(`Expected closing " but found ${s[i - 1] ?? "EOF"}`)
      }

      return r
    }

    {
      let r = ""
      while (
        i < s.length &&
        s.charCodeAt(i) > 32 &&
        s[i] !== "(" &&
        s[i] !== ")" &&
        s[i] !== "."
      ) {
        r += s[i++]
      }

      return String(Number(r)) === r ? Number(r) : Symbol.for(r)
    }
  }

  return exp()
}

export const r = (strs) => read(strs.join(""))

const type = (a) => (a === null ? "Null" : a?.constructor?.name ?? "Undefined")

// lisp to string
export const prn = (x) => {
  const t = type(x)

  if (t === "Array") {
    const r = []
    let c = x
    while (c !== null) {
      if (type(c) === "Array") {
        r.push(c[0])
        c = c[1]
      } else {
        r.push(Symbol.for("."))
        r.push(c)
        break
      }
    }

    return `(${r.map(prn).join(" ")})`
  }

  if (t === "Null") {
    return "()"
  }

  if (t === "String") {
    return JSON.stringify(x)
  }

  if (t === "Number") {
    return String(x)
  }

  if (t === "Symbol") {
    return Symbol.keyFor(x)
  }

  if (t === "Object") {
    return `{${Object.entries(x)
      .map(([key, val]) => `${key} ${prn(val)}`)
      .join(", ")}}`
  }

  throw new Error(`Cannot prn ${x}`)
}

// value equality
const egal = (a, b) => {
  if (type(a) !== type(b)) {
    return false
  }

  if (type(a) === "Array") {
    if (!egal(a[0], b[0])) {
      return false
    }

    return egal(a[1], b[1])
  }

  if (type(a) === "Object") {
    if (Object.keys(a).length !== Object.keys(b).length) {
      return false
    }

    return Object.entries(a).every(([key, val]) => egal(val, b[key]))
  }

  return a === b
}

// run a test
const test = (script, expected) => {
  const actual = script()
  if (!egal(actual, expected)) {
    console.warn(expected, actual)
    throw new Error(
      `Test \n${script} failed: expected \n${prn(expected)} but found \n${prn(
        actual
      )}`
    )
  }
}

// map over list
const map = (f) => (xs) => !Array.isArray(xs) ? null : [f(xs[0]), map(f)(xs[1])]

// append two lists
const append = (xs, ys) =>
  !Array.isArray(xs) ? ys : [xs[0], append(xs[1], ys)]

test(() => append(r`(1 2 3)`, r`(4 5 6)`), r`(1 2 3 4 5 6)`)

// flatmap over list
const flatmap = (f) => (xs) =>
  !Array.isArray(xs) ? null : append(f(xs[0]), flatmap(f)(xs[1]))

const take = (n) => (xs) =>
  n > 0 && Array.isArray(xs) ? [xs[0], take(n - 1)(xs[1])] : null

test(() => flatmap((x) => list([x, x]))(r`(1 2 3)`), r`(1 1 2 2 3 3)`)

// filter a list
const filter = (p) => (xs) =>
  !Array.isArray(xs)
    ? null
    : p(xs[0])
    ? [xs[0], filter(p)(xs[1])]
    : filter(p)(xs[1])

// test whether value is a var
const isVar = (x) => type(x) === "Symbol" && Symbol.keyFor(x)[0] === "?"
export const n = (x) => Symbol.keyFor(x)

// resolve var to values
const resolve = (pattern, dict) => {
  if (isVar(pattern) && n(pattern) in dict) {
    return resolve(dict[n(pattern)], dict)
  }

  if (type(pattern) === "Array") {
    return [resolve(pattern[0], dict), resolve(pattern[1], dict)]
  }

  return pattern
}

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

// unify two patterns
const unify = (pattern, entry, dict) => {
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

// const gen = () => Symbol.for(`??${Math.random().toString(36).substring(2)}`)
const gen = (() => {
  let i = 1

  return () => Symbol.for(`??G${i++}`)
})()

// query the db
const query = (pattern, db, dicts = [{}, null]) => {
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

const db = r`(
  (creator "clojure" ("Rich" "Hickey"))
  (creator "lisp" ("John" "McCarthy"))
  (creator "c" ("Dennis" "Ritchie"))
  (creator "apl" ("Kenneth" "Iverson"))
  (created "clojure" 2007)
  (created "c" 1972)
  (created "lisp" 1960)
  (influenced "lisp" "clojure")

  (RULE
    (old ??lang ??year)
    (AND (created ??source ??year)
         (influenced ??source ??lang)))

  (RULE
    (merge () ??y ??y))

  (RULE
    (merge ??x () ??x))

  (RULE
    (merge (??a . ??x) (??b . ??y) (??a . ??z))
    (AND (merge ??x (??b . ??y) ??z)
         (< ??a ??b)))

  (RULE
    (merge (??a . ??x) (??b . ??y) (??b . ??z))
    (AND (merge (??a . ??x) ??y ??z)
         (< ??b ??a)))

  (RULE
    (append () ?y ?y))

  (RULE
    (append (??a . ??x) ??y (??a . ??z))
    (append ??x ??y ??z))

  (RULE
    (get (??key ??val . ??rest) ??key ??val))

  (RULE (get (??y ??z . ??rest) ??key ??val)
        (get ??rest ??key ??val))

  (RULE (set ??map ??key ??val (??key ??val . ??map)))

  (RULE (inc 0 1))
  (RULE (inc 1 2))
  (RULE (inc 2 3))
  (RULE (inc 3 4))
  (RULE (inc 4 5))

  (RULE
    (eval ??x ??env ??x)
    (number? ??x))

  (RULE (eval ??x ??env ??val)
        (get ??env ??x ??val))

  (RULE (eval (lambda ??params ??body) ??env (closure ??params ??body ??env)))

  (RULE (eval (??rator ??rand) ??env ??res)
        (AND
          (AND
            (AND (eval ??rator ??env-clos (closure (??param) ??body ??env-clos))
                 (eval ??rand ??env ??arg))
            (set ??env-clos ??param ??arg ??env-new))
          (eval ??body ??env-new ??res))
  )

)`

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
  () => query(r`(eval ((lambda (x) y) 3) (y 4) ?res)`, db),
  [{ "?res": 4 }, null]
)

console.log(prn(query(r`(eval ((lambda (x) y) 3) (y 4) ?res)`, db)))
