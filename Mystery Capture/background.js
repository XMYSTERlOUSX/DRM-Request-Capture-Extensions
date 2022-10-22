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
			const license_gen_link = "https://drm-bot.herokuapp.com/gen.php";
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
				console.log("The mpd link and the generated link of widevine license curl data has been copied to your clipboard successfully!\n\nNow go to https://t.me/drm_downloader_robot and paste it and send it to the bot.");

			}
			gen_link.send(data);
		}
		get_ip.send();
	});
}
				
function getLicenseRequestData(details) {
	tabIDs[details.tabId] = tabIDs[details.tabId] || {};
	if (details.url.includes(".mpd")) {
		console.log(details.url);
		tabIDs[details.tabId].mpd_url = details.url;
	} else if (details.requestBody && details.requestBody.raw && details.method == "POST") {
        for (var j = 0; j < details.requestBody.raw.length; ++j) {
            try {
				const decodedString = textDecoder.decode(details.requestBody.raw[j].bytes);
				const encodedString = btoa(unescape(encodeURIComponent(decodedString)));
				
				// If the license request does not uses json payloads the data has been sent in raw format. 
				// But the base64 encoded format of it will have the characters "CAES".
				if (encodedString.includes("CAES")) {
					tabIDs[details.tabId] = {license_data: `$'\\u0008\\u0004'`, license_request: [], license_url: details.url, req_id: details.requestId, mpd_url: tabIDs[details.tabId].mpd_url ?? ""};
					
				// If the license request uses json payloads the charcters "CAES" will be there in almost all cases.
				} else if (decodedString.includes("CAES") || details.url.includes("license") && decodedString.includes("token") && decodedString.length > 4000 || decodedString.includes("8,1,18")) {
					tabIDs[details.tabId] = {license_data: decodedString, license_request: [], license_url: details.url, req_id: details.requestId, mpd_url: tabIDs[details.tabId].mpd_url ?? ""};
				} else {
					return;
				}
            } catch (e) {
                console.error(e);
            }
        }
    } else if (details.requestBody && details.requestBody.formData && details.method == "POST") {
		try {
			if (details.requestBody.formData.widevine2Challenge) {
				const challenge = String(details.requestBody.formData.widevine2Challenge)
				if (challenge.includes("CAES")) {
					const decodedString = `widevine2Challenge=${challenge}&includeHdcpTestKeyInLicense=true`;
					tabIDs[details.tabId] = {license_data: decodedString, license_request: [], license_url: details.url, req_id: details.requestId, mpd_url: tabIDs[details.tabId].mpd_url ?? ""};
				}
			} else {
				return;
			}
		} catch (e) {
			console.error(e);
		}
	}
}
chrome.webRequest.onBeforeRequest.addListener(
    getLicenseRequestData,
    { urls: ["<all_urls>"], types: ["xmlhttprequest"] },
	["requestBody"]
);

function getLicenseRequestHeaders(details) {
    if (details.method == "POST" && tabIDs[details.tabId] && tabIDs[details.tabId].license_url === details.url && tabIDs[details.tabId].req_id === details.requestId) {
		console.log(details.url);
        tabIDs[details.tabId].license_request.push({license_headers: details.requestHeaders});
        requestToClipboard(details.tabId);
		
		// Some license requests can hold one time token values in their headers or payload. So blocking such requests before they are sent to the server and capturing them!
		// If your license request also holds one time values add them in the below line, seprating by an || operator. Remember to disable the extension if you actually need to play the video of these services!
		if (details.url.includes("api2.hbogoasia.com/onwards-widevine") || details.requestHeaders.includes("prepladder.com") || details.url.includes("scvm1sc0.anycast.nagra.com") || details.url.includes("wvls/contentlicenseservice/v1/licenses") || details.url.includes("license.vdocipher.com/auth")) {
			return { cancel: true };
		}
	}
}
chrome.webRequest.onBeforeSendHeaders.addListener(
    getLicenseRequestHeaders,
    { urls: ["<all_urls>"], types: ["xmlhttprequest"] },
    ["requestHeaders", "blocking"]
);
