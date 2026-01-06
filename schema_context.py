"""
Schema Context Manager
Handles storage and formatting of database schema information.
"""

import json
import os


class SchemaContext:
    """Manages database schema context for SQL generation."""

    def __init__(self):
        self._tables = []

    def set_schema(self, tables):
        """Set the complete schema from a list of table definitions."""
        self._tables = []
        for table in tables:
            self._validate_table(table)
            self._tables.append(table)

    def add_table(self, table):
        """Add a single table to the schema."""
        self._validate_table(table)

        # Remove existing table with same name
        self._tables = [t for t in self._tables if t['name'] != table['name']]
        self._tables.append(table)

    def _validate_table(self, table):
        """Validate table structure."""
        if 'name' not in table:
            raise ValueError("Table must have a 'name' field")
        if 'columns' not in table:
            table['columns'] = []

    def get_schema(self):
        """Get the current schema as a dictionary."""
        return {'tables': self._tables}

    def clear(self):
        """Clear all schema information."""
        self._tables = []

    def format_for_prompt(self):
        """Format schema for LLM prompt."""
        if not self._tables:
            return "No schema defined."

        lines = ["DATABASE SCHEMA:"]
        lines.append("=" * 50)

        for table in self._tables:
            lines.append(f"\nTable: {table['name']}")
            if table.get('description'):
                lines.append(f"Description: {table['description']}")

            if table.get('columns'):
                lines.append("Columns:")
                for col in table['columns']:
                    col_line = f"  - {col['name']}"
                    if col.get('type'):
                        col_line += f" ({col['type']})"
                    if col.get('description'):
                        col_line += f": {col['description']}"
                    if col.get('primary_key'):
                        col_line += " [PRIMARY KEY]"
                    if col.get('foreign_key'):
                        col_line += f" [FK -> {col['foreign_key']}]"
                    lines.append(col_line)

            if table.get('relationships'):
                lines.append("Relationships:")
                for rel in table['relationships']:
                    lines.append(f"  - {rel}")

        return "\n".join(lines)

    def load_sample_schema(self):
        """Load the sample revenue cycle schema."""
        sample_path = os.path.join(os.path.dirname(__file__), 'sample_schema.json')
        with open(sample_path, 'r') as f:
            data = json.load(f)
        self.set_schema(data.get('tables', []))
