/* PW protection 
function trim(str) {
	return str.replace(/^\s+|\s+$/g, '');  
}

var pw_prompt = prompt('Passwort eingeben um auf die Seite **Legacy Trails Tirol** zu gelangen..',' ');
var pw = 'coffee';
// if prompt is cancelled the pw_prompt var will be null!
if (pw_prompt == null) {
	alert('Kein Passwort wurde angegeben! Die Seite wird nicht geladen...');
	if (bowser.msie) {
		document.execCommand('Stop');
	} else {
		window.stop();s
	}
	window.location='tilt.html';
}
if (trim(pw_prompt) == pw ) {
	alert('Passwort ok!');
} else {
	alert('Falsches Passwort! Die Seite wird nicht geladen..');
	if (bowser.msie) {
		document.execCommand('Stop');
	} else {
		window.stop();
	}
	window.location='tilt.html';
}
*/

/*** Add base maps with controls ***/
var map = L.map('map', {
  zoom: 12,
  maxZoom: 18,
  minZoom: 11,
  zoomControl: false,
  attributionControl: false
	/*
	click tolerance radius not working 
	throws error _renderer not defined
	https://github.com/makinacorpus/Leaflet.TextPath/issues/87
	renderer: L.canvas({ tolerance: 5 })
	*/
});

new L.control.attribution({position: 'bottomright'}).addTo(map);
new L.Control.Zoom({ position: 'topright' }).addTo(map);

var toggle = L.easyButton({
  position: 'topright',
  states: [{
	stateName: 'basemap-outdoor',
	icon: '<span class="custom-control">T</span>',
	title: 'Hintergrundkarte umschalten',		
	onClick: function(control) {
	  map.removeLayer(mapbox_outdoorLayer);
	  map.addLayer(mapbox_satelliteLayer);
	  control.state('basemap-satellite');
	}
  }, {
	stateName: 'basemap-satellite',
	icon: '<span class="custom-control">S</span>',
	title: 'Hintergrundkarte umschalten',
	onClick: function(control) {
	  map.removeLayer(mapbox_satelliteLayer);
	  map.addLayer(mapbox_outdoorLayer);
	  control.state('basemap-outdoor');
	},
  }]
});	
toggle.addTo(map);

var centerView = L.easyButton({
  position: 'topright',
  states: [{
	stateName: 'centerView',
	icon: '<span class="custom-control">◾</span>',
	title: 'Center View',		
	onClick: function(control) {
	map.fitBounds(trails_json.getBounds(), {maxZoom: 16});
	}
  }]
});	
centerView.addTo(map);

var mapbox_Attr = 'Tiles &copy; <a href="google.com">Google Maps</a>, <a href="openstreetmap.org">OSM</a> | Design &copy; <a href="http://www.tiroltrailhead.com/guiding">Tirol Trailhead</a>';  
var mapbox_satelliteUrl = '//mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}';
var mapbox_outdoorUrl = '//c.tile.opentopomap.org/{z}/{x}/{y}.png';

var mapbox_satelliteLayer = L.tileLayer(mapbox_satelliteUrl, {
  attribution: mapbox_Attr 
});

var mapbox_outdoorLayer = L.tileLayer(mapbox_outdoorUrl, {
  attribution: mapbox_Attr,
  maxZoom: 20,
  maxNativeZoom: 17  
});

mapbox_outdoorLayer.addTo(map);	


/*** Set up Elevation Control ***/

var el = L.control.elevation({
			position: "bottomright",
			theme: "lime-theme", //default: lime-theme
			width: 320,	
			height: 160,
			margins: {
				top: 20,
				right: 20,
				bottom: 30,
				left: 60
			},
			useHeightIndicator: true, //if false a marker is drawn at map position
			interpolation: "linear", //see https://github.com/mbostock/d3/wiki/SVG-Shapes#wiki-area_interpolate
			hoverNumber: {
				decimalsX: 2, //decimals on distance (always in km)
				decimalsY: 0, //deciamls on hehttps://www.npmjs.com/package/leaflet.coordinatesight (always in m)
				formatter: undefined //custom formatter function may be injected
			},
			xTicks: undefined, //number of ticks in x axis, calculated by default according to width
			yTicks: undefined, //number of ticks on y axis, calculated by default according to height
			collapsed: false,  //collapsed mode, show chart on click or mouseover
			imperial: false    //display imperial units instead of metric
	});
	
	
