// @ts-nocheck

/*
    (rule (merge-to-form () ?y ?y))

    (rule (merge-to-form ?y () ?y))

    (rule
      (merge-to-form (?a . ?x) (?b . ?y) (?b . ?z))
      (and (merge-to-form (?a . ?x) ?y ?z)
           (lisp-value > ?a ?b)))

    (rule
      (merge-to-form (?a . ?x) (?b . ?y) (?a . ?z))
      (and (merge-to-form ?x (?b . ?y) ?z)
           (lisp-value > ?b ?a)))
*/

const db = [
  ["creator", "clojure", ["Rich", "Hickey"]],
  ["creator", "lisp", ["John", "McCarthy"]],
  ["creator", "c", ["Dennis", "Ritchie"]],
  ["creator", "apl", ["Kenneth", "Iverson"]],
  ["created", "clojure", 2007],
  ["created", "c", 1972],
  ["created", "lisp", 1960],
  ["influenced", "lisp", "clojure"],
]

const rules = [
  [
    "RULE",
    (_) => [
      ["old", "??lang", "??year"],
      [
        "AND",
        ["created", "??source", "??year"],
        ["influenced", "??source", "??lang"],
      ],
    ],
  ],

  ["RULE", (_) => [["merge", [], `??y${_}`, `??y${_}`]]],

  ["RULE", (_) => [["merge", `??y${_}`, [], `??y${_}`]]],

  [
    "RULE",
    (_) => [
      [
        "merge",
        [`??a${_}`, `??...x${_}`],
        [`??b${_}`, `??...y${_}`],
        [`??a${_}`, `??...z${_}`],
      ],
      [
        "AND",
        ["merge", `??x${_}`, [`??b${_}`, `??...y${_}`], `??z${_}`],
        ["<", `??a${_}`, `??b${_}`],
      ],
    ],
  ],

  [
    "RULE",
    (_) => [
      [
        "merge",
        [`??a${_}`, `??...x${_}`],
        [`??b${_}`, `??...y${_}`],
        [`??b${_}`, `??...z${_}`],
      ],
      [
        "AND",
        ["merge", [`??a${_}`, `??...x${_}`], `??y${_}`, `??z${_}`],
        ["<", `??b${_}`, `??a${_}`],
      ],
    ],
  ],
]

const alldata = [...db, ...rules]

const type = (a) => a?.constructor?.name

const mapValues = (f, obj) =>
  Object.fromEntries(Object.entries(obj).map(([key, val]) => [key, f(val)]))

const egal = (a, b) => {
  if (type(a) !== type(b)) {
    return false
  }

  if (type(a) === "Array") {
    if (a.length !== b.length) {
      return false
    }

    return a.every((x, i) => egal(x, b[i]))
  }

  if (type(a) === "Object") {
    if (Object.keys(a).length !== Object.keys(b).length) {
      return false
    }

    return Object.entries(a).every(([key, val]) => egal(val, b[key]))
  }

  return a === b
}

const thread = (x, ...fns) => fns.reduce((r, fn) => fn(r), x)

const tap = (m) => (x) => console.log(m, x) || x

const test = (actual, expected) => {
  if (!egal(actual, expected)) {
    console.warn(expected, actual)
    throw new Error(
      `Expected ${JSON.stringify(expected)} but found ${JSON.stringify(actual)}`
    )
  }
}

const resolve = (pattern, dict) => {
  if (pattern[0] === "?") {
    if (!pattern.includes("...")) {
      return dict[pattern] ?? pattern
    } else {
      return dict[pattern.replace("...", "")] ?? pattern
    }
  }

  if (type(pattern) === "Array") {
    return pattern.flatMap((part) => {
      const t = resolve(part, dict)

      return part[0] === "?" && part.includes("...") ? t : [t]
    })
  }

  return pattern
}

test(resolve(["?a", "?...b"], { "?a": 1, "?b": [2, 3] }), [1, 2, 3])

const unify = (pattern, entry, dict, stack = []) => {
  stack.push({ pattern, entry, dict })
  if (stack.length > 20) {
    console.error(stack)
    throw new Error("Unify stack overflow")
  }

  if (egal(pattern, entry)) {
    return dict
  }

  const ifPoss = (pat, ent) => {
    if (pattern in dict) {
      return unify(dict[pattern], ent, dict)
    }

    if (ent[0] === "?") {
      if (ent in dict) {
        return unify(pat, dict[ent], dict)
      } else {
        return {
          ...dict,
          [pat]: ent,
        }
      }
    }

    const depends = (exp) => {
      if (exp === pat) {
        return true
      }

      if (exp[0] === "?") {
        if (exp in dict) {
          return depends(dict[exp])
        } else {
          return false
        }
      }

      if (type(exp) === "Array") {
        return exp.some((x) => depends(x))
      }

      return false
    }

    if (depends(ent)) {
      console.log("CIRCULAR", ent)
      return null
    }

    return {
      ...dict,
      [pat]: ent,
    }
  }

  if (pattern[0] === "?") {
    return ifPoss(pattern, entry)
  }

  if (entry[0] === "?") {
    return ifPoss(entry, pattern)
  }

  if (type(pattern) === type(entry) && type(pattern) === "Array") {
    let r = dict
    let i = 0
    while (r && i < pattern.length) {
      const p = pattern[i]
      if (typeof p === "string" && p.includes("...")) {
        // ?...x = .
        const e = entry.slice(i)
        i = Math.max(pattern.length, entry.length)
        r = unify(p.replace("...", ""), e, r, stack)
      } else if (i < entry.length) {
        // . = .
        const e = entry[i]
        r = unify(p, e, r, stack)
        i++
      } else {
        r = null
      }
    }

    return i < entry.length
      ? null
      : !r
      ? r
      : mapValues((val) => resolve(val, r), r)
  }

  return null
}

