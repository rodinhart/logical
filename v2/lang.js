// value equality
export const egal = (a, b) => {
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
export const test = (script, expected) => {
  const actual = script()
  if (!egal(actual, expected)) {
    console.warn(expected, actual)
    throw new Error(
      `Test failed:\n${script} \nexpected:\n${test.prn(
        expected
      )}\nbut found:\n${test.prn(actual)}`
    )
  }
}

export const thread = (x, ...fns) => fns.reduce((r, fn) => fn(r), x)

export const type = (a) =>
  a === null ? "Null" : a?.constructor?.name ?? "Undefined"
