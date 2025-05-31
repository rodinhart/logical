// clear; ..\..\deno.exe run --allow-read .\main.js

import { r, read } from "./lisp.js"
import { query } from "./rlisp.js"
import {} from "./tests.js"

let debug = 0

const db = read(Deno.readTextFileSync("./db.clj"))

console.log(prn(query(r`(eval ((lambda (x) y) 3) (y 4) ?res)`, db)))