test(unify("?x", 42, {}), { "?x": 42 })
test(unify("?x", 42, { "?y": 20 }), { "?y": 20, "?x": 42 })
test(unify("?x", 42, { "?x": 20 }), null)
test(unify(["?x", "?y", "?x"], [2, 3, 2], {}), { "?x": 2, "?y": 3 })
test(unify(["?x", "?y", "?x"], [2, 3, 3], {}), null)

test(unify([42, "?x"], ["??y", "??y"], {}), { "?x": 42, "??y": 42 })
test(unify(["?x", 42], ["??y", "??y"], {}), { "?x": 42, "??y": 42 })

test(unify(["?x", "?y", "?...z"], [1, 2, 3, 4, 5], {}), {
  "?x": 1,
  "?y": 2,
  "?z": [3, 4, 5],
})

test(unify(["merge", [], "??y", "??y"], ["merge", [], [2, 3], "??z"], {}), {
  "??y": [2, 3],
  "??z": [2, 3],
})

test(unify(["merge", [], "??y", "??y"], ["merge", [], "??z", [2, 3]], {}), {
  "??y": [2, 3],
  "??z": [2, 3],
})

test(
  unify(
    ["merge", ["?a", "?...x"], ["?b", "?...y"]],
    ["merge", [1, 3], [2, 4]],
    {}
  ),
  { "?a": 1, "?x": [3], "?b": 2, "?y": [4] }
)

test(unify([], [1], {}), null)

let GEN = 1
const query = (pattern, db, dicts = [{}]) => {
  if (dicts.length === 0) {
    return []
  }

  if (pattern[0] === "AND") {
    return query(pattern[2], db, query(pattern[1], db, dicts))
  }

  if (pattern[0] === "OR") {
    return [...query(pattern[1], db, dicts), ...query(pattern[2], db, dicts)]
  }

  if (pattern[0] === "<") {
    return dicts
      .map((dict) => {
        const t = resolve(pattern, dict)

        return typeof t[1] === "number" &&
          typeof t[2] === "number" &&
          t[1] < t[2]
          ? dict
          : null
      })
      .filter((x) => x !== null)
  }

  return db
    .flatMap((entry) => {
      if (entry[0] === "RULE") {
        const [head, body] = entry[1](GEN++)

        const matchRule = unify(head, pattern, {})
        if (!matchRule) {
          return []
        }

        const subs = !body
          ? [matchRule]
          : query(resolve(body, matchRule), db, [{}])

        return subs.flatMap((sub) => {
          const headP = resolve(head, matchRule)
          const resolved = resolve(headP, sub)

          return dicts.map((dict) => unify(pattern, resolved, dict))
        })
      }

      return dicts.map((dict) => unify(pattern, entry, dict))
    })
    .filter((x) => x !== null)
}

test(query(["old", "?lang", "?year"], alldata), [
  { "?lang": "clojure", "?year": 1960 },
])
test(query(["merge", [], [1, 2], "?r"], alldata), [{ "?r": [1, 2] }])
test(query(["merge", [], "?r", [1, 2]], alldata), [{ "?r": [1, 2] }])
test(query(["merge", "?r", [], [1, 2]], alldata), [{ "?r": [1, 2] }])
test(query(["merge", [1, 2], [], "?r"], alldata), [{ "?r": [1, 2] }])

test(query(["merge", [1], [2, 3], "?r"], alldata), [{ "?r": [1, 2, 3] }])
test(query(["merge", [1, 2], [3, 4], "?r"], alldata), [{ "?r": [1, 2, 3, 4] }])
test(query(["merge", [1, 3], [2], "?r"], alldata), [{ "?r": [1, 2, 3] }])
test(query(["merge", [1, 3], [2, 4], "?r"], alldata), [{ "?r": [1, 2, 3, 4] }])

test(query(["merge", [1, 3], "?r", [1, 3]], alldata), [{ "?r": [] }])
test(query(["merge", [1, 3], "?r", [1, 2, 3]], alldata), [{ "?r": [2] }])

// test(query(["merge", "?x", "?y", [1, 2, 3]], alldata), [])

const pattern = ["old", "?lang", "?year"]
// const pattern = ["merge", [1, 3], [2, 4], "?r"]

// const r = query(pattern, alldata).map((dict) => resolve(pattern, dict))

// for (const e of r) {
//   console.log("found", e)
// }
