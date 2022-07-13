const { app, BrowserWindow, Notification, Tray, Menu, net} = require('electron')
var win2 = null;
var weatherLocations;
var locationNames;
var locationCache;
var settings;
var notifiedAlerts = [];
var cycleAt = 0;
var lastNetworkCheck = true;
const createWindow = () => {
const win = new BrowserWindow({
    width: 800,
    height: 600,
	icon: __dirname + "/img/icon.png",
	autoHideMenuBar: true,
	show: false
})
win2 = win;
  win.loadFile('index.html')
}

// Check if app is already running to prevent multiple background instances
const singleAppLock = app.requestSingleInstanceLock();
if (!singleAppLock){
	app.quit();
}
else{
	// Run at system startup (TODO: Have a setting)
	app.setLoginItemSettings({
		openAtLogin: true
	})
	app.on('second-instance', (event, commandLine, workingDirectory, additionalData) => {
		if (win2 == null){
			createWindow();
		}
		win2.show()
		if (win2.isMinimized()){
			win2.restore();
			win2.focus();
		}
	})
	app.whenReady().then(() => {
		if (process.platform === 'win32'){
			app.setAppUserModelId("Atmos Weather");
		}
		createWindow()
		let trayIcon = new Tray(__dirname + "/img/icon.png")
		trayIcon.setToolTip('Atmos Weather')
		const trayMenuTemplate = [{
				   label: 'Atmos Weather',
				   enabled: false
				},
				{
				   label: 'About Atmos Weather',
				   enabled: true
				},
				{
					label: 'Quit',
					enabled: true,
					click: () => {
						app.quit()
					}
				}
			 ]

			 let trayMenu = Menu.buildFromTemplate(trayMenuTemplate)
			 trayIcon.setContextMenu(trayMenu)
			 trayIcon.on('click', function(e){
				// If window was destroyed, create a new one. Otherwise, show current window.
				if (win2 == null){
					win2 = new BrowserWindow({
						width: 800,
						height: 600,
						icon: __dirname + "/img/icon.png",
						autoHideMenuBar: true
					});
					win2.loadFile('index.html')
					win2.hide()
				}
				if (win2.isVisible()) {
					win2.hide()
				} else {
					// Refresh displayed weather data so that old data is not shown to the user
					win2.webContents.executeJavaScript('refreshLocations();', false);
					win2.show()
				}
			});

	})

	app.on("window-all-closed", () => {
		win2 = null;
	})
}

setInterval(function(){
	if (win2 == null){
		createWindow();
	}
	// Get app settings from window localStorage
	win2.webContents.executeJavaScript('localStorage.getItem("weather-locations");', true)
		.then(result => {
			weatherLocations = JSON.parse(result);
	});
	win2.webContents.executeJavaScript('localStorage.getItem("weather-location-names")', true)
		.then(result =>{
		locationNames = JSON.parse(result);
	});
	win2.webContents.executeJavaScript('localStorage.getItem("nws-location-cache")', true)
		.then(result =>{
		locationCache = JSON.parse(result);
	});
	win2.webContents.executeJavaScript('localStorage.getItem("atmos-settings")', true)
		.then(result => {
		settings = JSON.parse(result);
	});
	win2.webContents.executeJavaScript('navigator.onLine', true)
		.then(result => {
		isOnline = result;
	});
	setTimeout(checkLocation, 100);
	cycleAt++;
}, 10000);

