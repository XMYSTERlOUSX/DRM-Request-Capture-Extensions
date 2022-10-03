(async () => {
    const b64 = {
        decode: s => Uint8Array.from(atob(s), c => c.charCodeAt(0)),
        encode: b => btoa(String.fromCharCode(...new Uint8Array(b)))
    };

    const fnproxy = (object, func) => new Proxy(object, { apply: func });

    const proxy = (object, key, func) => Object.defineProperty(object, key, {
        value: fnproxy(object[key], func)
    });
	
    proxy(MediaKeySession.prototype, 'update', async (_target, _this, _args) => {
        const [response] = _args;
		const resp = b64.encode(response)
		if (resp) {
			if (resp.startsWith("eyJ")) {
				console.groupCollapsed(
					`[EME] MediaKeySession::update\n` +
					`    Session ID: ${_this.sessionId || '(not available)'}\n` +
					`    Clearkeys Response: ${resp}`
				);
				window.postMessage({ type: "38405bbb-36ef-454d-8b32-346f9564c979", log: resp }, "*");
			}
		}
        console.trace();
        console.groupEnd();
        return _target.apply(_this, _args);
    });
})();