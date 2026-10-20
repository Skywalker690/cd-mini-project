/* String Processing Language - compiler front end in standard C99.
 * Build: gcc -std=c99 -Wall -Wextra -Wpedantic -O2 src/mini_compiler.c -o mini_compiler
 * Read the sections in order: lexer, parser, semantics, preview, displays, main.
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdarg.h>
#include <setjmp.h>

#define SOURCE_CAP 65536       /* at most 65535 source bytes */
#define TOKEN_CAP 4096         /* includes the EOF token */
#define NODE_CAP 4096
#define SYMBOL_CAP 256
#define TEXT_CAP 1024          /* at most 1023 bytes per string value */
#define NAME_CAP 64            /* at most 63 bytes per identifier */
#define DEPTH_CAP 128

typedef enum {
    T_STRING, T_PRINT, T_ID, T_LITERAL, T_EQUAL, T_PLUS,
    T_LPAREN, T_RPAREN, T_SEMI, T_EOF
} TokenKind;

typedef struct {
    TokenKind kind;
    int start, length, line, column;
    char text[TEXT_CAP];        /* decoded literal or identifier */
} Token;

typedef enum { N_PROGRAM, N_DECL, N_ASSIGN, N_PRINT, N_CONCAT, N_LITERAL, N_ID } NodeKind;
typedef struct Node {
    NodeKind kind;
    Token *token;
    struct Node *left, *right, *next;
    int id, height;
} Node;

typedef struct {
    char name[NAME_CAP];
    int line, initialized, length;
    char value[TEXT_CAP];       /* filled only by the preview interpreter */
} Symbol;

static char source[SOURCE_CAP + 1];
static Token tokens[TOKEN_CAP];
static Node nodes[NODE_CAP];
static Symbol symbols[SYMBOL_CAP];
static int pos, line_no = 1, column_no = 1, token_count, node_count;
static int current, parse_depth, symbol_count, error_count;
static jmp_buf stop_compilation;

/* ---------- Diagnostics ---------- */
static void diagnostic(const char *phase, Token *token, const char *format, va_list args) {
    int start = token->start, end, i;
    fprintf(stderr, "%s error at %d:%d: ", phase, token->line, token->column);
    vfprintf(stderr, format, args);
    fputc('\n', stderr);
    while (start > 0 && source[start - 1] != '\n' && source[start - 1] != '\r') start--;
    if (token->start - start > 90) start = token->start - 60;
    end = start;
    while (source[end] && source[end] != '\n' && source[end] != '\r' && end - start < 120) end++;
    fputs("  ", stderr);
    for (i = start; i < end; i++) fputc(source[i] == '\t' ? ' ' : source[i], stderr);
    fputs("\n  ", stderr);
    for (i = start; i < token->start; i++) fputc(' ', stderr);
    fputs("^\n", stderr);
    error_count++;
}

static void fail(const char *phase, Token *token, const char *format, ...) {
    va_list args;
    va_start(args, format);
    diagnostic(phase, token, format, args);
    va_end(args);
    longjmp(stop_compilation, 1);
}

static void semantic_error(Token *token, const char *format, ...) {
    va_list args;
    va_start(args, format);
    diagnostic("Semantic", token, format, args);
    va_end(args);
}

/* ---------- 1. Lexical analyzer ---------- */
static int is_letter(unsigned char c) {
    return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c == '_';
}

static int is_digit(unsigned char c) { return c >= '0' && c <= '9'; }

static void advance(void) {
    if (source[pos] == '\r') {
        pos++;
        if (source[pos] == '\n') pos++;
        line_no++;
        column_no = 1;
    } else if (source[pos++] == '\n') {
        line_no++;
        column_no = 1;
    } else column_no++;
}

static Token location(void) {
    Token t;
    memset(&t, 0, sizeof(t));
    t.start = pos; t.line = line_no; t.column = column_no;
    return t;
}

