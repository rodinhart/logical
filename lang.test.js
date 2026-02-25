import { egal, test } from "./lang.js"

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
