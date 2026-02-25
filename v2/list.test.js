import { test } from "./lang.js"
import {
  append,
  filter,
  flatmap,
  list,
  map,
  nil,
  ones,
  reduce,
  take,
} from "./list.js"

test(() => append(list(1, 2, 3), list(4, 5, 6)), list(1, 2, 3, 4, 5, 6))

test(() => flatmap((x) => list([x, x]))(list(1, 2, 3)), list(1, 1, 2, 2, 3, 3))

test(() => take(100)(map((x) => x * 2)(list([1, 2, 3]))), list([2, 4, 6]))
test(
  () => take(100)(filter((x) => x % 2 === 0)(list([1, 2, 3, 4]))),
  list([2, 4]),
)
test(() => reduce((acc, x) => acc + x, 0)(list([1, 2, 3, 4])), 10)

test(() => take(2)(list([1, 2, 3, 4])), list([1, 2]))
test(() => take(0)(list([1, 2, 3, 4])), nil)
test(() => take(10)(list([1, 2, 3])), list([1, 2, 3]))

test(() => take(5)(flatmap(() => ones)(ones)), list([1, 1, 1, 1, 1]))
