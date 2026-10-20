import unittest

from mini_compiler.compiler import compile_source
from mini_compiler.models import ast_to_dot, format_ast


class CompilerTests(unittest.TestCase):
    def test_all_required_features(self):
        result = compile_source('string name = "Ada"; string message; '
                                'message = "Hello, " + name; print(message);')
        self.assertTrue(result.success, result.diagnostics)
        self.assertEqual(result.output, ['Hello, Ada'])
        self.assertEqual(result.symbols['message']['value'], 'Hello, Ada')
        self.assertIn('Concat', format_ast(result.ast))
        self.assertIn('digraph AST', ast_to_dot(result.ast))

    def test_escapes_decode_once(self):
        result = compile_source(r'print("a\nb\tc\r\"d\\e"); print("\\n");')
        self.assertTrue(result.success)
        self.assertEqual(result.output, ['a\nb\tc\r"d\\e', '\\n'])
        literal = next(t for t in result.tokens if t.kind == 'STRING_LITERAL')
        self.assertIn(r'\n', literal.lexeme)

    def test_parentheses_and_left_associativity(self):
        result = compile_source('print("a" + ("b" + "c") + "d");')
        self.assertTrue(result.success)
        self.assertEqual(result.output, ['abcd'])
        self.assertEqual(result.ast.children[0].children[0].kind, 'Concat')

    def test_empty_program_and_strings(self):
        self.assertTrue(compile_source('// comment only').success)
        self.assertEqual(compile_source('print("");').output, [''])

    def test_unicode_string_and_case_sensitive_identifiers(self):
        result = compile_source('string a = "नमस्ते"; string A = "🌟"; print(a + A);')
        self.assertEqual(result.output, ['नमस्ते🌟'])

    def test_comments_and_crlf_positions(self):
        result = compile_source('// ignored\r\nstring x = "http://a";\r\nprint(x);')
        self.assertTrue(result.success)
        self.assertEqual(result.tokens[0].line, 2)
        self.assertEqual(result.tokens[0].column, 1)
        self.assertEqual(result.output, ['http://a'])

    def test_lexical_errors(self):
        for source, fragment in [
            (r'print("bad\q");', 'escape'),
            ('print("open);', 'Unterminated'),
            ('print("line\nbreak");', 'newline'),
            ('print("tab\there");', 'control'),
            ('print(42);', 'Unexpected'),
            ('print("ok"); @', 'Unexpected'),
            ('print("tail' + '\\', 'Unterminated'),
        ]:
            with self.subTest(source=source):
                result = compile_source(source)
                self.assertFalse(result.success)
                self.assertEqual(result.diagnostics[0].phase, 'Lexical')
                self.assertIn(fragment.lower(), result.diagnostics[0].message.lower())
                self.assertEqual(result.output, [])

    def test_syntax_errors(self):
        for source in ['string x = "a"', 'print("a" + );', 'print("a";',
                       'string = "a";', 'print();', 'string print = "a";',
                       'print("a"); )']:
            with self.subTest(source=source):
                result = compile_source(source)
                self.assertFalse(result.success)
                self.assertEqual(result.diagnostics[0].phase, 'Syntax')
                self.assertEqual(result.output, [])

    def test_multiple_semantic_errors(self):
        result = compile_source('string x; print(x); y = "a"; string x = "b";')
        self.assertFalse(result.success)
        self.assertEqual(len(result.diagnostics), 3)
        self.assertTrue(all(d.phase == 'Semantic' for d in result.diagnostics))
        self.assertFalse(result.symbols['x']['initialized'])
        self.assertEqual(result.output, [])

    def test_self_reference_and_failed_assignment(self):
        for source in ['string x = x;', 'string x; x = missing; print(x);',
                       'print(x); string x = "later";']:
            with self.subTest(source=source):
                result = compile_source(source)
                self.assertFalse(result.success)
                self.assertEqual(result.output, [])

    def test_reassignment_and_identifier_boundaries(self):
        result = compile_source('string stringer = "a"; '
                                'stringer = stringer + "b"; print(stringer);')
        self.assertTrue(result.success)
        self.assertEqual(result.output, ['ab'])

    def test_failure_never_executes_earlier_print(self):
        result = compile_source('print("must not run"); print(unknown);')
        self.assertFalse(result.success)
        self.assertEqual(result.output, [])

    def test_diagnostic_location_and_serialization(self):
        result = compile_source('string x;\nprint(x);')
        diag = result.to_dict()['diagnostics'][0]
        self.assertEqual((diag['line'], diag['column']), (2, 7))
        self.assertFalse(result.to_dict()['success'])
        self.assertEqual(result.to_dict()['ast']['kind'], 'Program')

    def test_deep_input_has_friendly_error(self):
        source = 'print(' + '(' * 1200 + '"x"' + ')' * 1200 + ');'
        result = compile_source(source)
        self.assertFalse(result.success)
        self.assertIn('nested', result.diagnostics[0].message.lower())


if __name__ == '__main__':
    unittest.main()
