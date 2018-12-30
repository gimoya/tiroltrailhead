/*** General Leaflet Code ***/
// Create map and center around Innsbruck, AT
var map = L.map('map', {
  center: [47.26, 11.42],
  zoom: 13
});

var attributionsTirol = ' | &copy; <a href="https://data.tirol.gv.at" target="_blank">Land Tirol - data.tirol.gv.at</a>, <a href="https://creativecommons.org/licenses/by/3.0/at/legalcode" target="_blank">CC BY 3.0 AT</a>';

// Add base maps with controls
var basemaps = {
    'OSM': L.tileLayer('//{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
		attribution: 'Map data © <a href="http://openstreetmap.org">OpenStreetMap</a>'
	}),

    'TIRIS-Gelände': L.tileLayer.wms('//gis.tirol.gv.at/arcgis/services/Service_Public/terrain/MapServer/WMSServer?', {
        layers: 'Image_Schummerung_Gelaendemodell', 
		maxZoom: 19, 
		attribution: attributionsTirol
    })
	
	'TIRIS-Sommerkarte': L.tileLayer.wms('//wmts.kartetirol.at/wmtsgdi_base_summer', {
	    layers: 'gdi_base_summer', 
		maxZoom: 19, 
		attribution: attributionsTirol
};

L.control.layers(basemaps).addTo(map);
basemaps.OSM.addTo(map);

map.on('moveend', function(e){
	coords.innerHTML='<b> CENTER: </b>' + map.getCenter()
})
.on('zoomend', function(e){
	zoom.innerHTML='<b>ZOOM: </b>' + map.getZoom()
});

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
		opacity: 7,
		lineJoin: 'round',  //miter | round | bevel 
    };
}

// specify popup options 
    var trailPopupOptions =
        {
		closeOnClick: true,
        className: 'trailPopupClass'
        }
		
var trailsLayer;

$.getJSON('Trails.json', function(json) {
  trailsLayer = L.geoJson(json, {
    style: styleLines,
	onEachFeature: function(feature, layer) {
		  var popupContent = '<h2 class="map-popup">' + feature.properties.name + '</h2>' + feature.properties.description;
		  // add a popup to each feature
		  layer.bindPopup(popupContent, trailPopupOptions)
		  }
  }).addTo(map);
});