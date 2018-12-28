'use strict';

/*** General Leaflet Code ***/
// Create map and center around Innsbruck, AT
var map = L.map('map', {
  center: [47.26, 11.42],
  zoom: 13
});

// Add Open Street Map as base map
var osm = L.tileLayer('//{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: 'Map data © <a href="http://openstreetmap.org">OpenStreetMap</a>'
}).addTo(map);

/*** Helper Functions ***/
// style function for features
function getColor(description) {
	var color;
	color = description.indexOf('K!') > -1 ? "#E53E38" : "#1F5AAA";
	// trails with ? classification (unknown, planned but not yet been there) should be pink
	if (description.indexOf('?') > -1) {color = "#FF69B4"}
	// trails with X! classification (been there, and it was shit) should be grey
	if (description.indexOf('X!') > -1) {color = "#BCBCBC"}	
	return color
}

function styleLines(feature) {
    return {
			color: getColor(feature.properties.description),
			weight: 2,
			opacity: .7, 	
			lineJoin: 'round',  //miter | round | bevel 
            };
}

$.getJSON('Trails.json', function(json) {
  trailsLayer = L.geoJson(json, {
    style: styleLines,
	onEachFeature: function(feature, layer) {
		  var tooltipTemplate = '<h2 class="map-popup">{name}</h2>';
		  var popupContent = L.Util.template(tooltipTemplate, feature.properties);
		  // add a popup to each feature
		  layer.bindPopup(popupContent, { closeOnClick: true })
		  }
  }).addTo(map);
});