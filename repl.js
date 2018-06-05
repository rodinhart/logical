const readline = require("readline")

const compose = (f, g) => x => f(g(x))
const concat = (a, b) => (a ? cons(first(a), concat(rest(a), b)) : b)
const cons = (x, y) => [x, y]
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
  if (x instanceof Array) {
    const r = []
    let c = x
    while (c instanceof Array) {
      r.push(prn(first(c)))
      c = rest(c)
    }

    return c === null ? `(${r.join(" ")})` : `(${r.join(" ")} . ${prn(c)})`
  }

  return x === null ? "()" : String(x)
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
      if (dict["?" + atom] !== undefined && !equal(dict["?" + atom], pat))
        return null

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

const match = pat => (atoms, dicts) =>
  fold(
    (r, atom) =>
      fold((r, dict) => {
        if (first(atom) === "rule") {
          const t = unify(pat)(nth(1)(atom), dict)
          if (t === null) return r
          if (!rest(rest(atom))) return cons(t, r)
          const u = evalǃ(nth(2)(atom))(atoms, empty)
          return concat(r, map(d => mapValues(v => d[v])(t))(u))
        }

        const t = unify(pat)(atom, dict)

        return t !== null ? cons(t, r) : r
      }, r)(dicts),
    null
  )(atoms)

const data = read(`
(
  (Pebbles child Barney)
  (Marty child George)
  (Marty job Time Traveller)
  (Barney job Builder)
  (rule
    (?y alias BuildKid)
    (and
      (?x job Builder)
      (?y child ?x)
    )
  )

  (rule
    (merge () ?y ?y)
  )

  (rule
    (merge ?y () ?y)
  )
)
`)

assert(
  match(read(`(Pebbles child ?x)`))(data, empty),
  cons({ "?x": "Barney" }, null)
)
assert(
  match(read(`(?x child Barney)`))(data, empty),
  cons({ "?x": "Pebbles" }, null)
)
assert(match(read(`(Pebbles child Barney)`))(data, empty), empty)
assert(match(read(`(Pebbles child Fred)`))(data, empty), null)
assert(
  match(read(`(Marty job . ?x)`))(data, empty),
  cons({ "?x": ["Time", ["Traveller", null]] }, null)
)
assert(
  match(read(`(Pebbles child ?x)`))(data, cons({ "?x": "Barney" }, null)),
  cons({ "?x": "Barney" }, null)
)
assert(
  match(read(`(Pebbles child ?x)`))(data, cons({ "?x": "George" }, null)),
  null
)

// eval
const evalǃ = expr => {
  if (expr instanceof Array) {
    if (first(expr) === "and") {
      return and(evalǃ(nth(1)(expr)), evalǃ(nth(2)(expr)))
    } else if (first(expr) === "or") {
      return or(evalǃ(nth(1)(expr)), evalǃ(nth(2)(expr)))
    }
  }

  return match(expr)
}

assert(evalǃ(read(`(Pebbles child Barney)`))(data, empty), empty)

// and
const and = (a, b) => (atoms, dicts) => b(atoms, a(atoms, dicts))

assert(
  evalǃ(read(`(and (?x job Builder) (?y child ?x))`))(data, empty),
  cons({ "?x": "Barney", "?y": "Pebbles" }, null)
)

// or
const or = (a, b) => (atoms, dicts) => concat(a(atoms, dicts), b(atoms, dicts))

assert(
  evalǃ(read(`(or (?x job Builder) (?x child Barney))`))(data, empty),
  cons({ "?x": "Barney" }, cons({ "?x": "Pebbles" }, null))
)

// rule
assert(
  evalǃ(read(`(?z alias BuildKid)`))(data, empty),
  cons({ "?z": "Pebbles" }, null)
)

assert(
  evalǃ(read(`(merge () (1 2) (1 2))`))(data, empty),
  cons({ "??y": [1, [2, null]] }, null)
)

// substitute
const substitute = code => dict =>
  code instanceof Array
    ? map(term => substitute(term)(dict))(code)
    : dict[code] !== undefined
      ? dict[code]
      : code

// repl
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

const repl = () => {
  console.log()
  rl.question("spock>  ", s => {
    if (s !== ".exit") {
      const code = read(s)
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
