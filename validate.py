import json
import sys

try:
    import jsonschema
except ImportError:
    print("Error: The 'jsonschema' library is not installed.")
    print("Please install it by running: pip install jsonschema")
    sys.exit(1)

def validate_data(data_path, schema_path):
    # Load the files
    try:
        with open(data_path, 'r') as f:
            data = json.load(f)
    except json.JSONDecodeError as e:
        print(f"❌ Error reading {data_path} - Invalid JSON structure: {e}")
        sys.exit(1)
    except FileNotFoundError:
        print(f"❌ Error: {data_path} not found.")
        sys.exit(1)

    try:
        with open(schema_path, 'r') as f:
            schema = json.load(f)
    except json.JSONDecodeError as e:
        print(f"❌ Error reading {schema_path} - Invalid JSON structure: {e}")
        sys.exit(1)
    except FileNotFoundError:
        print(f"❌ Error: {schema_path} not found.")
        sys.exit(1)

    # Perform validation
    try:
        jsonschema.validate(instance=data, schema=schema)
        print(f"✅ Success! '{data_path}' strictly matches the '{schema_path}' schema.")
    except jsonschema.exceptions.ValidationError as err:
        print("❌ Validation Failed!")
        print(f"Message: {err.message}")
        
        # Build the path to the error
        if err.path:
            path_str = " -> ".join(str(p) for p in err.path)
            print(f"Location in data: {path_str}")
            
        sys.exit(1)
    except jsonschema.exceptions.SchemaError as err:
        print(f"❌ The provided schema is invalid: {err.message}")
        sys.exit(1)

if __name__ == '__main__':
    DATA_FILE = 'data.json'
    SCHEMA_FILE = 'schema.json'
    print(f"Validating {DATA_FILE} against {SCHEMA_FILE}...\n")
    validate_data(DATA_FILE, SCHEMA_FILE)