// Check the location for alerts
function checkLocation(){
	if (locationNames == undefined){
		setTimeout(checkLocation, 200);
		return;
	}
	if (cycleAt >= locationNames.length){
		cycleAt = 0;
	}
	if (locationNames.length > 0){
		alertCheck("https://api.weather.gov/alerts/active?point=" + weatherLocations[cycleAt]["lat"] + "," + weatherLocations[cycleAt]["lon"]);
	}
	win2.webContents.executeJavaScript('localStorage.getItem("lastForecastNotification' + locationNames[cycleAt] + '");', true)
		.then(result => {
			var date = new Date();
			var dateString = date.getMonth() + "-" + date.getDate() + "-" + date.getFullYear();
			if (result != dateString){
				var severeNotification =  settings["notifications"]["severe-future"];
				var rainNotification = settings["notifications"]["rain-future"];
				if (settings["per-location"][locationNames[cycleAt]] != undefined){
					if (settings["per-location"][locationNames[cycleAt]]["notifications"]["severe-future"] != undefined){
						severeNotification =  settings["per-location"][locationNames[cycleAt]]["notifications"]["severe-future"];
					}
					if (settings["per-location"][locationNames[cycleAt]]["notifications"]["rain-future"] != undefined){
						rainNotification =  settings["per-location"][locationNames[cycleAt]]["notifications"]["rain-future"];
					}
				}
				if (severeNotification || rainNotification){
					try{
						var forecastLink = JSON.parse(locationCache[locationNames[cycleAt]])["properties"]['forecast'];
						var notificationRequest = net.request(forecastLink);
						notificationRequest.on("response", (response) => {
							response.on("data", (chunk) => {
								try{
									chunk = JSON.parse(chunk);
									var fullForecast = chunk["properties"]["periods"][0]["detailedForecast"] + " " + chunk["properties"]["periods"][1]["detailedForecast"];
									var fullForecastCaps = fullForecast;
									win2.webContents.executeJavaScript('localStorage.setItem("lastForecastNotification' + locationNames[cycleAt] + '", "' + dateString + '");')
									fullForecast = fullForecast.toLowerCase();
									// Check for severe trigger words
									if (fullForecast.includes("severe") || fullForecast.includes("tropical") || fullForecast.includes("strong") || fullForecast.includes("tornado") || fullForecast.includes("damaging") || fullForecast.includes("damage") || fullForecast.includes("hail")){
										new Notification({ title: "Future severe weather expected at " + locationNames[cycleAt], body: fullForecastCaps, icon: __dirname + "/img/icon.png"}).show();
									}
									else{
										if (rainNotification){
											// Check rain trigger words
											if (fullForecast.includes("rain") || fullForecast.includes("storm")){
												new Notification({ title: "Future rain/storms expected at " + locationNames[cycleAt], body: fullForecastCaps, icon: __dirname + "/img/icon.png"}).show();
											}
										}
									}
								}
								catch(err){
									console.log("There was an error getting the forecast.")
								}
							})
						})
						notificationRequest.on("error", (error)=>{
							// Decide if should give offline notification (TODO - Add offline notification settings)
							if (error.message == "net::ERR_NETWORK_IO_SUSPENDED"){
								console.log("Computer is going to sleep.")
							}
							else{
								if (lastNetworkCheck){
									lastNetworkCheck = false;
									console.log("Computer is now offline.")
								}
							}
						})
						notificationRequest.end()
					}
					catch (err){
						console.log(err)
					}
				}
				else{
					win2.webContents.executeJavaScript('localStorage.setItem("lastForecastNotification' + locationNames[cycleAt] + '", "' + dateString + '");')
				}
			}
	});
}

