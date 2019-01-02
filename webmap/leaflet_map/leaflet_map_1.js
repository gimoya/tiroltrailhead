/*** General Leaflet Code ***/
// Create map and center around Innsbruck, AT
var map = L.map('map', {
  center: [47.26, 11.42],
  zoom: 13
});

var attributionsTirol = '&copy; <a href="https://data.tirol.gv.at" target="_blank">Land Tirol - data.tirol.gv.at</a>, <a href="https://creativecommons.org/licenses/by/3.0/at/legalcode" target="_blank">CC BY 3.0 AT</a>';

/*** Add base maps with controls ***/
var basemaps = {
    'osm4UMaps': L.tileLayer('//4umaps.eu/{z}/{x}/{y}.png', {
		maxZoom: 19, 
		maxNativeZoom: 15,
		attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> | <a href="http://4umaps.eu" target="_blank">4UMaps.eu</a>'
	}),
	'TIRIS-Sommerkarte': L.tileLayer('//wmts.kartetirol.at/gdi_summer/{z}/{x}/{y}.png', { 
		maxZoom : 18, attribution : attributionsTirol, tileSize : 256 
	}),
	'TIRIS-Orthofoto': L.tileLayer('//wmts.kartetirol.at/gdi_ortho/{z}/{x}/{y}.png', { 
		maxZoom : 18, attribution : attributionsTirol, tileSize : 256 
	}),
    'TIRIS-Gelände': L.tileLayer.wms('//gis.tirol.gv.at/arcgis/services/Service_Public/terrain/MapServer/WMSServer?', {
        layers: 'Image_Schummerung_Gelaendemodell', 
		maxZoom: 19, 
		attribution: attributionsTirol
    }),
};

var overlays = {
	'TIRIS-Namen': L.tileLayer('//wmts.kartetirol.at/gdi_nomenklatur/{z}/{x}/{y}.png', { 
		maxZoom : 18, tileSize : 256 
	}),
	'Wanderwege': L.tileLayer('https://tile.waymarkedtrails.org/slopes/{z}/{x}/{y}.png', {
		maxZoom: 19, maxNativeZoom: 18, attribution: '&copy; <a href="http://www.waymarkedtrails.org" target="_blank">waymarkedtrails.org</a>, <a href="https://creativecommons.org/licenses/by-sa/3.0/de/deed.de" target="_blank">CC BY-SA 3.0 DE</a>'
	})
};

L.control.layers(basemaps, overlays).addTo(map);
basemaps.osm4UMaps.addTo(map);

/*** Trail Style Functions ***/

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

/*** specify Trail Popup options ***/

var trailPopupOptions =
	{
	closeOnClick: true,
	className: 'trailPopupClass'
	}
		
		
/*** Set up Elevation Control ***/

var el = L.control.elevation({
			position: "bottomright",
			theme: "steelblue-theme", //default: lime-theme
			width: 500,
			height: 200,
			margins: {
				top: 20,
				right: 20,
				bottom: 30,
				left: 60
			},
			useHeightIndicator: true, //if false a marker is drawn at map position
			interpolation: "linear", //see https://github.com/mbostock/d3/wiki/SVG-Shapes#wiki-area_interpolate
			hoverNumber: {
				decimalsX: 3, //decimals on distance (always in km)
				decimalsY: 0, //deciamls on hehttps://www.npmjs.com/package/leaflet.coordinatesight (always in m)
				formatter: undefined //custom formatter function may be injected
			},
			xTicks: undefined, //number of ticks in x axis, calculated by default according to width
			yTicks: undefined, //number of ticks on y axis, calculated by default according to height
			collapsed: false,  //collapsed mode, show chart on click or mouseover
			imperial: false    //display imperial units instead of metric
	});
		
/*** Add Trails ***/
		
var trailsLayer;
	
$.getJSON('Trails.json', function(json) {
  trailsLayer = L.geoJson(json, {
    style: styleLines,
	onEachFeature: function(feature, layer) {
		
		var popupContent = '<h2 class="map-popup">' + feature.properties.name + '</h2>' + feature.properties.description;
		// add a popup to each feature
		layer.bindPopup(popupContent, trailPopupOptions);
		
		layer.on ('click', function(e) {
				if (typeof el !== 'undefined') {
					// the variable is defined
					el.clear();
					map.removeControl(el);
				};
				el.addTo(map);
				el.addData.bind(el);
				el.addData(feature, layer);
				L.DomEvent.stopPropagation(e);
			});
	}
  }).addTo(map);
});


/*** Event Listeners ***/

map.on("click", function(e){
	if (typeof el !== 'undefined') {
		// the variable is defined
		el.clear();
		map.removeControl(el);
	};	
});


map.on('moveend', function(e){
	coords.innerHTML='<b> CENTER: </b>' + map.getCenter()
})
.on('zoomend', function(e){
	zoom.innerHTML='<b>ZOOM: </b>' + map.getZoom()
});