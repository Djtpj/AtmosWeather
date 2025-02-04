/*
	nominatim-api.js
	Handles functions related to contacting and caching nominatim objects and search results
*/

// Initialize Cache
if (!window.localStorage.getItem("nominatim-storage")){
	window.localStorage.setItem("nominatim-storage", "{}");
}

// Get String HTTP Get
function httpGet(urlGet){
    var httpObj = new XMLHttpRequest();
    httpObj.open("GET", urlGet, false); 
    httpObj.send(null);
    return httpObj.responseText;
}

// Get String and convert to JSON http GET
function JSONGet(urlGet){
    var httpObj = new XMLHttpRequest();
    httpObj.open("GET", urlGet, false); 
    httpObj.send(null);
    return JSON.parse(httpObj.responseText);
}

// Check if location in cache and if not, check nominatim
function nomSearch(query){
	// Format query to standard
	query = query.replace(/,/g, " ")
	query = query.replace(/ {2}/g, " ");
	query = query.replace(/ {2}/g, " ");
	query = query.toLowerCase();
	var theCache = JSON.parse(window.localStorage.getItem("nominatim-storage"));
	
	if (theCache.hasOwnProperty(query)){
		return theCache[query];
	}
	else{
		var res = JSONGet('https://nominatim.openstreetmap.org/search?q=' + encodeURIComponent(query) + "&format=json");
		theCache[query] = res;
		window.localStorage.setItem("nominatim-storage", JSON.stringify(theCache));
		return res;
	}
}

// Get City Names From Object List
function nomItemsToNames(items){
	var a = 0;
	var theList = [];
	var temp;
	while (a < items.length){
		temp = items[a]["display_name"];
		temp = temp.split(", ");
		temp = temp[0] + ", " + temp[1] + ", " + temp[2];
		temp = temp.replaceAll("undefined, ", "");
		temp = temp.replaceAll(", undefined", "");
		theList.push(temp)
		a++;
	}
	return theList;
}