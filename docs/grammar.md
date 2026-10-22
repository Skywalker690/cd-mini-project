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
| Identifier | `[A-Za-z_][A-Za-z0-9_]*`, maximum 63 ASCII characters |
| String literal | Double quotes surrounding zero or more ordinary characters or valid escapes |
| Operators | `=` and `+` |
| Delimiters | `(`, `)`, `;` |
| Comment | `//` to the end of the current line, outside strings |
| Whitespace | Space, tab, CR, LF, outside strings |

Ordinary string characters exclude quote, backslash, raw line breaks, ASCII controls 0 through 31 and 127. The accepted escapes are `\n`, `\t`, `\r`, `\\`, and `\"`. Decode each escape exactly once. Source may contain at most 65,535 UTF-16 code units. A decoded literal or concatenated value may contain at most 1,023 UTF-16 code units. JavaScript preserves Unicode string content without normalization. Locations use one-based lines and UTF-16 code-unit columns. CRLF counts as one newline. An optional initial BOM is ignored. NUL is rejected anywhere in source, including strings and comments.

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

The AST keeps semantic structure and omits punctuation and helper nonterminals. A Program node contains an ordered body array. Declaration, Assignment and Print nodes contain expression children. Concat has left and right children. The browser displays connected oval nodes for individual statements or the whole program. Assignment and initialized-declaration diagrams use an = root, with a target-name leaf and an expression child; concatenation uses + with left and right children. Target names are stored as properties in the compiler AST and projected as leaves for display. The original AST can be exported as JSON.
