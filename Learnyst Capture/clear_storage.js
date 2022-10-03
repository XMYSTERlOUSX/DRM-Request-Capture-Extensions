(function() {
	var ses = `
window.localStorage.clear();`;
	var script  = document.createElement('script');
	script.innerHTML = ses;
	document.body.appendChild(script);
})();