static void lex(void) {
    while (1) {
        Token t;
        int length = 0;
        unsigned char c = (unsigned char) source[pos];
        if (c == ' ' || c == '\t' || c == '\r' || c == '\n') { advance(); continue; }
        if (c == '/' && source[pos + 1] == '/') {
            while (source[pos] && source[pos] != '\n' && source[pos] != '\r') advance();
            continue;
        }
        t = location();
        if (token_count >= TOKEN_CAP) fail("Lexical", &t, "Token limit is %d including EOF.", TOKEN_CAP);
        if (!c) {
            t.kind = T_EOF;
            tokens[token_count++] = t;
            return;
        }
        if (is_letter(c)) {
            while (is_letter((unsigned char) source[pos]) || is_digit((unsigned char) source[pos])) {
                if (length >= NAME_CAP - 1) fail("Lexical", &t, "Identifier limit is %d bytes.", NAME_CAP - 1);
                t.text[length++] = source[pos];
                advance();
            }
            t.text[length] = '\0';
            t.kind = strcmp(t.text, "string") == 0 ? T_STRING :
                     strcmp(t.text, "print") == 0 ? T_PRINT : T_ID;
        } else if (c == '"') {
            t.kind = T_LITERAL;
            advance();
            while (source[pos] != '"') {
                char decoded;
                if (!source[pos]) fail("Lexical", &t, "Unterminated string literal.");
                if (source[pos] == '\n' || source[pos] == '\r')
                    fail("Lexical", &t, "Raw newline in string. Use \\n instead.");
                if ((unsigned char) source[pos] < 32 || (unsigned char) source[pos] == 127)
                    fail("Lexical", &t, "Unescaped control character in string.");
                if (source[pos] == '\\') {
                    Token escape = location();
                    advance();
                    switch (source[pos]) {
                        case 'n': decoded = '\n'; break;
                        case 't': decoded = '\t'; break;
                        case 'r': decoded = '\r'; break;
                        case '\\': decoded = '\\'; break;
                        case '"': decoded = '"'; break;
                        case '\0': fail("Lexical", &t, "Unterminated escape in string."); return;
                        default: fail("Lexical", &escape, "Invalid escape. Allowed: \\n \\t \\r \\\\ \\\"."); return;
                    }
                } else decoded = source[pos];
                if (length >= TEXT_CAP - 1) fail("Lexical", &t, "String literal limit is %d bytes.", TEXT_CAP - 1);
                t.text[length++] = decoded;
                advance();
            }
            t.text[length] = '\0';
            advance();
        } else {
            switch (c) {
                case '=': t.kind = T_EQUAL; break;
                case '+': t.kind = T_PLUS; break;
                case '(': t.kind = T_LPAREN; break;
                case ')': t.kind = T_RPAREN; break;
                case ';': t.kind = T_SEMI; break;
                default: fail("Lexical", &t, "Unexpected character 0x%02X.", c); return;
            }
            advance();
        }
        t.length = pos - t.start;
        tokens[token_count++] = t;
    }
}

/* ---------- 2. Recursive-descent parser and AST ---------- */
static Token *peek(void) { return &tokens[current]; }

static Token *expect(TokenKind kind, const char *description) {
    Token *t = peek();
    if (t->kind != kind) fail("Syntax", t, "Expected %s.", description);
    current++;
    return t;
}

static Node *new_node(NodeKind kind, Token *token, Node *left, Node *right) {
    Node *n;
    int left_height = left ? left->height : 0;
    int right_height = right ? right->height : 0;
    if (node_count >= NODE_CAP) fail("Syntax", token, "AST node limit is %d.", NODE_CAP);
    n = &nodes[node_count];
    n->id = node_count++; n->kind = kind; n->token = token;
    n->left = left; n->right = right;
    n->height = 1 + (left_height > right_height ? left_height : right_height);
    if (n->height > DEPTH_CAP) fail("Syntax", token, "Expression nesting/depth limit is %d.", DEPTH_CAP);
    return n;
}

static Node *expression(void);

static Node *primary(void) {
    Token *t = peek();
    Node *n;
    if (t->kind == T_LITERAL || t->kind == T_ID) {
        current++;
        return new_node(t->kind == T_LITERAL ? N_LITERAL : N_ID, t, NULL, NULL);
    }
    if (t->kind == T_LPAREN) {
        current++;
        if (++parse_depth > DEPTH_CAP) fail("Syntax", t, "Parenthesis nesting limit is %d.", DEPTH_CAP);
        n = expression();
        expect(T_RPAREN, "')'");
        parse_depth--;
        return n; /* grouping punctuation does not need its own AST node */
    }
    fail("Syntax", t, "Expected a string literal, identifier, or '('.");
    return NULL;
}