// add location control

L.control.locate({
    strings: {
        title: "Show my location!"
    },
	position: 'topright'
}).addTo(map);	
		
/*** Trail Style-Helper Functions ***/

function highlight (layer) {	// will be used on hover
	layer.setStyle({
		weight: 4,
		dashArray: '',
		opacity: 0.95
	});
	if (!L.Browser.ie && !L.Browser.opera) {
		layer.bringToFront();
	}	
}

function styleLines(feature) {	// deafult style used for constructor of json
    return {
		color: '#FF5F1F',
		weight: 3,
		opacity: 0.8,
		lineJoin: 'round',  //miter | round | bevel 
    };
}


/*** Map and Json Layer Event Listeners and Helper Functions ***/
			
var lyr;
var ftr;
var trails_json;

var selected = null;

function dehighlight (layer) { 	// will be used inside select function
  if (selected === null || selected._leaflet_id !== layer._leaflet_id) {
	  trails_json.resetStyle(layer);
	  layer.setText(null);
  }
}

function select (layer) {  // ..use inside onClick Function doClickStuff() to select and style clicked feature 
  if (selected !== null) {
	var previous = selected;
  }
	map.fitBounds(layer.getBounds());
	selected = layer;
	if (previous) {
	  dehighlight(previous);
	}
}

function doClickStuff(e) {
	
	lyr = e.target;
	ftr = e.target.feature;
	
	select(lyr);
	lyr.setText('- - - ►             ', { repeat: true, offset: 11, attributes: {fill:  '#FF5F1F', 'font-weight': 'bold', 'font-size': '12'} });
	
	/*** Elevation Control ***/
		
	if (typeof el !== 'undefined') {
		// the variable is defined
		el.clear();
		map.removeControl(el);
	};	
	
	L.DomEvent.stopPropagation(e);
    el.addData(ftr, lyr);
    map.addControl(el);	
	
	/*** make all non-selected trails opaque, after resetting styles (ftr selected before)***/ 
	
	trails_json.eachLayer(function(layer){ if(selected._leaflet_id !== layer._leaflet_id) {
		dehighlight(layer);
		layer.setStyle({opacity: 0.4})
		}
	});
	
}

/*** Add Trails ***/

/* Start/End pts in different pane ontop of trails */ 
map.createPane('ptsPane');
map.getPane('ptsPane').style.zIndex = 600;

