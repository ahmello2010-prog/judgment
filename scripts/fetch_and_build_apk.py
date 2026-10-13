import os
import sys
import re
import urllib.request
import urllib.parse
import http.cookiejar
import zipfile
import hashlib

BASE_FOLDER_ID = "1nK7bvzizHO9Oshm3AlXrQqiZIEcm_Jng"
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
TARGET_DIR = os.path.join(PROJECT_ROOT, "public", "downloads")
TEMP_DIR = os.path.join(PROJECT_ROOT, "tmp_apk_unzipped")

os.makedirs(TARGET_DIR, exist_ok=True)
os.makedirs(TEMP_DIR, exist_ok=True)

cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))

visited_folders = set()
files_to_download = []

def crawl_folder(folder_id, current_path=""):
    if folder_id in visited_folders:
        return
    visited_folders.add(folder_id)
    url = f"https://drive.google.com/drive/folders/{folder_id}"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
    try:
        html = opener.open(req).read().decode("utf-8", errors="ignore")
    except Exception as e:
        print(f"[Error] reading folder {folder_id}: {e}")
        return

    rows = re.findall(r'<tr[^>]*data-id=\"([^\"]+)\"[^>]*>(.*?)</tr>', html, re.DOTALL)
    for doc_id, content in rows:
        name_m = re.search(r'<strong class=\"DNoYtb\">([^<]+)</strong>', content)
        if not name_m:
            continue
        name = name_m.group(1).strip()
        is_folder = "Shared folder" in content or "shared folder" in content.lower()
        full_path = f"{current_path}/{name}" if current_path else name
        if is_folder:
            crawl_folder(doc_id, full_path)
        else:
            files_to_download.append((doc_id, full_path))

print("Crawling Google Drive folder...")
crawl_folder(BASE_FOLDER_ID)
print(f"Total files found to download: {len(files_to_download)}")

def download_file(doc_id, rel_path):
    dest_path = os.path.join(TEMP_DIR, rel_path)
    os.makedirs(os.path.dirname(dest_path), exist_ok=True)

    url = f"https://drive.google.com/uc?export=download&id={doc_id}"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
    try:
        resp = opener.open(req)
        content_type = resp.headers.get("Content-Type", "")
        data = resp.read()

        # Check if confirmation page returned
        if "Virus scan warning" in data.decode("utf-8", errors="ignore") or "Google Drive - Download" in data.decode("utf-8", errors="ignore"):
            html = data.decode("utf-8", errors="ignore")
            form_m = re.search(r'<form[^>]*action=\"([^\"]+)\"[^>]*>(.*?)</form>', html, re.DOTALL)
            if form_m:
                action, body = form_m.groups()
                inputs = dict(re.findall(r'<input[^>]*name=\"([^\"]+)\"[^>]*value=\"([^\"]*)\"', body))
                confirm_url = action + "?" + urllib.parse.urlencode(inputs)
                req2 = urllib.request.Request(confirm_url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
                resp2 = opener.open(req2)
                data = resp2.read()

        with open(dest_path, "wb") as f:
            f.write(data)
        print(f"Downloaded: {rel_path} ({len(data)} bytes)")
        return True
    except Exception as e:
        print(f"Failed to download {rel_path} ({doc_id}): {e}")
        return False

# Download all files
for doc_id, rel_path in files_to_download:
    download_file(doc_id, rel_path)

print("\nAll files downloaded. Now building APK...")

apk_output_path = os.path.join(TARGET_DIR, "role-court.apk")
apk_release_copy = os.path.join(TARGET_DIR, "app-release.apk")

# APK structure rule:
# resources.arsc MUST be uncompressed (ZIP_STORED)
# Other files are ZIP_DEFLATED
with zipfile.ZipFile(apk_output_path, "w") as apk:
    # Walk TEMP_DIR
    for root, dirs, files in os.walk(TEMP_DIR):
        for file in files:
            full_fp = os.path.join(root, file)
            rel_fp = os.path.relpath(full_fp, TEMP_DIR)
            
            # Use ZIP_STORED for resources.arsc and uncompressed assets
            if rel_fp in ("resources.arsc",) or rel_fp.endswith((".png", ".jpg", ".mp3", ".ogg")):
                compress_type = zipfile.ZIP_STORED
            else:
                compress_type = zipfile.ZIP_DEFLATED
            
            apk.write(full_fp, arcname=rel_fp, compress_type=compress_type)

# Create copy
import shutil
shutil.copyfile(apk_output_path, apk_release_copy)

apk_size = os.path.getsize(apk_output_path)
print(f"SUCCESS! APK generated at {apk_output_path} ({apk_size} bytes / {apk_size / (1024*1024):.2f} MB)")
