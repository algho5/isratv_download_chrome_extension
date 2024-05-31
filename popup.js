document.getElementById("loadVideo").addEventListener("click", loadVideo);
document.getElementById("download").addEventListener("click", downloadVideo);

async function loadVideo() {
  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: loadVideoInfo,
  });
}

async function downloadVideo() {
  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  let videos = [...document.getElementById("videos").children];
  // videos = videos.slice(0, 1); /////
  for (let video of videos) {
    const url = video.lastElementChild.getAttribute("id");
    const name = video.firstElementChild.innerHTML;
    console.log(url, name);
    await chrome.scripting
      .executeScript({
        target: { tabId: tab.id },
        func: downloadEpi,
        args: [{ url }],
      })
      .then(([res]) => {
        console.log(res.result);
        const jsonStr = JSON.stringify(res.result);
        const blob = new Blob([jsonStr], { type: "application/json" });
        const jsonUrl = URL.createObjectURL(blob);
        chrome.downloads.download({ url: jsonUrl, filename: `${name}.json` });
      });
  }
}

chrome.runtime.onMessage.addListener(async (req, sender, res) => {
  switch (req["type"]) {
    case "loaded_videos":
      addVideos(req["data"]);
      break;
    case "download":
      await downloadFile(req["data"]);
      break;
    default:
      break;
  }
});

function addVideos(data) {
  console.log(data);
  let videos = document.getElementById("videos");
  videos.innerHTML = "";
  data.map((val) => {
    let video = document.createElement("div");
    video.innerHTML = `<label for="${val.url}">${val.name}</label>
    <progress value="0" max="100" id="${val.url}"></progress>`;
    video.setAttribute("class", "video");
    videos.appendChild(video);
  });
  document.getElementById("download").removeAttribute("disabled");
  document.getElementById("loadVideo").setAttribute("disabled", true);
}

//////////////////////////////////

async function loadVideoInfo() {
  const name = document.querySelector("div.results_b.pb_7").textContent.trim();
  const mobs = [...document.querySelectorAll("div.mob_img_vod")];
  const data_infos = mobs.map((val) => {
    return {
      url: val.querySelector("a.pl_vod_load")["dataset"]["url"],
      name: `${name} - ${val.querySelector(".name").textContent}`,
    };
  });
  console.log(data_infos);
  await chrome.runtime.sendMessage({
    type: "loaded_videos",
    data: data_infos,
  });
}

async function downloadEpi({ url: data_url }) {
  const resp = await fetch(`${data_url}`);
  const json_data = await resp.json();
  const [{ urlport, file }] = json_data["playlist"];

  const reg = /\/[\w\.]*\.m3u8/;
  const file_url = file.slice(0, file.search(reg) + 1);

  console.log(urlport, file);

  const m3u8Resp = await fetch(`${urlport}${file}`);
  const m3u8 = await m3u8Resp.text();

  const playlist = m3u8
    .split("#")
    .filter((val) => val.startsWith("EXTINF"))
    .map((val) => val.slice(val.indexOf("\n") + 1, -1))
    .map((val) => val.slice(0, val.indexOf("?")));

  console.log(playlist);
  return { url: `${urlport}${file_url}`, playlist };
}