// Check the location at for alerts
function alertCheck(urlGet){
	var request = net.request(urlGet);
	request.on("response", (response) => {
		lastNetworkCheck = true;
		response.on('data', (chunk) => {
			if (!notifiedAlerts){
				notifiedAlerts = [];
			}
			chunk = JSON.parse(chunk);
			chunk = chunk["features"];
			var at = 0;
			while (at < chunk.length){
				// Get Alert Settings
				if (!notifiedAlerts.includes(chunk[at]["id"])){
					console.log(locationNames[cycleAt])
					var eventType = chunk[at]["properties"]["event"];
					if (eventType.includes("Red Flag Warning")){
						eventType = "Fire Weather Warning";
					}
					var notificationSetting = "soundnotification";
					var notificationSound = settings["location-alerts"]["default-notification"];
					var alertSound = settings["location-alerts"]["default-alert"];
					eventType = eventType.toLowerCase().replaceAll(" ", "-");
					console.log(eventType.replace("-watch", ""));
					if (eventType.includes("warning")){
						notificationSetting = settings["alert-types"]["warnings"][eventType.replace("-warning", "")];
					}
					else if (eventType.includes("watch")){
						notificationSetting = settings["alert-types"]['watches'][eventType.replace("-watch", "")];
					}
					else{
						notificationSetting = settings["alert-types"]["advisory"][eventType.replace("-advisory", "")];
					}
					// Check if has location specific settings
					if (settings["per-location"][locationNames[cycleAt]] != undefined){
						if (eventType.includes("warning")){
							if (settings["per-location"][locationNames[cycleAt]]["alert-types"]["warnings"][eventType.replace("-warning", "")] != undefined){
								notificationSetting = settings["per-location"][locationNames[cycleAt]]["alert-types"]["warnings"][eventType.replace("-warning", "")];
							}
						}
						else if (eventType.includes("watches")){
							if (settings["per-location"][locationNames[cycleAt]]["alert-types"]["watches"] != undefined){
								notificationSetting = settings["per-location"][locationNames[cycleAt]]["alert-types"]["watches"][eventType.replace("-watch", "")];
							}
							notificationSetting = settings["alert-types"]["watches"][eventType.replace("-watch", "")];
						}
						else{
							if (settings["per-location"][locationNames[cycleAt]]["alert-types"]["advisory"][eventType.replace("-advisory", "")] != undefined){
								notificationSetting = settings["per-location"][locationNames[cycleAt]]["alert-types"]["advisory"][eventType.replace("-advisory", "")];	
							}
						}
						if (settings["per-location"][locationNames[cycleAt]]["location-alerts"]["default-notification"] != undefined){
							notificationSound = settings["per-location"][locationNames[cycleAt]]["location-alerts"]["default-notification"];
						}
						if (settings["per-location"][locationNames[cycleAt]]["location-alerts"]["default-alert"] != undefined){
							alertSound = settings["per-location"][locationNames[cycleAt]]["location-alerts"]["default-alert"];
						}
					}
					if (notificationSetting == undefined){
						notificationSetting = "soundnotification";
					}
					if (notificationSetting == "alert"){
						new Notification({ title: chunk[at]["properties"]["event"] + " issued for " + locationNames[cycleAt], body: chunk[at]["properties"]["description"], urgency: "critical", timeoutType: 'never', silent: true, sound: __dirname + "/audio/readynownotification.mp3", icon: __dirname + "/img/warning.png"}).show()
						win2.webContents.executeJavaScript("var audio = new Audio('audio/" + alertSound + "extended.mp3');audio.play();", false);
					}
					else if (notificationSetting == "silentnotification"){
						new Notification({ title: chunk[at]["properties"]["event"] + " issued for " + locationNames[cycleAt], body: chunk[at]["properties"]["description"], urgency: "critical", timeoutType: 'never', silent: true, sound: __dirname + "/audio/readynownotification.mp3", icon: __dirname + "/img/alerts.png"}).show()
					}
					else if (notificationSetting == "soundnotification"){
						if (chunk[at]["properties"]["event"].toLowerCase().includes("watch")){
							new Notification({ title: chunk[at]["properties"]["event"] + " issued for " + locationNames[cycleAt], body: chunk[at]["properties"]["description"], silent: true, icon: __dirname + "/img/watch.png"}).show();
						}
						else{
							new Notification({ title: chunk[at]["properties"]["event"] + " issued for " + locationNames[cycleAt], body: chunk[at]["properties"]["description"], silent: true, icon: __dirname + "/img/alerts.png"}).show();
						}
						win2.webContents.executeJavaScript("var audio = new Audio('audio/" + notificationSound + "notification.mp3');audio.play();", false);
					}
					locationNames[cycleAt]
					console.log(notificationSetting);
					notifiedAlerts.push(chunk[at]["id"]);
				}
				at++;
			}
		})
	})
	request.on("error", (error)=>{
		// Decide if should give offline notification (TODO - Add offline notification settings)
		if (error.message == "net::ERR_NETWORK_IO_SUSPENDED"){
			console.log("Computer is going to sleep.")
		}
		else{
			if (lastNetworkCheck){
				lastNetworkCheck = false;
				console.log("Computer is now offline.")
				new Notification({title: "Cannot give weather alerts.", body: "Atmos Weather could not successfully contact the NWS API. This is usually because you have no internet.", icon: __dirname + "/img/icon.png"}).show()
			}
		}
	})
	request.end();
}