"""The two launch modes must set the intended cookie policy."""

import os
import unittest
from io import BytesIO
from unittest.mock import Mock, patch

from .main import ReportHandler


class EnvironmentTests(unittest.TestCase):
    def test_cookie_secure_default_depends_on_environment(self):
        with patch.dict(os.environ, {}, clear=True):
            for environment, expected in (("development", False), ("production", True)):
                with self.subTest(environment=environment):
                    handler = Mock()
                    handler.environment = environment
                    handler.wfile = BytesIO()
                    ReportHandler._send(handler, 200, b"{}", "application/json", "visitor")
                    cookie = next(call.args[1] for call in handler.send_header.call_args_list
                                  if call.args[0] == "Set-Cookie")
                    self.assertEqual("; Secure" in cookie, expected)


if __name__ == "__main__":
    unittest.main()
