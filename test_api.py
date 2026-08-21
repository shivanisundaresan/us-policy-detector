# test_api.py
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).parent / 'src' / 'backend'))

from api import app  # noqa: E402


class ApiTestCase(unittest.TestCase):
    def setUp(self):
        self.app = app.test_client()
        self.app.testing = True

    def test_get_policy_info_missing_country(self):
        response = self.app.get('/api/policy-info')
        self.assertEqual(response.status_code, 400)
        self.assertIn('error', response.get_json())

    @patch('api.generate_ai_summary')
    @patch('api.fetch_articles')
    def test_get_policy_info_success(self, mock_fetch, mock_ai):
        mock_fetch.return_value = [
            {'title': 'X', 'url': 'https://example.com', 'description': 'd',
             'source': {'name': 'S'}, 'publishedAt': '2025-01-01T00:00:00Z'}
        ]
        mock_ai.return_value = {'summary': 'ok', 'top3': []}

        response = self.app.get('/api/policy-info?country=United%20States')
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertIn('summary', data)
        self.assertIn('top3', data)


if __name__ == '__main__':
    unittest.main()
