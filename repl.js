const fs = require("fs")
const readline = require("readline")

const compose = (f, g) => x => f(g(x))
const concat = (a, b) => (a ? cons(first(a), concat(rest(a), b)) : b)
const cons = (x, y) => [x, y]
const filter = p => c =>
  c
    ? p(first(c))
      ? cons(first(c), filter(p)(rest(c)))
      : filter(p)(rest(c))
    : null
const filterKeys = p => xs => {
  const r = {}
  for (let k in xs) {
    if (p(k)) r[k] = xs[k]
  }

  return r
}
const first = c => c[0]
const fold = (step, init) => c => {
  let r = init
  while (c) {
    r = step(r, first(c))
    c = rest(c)
  }

  return r
}
const identity = x => x
const map = f => c =>
  c instanceof Array ? cons(f(first(c)), map(f)(rest(c))) : c ? f(c) : c
const mapValues = f => xs => {
  const r = {}
  for (let k in xs) {
    r[k] = f(xs[k])
  }

  return r
}
const nth = n => c => (n > 0 ? nth(n - 1)(rest(c)) : first(c))
const rest = c => c[1]
const tap = x => console.log("TAP", x) || x
const toArray = xs => (xs ? [first(xs)].concat(toArray(rest(xs))) : [])

const empty = cons({}, null)

const equal = (x, y) => {
  if (x instanceof Array) {
    if (!(y instanceof Array)) return false
    if (x.length !== y.length) return false
    for (let i = 0; i < x.length; i += 1) {
      if (!equal(x[i], y[i])) return false
    }

    return true
  } else if (x && typeof x === "object") {
    if (typeof y !== "object" || y instanceof Array) return false
    for (let key in x) {
      if (!equal(x[key], y[key])) return false
    }

    for (let key in y) {
      if (!equal(x[key], y[key])) return false
    }

    return true
  }

  return x === y
}

// substitute
const substitute = code => dict =>
  code instanceof Array
    ? map(term => substitute(term)(dict))(code)
    : dict[code] !== undefined
      ? dict[code]
      : code

const assert = (actual, expected) => {
  if (!equal(actual, expected)) {
    throw new Error(
      `Assertion failed. Received ${JSON.stringify(
        actual
      )}, expected ${JSON.stringify(expected)}.`
    )
  }
}

const prn = x => {
  if (x === null) return "()"

  if (x instanceof Array) {
    const r = []
    let c = x
    while (c instanceof Array) {
      r.push(prn(first(c)))
      c = rest(c)
    }

    return c === null ? `(${r.join(" ")})` : `(${r.join(" ")} . ${prn(c)})`
  } else if (typeof x === "object") {
    return (
      "{" +
      Object.entries(x)
        .map(([k, v]) => `${k}: ${prn(v)}`)
        .join(", ") +
      "}"
    )
  }

  return String(x)
}

// read
const read = s => {
  const _ = x => {
    if (!x.length) return null
    const f = x.shift()
    if (f === "(") {
      const r = [null, null]
      let c = r
      while (x.length && x[0] !== ")") {
        if (x[0] === ".") {
          x.shift()
          c[1] = _(x)
        } else {
          c = c[1] = [_(x), null]
        }
      }

      if (x.shift() !== ")") throw new Error("Missing )")

      return r[1]
    }

    return String(Number(f)) === f ? Number(f) : f
  }

  return _(
    s
      .replace(/(;.*\n)/g, "\n")
      .replace(/(\(|\))/g, " $1 ")
      .split(/\s/)
      .filter(identity)
  )
}

assert(read(`(1 2 3)`), [1, [2, [3, null]]])
assert(read(`(x y . rest)`), ["x", ["y", "rest"]])

// unify
const unify = pat => (atom, dict) => {
  if (pat instanceof Array) {
    if (!(atom instanceof Array)) {
      if (!atom || atom[0] !== "?") return null
      if (dict["?" + atom] !== undefined) {
        const t = unify(dict["?" + atom])(pat, dict)
        if (t !== null) return t

        return null
      }

      return {
        ...dict,
        ["?" + atom]: pat
      }
    }
    const t = unify(first(pat))(first(atom), dict)
    if (t === null) return null
    return unify(rest(pat))(rest(atom), t)
  } else if (pat && pat[0] === "?") {
    if (dict[pat] !== undefined && dict[pat] !== atom) return null

    return {
      ...dict,
      [pat]: atom
    }
  } else if (atom && atom[0] === "?") {
    if (dict["?" + atom] !== undefined && !equal(dict["?" + atom], pat))
      return null

    return {
      ...dict,
      ["?" + atom]: pat
    }
  }

  if (!equal(pat, atom)) return null

  return dict
}

