const tabIDs = {};
const textDecoder = new TextDecoder();

function requestToClipboard(dataId, tabTd) {
	let clearkeyData = tabIDs[dataId].clearkey_data;
	const clearkey_gen_link = "https://drm-bot.herokuapp.com/clearkey.php";
	var data = new FormData();
	data.append('playlist', clearkeyData);
	data.append('api', 'api');
	var gen_link = new XMLHttpRequest();
	gen_link.open('POST', clearkey_gen_link, true);
	gen_link.onload = function () {
		var gen_link_resposnse = this.responseText;
		let json_resp = JSON.parse(gen_link_resposnse);
		console.log(json_resp);
		let generated_clearkey_link = json_resp.data;
		const final = `${tabIDs[dataId].mpd_url}*${generated_clearkey_link}`;
		console.log(final);
		
		const copyText = document.createElement("textarea");
		copyText.style.position = "absolute";
		copyText.style.left = "-5454px";
		copyText.style.top = "-5454px";
		copyText.style.opacity = 0;
		document.body.appendChild(copyText);
		copyText.value = final;
		copyText.select();
		document.execCommand("copy");
		document.body.removeChild(copyText);
		
		chrome.browserAction.setBadgeBackgroundColor({color: "#FF0000", tabId: tabTd});
		chrome.browserAction.setBadgeText({text: "📋", tabId: tabTd});
		alert("The required data to download this clearkey video has been copied to your clipboard successfully!\n\nNow go to https://t.me/drm_downloader_robot and paste it and send it to the bot.");
	}
	gen_link.send(data);
}

function getManifestUrl(details) {
    tabIDs[9999] = tabIDs[9999] || {};
	if (details.url.includes(".mpd")) {
		tabIDs[9999] = {mpd_url: details.url, clearkey_data: ""};
		console.log(`MPD URL:- ${details.url}`);
	}
}
chrome.webRequest.onBeforeRequest.addListener(
    getManifestUrl,
    { urls: ["<all_urls>"], types: ["xmlhttprequest"] },
	["requestBody"]
);

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (!request || !sender.tab)
        return;
    tabIDs[9999] = tabIDs[9999] || {};
	if (tabIDs[9999].clearkey_data === "") {
		tabIDs[9999].clearkey_data = request;
		console.log(`CLEARKEY DATA:- ${tabIDs[9999].clearkey_data}`);
		requestToClipboard(9999, sender.tab.id);
	}
});