static Node *expression(void) {
    Node *left = primary();
    while (peek()->kind == T_PLUS) {
        Token *operator_token = &tokens[current++];
        Node *right = primary();
        left = new_node(N_CONCAT, operator_token, left, right);
    }
    return left; /* loop builds a left-associative concatenation tree */
}

static Node *statement(void) {
    Token *t = peek();
    Token *name;
    Node *value = NULL;
    if (t->kind == T_STRING) {
        current++;
        name = expect(T_ID, "an identifier after 'string'");
        if (peek()->kind == T_EQUAL) { current++; value = expression(); }
        expect(T_SEMI, "';' after declaration");
        return new_node(N_DECL, name, value, NULL);
    }
    if (t->kind == T_ID) {
        current++;
        expect(T_EQUAL, "'=' after identifier");
        value = expression();
        expect(T_SEMI, "';' after assignment");
        return new_node(N_ASSIGN, t, value, NULL);
    }
    if (t->kind == T_PRINT) {
        current++;
        expect(T_LPAREN, "'(' after 'print'");
        value = expression();
        expect(T_RPAREN, "')' after output expression");
        expect(T_SEMI, "';' after print statement");
        return new_node(N_PRINT, t, value, NULL);
    }
    fail("Syntax", t, "Expected a declaration, assignment, or print statement.");
    return NULL;
}

static Node *parse(void) {
    Node *program = new_node(N_PROGRAM, peek(), NULL, NULL);
    Node **tail = &program->left;
    while (peek()->kind != T_EOF) {
        *tail = statement();
        tail = &(*tail)->next;
    }
    return program;
}

/* ---------- 3. Semantic checks and symbol table ---------- */
static int find_symbol(const char *name) {
    int i;
    for (i = 0; i < symbol_count; i++) if (strcmp(symbols[i].name, name) == 0) return i;
    return -1;
}

/* All grammar expressions have string type. Track their byte lengths as well. */
static int expression_length(Node *n) {
    int index, left, right;
    if (n->kind == N_LITERAL) return (int) strlen(n->token->text);
    if (n->kind == N_ID) {
        index = find_symbol(n->token->text);
        if (index < 0) { semantic_error(n->token, "Variable '%s' is not declared.", n->token->text); return -1; }
        if (!symbols[index].initialized) {
            semantic_error(n->token, "Variable '%s' is not initialized.", n->token->text);
            return -1;
        }
        return symbols[index].length;
    }
    left = expression_length(n->left);
    right = expression_length(n->right);
    if (left < 0 || right < 0) return -1;
    if (left + right >= TEXT_CAP) {
        semantic_error(n->token, "Concatenated string exceeds the %d-byte value limit.", TEXT_CAP - 1);
        return -1;
    }
    return left + right;
}

static void analyze(Node *program) {
    Node *n;
    for (n = program->left; n; n = n->next) {
        int index = find_symbol(n->token->text), length;
        if (n->kind == N_DECL) {
            if (index >= 0) {
                semantic_error(n->token, "Variable '%s' is already declared on line %d.",
                               n->token->text, symbols[index].line);
                continue;
            }
            if (symbol_count >= SYMBOL_CAP) { semantic_error(n->token, "Symbol limit is %d.", SYMBOL_CAP); continue; }
            index = symbol_count++;
            strcpy(symbols[index].name, n->token->text);
            symbols[index].line = n->token->line;
            if (n->left) {
                length = expression_length(n->left); /* self-reference sees an uninitialized symbol */
                if (length >= 0) { symbols[index].initialized = 1; symbols[index].length = length; }
            }
        } else if (n->kind == N_ASSIGN) {
            if (index < 0) semantic_error(n->token, "Variable '%s' is not declared.", n->token->text);
            length = expression_length(n->left);
            if (index >= 0 && length >= 0) { symbols[index].initialized = 1; symbols[index].length = length; }
        } else (void) expression_length(n->left);
    }
}

/* ---------- 4. Optional preview interpreter (only after semantic success) ---------- */
static void evaluate(Node *n, char *result) {
    if (n->kind == N_LITERAL) strcpy(result, n->token->text);
    else if (n->kind == N_ID) strcpy(result, symbols[find_symbol(n->token->text)].value);
    else {
        char right[TEXT_CAP];
        evaluate(n->left, result);
        evaluate(n->right, right);
        strcat(result, right); /* semantic analysis already proved the total length fits */
    }
}

