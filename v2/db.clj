(
  (creator "clojure" ("Rich" "Hickey"))
  (creator "lisp" ("John" "McCarthy"))
  (creator "c" ("Dennis" "Ritchie"))
  (creator "apl" ("Kenneth" "Iverson"))
  (created "clojure" 2007)
  (created "c" 1972)
  (created "lisp" 1960)
  (influenced "lisp" "clojure")

  (RULE
    (old ??lang ??year)
    (AND (created ??source ??year)
         (influenced ??source ??lang)))

  (RULE
    (merge () ??y ??y))

  (RULE
    (merge ??x () ??x))

  (RULE
    (merge (??a . ??x) (??b . ??y) (??a . ??z))
    (AND (merge ??x (??b . ??y) ??z)
         (< ??a ??b)))

  (RULE
    (merge (??a . ??x) (??b . ??y) (??b . ??z))
    (AND (merge (??a . ??x) ??y ??z)
         (< ??b ??a)))

  (RULE
    (append () ?y ?y))

  (RULE
    (append (??a . ??x) ??y (??a . ??z))
    (append ??x ??y ??z))

  (RULE
    (get (??key ??val . ??rest) ??key ??val))

  (RULE (get (??y ??z . ??rest) ??key ??val)
        (get ??rest ??key ??val))

  (RULE (set ??map ??key ??val (??key ??val . ??map)))

  (RULE (inc 0 1))
  (RULE (inc 1 2))
  (RULE (inc 2 3))
  (RULE (inc 3 4))
  (RULE (inc 4 5))

  (RULE
    (eval ??x ??env ??x)
    (number? ??x))

  (RULE
    (eval ??x ??env ??val)
    (AND (symbol? ??x)
         (get ??env ??x ??val)))

  (RULE (eval (lambda (??param) ??body) ??env (closure (??param) ??body ??env)))

  ;; (RULE (eval (??rator ??rand) ??env ??res)
  ;;       (AND
  ;;         (AND
  ;;           (AND (eval ??rator ??env (closure (??param) ??body ??env2))
  ;;                (eval ??rand ??env ??arg))
  ;;           (set ??env2 ??param ??arg ??env-new))
  ;;         (eval ??body ??env-new ??res))
  ;; )

)