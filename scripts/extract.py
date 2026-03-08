import zipfile
import sys
import os

zip_path = r"public\images\stitch_juhuri_heritage_design_system.zip"
out_dir = r"tmp-stitch-app"

try:
    with zipfile.ZipFile(zip_path, 'r') as zip_ref:
        zip_ref.extractall(out_dir)
    print(f"Successfully extracted to {out_dir}")
    print("Files:")
    for root, dirs, files in os.walk(out_dir):
        for name in files:
            print(os.path.join(root, name))
except Exception as e:
    print(f"Extraction failed: {e}")
