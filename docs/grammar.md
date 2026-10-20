# CFG and Grammar Transformations

The grammar describes token sequences after whitespace and `//` comments have been removed. Keywords are case sensitive. `id` and `literal` are tokens. Quoted punctuation denotes a terminal. `ε` denotes the empty production and `$` denotes end of input.

## Original CFG

```text
Program -> Program Stmt | ε
Stmt    -> Decl | Assign | Output
Decl    -> 'string' id ';' | 'string' id '=' Expr ';'
Assign  -> id '=' Expr ';'
Output  -> 'print' '(' Expr ')' ';'
Expr    -> Expr '+' Term | Term
Term    -> literal | id | '(' Expr ')'
```

This CFG has immediate left recursion in Program and Expr. Decl has a common prefix. A direct recursive-descent implementation of the original left-recursive productions would recurse without consuming input.

## Transformation 1 Removing left recursion

For `A -> A α | β`, use `A -> β A'` and `A' -> α A' | ε`.

```text
Expr     -> Term ExprTail
ExprTail -> '+' Term ExprTail | ε
```

For Program the nonrecursive alternative is ε. Removing left recursion gives a zero-or-more statement list. Rename its helper as List and simplify the empty prefix:

```text
Program -> List
List    -> Stmt List | ε
```

The parser implements both repetitions with loops. It folds each new concatenation into the left child, preserving the original left associativity. Thus `a + b + c` builds `Concat(Concat(a,b),c)` even though the transformed grammar uses a right-recursive tail.

## Transformation 2 Left factoring

The declaration alternatives share `'string' id`:

```text
Decl     -> 'string' id Init ';'
Init     -> '=' Expr | ε
```

## Final predictive grammar

```text
Program  -> List
List     -> Stmt List | ε
Stmt     -> Decl | Assign | Output
Decl     -> 'string' id Init ';'
Init     -> '=' Expr | ε
Assign   -> id '=' Expr ';'
Output   -> 'print' '(' Expr ')' ';'
Expr     -> Term ExprTail
ExprTail -> '+' Term ExprTail | ε
Term     -> literal | id | '(' Expr ')'
```

## FIRST and FOLLOW sets

| Nonterminal | FIRST | FOLLOW |
| --- | --- | --- |
| Program | string, id, print, ε | $ |
| List | string, id, print, ε | $ |
| Stmt | string, id, print | string, id, print, $ |
| Decl | string | string, id, print, $ |
| Init | =, ε | ; |
| Assign | id | string, id, print, $ |
| Output | print | string, id, print, $ |
| Expr | literal, id, ( | ;, ) |
| ExprTail | +, ε | ;, ) |
| Term | literal, id, ( | +, ;, ) |

Stmt selects Decl on `string`, Assign on `id`, and Output on `print`. Term selects its three alternatives on distinct tokens. The nullable List, Init, and ExprTail alternatives have no FIRST/FOLLOW conflicts. Therefore the final grammar is LL(1). The parser also requires end of input after the statement list.

## Lexer rules

| Token | Rule |
| --- | --- |
| Keyword | `string` or `print`, matched after reading a complete identifier |
| Identifier | `[A-Za-z_][A-Za-z0-9_]*`, maximum 63 bytes |
| String literal | Double quotes surrounding zero or more ordinary characters or valid escapes |
| Operators | `=` and `+` |
| Delimiters | `(`, `)`, `;` |
| Comment | `//` to the end of the current line, outside strings |
| Whitespace | Space, tab, CR, LF, outside strings |

Ordinary string bytes exclude quote, backslash, raw line breaks, ASCII control bytes 0 through 31 and 127. The only accepted escapes are `\n`, `\t`, `\r`, `\\`, and `\"`. A decoded string may contain at most 1023 bytes. UTF-8 string bytes pass through unchanged, but Unicode encoding is not validated. Locations use one-based lines and byte columns. CRLF counts as one newline. An optional UTF-8 BOM is accepted. Embedded NUL bytes in source files are rejected.

## AST example

Source:

```text
string a = "Hi";
print(a + "!");
```

AST:

```text
Program
  Declaration a
    Literal "Hi"
  Print
    Concat
      Identifier a
      Literal "!"
```

The AST keeps semantic structure and omits punctuation and helper nonterminals. A linked `next` pointer connects statements. `--dot PATH` exports the same AST, with sibling links labeled `next`.