static void preview(Node *program) {
    Node *n;
    puts("\n=== OUTPUT ===");
    for (n = program->left; n; n = n->next) {
        char value[TEXT_CAP];
        if (!n->left) continue;
        evaluate(n->left, value);
        if (n->kind == N_PRINT) puts(value);
        else strcpy(symbols[find_symbol(n->token->text)].value, value);
    }
}

/* ---------- 5. Human-readable tokens, AST, symbol table, DOT export ---------- */
static void quoted(FILE *out, const char *text, int length) {
    int i;
    fputc('"', out);
    for (i = 0; i < length; i++) {
        switch (text[i]) {
            case '\n': fputs("\\n", out); break;
            case '\t': fputs("\\t", out); break;
            case '\r': fputs("\\r", out); break;
            case '\\': fputs("\\\\", out); break;
            case '"': fputs("\\\"", out); break;
            default: fputc((unsigned char) text[i], out);
        }
    }
    fputc('"', out);
}

static void print_tokens(void) {
    static const char *names[] = { "STRING", "PRINT", "IDENTIFIER", "STRING_LITERAL", "EQUAL",
                                  "PLUS", "LPAREN", "RPAREN", "SEMICOLON", "EOF" };
    int i;
    puts("\n=== TOKENS ===\nLocation  Token            Raw lexeme");
    for (i = 0; i < token_count; i++) {
        Token *t = &tokens[i];
        printf("%d:%-6d %-16s ", t->line, t->column, names[t->kind]);
        quoted(stdout, source + t->start, t->length);
        if (t->kind == T_LITERAL) { fputs("  decoded=", stdout); quoted(stdout, t->text, (int) strlen(t->text)); }
        putchar('\n');
    }
}

static const char *node_name(NodeKind kind) {
    static const char *names[] = { "Program", "Declaration", "Assignment", "Print", "Concat", "Literal", "Identifier" };
    return names[kind];
}

static void print_tree(Node *n, int indent) {
    int i;
    Node *child;
    for (i = 0; i < indent; i++) fputs("  ", stdout);
    fputs(node_name(n->kind), stdout);
    if (n->kind == N_DECL || n->kind == N_ASSIGN || n->kind == N_ID) printf(" %s", n->token->text);
    if (n->kind == N_LITERAL) { putchar(' '); quoted(stdout, n->token->text, (int) strlen(n->token->text)); }
    putchar('\n');
    if (n->kind == N_PROGRAM) {
        for (child = n->left; child; child = child->next) print_tree(child, indent + 1);
    } else {
        if (n->left) print_tree(n->left, indent + 1);
        if (n->right) print_tree(n->right, indent + 1);
    }
}

static void print_symbols(int ran) {
    int i;
    puts("\n=== SYMBOL TABLE ===\nName                 Type     Line  Initialized  Bytes  Final preview value");
    for (i = 0; i < symbol_count; i++) {
        Symbol *s = &symbols[i];
        printf("%-20s string   %-5d %-12s %-6d ", s->name, s->line, s->initialized ? "yes" : "no", s->length);
        if (ran && s->initialized) quoted(stdout, s->value, (int) strlen(s->value));
        else fputs("(not evaluated)", stdout);
        putchar('\n');
    }
    if (!symbol_count) puts("(no variables)");
}

static int export_dot(const char *path) {
    int i, failed;
    FILE *file = fopen(path, "rb");
    /* Preserve existing readable files, including source files reached by aliases. */
    if (file) {
        fclose(file);
        fprintf(stderr, "I/O error: AST path '%s' already exists. Choose a new file.\n", path);
        return 0;
    }
    file = fopen(path, "w");
    if (!file) { fprintf(stderr, "I/O error: cannot write AST file '%s'.\n", path); return 0; }
    fputs("digraph AST {\n  node [shape=box];\n", file);
    for (i = 0; i < node_count; i++) {
        Node *n = &nodes[i];
        char label[TEXT_CAP + 32];
        if (n->kind == N_DECL || n->kind == N_ASSIGN || n->kind == N_ID || n->kind == N_LITERAL)
            snprintf(label, sizeof(label), "%s: %s", node_name(n->kind), n->token->text);
        else snprintf(label, sizeof(label), "%s", node_name(n->kind));
        fprintf(file, "  n%d [label=", n->id);
        quoted(file, label, (int) strlen(label));
        fputs("];\n", file);
        if (n->left) fprintf(file, "  n%d -> n%d;\n", n->id, n->left->id);
        if (n->right) fprintf(file, "  n%d -> n%d;\n", n->id, n->right->id);
        if (n->next) fprintf(file, "  n%d -> n%d [label=\"next\"];\n", n->id, n->next->id);
    }
    fputs("}\n", file);
    failed = ferror(file);
    if (fclose(file) != 0) failed = 1;
    if (failed) fprintf(stderr, "I/O error: failed writing AST file '%s'.\n", path);
    return !failed;
}

