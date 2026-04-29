# RND

## Datalog

- datalog and logic programming closely related
- start with some facts: `(a name "Alice") (b name "Bob")`
- add more attributes: `(a id 1) (b id 2)`
- add pid: `(a pid null) (b pid 2)`
- show parent query
- extract as rule
- add Charlie: `(c name "Charlie") (c id 3) (c pid 2)`
- add ancestor rule

## Logic programming

- to state what is true, to check if something is true, to find out what is true

- write append query: `(append (1 2) (3 4) ?r)`
- write rule to support this fact

```
(append () ?ys ?ys)

((append (?x . ?xs) ?ys (?x . ?rs))
 (append ?xs ?ys ?rs)
)
```

- use relation: `(append ?a ?b (1 2 3 4))`
- what about: `(append (1 2) ?b ?c)`

## Logic grid puzzle

![puzzle](./images/grid%20puzzle.png)

- list styles and media

```
(style Abstract)
(style Impressionism)
(style Surrealism)

(medium Acrylic)
(medium Oil)
(medium Watercolor)
```

- build grid

```
(= ?a ?a)

((?s1 ?m1 ?s2 ?m2 ?s3 ?m3)
 (style ?s1)
 (style ?s2)
 (style ?s3)

 (NOT (= ?s1 ?s2))
 (NOT (= ?s1 ?s3))
 (NOT (= ?s3 ?s2))

 (medium ?m1)
 (medium ?m2)
 (medium ?m3)
 (NOT (= ?m1 ?m2))
 (NOT (= ?m1 ?m3))
 (NOT (= ?m3 ?m2))
)
```

- start solution
- add constraints

```
 ; Helen is the only artist whose style is surrealism
 ; The impressionism style isn't done with watercolor
 ; Clara doesn't work with acrylics
 ; Surrealism is paired with acrylics paints
 ; Anna doesn't work with watercolor
```

```
((solution (Anna ?s1 ?m1) (Clara ?s2 ?m2) (Helen ?s3 ?m3))
 (?s1 ?m1 ?s2 ?m2 ?s3 ?m3)

 ; Helen is the only artist whose style is surrealism
 (?s1 ?m1 ?s2 ?m2 Surrealism ?m3)

 ; The impressionism style isn't done with watercolor
 (NOT (Impressionism Watercolor ?s2 ?m2 ?s3 ?m3))
 (NOT (?s1 ?m1 Impressionism Watercolor ?s3 ?m3))
 (NOT (?s1 ?m1 ?s2 ?m2 Impressionism Watercolor))

 ; Clara doesn't work with acrylics
 (NOT (?s1 Acrylic ?s2 ?m2 ?s3 ?m3))

 ; Surrealism is paired with acrylics paints
 (OR
   (Surrealism Acrylic ?m2 ?s3 ?m3)
   (?s1 ?m1 Surrealism Acrylic ?s3 ?m3)
   (?s1 ?m1 ?s2 ?m2 Surrealism Acrylic)
 )
 ; Anna doesn't work with watercolor
 (NOT (?s1 Watercolor ?s2 ?m2 ?s3 ?m3))
)
```

![](./images/grid%20puzzle%20sol.png)

## Type checking

- define \*: `(type * (number number) number)`
- using lisp as AST
- compile sq: `; (defn sq [x] (* x x))`

```
((type sq (?x) ?r)
 (type * (?x ?x) ?r)
)
```

- infer type: `(type sq . ?t)`
- compile prod:

```
; (defn prod [n]
;  (if (> n 1)
;   (* n (prod (- n 1)))
;   1))
```

```
(type > (number number) bool)
(type - (number number) number)

(= ?a ?a)

((type if (bool ?c ?a) ?r)
 (= ?c ?r)
 (= ?a ?r)
)

((type prod (?n) ?r)
 (type > (?n number) ?p)
 (type - (?n number) ?dec)
 (= ?n ?dec)
 (= ?r ?rec)
 (type * (?n ?rec) ?c)
 (= number ?a)
 (type if (?p ?c ?a) ?r)
)
```

- compile map:

```
; (defn map [f xs]
;   (if (empty? xs)
;     xs
;     (cons (f (car xs)) (map f (cdr xs)))))
```

```
(type empty? ((List ?a)) bool)
(type car ((List ?a)) ?a)
(type cdr ((List ?a)) (List ?a))
(type cons (?a (List ?a)) (List ?a))

((type map (?f ?xs) ?r)
 (type empty? (?xs) ?p)
 (= ?xs ?c)
 (type car (?xs) ?car)
 (type ?f (?car) ?t1)
 (type cdr (?xs) ?cdr)
 (= ?xs ?cdr)
 (= ?r ?t2)
 (type cons (?t1 ?t2) ?a)
 (type if (?p ?c ?a) ?r)
)
```

- interestingly, this returns possibilities by function name!
- let's make `f` a type

```
(type empty? ((List ?a)) bool)
(type car ((List ?a)) ?a)
(type cdr ((List ?a)) (List ?a))
(type cons (?a (List ?a)) (List ?a))

((type map (?f ?xs) ?r)
 (type empty? (?xs) ?p)
 (= (List ?x) ?c)

 (type car (?xs) ?car)
 (= ?f ((?car) => ?t1))

 (type cdr (?xs) ?cdr)
 (= ?xs ?cdr)
 (= ?r ?t2)

 (type cons (?t1 ?t2) ?a)
 (type if (?p ?c ?a) ?r)
)
```

### Investigate

```
(= ?a ?a)

((subtype ?a ?b)
 (= ?a ?b)
)

((subtype ?a (| ?b . ?bs))
 (= ?a ?b)
)

((subtype ?a (| ?b . ?bs))
 (subtype ?a (| . ?bs))
)


((subtype (| ?a) ?b)
 (subtype ?a ?b)
)

((subtype (| ?a ?a2 . ?as) ?b)
 (subtype ?a ?b)
 (subtype (| ?a2 . ?as) ?b)
)


((type if (?p ?c ?a) ?r)
 (= ?p bool)
 (subtype ?c ?r)
 (subtype ?a ?r)
)
```

## RBAC

```
(r1 name Admin)
(r2 name User)
(r3 name SuperAdmin)

(r1 conflicts r3)

(p1 name Read)
(p2 name Write)

(r1 assign p1)
(r1 assign p2)
(r2 assign p1)

(u1 name Alice)
(u2 name Bob)

(u1 assign r2)
(u2 assign r1)

(u2 assign r3) ; comment out this fact to remove conflicts for Bob

((?u conflicting ?r)
 (?u assign ?r)
 (?u assign ?r2)
 (OR (?r conflicts ?r2) (?r2 conflicts ?r))
)

((?u roles ?r)
 (?u assign ?r)
 (NOT (?u conflicting ?r))
)

((?un can ?pn)
 (?u name ?un)
 (?p name ?pn)
 (?u roles ?r)
 (?r assign ?p)
)
```
