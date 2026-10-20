/* Embedded examples work offline, including when index.html opens through file://. */
window.StringExamples = [
  { id: 'hello', label: 'Hello, world', category: 'Valid program', filename: 'hello.str',
    description: 'A declaration, an assignment, and a little concatenation.',
    source: '// A small language. A complete compiler front end.\nstring name = "World";\nstring greeting;\ngreeting = "Hello, " + name + "!";\n\nprint(greeting);\nprint("Made of strings. Built in your browser.");' },
  { id: 'escapes', label: 'Escape sequences', category: 'Valid program', filename: 'escapes.str',
    description: 'See how quoted strings and escape sequences are decoded.',
    source: String.raw`string title = "String processing";
print(title + "\nA new line begins here.");
print("Name:\tAda");
print("She said: \"Hello\"");
print("Path: C:\\project\\source");
print("A literal backslash and n: \\n");` },
  { id: 'grouping', label: 'Grouping & reassignment', category: 'Valid program', filename: 'grouping.str',
    description: 'Parentheses control the AST. Assignment updates a string.',
    source: 'string first = "Mini";\nstring second = "compiler";\nstring result = (first + " ") + second;\nresult = result + " in the browser";\nprint(result);' },
  { id: 'ast', label: 'A tiny AST', category: 'Valid program', filename: 'ast_demo.str',
    description: 'A small program makes the syntax tree easy to follow.',
    source: 'string a = "Hi";\nprint(a + "!");' },
  { id: 'lexical', label: 'Lexical error', category: 'Error demonstration', filename: 'lexical_error.str',
    description: 'The lexer rejects an unsupported escape sequence.',
    source: String.raw`// The escape \q is deliberately invalid.
string message = "Hello\q";
print(message);` },
  { id: 'syntax', label: 'Syntax error', category: 'Error demonstration', filename: 'syntax_error.str',
    description: 'The parser expects a semicolon after the declaration.',
    source: '// A semicolon is deliberately missing.\nstring message = "Hello"\nprint(message);' },
  { id: 'semantic', label: 'Semantic errors', category: 'Error demonstration', filename: 'semantic_error.str',
    description: 'Three independent errors in an otherwise grammatical program.',
    source: '// Valid syntax does not always mean valid meaning.\nstring message;\nprint(message);\nunknown = "Hello";\nstring message = "Again";' },
];
