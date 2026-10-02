import os
import re
import sys

def resolve_import(base_file, import_path):
    if not import_path.startswith('.'):
        if import_path.startswith('@/'):
            import_path = import_path.replace('@/', 'src/', 1)
            base_dir = '.'
        elif import_path.startswith('@app/'):
            import_path = import_path.replace('@app/', 'src/app/', 1)
            base_dir = '.'
        elif import_path.startswith('@core/'):
            import_path = import_path.replace('@core/', 'src/core/', 1)
            base_dir = '.'
        elif import_path.startswith('@shared/'):
            import_path = import_path.replace('@shared/', 'src/shared/', 1)
            base_dir = '.'
        elif import_path.startswith('@modules/'):
            import_path = import_path.replace('@modules/', 'src/modules/', 1)
            base_dir = '.'
        else:
            return True # External module
    else:
        base_dir = os.path.dirname(base_file)
    
    target_path = os.path.normpath(os.path.join(base_dir, import_path))
    
    # Try different extensions
    extensions = ['', '.js', '.jsx', '.ts', '.tsx', '/index.js', '/index.jsx', '/index.ts', '/index.tsx']
    for ext in extensions:
        if os.path.exists(target_path + ext):
            return True
    
    return False

def check_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Regex to find ES6 imports
    import_regex = re.compile(r'import\s+.*?from\s+[\'"]([^\'"]+)[\'"]')
    imports = import_regex.findall(content)
    
    for imp in imports:
        if not resolve_import(file_path, imp):
            print(f"File: {file_path} -> Missing import: {imp}")

def main():
    src_dir = 'src'
    for root, _, files in os.walk(src_dir):
        for file in files:
            if file.endswith(('.js', '.jsx', '.ts', '.tsx')):
                check_file(os.path.join(root, file))

if __name__ == "__main__":
    os.chdir('c:\\Users\\maicr\\OneDrive\\Desktop\\Demo\\frontend')
    main()
