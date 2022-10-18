cordovaReady = true;
var allAudio = [];

function stopAllAudio(){
	var a = 0;
	while (a < allAudio.length){
		allAudio[a].pause();
		a++;
	}
	allAudio = [];
}

// Decides if there are any notices to show, and if so, creates them and shows them
function showNotices(){
	if (!localStorage.getItem("run-before")){
		document.getElementById("welcome-window-native").hidden = false;
		document.getElementById("atmos-logo").style = "animation: fadeOut 2s; animation-fill-mode: forwards;";
		return;
	}
	if (!cordovaReady){
		setTimeout(showNotices, 1000);
		return;
	}
	document.getElementById("atmos-logo").style = "animation: fadeOut 2s; animation-fill-mode: forwards;"
	// Hide geolocation settings
	document.getElementById("settings-device-location").hidden = true;
	var elementsList = document.querySelectorAll(`[value="alertmove"]`);
	var b = 0;
	while (b < elementsList.length){
		elementsList[b].remove();
		b++;
	}
	// Check if running the web browser version
	var platform = "unknown"
	if (navigator.platform.indexOf("Win") == 0){
		console.log("Atmos for Windows")
		platform = "desktop-windows"
	}
	else if (navigator.platform.indexOf("Mac") == 0){
		console.log("Atmos for Mac")
		platform = "desktop-mac"
	}
	else{
		console.log("Atmos for Linux/Other")
		platform = "desktop-linux"
	}
	
	// Important Notice About Weather Alerts
	if (!window.localStorage.getItem("notice-weatherAlerts")){
		document.getElementById("notice-window").innerHTML += `
		<h2>Important Information About Weather Warnings</h2>
		<hr>
		<h3>Although we strive to give rapid, accurate warning notifications 24/7, Atmos Weather should not be your only method of receiving emergency alerts. If internet service is lost or other errors occur, Atmos cannot give you alerts. All homes should have at least one weather radio with a battery backup so that they can receive weather information even when the power is out. Atmos Weather is not responsible for alerts not sending or the consequences of alerts not sending.</h3>
		<br><br>
		`
		document.getElementById("notice-window-container").hidden = false;
		window.localStorage.setItem("notice-weatherAlerts", "true");
	}
	
	// UPDATE
	if (!window.localStorage.getItem("notice-version1.0.1")){
		document.getElementById("notice-window").innerHTML += `
		<h2>Atmos Weather v1.0.1 is here!</h2>
		<hr>
		 <dl style='font-family: Secular One;'>
			<dt>New Features</dt>
  			<dd>- Removed Congressional App Challenge warning screen.</dd>
  			<dt>Bug Fixes Everywhere</dt>
  			<dd>- Auto updates are enabled again.</dd>
		</dl> 
		<br><br>
		`;
		document.getElementById("notice-window-container").hidden = false;
		window.localStorage.setItem("notice-version1.0.1", "true");
	}
	console.log(platform);
	if (platform == "pwa"){
		document.getElementById("settings-warning").hidden = false;
	}
}

// Check the version of Atmos being run
function getPlatform(){
	var platform = "unknown"
	if (navigator.platform.indexOf("Win") == 0){
		platform = "desktop-windows"
	}
	else if (navigator.platform.indexOf("Mac") == 0){
		platform = "desktop-mac"
	}
	else{
		platform = "desktop-linux"
	}
	window.platform = platform;
	return platform;
}