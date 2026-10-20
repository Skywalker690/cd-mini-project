"""Optional Python test runner. The compiler itself is entirely C."""
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
EXE = Path(os.environ.get('MINI_COMPILER', ROOT / 'build' / 'mini_compiler.exe'))


class CompilerTests(unittest.TestCase):
    def compile(self, source, *options):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / 'test.str'
            path.write_bytes(source.encode('utf-8') if isinstance(source, str) else source)
            return subprocess.run([str(EXE), str(path), *options], capture_output=True,
                                  encoding='utf-8', errors='replace')

    def error(self, source, phase, message):
        result = self.compile(source)
        self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
        self.assertIn(phase + ' error', result.stderr)
        self.assertIn(message.lower(), result.stderr.lower())
        self.assertNotIn('=== OUTPUT ===', result.stdout)
        return result

    def test_required_features(self):
        result = self.compile('string name = "Ada"; string msg; '
                              'msg = "Hello, " + name; print(msg);')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn('Hello, Ada', result.stdout)
        for feature in ['TOKENS', 'AST', 'SYMBOL TABLE', 'OUTPUT', 'Concat']:
            self.assertIn(feature, result.stdout)

    def test_escapes_decode_once(self):
        result = self.compile(r'print("a\nb\tc\r\"d\\e"); print("\\n");', '--run')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn('a\nb\tc\n"d\\e\n\\n\n', result.stdout)

    def test_parentheses_and_reassignment(self):
        result = self.compile('string x = "a"; x = x + ("b" + "c"); print(x + "d");')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn('abcd', result.stdout)

    def test_empty_program_and_literal(self):
        for source in ['', '// nothing', 'print("");']:
            self.assertEqual(self.compile(source).returncode, 0)

    def test_comments_crlf_keyword_boundaries(self):
        result = self.compile('// ignored\r\nstring stringer = "http://a";\r\nprint(stringer);')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn('http://a', result.stdout)
        self.assertIn('2:1', result.stdout)

    def test_utf8_and_case_sensitive_names(self):
        result = self.compile('string a = "नमस्ते"; string A = "🌟"; print(a + A);', '--run')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn('नमस्ते🌟', result.stdout)

    def test_invalid_escape(self):
        self.error(r'print("bad\q");', 'Lexical', 'escape')

    def test_unterminated_strings(self):
        for source in ['print("open);', 'print("tail' + '\\']:
            self.error(source, 'Lexical', 'Unterminated')

    def test_newline_and_control(self):
        self.error('print("line\nbreak");', 'Lexical', 'newline')
        self.error('print("tab\there");', 'Lexical', 'control')

    def test_invalid_characters_and_numbers(self):
        for source in ['print(42);', 'print("ok"); @', "print('bad');"]:
            self.error(source, 'Lexical', 'Unexpected')

    def test_embedded_nul(self):
        result = self.compile(b'print("ok");\0print(missing);')
        self.assertEqual(result.returncode, 2)
        self.assertIn('NUL', result.stderr)

    def test_syntax_errors(self):
        for source in ['string x = "a"', 'print("a" + );', 'print("a";',
                       'string = "a";', 'print();', 'string print = "a";', 'print("a"); )']:
            self.error(source, 'Syntax', 'Expected')

    def test_multiple_semantic_errors(self):
        result = self.error('string x; print(x); y = "a"; string x = "b";', 'Semantic', 'initialized')
        self.assertEqual(result.stderr.count('Semantic error'), 3)

    def test_self_reference_and_order(self):
        self.error('string x = x;', 'Semantic', 'initialized')
        self.error('print(x); string x = "later";', 'Semantic', 'declared')

    def test_failed_assignment(self):
        result = self.error('string x; x = missing; print(x);', 'Semantic', 'declared')
        self.assertIn('initialized', result.stderr)

    def test_no_execution_on_error(self):
        self.error('print("MUST_NOT_RUN"); print(unknown);', 'Semantic', 'declared')

    def test_source_location(self):
        self.assertIn('2:7', self.error('string x;\nprint(x);', 'Semantic', 'initialized').stderr)

    def test_check_disables_execution(self):
        result = self.compile('print("hidden");', '--check')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertNotIn('=== OUTPUT ===', result.stdout)

    def test_dot_export(self):
        with tempfile.TemporaryDirectory() as folder:
            dot = Path(folder) / 'tree.dot'
            result = self.compile(r'print("a\n\"b");', '--dot', str(dot))
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertIn('digraph AST', dot.read_text())
            self.assertIn('Print', dot.read_text())

    def test_literal_identifier_and_value_limits(self):
        self.assertEqual(self.compile('print("' + 'a' * 1023 + '");', '--check').returncode, 0)
        self.error('print("' + 'a' * 1024 + '");', 'Lexical', 'limit')
        self.error('string ' + 'x' * 64 + ';', 'Lexical', 'identifier')
        self.error('print("' + 'a' * 700 + '" + "' + 'b' * 400 + '");', 'Semantic', 'limit')

    def test_nesting_limit(self):
        self.error('print(' + '(' * 150 + '"a"' + ')' * 150 + ');', 'Syntax', 'nesting')

    def test_array_and_source_limits(self):
        self.error('print("");' * 1000, 'Lexical', 'token')
        self.error(''.join('string x%d;' % i for i in range(257)), 'Semantic', 'symbol')
        result = self.compile(' ' * 65536)
        self.assertEqual(result.returncode, 2)
        self.assertIn('source', result.stderr.lower())

    def test_cli_errors(self):
        for args in [[], ['missing.str'], ['--unknown'], ['--dot'], ['--help', '--unknown']]:
            result = subprocess.run([str(EXE), *args], capture_output=True, text=True)
            self.assertEqual(result.returncode, 2, str(args))
        self.assertEqual(subprocess.run([str(EXE), '--help'], capture_output=True).returncode, 0)

    def test_failed_export(self):
        result = self.compile('print("ok");', '--dot', str(ROOT / 'absent-folder' / 'tree.dot'))
        self.assertEqual(result.returncode, 2)
        self.assertNotIn('=== OUTPUT ===', result.stdout)

    def test_dot_preserves_existing_files(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / 'source.str'
            original = 'print("preserve source");'
            path.write_text(original)
            result = subprocess.run([str(EXE), str(path), '--dot', str(path)], capture_output=True)
            self.assertEqual(result.returncode, 2)
            self.assertEqual(path.read_text(), original)
            dot = Path(folder) / 'existing.dot'
            dot.write_text('preserve previous output')
            result = self.compile('print("ok");', '--dot', str(dot))
            self.assertEqual(result.returncode, 2)
            self.assertEqual(dot.read_text(), 'preserve previous output')

    def test_failed_stdout_is_not_success(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / 'source.str'
            path.write_text('print("ok");')
            reader, writer = os.pipe()
            os.close(reader)
            try:
                result = subprocess.run([str(EXE), str(path), '--run'], stdout=writer,
                                        stderr=subprocess.PIPE)
            finally:
                os.close(writer)
            self.assertNotEqual(result.returncode, 0)
            if os.name == 'nt':
                self.assertEqual(result.returncode, 2)
                self.assertIn(b'I/O error', result.stderr)


if __name__ == '__main__':
    unittest.main()
