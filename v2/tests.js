import { test } from "./lang.js"
import { r, read } from "./lisp.js"
import { append, flatmap, list, take } from "./list.js"
import { query, resolve, unify } from "./rlisp.js"

const db = read(Deno.readTextFileSync("./db.clj"))

// interpreter
