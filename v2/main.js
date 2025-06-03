// clear; ..\..\deno.exe run --allow-read .\main.js

import { prn, r, read } from "./lisp.js"
import { car, cdr, isEmpty } from "./list.js"
import { query } from "./rlisp.js"
import {} from "./tests.js"

const db = read(Deno.readTextFileSync("./db.clj"))

const run = (n, pattern) => {
  let res = query(pattern, db)
  while (n > 0 && !isEmpty(res)) {
    n--
    console.log(prn(car(res)))
    res = cdr(res)
  }
}

// run(10, r`(eval ?r () 3)`)
// run(10, r`(eval ((lambda (x) y) 3) (y 4) ?res)`)
