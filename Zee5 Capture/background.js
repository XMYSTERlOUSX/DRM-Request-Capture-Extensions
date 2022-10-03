const tabIDs = {};
const textDecoder = new TextDecoder();

function requestToClipboard(tabId) {
    chrome.tabs.get(tabId, (details) => {
        const req_headers = tabIDs[details.id].playback_request[0]?.playback_headers;
		const req_url = tabIDs[details.id].playback_url;
		const req_data_json = tabIDs[details.id].playback_data;
        if (!req_headers)
            return;

		// Fetching the user's ip for setting the header x-forwarded-for.
		// This might help to bypass regional restrictions when performing the playback request in some cases.

		const ip_retrieve_link = "https://ipinfo.io/ip";

		var get_ip = new XMLHttpRequest();
		get_ip.open('GET', ip_retrieve_link, true);
		get_ip.onload = function () {
			var ip_resposnse = this.responseText;
			console.log(ip_resposnse);
			
			var i = 0;
			let curl_playback_data = "curl ";
			curl_playback_data += `'${req_url}' \\`;
			for (; i < req_headers.length; ++i)
				curl_playback_data += `\n  -H '${req_headers[i].name.toLowerCase()}: ${req_headers[i].value}' \\`;
			curl_playback_data += `\n  -H 'x-forwarded-for: ${ip_resposnse}' \\`;
			curl_playback_data += "\n  --data-raw ";
			curl_playback_data += `'${req_data_json}' \\`;
			curl_playback_data += "\n  --compressed";
			
			// Generating the curl license text link for https://t.me/drm_downloader_robot
			const zee5_gen_link = "https://drm-bot.herokuapp.com/zee5.php";
			var data = new FormData();
			data.append('playlist', curl_playback_data);
			data.append('api', 'api');

			var gen_link = new XMLHttpRequest();
			gen_link.open('POST', zee5_gen_link, true);
			gen_link.onload = function () {
				var gen_link_resposnse = this.responseText;
				let json_resp = JSON.parse(gen_link_resposnse);
				console.log(json_resp);
				let generated_playback_link = json_resp.data;
				
				const final = `${generated_playback_link}`;
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

				chrome.browserAction.setBadgeBackgroundColor({color: "#FF0000", tabId: details.id});
				chrome.browserAction.setBadgeText({text: "📋", tabId: details.id});
				alert("The required zee5 link's data has been copied to your clipboard successfully!\n\nNow go to https://t.me/drm_downloader_robot and paste it and send it to the bot.");

			}
			gen_link.send(data);
		}
		get_ip.send();
	});
}
				
function getPlaybackRequestData(details) {
	tabIDs[details.tabId] = tabIDs[details.tabId] || {};
	if (details.requestBody && details.requestBody.raw && details.method == "POST") {
        for (var j = 0; j < details.requestBody.raw.length; ++j) {
            try {
				const decodedString = textDecoder.decode(details.requestBody.raw[j].bytes);
				tabIDs[details.tabId] = {playback_data: decodedString, playback_request: [], playback_url: details.url, req_id: details.requestId};
            } catch (e) {
                console.error(e);
            }
        }
    }
}
chrome.webRequest.onBeforeRequest.addListener(
    getPlaybackRequestData,
    { urls: ["https://spapi.zee5.com/singlePlayback/getDetails/*"], types: ["xmlhttprequest"] },
	["requestBody"]
);

function getPlaybackRequestHeaders(details) {
    if (details.method == "POST" && tabIDs[details.tabId] && tabIDs[details.tabId].playback_url === details.url && tabIDs[details.tabId].req_id === details.requestId) {
		console.log(details.url);
        tabIDs[details.tabId].playback_request.push({playback_headers: details.requestHeaders});
        requestToClipboard(details.tabId);
	}
}
chrome.webRequest.onSendHeaders.addListener(
    getPlaybackRequestHeaders,
    { urls: ["https://spapi.zee5.com/singlePlayback/getDetails/*"], types: ["xmlhttprequest"] },
    ["requestHeaders"]
);