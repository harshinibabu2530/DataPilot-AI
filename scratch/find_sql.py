import os

def find_sql_files():
    for root, dirs, files in os.walk("."):
        if "node_modules" in root or ".git" in root or "__pycache__" in root:
            continue
        for file in files:
            if file.endswith(".sql") or "schema" in file.lower():
                print(os.path.join(root, file))

if __name__ == "__main__":
    find_sql_files()