$.getJSON('my_trails_z.geojson', function(json) {
	
	trails_json = L.geoJson(json, {
		
		style: 	styleLines,
		
		onEachFeature: function(feature, layer) {
					
			var stPt = [feature.geometry.coordinates[0][1], 
						feature.geometry.coordinates[0][0],  
						]; // need to flip xy-coords!
			var endPt = [feature.geometry.coordinates[feature.geometry.coordinates.length - 1][1],
						feature.geometry.coordinates[feature.geometry.coordinates.length - 1][0], 
						];
			
	
			// Add Start and End Markers to each Feature 
			new L.circleMarker(stPt, {
					color: 'darkslategrey',
					fillColor: 'lightgreen',	
					fillOpacity: 1,				
					radius: 3.5,
					weight:1.5,
					pane: 'ptsPane'
				})
				.bindTooltip('<div id="pop_cont_name">' + feature.properties.name + ' - Start (' + Math.round(feature.geometry.coordinates[0][2]) + ' m)</div>', {
					permanent: false, 
					direction: 'right'
				})
				.addTo(map);
			
			new L.circleMarker(endPt, {
					color: 'darkslategrey',
					fillColor: 'pink',
					fillOpacity: 1,
					radius: 3.5,
					weight:1.5,	
					pane: 'ptsPane'
				})	
				.bindTooltip('<div id="pop_cont_name">' + feature.properties.name + ' - Ende (' + Math.round(feature.geometry.coordinates[0][2]) + ' m)</div>', {
					permanent: false, 
					direction: 'right'
				})
				.addTo(map)	
			
			
			// on events
			layer.on({		
				'mouseover': function (e) {
					highlight(e.target);
				},
				'mouseout': function (e) {
					dehighlight(e.target);
				},
				'click': doClickStuff
			});			
	
			/*** add a popup to each feature and.. ***/ 	
			/*** ..set GPX link ***/
			var bb = new Blob([togpx(feature)], {type: 'application/gpx+xml'});	
			var gpxLink = document.createElement("a");
			gpxLink.download = feature.properties.name + ".gpx";
			gpxLink.innerHTML = "GPX-Download";	
			gpxLink.href =  window.URL.createObjectURL(bb);
			gpxLink.tabIndex = "0";
			  
			var popupContent = 
			'<p><div class="pop_cont_name">' + feature.properties.name + '</div></p>'
			+ '<div class="pop_cont_text">' + feature.properties.Trail_Text + '</div>' 
			+ '<div tabindex="0" class="pop_gpx_text">🤝 ' +  gpxLink.outerHTML + ' 🚩</div>'
			+ '<div class="kofi_reminder">'
				+ '<p>🚴 Dein GPX-Track wird heruntergeladen..</p>'
				+ '<p>💓 Bitte halte das Projekt am Leben!</p>'
				+ '<p>⚠ Die Downloads auf Legacy Trails Tirol sind gratis - der Betrieb dieser Webseite ist es leider nicht!💲</p>'
				+ '<p>Mit einem kleinen Beitrag für deinen GPX-Download hilfst Du, die Seite am Leben zu halten!</p>'
				+ '<div class="kofi_button" title="Unterstütze diese Seite!"><a href="https://ko-fi.com/C1C74GQ0I" target="_blank">'
				+	'<img id="kofi_img_div" class="kofi_img" src="https://tiroltrailhead.com/legacy_trails/images/kofi_s_logo_nolabel.png"/>'
				+   '<span style="margin-left:14px;">Click to Support!</span>' 	
				+ '</div>'
			+ '</div>'
			layer.bindPopup(popupContent, {closeOnClick: true, className: 'trailPopupClass'});
		}
	}).addTo(map);
	map.fitBounds(trails_json.getBounds(), {maxZoom: 15});
});

				
/*
Points of interest


jQuery.get('POIs.geojson', function(data) {

var POIs = data;

var POIs_Icon = L.icon({
	iconUrl: 'images/pin.png',
	iconSize: [22,22], // size of the icon
    iconAnchor: [11,22],
	popupAnchor: [0,-24]
	});

for (i = 0; i < POIs.features.length; i++) { 
	new L.marker(L.GeoJSON.coordsToLatLng(POIs.features[i].geometry.coordinates), {
				icon: POIs_Icon,
				zIndexOffset: 10000,
				riseOnHover: true,
				pane: 'ptsPane'})
			.bindPopup('<div id="pop_cont_name">' + POIs.features[i].properties.name + '</div><div id="pop_cont_descr">' + POIs.features[i].properties.description + '</div>', 
				{
					closeButton: true,
					autoClose: false,
					direction: 'right'
				}
			)
			.addTo(map);
	}
});

*/

/*** Map Event Listeners ***/

map.on("click", function(e){
	if (typeof el !== 'undefined') {
		// the variable is defined
		el.clear();
		map.removeControl(el);
	};	
	/*** reset opaque trails, reset direction arrows ***/
	trails_json.eachLayer(function(layer) {
		layer.setStyle({opacity: 0.75})
	});
	if (selected!== null) selected.setText(null);
	
});

