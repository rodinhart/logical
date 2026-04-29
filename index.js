import { prn, read } from "./lisp.js"
import { length, reduce } from "./list.js"
import { resolve, run } from "./rlisp.js"

const txtDb = document.getElementById("txtDb")
const txtPattern = document.getElementById("txtPattern")
const txtOutput = document.getElementById("txtOutput")

const exec = () => {
  try {
    const db = read(`(${txtDb.value})`)
    console.log({ db })
    const pattern = read(txtPattern.value)
    console.log({ pattern })
    const result = run(100, pattern, db)
    console.log({ length: length(result) })
    txtOutput.value = reduce(
      (r, dict) => [...r, prn(resolve(pattern, dict))],
      [],
      result,
    ).join("\n")
  } catch (e) {
    txtOutput.value = String(e)
  }
}

txtDb.addEventListener("keypress", (event) => {
  if (event.ctrlKey && event.code === "Enter") {
    exec()
  }
})

txtPattern.addEventListener("keypress", (event) => {
  if (event.ctrlKey && event.code === "Enter") {
    exec()
  }
})
