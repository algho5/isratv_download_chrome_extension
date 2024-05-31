import json
import requests
import os


def download_segment(base_url, segment, epi_name):
    response = requests.get(base_url + segment)
    if response.status_code == 200:
        with open(epi_name + " - " + segment, "wb") as f:
            f.write(response.content)


def download_episode(epi_name):
    with open(epi_name + ".json", "r") as f:
        data = json.load(f)

    if "url" in data:
        base_url = data["url"]
    else:
        return

    if "playlist" in data:
        playlist = data["playlist"]
    else:
        return

    print(epi_name + " downloading started")

    for segment in playlist:
        download_segment(base_url, segment, epi_name)

    print(epi_name + " Downloading ended")


current_dir = os.getcwd()
files = os.listdir(current_dir)
files = [f for f in files if f.endswith(".json")]
for f in files:
    download_episode(f.removesuffix(".json"))
