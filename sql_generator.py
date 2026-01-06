"""
SQL Generator
Uses LLM to convert natural language queries to SQL.
"""

import os
import json
import re
import anthropic

from schema_context import SchemaContext


class SQLGenerator:
    """Generates SQL queries from natural language using an LLM."""

    def __init__(self):
        api_key = os.environ.get('ANTHROPIC_API_KEY')
        if api_key:
            self.client = anthropic.Anthropic(api_key=api_key)
        else:
            self.client = None

    def generate(self, natural_language_query, schema):
        """
        Generate SQL from a natural language query.

        Args:
            natural_language_query: The user's question in plain English
            schema: Dictionary containing table definitions

        Returns:
            Dictionary with 'sql' and 'explanation' keys
        """
        if not self.client:
            raise ValueError("Anthropic API key not configured. Set ANTHROPIC_API_KEY environment variable.")

        # Format schema for the prompt
        schema_context = SchemaContext()
        schema_context.set_schema(schema.get('tables', []))
        formatted_schema = schema_context.format_for_prompt()

        # Build the prompt
        system_prompt = self._build_system_prompt()
        user_prompt = self._build_user_prompt(formatted_schema, natural_language_query)

        # Call the LLM
        response = self.client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1024,
            system=system_prompt,
            messages=[
                {"role": "user", "content": user_prompt}
            ]
        )

        # Parse the response
        return self._parse_response(response.content[0].text)

    def _build_system_prompt(self):
        """Build the system prompt for SQL generation."""
        return """You are an expert SQL query generator for healthcare revenue cycle management data.
Your task is to convert natural language questions into accurate SQL queries.

Rules:
1. Generate only valid SQL syntax
2. Use proper JOIN clauses when querying multiple tables
3. Use table aliases for readability
4. Include appropriate WHERE clauses based on the question
5. Use aggregate functions (COUNT, SUM, AVG) when appropriate
6. Always consider data relationships defined in the schema
7. For revenue cycle data, be aware of common patterns:
   - Claims have statuses and may need filtering
   - Dates are important for aging and trending analysis
   - Financial amounts should use appropriate precision
   - Patient and encounter relationships are key

Output format:
Respond with a JSON object containing:
- "sql": The generated SQL query
- "explanation": Brief explanation of what the query does

Example response:
{
  "sql": "SELECT * FROM claims WHERE status = 'pending'",
  "explanation": "Retrieves all pending claims from the claims table."
}"""

    def _build_user_prompt(self, schema, query):
        """Build the user prompt with schema and query."""
        return f"""{schema}

USER QUESTION:
{query}

Generate a SQL query to answer this question. Return your response as a JSON object with "sql" and "explanation" fields."""

    def _parse_response(self, response_text):
        """Parse the LLM response to extract SQL and explanation."""
        # Try to parse as JSON first
        try:
            # Find JSON in the response (it might be wrapped in markdown code blocks)
            json_match = re.search(r'\{[\s\S]*\}', response_text)
            if json_match:
                result = json.loads(json_match.group())
                return {
                    'sql': result.get('sql', ''),
                    'explanation': result.get('explanation', '')
                }
        except json.JSONDecodeError:
            pass

        # Fallback: try to extract SQL from code blocks
        sql_match = re.search(r'```sql\s*([\s\S]*?)\s*```', response_text, re.IGNORECASE)
        if sql_match:
            return {
                'sql': sql_match.group(1).strip(),
                'explanation': 'Query generated from natural language.'
            }

        # Last resort: return the whole response as SQL
        return {
            'sql': response_text.strip(),
            'explanation': ''
        }
