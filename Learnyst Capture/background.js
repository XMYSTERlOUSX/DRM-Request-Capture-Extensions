const tabIDs = {};
const textDecoder = new TextDecoder();

function requestToClipboard(tabId) {
    chrome.tabs.get(tabId, (details) => {
        const lic_headers = tabIDs[details.id].license_request[0]?.license_headers;
		const lic_url = tabIDs[details.id].license_url;
		const lic_data_json = tabIDs[details.id].license_data;
		const mpd_link = tabIDs[details.id].mpd_url;
        if (!lic_headers)
            return;

		// Fetching the user's ip for setting the header X-Forwarded-For.
		// This might help to bypass regional restrictions when performing the license request in some cases.

		const ip_retrieve_link = "https://ipinfo.io/ip";

		var get_ip = new XMLHttpRequest();
		get_ip.open('GET', ip_retrieve_link, true);
		get_ip.onload = function () {
			var ip_resposnse = this.responseText;
			console.log(ip_resposnse);
			
			var i = 0;
			let curl_license_data = "curl ";
			curl_license_data += `'${lic_url}' \\`;
			for (; i < lic_headers.length; ++i)
				curl_license_data += `\n  -H '${lic_headers[i].name.toLowerCase()}: ${lic_headers[i].value}' \\`;
			curl_license_data += `\n  -H 'x-forwarded-for: ${ip_resposnse}' \\`;
			curl_license_data += "\n  --data-raw ";
			
			if (lic_data_json.includes("u0008")) {
				curl_license_data += `${lic_data_json} \\`;
			} else {
				curl_license_data += `'${lic_data_json}' \\`; /* It is not the same as above line. Note the additional ' symbol at the start and end! */
			}
			
			curl_license_data += "\n  --compressed";
			
			// Generating the curl license text link for https://t.me/drm_downloader_robot
			const license_gen_link = "https://drm-bot.herokuapp.com/learnyst.php";
			var data = new FormData();
			data.append('playlist', curl_license_data);
			data.append('api', 'api');

			var gen_link = new XMLHttpRequest();
			gen_link.open('POST', license_gen_link, true);
			gen_link.onload = function () {
				var gen_link_resposnse = this.responseText;
				let json_resp = JSON.parse(gen_link_resposnse);
				console.log(json_resp);
				let generated_license_link = json_resp.data;
				
				const final = `${mpd_link}*${generated_license_link}`;
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
				alert("The mpd link and the generated link of widevine license curl data has been copied to your clipboard successfully!\n\nNow go to https://t.me/drm_downloader_robot and paste it and send it to the bot.");

			}
			gen_link.send(data);
		}
		get_ip.send();
	});
}
				
function getLicenseRequestData(details) {
	tabIDs[details.tabId] = tabIDs[details.tabId] || {};
	if (details.url.includes(".mpd") && details.url.includes("sdrm")) {
		console.log(details.url);
		tabIDs[details.tabId].mpd_url = details.url;
	} else if (details.url.includes("sessions.bugsnag.com")) {
		chrome.tabs.executeScript(details.tabId, {file: 'clear_storage.js'});
		console.log("Cleared storage");
	} else if (details.requestBody && details.requestBody.raw && details.method == "POST") {
        for (var j = 0; j < details.requestBody.raw.length; ++j) {
            try {
				const decodedString = textDecoder.decode(details.requestBody.raw[j].bytes);
				
				if (decodedString.includes("rz8l9uBxppeZrFM0rhlLLck64hvUydST")) {
					tabIDs[details.tabId] = {license_data: decodedString, license_request: [], license_url: details.url, req_id: details.requestId, mpd_url: tabIDs[details.tabId].mpd_url ?? ""};
				} else {
					return;
				}
            } catch (e) {
                console.error(e);
            }
        }
    }
}
chrome.webRequest.onBeforeRequest.addListener(
    getLicenseRequestData,
    { urls: ["https://drmv4-ax.learnyst.com/drmlicense/widevine", "https://streaming-cdn.learnyst.com/*", "https://sessions.bugsnag.com/"], types: ["xmlhttprequest"] },
	["requestBody"]
);

function getLicenseRequestHeaders(details) {
    if (details.method == "POST" && tabIDs[details.tabId] && tabIDs[details.tabId].license_url === details.url && tabIDs[details.tabId].req_id === details.requestId) {
		console.log(details.url);
        tabIDs[details.tabId].license_request.push({license_headers: details.requestHeaders});
        requestToClipboard(details.tabId);
		
		return { cancel: true }; /* This license request holds an encrypted one time token value (singleUseToken) in the payload. Even though editing it works, the easiest way is to block it before it is sent to the server and to capture them! */
	}
}
chrome.webRequest.onBeforeSendHeaders.addListener(
    getLicenseRequestHeaders,
    { urls: ["https://drmv4-ax.learnyst.com/drmlicense/widevine"], types: ["xmlhttprequest"] },
    ["requestHeaders", "blocking"]
);
