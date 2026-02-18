import { test, type } from "./lang.js"
import { car, cdr, cons, nil } from "./list.js"

// lisp to string
export const prn = (x) => {
  const t = type(x)

  if (t === "Array") {
    const r = []
    let c = x
    while (c !== nil) {
      if (type(c) === "Array") {
        r.push(car(c))
        c = cdr(c)
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

  if (t === "Undefined") {
    return "undefined"
  }

  throw new Error(`Cannot prn ${x}`)
}
test.prn = prn // !!

export const r = (strs) => read(strs.join(""))

// lisp reader
export const read = (s) => {
  s = s.replace(/;[^\n]*\n/g, "")
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
      const r = cons(nil, nil)
      let c = r
      ws()
      while (i < s.length && s[i] !== ")" && s[i] !== ".") {
        c[1] = cons(exp(), nil)
        c = cdr(c)
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

      return cdr(r)
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
