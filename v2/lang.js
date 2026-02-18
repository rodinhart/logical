// value equality
export const egal = (a, b) => {
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

  if (type(a) === "Set") {
    if (a.size !== b.size) {
      return false
    }

    return [...a].every((e) => b.has(e))
  }

  return a === b
}

// run a test
export const test = (script, expected) => {
  const actual = script()
  if (!egal(actual, expected)) {
    console.warn(expected, actual)
    throw new Error(
      `Test failed:\n${script} \nexpected:\n${test.prn(
        expected,
      )}\nbut found:\n${test.prn(actual)}`,
    )
  }
}

test.prn = (x) => x

export const thread = (x, ...fns) => fns.reduce((r, fn) => fn(r), x)

export const type = (a) =>
  a === null ? "Null" : (a?.constructor?.name ?? "Undefined")

// tests

test(() => egal(2, 2), true)
test(() => egal(2, 3), false)

test(() => egal("hello", "hello"), true)
test(() => egal("hello", "world"), false)

test(() => egal([1, 2, 3], [1, 2, 3]), true)
test(() => egal([1, 2, 3], [1, 2, 4]), false)

test(() => egal({ a: 1, b: 2 }, { a: 1, b: 2 }), true)
test(() => egal({ a: 1, b: 2 }, { a: 1, b: 3 }), false)

test(() => egal(new Set([1, 2]), new Set([2, 1])), true)
test(() => egal(new Set([1, 2]), new Set([2, 3])), false)
