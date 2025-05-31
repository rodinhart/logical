import { test, type } from "./lang.js"

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