let limit
const match = pat => (atoms, dicts) =>
  fold(
    (r, atom) =>
      fold((r, dict) => {
        if (first(atom) === "rule") {
          const t = unify(pat)(nth(1)(atom), dict)
          // console.log()
          // console.log("PAT", prn(pat))
          // console.log("DICT", prn(dict))
          // console.log("ATOM", prn(atom))
          // console.log("CONCL", prn(t))
          if (t === null) return r
          // if (limit === 0) process.exit(0)
          // limit -= 1
          if (!rest(rest(atom))) {
            return cons(
              filterKeys(k => k[0] !== "?" || k[1] !== "?")(
                mapValues(
                  v =>
                    v && v[0] === "?" && t["?" + v] !== undefined
                      ? t["?" + v]
                      : v
                )(t)
              ),
              r
            )
          }

          const tt = (() => {
            const r = {}
            for (let k in t) {
              if (k[0] === "?" && k[1] === "?") {
                r[k.substr(1)] = t[k]
              }
            }

            return r
          })()
          const u = evalǃ(substitute(nth(2)(atom))(tt))(atoms, empty)
          const uu =
            u !== null
              ? map(d => mapValues(v => substitute(v)({ ...tt, ...d }))(t))(u)
              : null
          // console.log()
          // console.log("PAT", prn(pat))
          // console.log("DICT", prn(dict))
          // console.log("ATOM", prn(atom))
          // console.log("CONCL", prn(t))
          // console.log("RECUR", prn(u))
          // console.log("UNIFY", prn(uu))
          return concat(r, uu)
        }

        const t = unify(pat)(atom, dict)

        return t !== null ? cons(t, r) : r
      }, r)(dicts),
    null
  )(atoms)

let data = read(`
(
  (child Pebbles Barney)
  (child Marty George)
  (job Marty Time Traveller)
  (job Barney Builder)
  (rule
    (alias ?y BuildKid)
    (and
      (job ?x Builder)
      (child ?y ?x)
    )
  )
  (age Pebbles 2)
  (age Marty 17)

  (rule
    (merge () ?y ?y)
  )

  (rule
    (merge ?y () ?y)
  )

  (rule
    (merge (?a . ?x) (?b . ?y) (?b . ?z))
    (and
      (merge (?a . ?x) ?y ?z)
      (> ?a ?b)
    )
  )

  (rule
    (merge (?a . ?x) (?b . ?y) (?a . ?z))
    (and
      (merge ?x (?b . ?y) ?z)
      (> ?b ?a)
    )
  )
)
`)

assert(
  match(read(`(child Pebbles ?x)`))(data, empty),
  cons({ "?x": "Barney" }, null)
)
assert(
  match(read(`(child ?x Barney)`))(data, empty),
  cons({ "?x": "Pebbles" }, null)
)
assert(match(read(`(child Pebbles Barney)`))(data, empty), empty)
assert(match(read(`(child Pebbles Fred)`))(data, empty), null)
assert(
  match(read(`(job Marty . ?x)`))(data, empty),
  cons({ "?x": ["Time", ["Traveller", null]] }, null)
)
assert(
  match(read(`(child Pebbles ?x)`))(data, cons({ "?x": "Barney" }, null)),
  cons({ "?x": "Barney" }, null)
)
assert(
  match(read(`(child Pebbles ?x)`))(data, cons({ "?x": "George" }, null)),
  null
)

assert(match(read(`(merge () (1 2) (1 2))`))(data, empty), empty)
assert(
  match(read(`(merge () (1 2) ?x)`))(data, empty),
  cons({ "?x": [1, [2, null]] }, null)
)
assert(
  match(read(`(merge () ?x (1 2))`))(data, empty),
  cons({ "?x": [1, [2, null]] }, null)
)
assert(
  match(read(`(merge () (?p . ?u) (1 2))`))(data, empty),
  cons({ "?p": 1, "?u": [2, null] }, null)
)

// eval
const core = {}

const evalǃ = expr => {
  if (expr instanceof Array && core[first(expr)]) {
    return core[first(expr)](rest(expr))
  }

  return match(expr)
}

assert(evalǃ(read(`(child Pebbles Barney)`))(data, empty), empty)

// and
const and = clauses => (atoms, dicts) =>
  fold((r, clause) => evalǃ(clause)(atoms, r), dicts)(clauses)
core.and = and

assert(
  evalǃ(read(`(and (job ?x Builder) (child ?y ?x))`))(data, empty),
  cons({ "?x": "Barney", "?y": "Pebbles" }, null)
)

// or
const or = clauses => (atoms, dicts) =>
  fold((r, clause) => concat(r, evalǃ(clause)(atoms, dicts)), null)(clauses)
core.or = or

assert(
  evalǃ(read(`(or (job ?x Builder) (child ?x Barney))`))(data, empty),
  cons({ "?x": "Barney" }, cons({ "?x": "Pebbles" }, null))
)

// >
core[">"] = args => (atoms, dicts) =>
  filter(dict => {
    const a = dict[nth(0)(args)] || nth(0)(args)
    const b = dict[nth(1)(args)] || nth(1)(args)

    return a > b
  })(dicts)

// rule
assert(
  evalǃ(read(`(alias ?z BuildKid)`))(data, empty),
  cons({ "?z": "Pebbles" }, null)
)

// repl
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

const repl = () => {
  console.log()
  rl.question("spock>  ", s => {
    if (s === ".orgvue") {
      const raw = fs.readFileSync("DemoData.csv")
      const rows = String(raw)
        .split("\n")
        .map(row =>
          row
            .split(",")
            .map(x => x.replace(/\s/g, ""))
            .map(s => (String(Number(s)) === s ? Number(s) : s))
        )
      const fields = rows[0]
      rows.forEach(row =>
        row.forEach(
          (val, i) =>
            (data = cons(cons(fields[i], cons(row[1], cons(val, null))), data))
        )
      )
      console.log("LOADED")
      repl()
    } else if (s === ".data") {
      console.log(prn(data))
      repl()
    } else if (s !== ".exit") {
      const code = read(s)
      limit = 5
      const result = evalǃ(code)(data, empty)
      const t = map(substitute(code))(result)
      if (t) console.log(toArray(map(prn)(t)).join("\n"))
      repl()
    } else {
      rl.close()
    }
  })
}

repl()
