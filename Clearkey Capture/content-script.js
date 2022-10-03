(() => {
    "use strict";

    window.addEventListener("message", (event) => {
        if (event.source != window)
            return;

        if (event.data.type && event.data.type === "38405bbb-36ef-454d-8b32-346f9564c979") {
            if (event.data.log)
                chrome.runtime.sendMessage(event.data.log);
        }
    }, false);

    const script = document.createElement("script");
    script.type = "text/javascript";
    script.defer = false;
    script.async = false;
    script.src = chrome.extension.getURL("/eme-logger-mod.js");
    (document.head || document.documentElement).appendChild(script);
    script.remove();
})();