/* ---------- 6. Command line and pipeline ---------- */
static void usage(FILE *out) {
    fputs("Usage: mini_compiler FILE [options]\n"
          "  --all       Show tokens, AST, symbols and preview (default)\n"
          "  --run       Show phase status and preview only\n"
          "  --check     Check without running the preview\n"
          "  --tokens    Show token table\n"
          "  --ast       Show abstract syntax tree\n"
          "  --symbols   Show symbol table\n"
          "  --dot PATH  Export AST in Graphviz DOT format\n"
          "  --help      Show this help\n", out);
}

int main(int argc, char **argv) {
    const char *input = NULL, *dot = NULL;
    int show_tokens = 0, show_ast = 0, show_symbols = 0;
    int run = 1, detailed_option = 0, help = 0, i;
    size_t size;
    FILE *file;
    Node *program;
    for (i = 1; i < argc; i++) {
        if (!strcmp(argv[i], "--help")) help = 1;
        else if (!strcmp(argv[i], "--all")) { show_tokens = show_ast = show_symbols = 1; detailed_option = 1; }
        else if (!strcmp(argv[i], "--run")) detailed_option = 1;
        else if (!strcmp(argv[i], "--check")) { run = 0; detailed_option = 1; }
        else if (!strcmp(argv[i], "--tokens")) { show_tokens = 1; detailed_option = 1; }
        else if (!strcmp(argv[i], "--ast")) { show_ast = 1; detailed_option = 1; }
        else if (!strcmp(argv[i], "--symbols")) { show_symbols = 1; detailed_option = 1; }
        else if (!strcmp(argv[i], "--dot") && i + 1 < argc && argv[i + 1][0] != '-') dot = argv[++i];
        else if (argv[i][0] == '-' || input) { usage(stderr); return 2; }
        else input = argv[i];
    }
    if (help) { usage(stdout); return 0; }
    if (!input) { usage(stderr); return 2; }
    if (!detailed_option) show_tokens = show_ast = show_symbols = 1;
    file = fopen(input, "rb");
    if (!file) { fprintf(stderr, "I/O error: cannot open source file '%s'.\n", input); return 2; }
    size = fread(source, 1, sizeof(source), file);
    if (ferror(file)) { fclose(file); fputs("I/O error: cannot read source.\n", stderr); return 2; }
    fclose(file);
    if (size >= SOURCE_CAP) { fputs("I/O error: source limit is 65535 bytes.\n", stderr); return 2; }
    if (memchr(source, '\0', size)) { fputs("I/O error: source contains an embedded NUL byte.\n", stderr); return 2; }
    source[size] = '\0';
    /* Accept the optional UTF-8 BOM produced by some Windows editors. */
    if (size >= 3 && (unsigned char) source[0] == 0xEF &&
        (unsigned char) source[1] == 0xBB && (unsigned char) source[2] == 0xBF)
        memmove(source, source + 3, size - 2);
    puts("STRING PROCESSING MINI COMPILER (C99)");
    if (setjmp(stop_compilation)) { fflush(stdout); return 1; }
    lex();
    printf("[LEXER] OK - %d tokens including EOF\n", token_count);
    if (show_tokens) print_tokens();
    program = parse();
    printf("[PARSER] OK - %d AST nodes\n", node_count);
    if (show_ast) { puts("\n=== AST ==="); print_tree(program, 0); }
    analyze(program);
    if (error_count) { printf("[SEMANTIC] FAILED - %d error(s)\n", error_count); fflush(stdout); return 1; }
    printf("[SEMANTIC] OK - %d string symbol(s)\n", symbol_count);
    if (dot && !export_dot(dot)) return 2;
    if (run) preview(program);
    if (show_symbols) print_symbols(run);
    puts("\nCompilation successful.");
    if (fflush(stdout) == EOF || ferror(stdout)) {
        fputs("I/O error: cannot write compiler output.\n", stderr);
        return 2;
    }
    return 0;
}
