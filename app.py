"""
Revenue Cycle SQL Query Generator - Flask Application
A lightweight app for generating SQL queries from natural language.
"""

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
from dotenv import load_dotenv

from schema_context import SchemaContext
from sql_generator import SQLGenerator

load_dotenv()

app = Flask(__name__, static_folder='static')
CORS(app)

# Initialize components
schema_context = SchemaContext()
sql_generator = SQLGenerator()


@app.route('/')
def index():
    """Serve the main application page."""
    return send_from_directory('static', 'index.html')


@app.route('/api/schema', methods=['GET'])
def get_schema():
    """Get the current schema context."""
    return jsonify({
        'success': True,
        'schema': schema_context.get_schema()
    })


@app.route('/api/schema', methods=['POST'])
def set_schema():
    """Set or update the schema context."""
    data = request.get_json()

    if not data:
        return jsonify({'success': False, 'error': 'No data provided'}), 400

    try:
        schema_context.set_schema(data.get('tables', []))
        return jsonify({
            'success': True,
            'message': 'Schema updated successfully'
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400


@app.route('/api/schema/add-table', methods=['POST'])
def add_table():
    """Add a single table to the schema."""
    data = request.get_json()

    if not data or 'name' not in data:
        return jsonify({'success': False, 'error': 'Table name required'}), 400

    try:
        schema_context.add_table(data)
        return jsonify({
            'success': True,
            'message': f"Table '{data['name']}' added successfully"
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400


@app.route('/api/schema/clear', methods=['POST'])
def clear_schema():
    """Clear all schema context."""
    schema_context.clear()
    return jsonify({
        'success': True,
        'message': 'Schema cleared'
    })


@app.route('/api/generate-sql', methods=['POST'])
def generate_sql():
    """Generate SQL from natural language query."""
    data = request.get_json()

    if not data or 'query' not in data:
        return jsonify({'success': False, 'error': 'Query required'}), 400

    natural_language_query = data['query']
    schema = schema_context.get_schema()

    if not schema.get('tables'):
        return jsonify({
            'success': False,
            'error': 'No schema context set. Please define your data structure first.'
        }), 400

    try:
        result = sql_generator.generate(natural_language_query, schema)
        return jsonify({
            'success': True,
            'sql': result['sql'],
            'explanation': result.get('explanation', '')
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/load-sample-schema', methods=['POST'])
def load_sample_schema():
    """Load the sample revenue cycle schema."""
    try:
        schema_context.load_sample_schema()
        return jsonify({
            'success': True,
            'message': 'Sample revenue cycle schema loaded',
            'schema': schema_context.get_schema()
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
