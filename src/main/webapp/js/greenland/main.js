/*
 * Copyright 2012 52°North Initiative for Geospatial Open Source Software GmbH
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
// Hack(?) for not setting X-Requested-With header which is usually set by OpenLayers 2.12 and causes problems with CORS
OpenLayers.Request.XMLHttpRequest.prototype.setRequestHeaderOld = OpenLayers.Request.XMLHttpRequest.prototype.setRequestHeader;
OpenLayers.Request.XMLHttpRequest.prototype.setRequestHeader = function(sName, sValue) {
	if (sName != 'X-Requested-With')
		OpenLayers.Request.XMLHttpRequest.prototype.setRequestHeaderOld.call(this, sName, sValue);
};

if (typeof VIS == 'undefined')
	VIS = {};
/**
 * Utility function to extract the human readable part of a observed property id
 * 
 * @param obsProp
 * @returns
 */
VIS.getHumanReadableObservedProperty = function(obsProp) {
	var split = obsProp;
	if (split.match("^http")) {
		split = split.split("/");
	} else if (split.match("^urn")) {
		split = split.split(":");
	} else {
		return split;
	}
	return split[split.length - 1];
};

/**
 * Converts math function calls in a user defined function string to
 * corresponding Math-function calls. This method also ensures that a user
 * defined function string does not include an other JavaScript function calls
 * by throwing appropriate exceptions
 * 
 * @param funcString
 * @param allowedVariables
 *          Array of allowed variables within the function definition
 * @returns
 */
VIS.convertUserDefinedFunction = function(funcString, allowedVariables) {
	allowedVariables = allowedVariables || [];
	var replaceRegExp = /(?:[a-z][a-z0-9]*)|(?:[;={}\[\]])/ig;

	funcString = funcString.replace(replaceRegExp, function(match) {
		if (Math[match]) {
			// Math property/function -> prepend Math.
			return 'Math.' + match;
		} else {
			// Check if match is in allowedVariables
			for ( var i = 0; i < allowedVariables.length; i++) {
				if (match == allowedVariables[i]) {
					return match;
				}
			}

			// Not found -> not allowed
			throw match + ' not allowed in custom function';
		}
	});

	return funcString;
};

VIS.createPropertyArray = function(array, properties) {
	OpenLayers.Util.extend(array, properties);
	return array;
};

// represents the two map views
VIS.mapComponents = [];
VIS.syncViewports = true;

VIS.contextPath = '';

Ext
		.onReady(function() {
			// Executed when Ext framework is ready, i.e. website is loaded

			Ext.BLANK_IMAGE_URL = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP' + // 
			'///yH5BAEAAAAALAAAAAABAAEAQAIBRAA7';
			if (Ext.isIE6 || Ext.isIE7) {
				Ext.BLANK_IMAGE_URL = VIS.contextPath + 'js/ExtJs/resources/images/default/s.gif';
			}

			Ext.QuickTips.init();

			// Flags for viewport sync
			var syncPointers = true;
			var showExtents = true;

			// Timeslider component
			var timeSlider = new Ext.ux.VIS.Slider({
				width : 200,
				value : [ 50 ],
				increment : 10,
				minValue : 0,
				maxValue : 100,
				disabled : true,
				plugins : new Ext.slider.Tip({
					getText : function(thumb) {
						return String.format('<b>{0}</b>', new Date(thumb.value).toUTCString());
					}
				})
			});

			// Buttons for time changing
			var timeForward = new Ext.Button({
				xtype : 'button',
				text : 'Forward',
				iconCls : 'icon-timeforward',
				disabled : true,
				handler : function() {
					timeSlider.stepBy(0, 1);
				}
			});
			var timeBackward = new Ext.Button({
				xtype : 'button',
				text : 'Backward',
				iconCls : 'icon-timebackward',
				disabled : true,
				handler : function() {
					timeSlider.stepBy(0, -1);
				}
			});

			// Time animation
			var timeAnimateTask = {
				run : function() {
					timeSlider.stepBy(0, 1, true);
				},
				interval : 500
			};
			var timeAnimateButton = new Ext.Button({
				xtype : 'button',
				text : 'Animate',
				enableToggle : true,
				pressed : false,
				disabled : true,
				toggleHandler : function(b, pressed) {
					if (pressed) {
						Ext.TaskMgr.start(timeAnimateTask);
					} else {
						Ext.TaskMgr.stop(timeAnimateTask);
					}
				}
			});

			// Sync disabled/enabled state of timeslider with corresponding buttons
			timeSlider.on('disable', function() {
				timeForward.setDisabled(true);
				timeBackward.setDisabled(true);
				timeAnimateButton.setDisabled(true);
			});
			timeSlider.on('enable', function() {
				timeForward.setDisabled(false);
				timeBackward.setDisabled(false);
				timeAnimateButton.setDisabled(false);
			});

			// Label to show currently selected time
			var timeLabel = new Ext.form.Label({
				text : 'Selected Time'
			});

			// Function to synchronize pointers. Hides or shows the "mouseMarkerLayer"
			// of each map
			function enableSyncPointers(enable) {
				syncPointers = enable;
				if (!syncPointers) {
					for ( var i = 0, len = VIS.mapComponents.length; i < len; i++) {
						var mouseMarkerLayer = VIS.mapComponents[i].mouseMarkerLayer;
						mouseMarkerLayer.setVisibility(false);
					}
				}
			}

			// Function to show map extents on other maps. Hides the "extentLayer"
			// of each map when disabled
			function enableShowExtents(enable) {
				showExtents = enable;
				if (!showExtents) {
					for ( var i = 0, len = VIS.mapComponents.length; i < len; i++) {
						var extentLayer = VIS.mapComponents[i].extentLayer;
						extentLayer.setVisibility(false);
						extentLayer.map.setLayerIndex(extentLayer, 0);
					}
				}
			}

			// Function to synchronize viewports. The center location and zoom level
			// of each map gets adapted to the values of the first map
			function enableSyncViewports(enable) {
				VIS.syncViewports = enable;
				if (VIS.syncViewports) {
					var mainMap = VIS.mapComponents[0].mapPanel.map;
					var center = mainMap.getCenter().clone();
					var zoom = mainMap.getZoom();
					for ( var i = 0, len = VIS.mapComponents.length; i < len; i++) {
						var map = VIS.mapComponents[i].mapPanel.map;
						if (map == mainMap)
							continue;
						if (map.getProjection() != mainMap.getProjection()) {
							var centerProj = center.clone();
							centerProj.transform(mainMap.getProjectionObject(), map.getProjectionObject());
							var boundsProj = mainMap.getExtent();
							boundsProj.transform(mainMap.getProjectionObject(), map.getProjectionObject());
							var zoomProj = map.getZoomForExtent(boundsProj, true);
							map.setCenter(centerProj, zoomProj, false);
						} else {
							map.setCenter(center, zoom, false);
						}
					}
				}
			}

			function enableBoxSelection(enable) {
				for ( var i = 0, len = VIS.mapComponents.length; i < len; i++) {
					VIS.mapComponents[i].selectLayer.setBoxSelectionEnabled(enable);
				}
			}

			// Shows feature windows for the selected features of each layer from all
			// map components
			function showSelectedFeatureDetails() {
				var layerFeatureMap = {};

				for ( var i = 0, len = VIS.mapComponents.length; i < len; i++) {
					var selectLayer = VIS.mapComponents[i].selectLayer;
					for ( var j = 0, featureLen = selectLayer.selectedFeatures.length; j < featureLen; j++) {
						var feature = selectLayer.selectedFeatures[j].originalFeature;
						if (feature) {
							if (!layerFeatureMap[feature.layer.id])
								layerFeatureMap[feature.layer.id] = {
									layer : feature.layer,
									features : []
								};

							layerFeatureMap[feature.layer.id].features.push(feature);
						}
					}
				}

				for ( var key in layerFeatureMap) {
					var entry = layerFeatureMap[key];
					new Ext.ux.VIS.FeatureWindow({
						features : entry.features,
						layer : entry.layer,
						constrainHeader : true
					}).show();
				}

			}

			// Reusable action to show feature info windows for all selected features
			var showSelectedFeatureDetailsAction = new Ext.Action({
				text : 'Show Details...',
				handler : function(button, pressed) {
					showSelectedFeatureDetails();
				},
				iconCls : 'icon-barchart'
			});

			// Map event listening
			var handleMouseMove = function(evt) {
				if (!syncPointers)
					return;
				var lonLat = evt.object.getLonLatFromViewPortPx(evt.xy);

				for ( var i = 0, len = VIS.mapComponents.length; i < len; i++) {
					var mouseMarker = VIS.mapComponents[i].mouseMarker;
					if (evt.object == mouseMarker.map) {
						continue;
					}
					var moveToLonLat = lonLat.clone();
					if (evt.object.getProjection() != mouseMarker.map.getProjection()) {
						moveToLonLat.transform(evt.object.getProjectionObject(), mouseMarker.map.getProjectionObject());
					}

					if (mouseMarker.map.getExtent().containsLonLat(moveToLonLat)) {
						mouseMarker.moveTo(mouseMarker.map.getLayerPxFromLonLat(moveToLonLat));
					}
				}
			};

			var handleMouseOver = function(evt) {
				if (!syncPointers)
					return;
				for ( var i = 0, len = VIS.mapComponents.length; i < len; i++) {
					var mouseMarkerLayer = VIS.mapComponents[i].mouseMarkerLayer;
					if (evt.object != mouseMarkerLayer.map) {
						mouseMarkerLayer.setVisibility(true);
						mouseMarkerLayer.map.setLayerIndex(mouseMarkerLayer, mouseMarkerLayer.map.layers.length - 1);
					} else {
						mouseMarkerLayer.setVisibility(false);
						mouseMarkerLayer.map.setLayerIndex(mouseMarkerLayer, 0);

					}

				}
			};

			var handleMouseOut = function(evt) {
				if (!syncPointers)
					return;
				for ( var i = 0, len = VIS.mapComponents.length; i < len; i++) {
					var mouseMarkerLayer = VIS.mapComponents[i].mouseMarkerLayer;
					mouseMarkerLayer.setVisibility(false);
				}
			};

			// Counter ensures that no move events from manually invoking setCenter
			// are
			// processed
			var mapMoveCounter = 0;

			var handleMapMove = function(evt) {
				if (mapMoveCounter >= 1 || evt.object.reprojecting === true) {
					// cycle detected
					return;
				}
				mapMoveCounter++;
				var mapEvent = evt.object;

				if (showExtents) {
					var viewportDiv = mapEvent.getViewport();
					var points = [], lonLat = null;
					var numPoints = 8;
					for ( var i = 0; i < numPoints; i++) {
						lonLat = mapEvent.getLonLatFromViewPortPx({
							x : viewportDiv.clientWidth * (i / numPoints),
							y : 0
						});
						points.push(new OpenLayers.Geometry.Point(lonLat.lon, lonLat.lat));
					}
					for ( var i = 0; i < numPoints; i++) {
						lonLat = mapEvent.getLonLatFromViewPortPx({
							x : viewportDiv.clientWidth,
							y : viewportDiv.clientHeight * (i / numPoints)
						});
						points.push(new OpenLayers.Geometry.Point(lonLat.lon, lonLat.lat));
					}
					for ( var i = numPoints; i > 0; i--) {
						lonLat = mapEvent.getLonLatFromViewPortPx({
							x : viewportDiv.clientWidth * (i / numPoints),
							y : viewportDiv.clientHeight
						});
						points.push(new OpenLayers.Geometry.Point(lonLat.lon, lonLat.lat));
					}
					for ( var i = numPoints; i > 0; i--) {
						lonLat = mapEvent.getLonLatFromViewPortPx({
							x : 0,
							y : viewportDiv.clientHeight * (i / numPoints)
						});
						points.push(new OpenLayers.Geometry.Point(lonLat.lon, lonLat.lat));
					}
					var extentBounds = new OpenLayers.Geometry.LinearRing(points);

					// update viewport extent indicator
					for ( var i = 0, len = VIS.mapComponents.length; i < len; i++) {
						var extentLayer = VIS.mapComponents[i].extentLayer;
						var mapOther = extentLayer.map;
						if (mapEvent != extentLayer.map
								&& (mapEvent.getProjection() != mapOther.getProjection() || !VIS.syncViewports)) {
							extentLayer.setVisibility(true);
							extentLayer.map.setLayerIndex(extentLayer, extentLayer.map.layers.length - 1);

							extentLayer.extentBox.geometry = extentBounds.clone();
							if (mapEvent.getProjection() != extentLayer.map.getProjection()) {
								extentLayer.extentBox.geometry.transform(mapEvent.getProjectionObject(), extentLayer.map
										.getProjectionObject());
							}
							extentLayer.extentBoxHalo.geometry = extentLayer.extentBox.geometry.clone();
							extentLayer.renderer.clear();
							extentLayer.drawFeature(extentLayer.extentBoxHalo, 'halo');
							// extentLayer.extentBox.geometry.id += '_halo';
							extentLayer.drawFeature(extentLayer.extentBox, 'default');
						} else {
							extentLayer.setVisibility(false);
							extentLayer.map.setLayerIndex(extentLayer, 0);
						}

					}
				}

				if (VIS.syncViewports) {
					// Keep viewports in sync
					var center = mapEvent.getCenter().clone();
					var zoom = mapEvent.getZoom();
					for ( var i = 0, len = VIS.mapComponents.length; i < len; i++) {
						var mapOther = VIS.mapComponents[i].mapPanel.map;
						if (mapOther != mapEvent) {

							if (mapEvent.getProjection() != mapOther.getProjection()) {
								var centerProj = center.clone();
								centerProj.transform(mapEvent.getProjectionObject(), mapOther.getProjectionObject());
								var boundsProj = mapEvent.getExtent();
								boundsProj.transform(mapEvent.getProjectionObject(), mapOther.getProjectionObject());
								var zoomProj = mapOther.getZoomForExtent(boundsProj, true);
								mapOther.setCenter(centerProj, zoomProj, false);

							} else if (mapOther.zoom != zoom || !mapOther.center.equals(center)) {
								mapOther.setCenter(center, zoom, false);
							}

						}
					}
				}
				mapMoveCounter--;
			};

			var handleChangeTimeLimits = function(evt) {
				var min = Number.POSITIVE_INFINITY;
				var max = Number.NEGATIVE_INFINITY;
				var extents = [];
				for ( var i = 0, len = VIS.mapComponents.length; i < len; i++) {
					var map = VIS.mapComponents[i].mapPanel.map;
					if (min > map.time.min) {
						min = map.time.min;
					}
					if (max < map.time.max) {
						max = map.time.max;
					}
					extents = extents.concat(map.getTimeExtents());
				}

				var newTimeValue = null;
				if (min == Number.POSITIVE_INFINITY || max == Number.NEGATIVE_INFINITY || extents.length == 0) {
					timeSlider.setDisabled(true);

				} else {
					timeSlider.setDisabled(false);
					timeSlider.setMaxValue(max);
					timeSlider.setMinValue(min);

					var startTimes = [];
					for ( var i = 0, len = extents.length; i < len; i++) {
						startTimes.push(extents[i][0]);
					}
					timeSlider.setSnapValues(startTimes);
					newTimeValue = new Date(timeSlider.getValue(0));

				}

				// Set new time
				for ( var i = 0, len = VIS.mapComponents.length; i < len; i++) {
					var map = VIS.mapComponents[i].mapPanel.map;
					map.setTime(newTimeValue);
				}

			};

			// Function creates all components needed for a single map view
			function createMapComponents(options) {
				options = options || {};

				if (VIS.OpenLayersThemeDir) {
					options.theme = VIS.OpenLayersThemeDir;
				}
				// Base layers
				var proj3857 = new OpenLayers.Projection('EPSG:3857');
				var baseLayers = [ new OpenLayers.Layer.OSM.Mapnik('OpenStreetMap Mapnik', {
					transitionEffect : 'resize',
					projection : proj3857
				}), new OpenLayers.Layer.OSM.CycleMap('OpenStreetMap CycleMap', {
					transitionEffect : 'resize',
					projection : proj3857
				}) ];

				if (OpenLayers.Layer.Google) {
					// Load google base maps only if available
					baseLayers = baseLayers.concat([ new OpenLayers.Layer.Google('Google Streets', {
						transitionEffect : 'resize',
						projection : proj3857
					}), new OpenLayers.Layer.Google('Google Satellite', {
						type : google.maps.MapTypeId.SATELLITE,
						transitionEffect : 'resize',
						projection : proj3857
					}), new OpenLayers.Layer.Google('Google Hybrid', {
						type : google.maps.MapTypeId.HYBRID,
						transitionEffect : 'resize',
						projection : proj3857
					}), new OpenLayers.Layer.Google('Google Physical', {
						type : google.maps.MapTypeId.TERRAIN,
						transitionEffect : 'resize',
						projection : proj3857
					}) ]);
				}

				baseLayers.push(new OpenLayers.Layer('None', {
					isBaseLayer : true,
					projection : proj3857
				}));
				// Map itself
				var map = new OpenLayers.VIS.Map(OpenLayers.Util.applyDefaults(options, {
					projection : proj3857, // Default projection
					displayProjection : new OpenLayers.Projection('EPSG:4326'),
					controls : [ new OpenLayers.Control.ScaleLine(), // new
					// OpenLayers.Control.ZoomBox(),
					new OpenLayers.Control.Navigation({
						dragPanOptions : {
							enableKinetic : true,
							documentDrag : true
						}
					}) ], // , new OpenLayers.Control.KeyboardDefaults() ]
				}));
				map.addLayers(baseLayers);

				var center = new OpenLayers.LonLat(7.6, 51.9);
				center.transform(new OpenLayers.Projection('EPSG:4326'), map.getProjectionObject());
				map.setCenter(center, 4); // Needed for marker layer, although
				// eventually specified by GeoExt.MapPanel

				// Mouse marker, to show the position of the mouse in other map views
				var mouseMarkerLayer = new OpenLayers.Layer.Markers("MouseMarker");
				map.addLayer(mouseMarkerLayer);
				var mouseMarker = new OpenLayers.Marker(map.getCenter(), new OpenLayers.Icon(VIS.contextPath
						+ 'images/cross.png', new OpenLayers.Size(20, 20), new OpenLayers.Pixel(-10, -10)));
				mouseMarkerLayer.addMarker(mouseMarker);

				// Layer showing the extent of the map with which the user is currently
				// interacting
				var extentBox = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LinearRing([]));
				var extentBoxHalo = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LinearRing([]));

				var extentLayer = new OpenLayers.Layer.Vector("Extent", {
					extentBox : extentBox,
					extentBoxHalo : extentBoxHalo,
					styleMap : new OpenLayers.StyleMap({
						'default' : {
							strokeOpacity : 0.8,
							fillOpacity : 0,
							fillColor : 'transparent',
							strokeColor : 'black',
							strokeWidth : 2,
							strokeLinecap : 'square'
						},
						'halo' : {
							strokeColor : 'white',
							strokeWidth : 4
						}
					})
				});
				extentLayer.addFeatures([ extentBoxHalo, extentBox ]);
				map.addLayer(extentLayer);

				// layer which manages the feature selection
				var selectLayer = new OpenLayers.Layer.VIS.MultiProxyVector("", {});
				map.addLayers([ selectLayer ]);

				// Event registration
				map.events.register('mousemove', this, handleMouseMove);
				map.events.register('mouseover', this, handleMouseOver);
				map.events.register('mouseout', this, handleMouseOut);

				map.events.register('move', this, handleMapMove);

				map.events.register('changetimelimits', this, handleChangeTimeLimits);

				// Graticule
				// TODO fix problems with layer ordering
				var graticuleControl = new OpenLayers.Control.Graticule({
					labelled : true,
					targetSize : 200,
					layerName : 'grat_', // Used to identify graticule layer in
					// MultiProxyVector
					displayInLayerSwitcher : false,
					autoActivate : false,
					labelSymbolizer : new OpenLayers.Symbolizer.Text({
						fontSize : '8pt'
					})
				});
				map.addControl(graticuleControl);

				// Swipe control
				var swipeControl = new OpenLayers.VIS.Control.Swipe(baseLayers[0]);
				map.addControl(swipeControl);

				// Control for reading tiles from local cache
				var cacheReadControl = new OpenLayers.Control.CacheRead({
				// autoActivate : true
				});
				map.addControl(cacheReadControl);

				// Control for automatically writing to the local cache
				var cacheWriteControl = new OpenLayers.Control.CacheWrite({
					// autoActivate : true,
					layers : [],
					cache : function(obj) {
						if (obj.tile.imgDiv.complete !== false)
							// if browser supports completed attribute, call cache method only
							// if
							// tile is fully loaded, otherwise empty tiles get cached
							OpenLayers.Control.CacheWrite.prototype.cache.call(this, obj);
					}
				});
				cacheWriteControl.events.register('cachefull', this, function(evt) {
					if (!window.localStorage)
						return;
					// Delete 10% of cached tiles
					var delCount = window.localStorage.length / 10;
					for ( var i = 0; i < delCount; i++) {
						var key = window.localStorage.key(0);
						if (!key)
							break;
						if (key.substr(0, 8) === 'olCache_') {
							window.localStorage.removeItem(key);
						}
					}
				});
				map.addControl(cacheWriteControl);
				map.events.register('addlayer', this, function(evt) {
					if (evt.layer instanceof OpenLayers.Layer.VIS.Raster) {
						cacheWriteControl.addLayer(evt);
					}
				});
				map.events.register('removelayer', this, function(evt) {
					if (evt.layer instanceof OpenLayers.Layer.VIS.Raster) {
						cacheWriteControl.removeLayer(evt);
					}
				});

				// Base layer selection menu
				var layerMenu = new Ext.menu.Menu({
					listeners : {
						itemclick : function(item) {
							item.layer.map.setBaseLayer(item.layer);
						},
						beforeshow : function(menu) {
							// Create menu items every time the menu is shown to dynamically
							// add
							// available base layers based on the projection
							menu.removeAll();
							for ( var i = 0, len = map.layers.length; i < len; i++) {
								var layer = map.layers[i];
								if (layer.isBaseLayer && (!layer.projection || layer.projection.getCode() == map.getProjection())) {
									menu.add({
										text : layer.name,
										layer : layer,
										checked : layer == map.baseLayer,
										group : map.id + 'baselayer'
									});
								}
							}
						}
					}
				});

				var featureInfoControl = new OpenLayers.Control.WMSGetFeatureInfo({
					infoFormat : 'application/vnd.ogc.gml'
				});
				map.addControl(featureInfoControl);

				/**
				 * Function called on render event of the MapPanel. Performs actions
				 * which require a rendered map view, i.e. when the map is reflected as
				 * html elements
				 */
				function renderHandler(panel) {
					// Hide menus on map interaction
					Ext.fly(map.layerContainerDiv).on('mousedown', function(e) {
						Ext.menu.MenuMgr.hideAll();
					});

					// Context menu event attached to the maps base html element
					panel.body.on('contextmenu', function(e, t) {
						e.preventDefault(); // suppress browser context menu
						var viewportEl = Ext.get(map.viewPortDiv); // html element of map
						var clickPosition = new OpenLayers.Pixel(e.xy[0] - viewportEl.getLeft(), e.xy[1] - viewportEl.getTop()); // mouse
						// position
						// within
						// map
						// view

						/**
						 * Function to perform getFeatureInfo request used by the queryable
						 * layers menu
						 */
						function getFeatureInfoForLayerItem() {
							var lonLat = map.getLonLatFromViewPortPx(clickPosition);

							if (this.layer instanceof OpenLayers.Layer.VIS.WMSQ) {
								Ext.Msg.alert('Feature Info', this.layer.featureInfo(lonLat).replace('\n', '<br/>'));
							} else {

								this.layer.visualization.visualizer.dataSet.getValue(lonLat, map.getProjectionObject(),
										function(value) {

										});

								var featureInfoOptions = featureInfoControl.buildWMSOptions(this.layer.url, [ this.layer ],
										this.clickPosition, "application/vnd.ogc.se_xml");

								OpenLayers.Request.GET({
									url : this.layer.url,
									params : featureInfoOptions.params,
									success : function(resp) {
										alert(resp.responseText);
									}
								});
							}
						}

						var queryableLayerItems = [];
						for ( var i = 0, len = map.layers.length; i < len; i++) {
							var layer = map.layers[i];
							if ((layer instanceof OpenLayers.Layer.VIS.Raster && layer.visualization)
									|| layer instanceof OpenLayers.Layer.VIS.WMSQ) {
								queryableLayerItems.push({
									text : layer.visualization.getTitle(),
									layer : layer,
									clickPosition : clickPosition,
									handler : getFeatureInfoForLayerItem
								});
							}
						}

						var contextMenu = new Ext.menu.Menu({
							items : [ showSelectedFeatureDetailsAction, {
								disabled : queryableLayerItems.length == 0,
								text : 'Query Raster Layer (Test)',
								menu : queryableLayerItems
							} ]
						});

						contextMenu.showAt(e.xy);

					});
				}

				var store = function(parcel) {
					parcel.writeString(map.getProjection());
					parcel.writeFloat(map.getCenter().lon);
					parcel.writeFloat(map.getCenter().lat);
					parcel.writeInt(map.getZoom());
					parcel.writeInt(baseLayers.indexOf(map.baseLayer));

				};

				var restore = function(parcel, callback) {
					var projectionCode = parcel.readString();
					var center = new OpenLayers.LonLat(parcel.readFloat(), parcel.readFloat());
					var zoom = parcel.readInt();
					var baseLayerIndex = parcel.readInt();

					VIS.getProjection(projectionCode, function(projection) {
						map.reprojecting = true;
						map.projection = projection;
						map.maxExtent = new OpenLayers.Bounds(OpenLayers.Projection.defaults[projection.getCode()].maxExtent);
						map.setCenter(center, zoom);
						if (baseLayerIndex >= 0 && baseLayerIndex < baseLayers.length) {
							map.setBaseLayer(baseLayers[baseLayerIndex]);
						} else {
							var baseLayer = new OpenLayers.Layer('None', {
								isBaseLayer : true,
								projection : projection
							});
							map.addLayers([ baseLayer ]);
							map.setBaseLayer(baseLayer);
						}
						map.reprojecting = false;

						callback.call(this);
					});

				};

				// Return object of all required parts for a map component
				return {
					// Functions to save/restore map state
					store : store,
					restore : restore,

					// GeoExt.MapPanel
					mapPanel : new GeoExt.MapPanel({
						map : map,
						center : center,
						zoom : 4,
						items : [ {
							xtype : 'gx_zoomslider',
							aggressive : true,
							vertical : true,
							height : 100,
							x : 10,
							y : 20
						} ],
						tbar : {
							style : {
								'border-top' : 'none'
							},
							enableOverflow : true,
							items : [
									new GeoExt.Action({
										control : new OpenLayers.Control.ZoomIn(),
										map : map,
										iconCls : 'icon-zoomin',
										tooltip : 'Increases zoom level of the map'
									}),
									new GeoExt.Action({
										control : new OpenLayers.Control.ZoomOut(),
										map : map,
										iconCls : 'icon-zoomout',
										tooltip : 'Decreases zoom level of the map'
									}),
									'-',
									new GeoExt.Action({
										text : 'Zoom',
										control : new OpenLayers.Control.ZoomBox(),
										map : map,
										iconCls : 'icon-zoombox',
										enableToggle : true,
										tooltip : 'Zoom Box'
									}),
									new GeoExt.Action({
										text : 'Max Extent',
										control : new OpenLayers.Control.ZoomToMaxExtent(),
										map : map,
										iconCls : 'icon-maxextent',
										tooltip : 'Zooms to maximum extent'
									}),
									new Ext.Button({
										text : 'Graticule',
										enableToggle : true,
										toggleHandler : function(comp, pressed) {
											if (pressed)
												graticuleControl.activate();
											else
												graticuleControl.deactivate();
										},
										iconCls : 'icon-graticule',
										tooltip : 'Shows a graticule'
									}),
									new Ext.Button({
										text : 'Swipe',
										enableToggle : true,
										toggleHandler : function(comp, pressed) {
											if (pressed) {
												for ( var i = map.layers.length - 1; i >= 0; i--) {
													var layer = map.layers[i];
													if (layer.getVisibility() && layer != mouseMarkerLayer && layer != selectLayer
															&& layer.name != 'grat_') {
														swipeControl.setLayer(layer);
														break;
													}
												}

												swipeControl.activate();
											} else
												swipeControl.deactivate();
										},
										tooltip : 'Allows to swipe the top most layer'
									}), '->', {
										text : 'Settings',
										handler : function() {
											showMapSettings(map);
										}
									}, {
										text : 'Base Layer',
										menu : layerMenu
									} ]
						},
						listeners : {
							render : renderHandler
						}
					}),
					// The legend component
					legendPanel : new Ext.ux.VIS.Legend({
						map : map,
						layout : 'anchor'
					}),
					// Mouse marker layer
					mouseMarker : mouseMarker,
					mouseMarkerLayer : mouseMarkerLayer,
					// Extent Layer
					extentLayer : extentLayer,
					// Selection layer
					selectLayer : selectLayer,
					// Feature Info Control
					featureInfoControl : featureInfoControl,
					// Cache controls
					cacheWriteControl : cacheWriteControl,
					cacheReadControl : cacheReadControl
				};
			}

			VIS.mapComponents = [];

			var bottomPanel = new Ext.Panel({
				title : 'Visualizations',
				region : 'south',
				layout : {
					type : 'hbox',
					pack : 'start',
					align : 'stretch'
				},
				collapsible : true,
				split : true,
				height : 200,
				items : [],
				tools : [ VIS.createHelpToolDef('visualizations', 'left') ]
			});
			var centerPanel = new Ext.Panel({
				region : 'center',
				layout : {
					type : 'hbox',
					pack : 'start',
					align : 'stretch'
				},
				items : []
			});

			// / Feature selection
			// Label to show number of selected features
			var selectionInfo = new Ext.form.Label({
				text : ''
			});
			var selectedCount = 0;

			// Function updating the selection label and feature window action
			function updateSelectionInfo(reset) {
				if (reset === true) {
					selectedCount = 0;
					Ext.each(VIS.mapComponents, function(components) {
						selectedCount += components.selectLayer.selectedFeatures.length;
					});
				}

				selectionInfo.setText(selectedCount + " Features selected");
				showSelectedFeatureDetailsAction.setDisabled(selectedCount == 0);
			}
			updateSelectionInfo();

			var addMap = function(components) {
				centerPanel.add(Ext.apply(components.mapPanel, {
					flex : 1
				}));

				bottomPanel.add(Ext.apply(components.legendPanel, {
					flex : 1
				}));

				components.selectLayer.events.register('featureselected', this, function(evt) {
					selectedCount++;
					updateSelectionInfo();
				});
				components.selectLayer.events.register('featureunselected', this, function(evt) {
					selectedCount--;
					updateSelectionInfo();
				});
				// removing selected features does not raise featureunselected events
				components.selectLayer.events.register('featuresremoved', this, function(evt) {
					updateSelectionInfo(true);
				});

				VIS.mapComponents.push(components);
				return components;
			};

			var removeMap = function(components) {
				centerPanel.remove(components.mapPanel);

				bottomPanel.remove(components.legendPanel);

				// TODO possibly unregister feature selection events

				VIS.mapComponents.remove(components);
			};

			VIS.addMap = function(options) {
				return addMap(createMapComponents(options));
			};

			VIS.removeMap = function() {
				if (VIS.mapComponents.length > 1) {
					removeMap(VIS.mapComponents[VIS.mapComponents.length - 1]);
				}
			};

			// Reusable action to clear local cache
			var clearCacheAction = new Ext.Action({
				text : 'Clear Cache',
				handler : function(button) {
					OpenLayers.Control.CacheWrite.clearCache();
				}
			});

			// Button to enable/disable cache
			var cacheButton = new Ext.Button({
				text : 'Use Cache',
				enableToggle : true,
				pressed : false,
				tooltip : 'Allows to cache VISS data in local browser storage',
				enabled : window.localStorage != null,
				toggleHandler : function(button, pressed) {
					Ext.each(VIS.mapComponents, function(components) {
						components.cacheWriteControl[pressed ? 'activate' : 'deactivate']();
						components.cacheReadControl[pressed ? 'activate' : 'deactivate']();
					});
				}
			});

			// Reusable action which clears current feature selections
			var clearFeatureSelectionAction = new Ext.Action({
				text : 'Clear Selection',
				tooltip : 'Clears local VISS data cache',
				handler : function(button, pressed) {
					Ext.each(VIS.mapComponents, function(components) {
						components.selectLayer.unselectAll();
					});
				}
			});

			timeSlider.on('change', function(slider, value) {
				// Set selected time for all map views
				for ( var i = 0, len = VIS.mapComponents.length; i < len; i++) {
					var map = VIS.mapComponents[i].mapPanel.map;
					map.setTime(new Date(value));
				}
				timeLabel.setText(new Date(value).toUTCString());
			});

			// Viewport eventually combining all ExtJs components
			VIS.viewport = null;

			// Toolbar creation
			var toolbar = new Ext.Toolbar({
				enableOverflow : true,
				height : 73, // needs fixed height
				// autoHeight:true,
				region : 'north',
				items : [ {
					// Resources
					xtype : 'buttongroup',
					title : 'Resources',
					columns : 1,
					defaults : {
						scale : 'small'
					},
					items : [ {
						text : 'Add Resource...',
						handler : function() {
							// Left map
							VIS.showResourceWindow();
							// showResourceWindow(VIS.mapComponents[0].mapPanel.map);
						},
						iconCls : 'icon-database'
					}, {
						text : 'Refresh',
						handler : function() {
							Ext.each(VIS.mapComponents, function(components) {
								Ext.each(components.mapPanel.map.layers, function(layer) {
									// Reresh and/or redraw depending on which functions are
									// available
									if (layer.refresh) {
										layer.refresh();
									}
									if (layer.redraw) {
										layer.redraw();
									}
								});
							});
						},
						iconCls : 'icon-refresh'
					} ]
				}, {
					// Navigation
					xtype : 'buttongroup',
					title : 'Navigation',
					columns : 3,
					defaults : {
						scale : 'small'
					},
					items : [ {
						xtype : 'button',
						text : 'Add Map',
						iconCls : 'icon-addmap',
						handler : function(button) {
							VIS.addMap();
							VIS.viewport.doLayout();
						}
					}, {
						xtype : 'button',
						text : 'Sync Pointer',
						enableToggle : true,
						pressed : syncPointers,
						toggleHandler : function(button, pressed) {
							enableSyncPointers(pressed);
						}
					}, {
						xtype : 'button',
						text : 'Show Extents',
						enableToggle : true,
						pressed : showExtents,
						toggleHandler : function(button, pressed) {
							enableShowExtents(pressed);
						}
					}, {
						xtype : 'button',
						text : 'Remove Map',
						iconCls : 'icon-deletemap',
						handler : function(button) {
							VIS.removeMap();
							VIS.viewport.doLayout();
						}
					}, {
						xtype : 'button',
						text : 'Sync Viewports',
						enableToggle : true,
						pressed : VIS.syncViewports,
						toggleHandler : function(button, pressed) {
							enableSyncViewports(pressed);
						}
					} ]
				}, {
					// Time
					xtype : 'buttongroup',
					title : 'Time',
					columns : 3,
					defaults : {
						scale : 'small'
					},
					items : [ timeSlider, timeForward, timeAnimateButton, timeLabel, timeBackward ],
					tools : [ VIS.createHelpToolDef('time') ]
				}, {
					xtype : 'buttongroup',
					// Selection
					title : 'Feature Selection',
					columns : 2,
					defaults : {
						scale : 'small'
					},
					items : [ {
						xtype : 'button',
						text : 'Select',
						enableToggle : true,
						pressed : false,
						toggleHandler : function(button, pressed) {
							enableBoxSelection(pressed);
						},
						iconCls : 'icon-selectbox'
					}, selectionInfo, showSelectedFeatureDetailsAction, clearFeatureSelectionAction ]
				}, {
					xtype : 'buttongroup',
					// Cache
					title : 'Local Cache',
					columns : 1,
					defaults : {
						scale : 'small'
					},
					items : [ cacheButton, clearCacheAction ]
				}, '->',
				// About and help
				{
					xtype : 'panel',
					layout : {
						type : 'table',
						columns : 1
					},
					border : false,
					bodyStyle : 'background:transparent;',
					items : [ {
						xtype : 'button',
						text : 'About',
						handler : function() {
							VIS.showHTMLWindow('About', 'about.html');
						}
					}, {
						xtype : 'button',
						text : 'Help',
						handler : function() {
							VIS.showHTMLWindow('Help', 'help.html');
						}
					}, {
						xtype : 'button',
						text : 'Permalink',
						handler : function() {
							window.open(VIS.ResourceLoader.getPermalink(VIS.getAllLayers(), true));
						}
					} ],
					// Override so that toolbar overflow handling will treat this panel as
					// a buttongroup and place its items in the overflow menu
					isXType : function(type) {
						return type == 'buttongroup' || Ext.Panel.prototype.isXType.call(this, type);
					}

				} ]
			});

			// Initialize 2 map component sets
			VIS.addMap();
			VIS.addMap();

			// The complete ui layout
			var greenlandDiv = Ext.Element.get('greenlandDiv');
			if (greenlandDiv != null) {
				// If there is a div element with id greenlandDiv, render to that
				VIS.viewport = new Ext.Panel({
					renderTo : greenlandDiv,
					width : 100,
					height : 100,
					layout : 'border',
					items : [ centerPanel, toolbar, bottomPanel ],
					plugins : [ 'fittoparent' ],
					listeners : {
						afterrender : {
							// Force an additional toolbar layout pass after first render pass
							// to ensure creation of overflow menus
							single : true,
							fn : function() {
								toolbar.doLayout();
							}
						}
					}
				});
			} else {
				// If not, use the full body viewport
				VIS.viewport = new Ext.Viewport({
					layout : 'border',
					items : [ centerPanel, toolbar, bottomPanel ],
					listeners : {
						afterrender : {
							// Force an additional toolbar layout pass after first render pass
							// to ensure creation of overflow menus
							single : true,
							fn : function() {
								toolbar.doLayout();
							}
						}
					}
				});
			}

			// Check for get parameters
			VIS.checkForResourceRequest(function(newResource) {
				// Add new resource info at te beginning of default resources
				VIS.defaultResources.unshift(newResource);
				VIS.showResourceWindow([ newResource ], true);
			});

			VIS.checkForPermalink();

		}); // end onReady

VIS.getAllLayers = function() {
	var res = [];
	for ( var i = 0; i < VIS.mapComponents.length; i++) {
		var layers = VIS.mapComponents[i].mapPanel.map.layers;
		for ( var j = 0; j < layers.length; j++) {
			res.push(layers[j]);
		}
	}
	return res;
};

VIS.storeViewport = function(parcel) {
	parcel.writeBoolean(VIS.syncViewports);
	parcel.writeInt(VIS.mapComponents.length);
	for ( var i = 0; i < VIS.mapComponents.length; i++) {
		VIS.mapComponents[i].store(parcel);
	}
};

VIS.restoreViewport = function(parcel, callback) {
	VIS.syncViewports = parcel.readBoolean(); // TODO use enableSyncViewport
	var mapCount = Math.max(0, parcel.readInt());
	if (mapCount > VIS.mapComponents.length) {
		var len = mapCount - VIS.mapComponents.length;
		for ( var i = 0; i < len; i++) {
			VIS.addMap();
		}
	} else if (mapCount < VIS.mapComponents.length) {
		var len = VIS.mapComponents.length - mapCount;
		for ( var i = 0; i < len; i++) {
			VIS.removeMap();
		}
	}
	VIS.viewport.doLayout();

	var restoreCount = 0, mapCount = VIS.mapComponents.length;
	var mapRestoreCallback = function() {
		restoreCount++;
		if (restoreCount >= mapCount) {
			callback.call(this);
		}
	};

	for ( var i = 0; i < mapCount; i++) {
		VIS.mapComponents[i].restore(parcel, mapRestoreCallback);
	}
};

VIS.getMapIndex = function(layer) {
	var map = layer.map;
	for ( var i = 0; i < VIS.mapComponents.length; i++) {
		if (map == VIS.mapComponents[i].mapPanel.map) {
			return i;
		}
	}

	return -1;
};

/**
 * Processes "permalink" url parameters and adds resulting layers to first map
 */
VIS.checkForPermalink = function() {

	var parameters = OpenLayers.Util.getParameters();
	if (!parameters.perma) {
		return;
	}

	if (parameters.perma && parameters.perma.join)
		// Check if perma is parsed as array
		parameters.perma = parameters.perma.join(',');

	var msgBox = Ext.Msg.progress("Restoring Layers",
			"Please wait while Greenland restores visualizations from permalink");
	var messages = "";
	var hasLayers = VIS.ResourceLoader.loadResourcesFromPermalink(parameters.perma, function(result, mapIndex,
			currentNumber, length) {
		msgBox.updateProgress(currentNumber / length);
		if (result instanceof Error) {
			if (messages != '')
				messages += '<br/>';
			messages += Ext.util.Format.htmlEncode(result.message);
		} else {
			VIS.mapComponents[Math.min(Math.max(0, mapIndex), VIS.mapComponents.length)].mapPanel.map.addLayers([ result ]);
			// TODO add viewport if required
		}
		if (currentNumber >= length) {
			msgBox.hide();
			if (messages != '') {
				Ext.Msg.alert('Error loading permalink', 'Restoring of permalink genereated the following error: <br/>'
						+ messages);
			}
		}
	});

	if (hasLayers === false) {
		msgBox.hide();
	}
};

/**
 * Processes url parameters, callback function will receive a resource object
 */
VIS.checkForResourceRequest = function(callback) {

	var parameters = OpenLayers.Util.getParameters();
	if (parameters.url && parameters.url.join) // Check if url is parsed as array
		parameters.url = parameters.url.join(',');

	var newResource = {
		resourceId : VIS.nextResourceId++
	};

	if (parameters.url) {
		if (parameters.request) {
			OpenLayers.Request.GET({
				url : parameters.request,
				success : function(resp) {
					var newResource = {
						resourceId : VIS.nextResourceId++,
						url : parameters.url,
						request : resp.responseText,
						mime : parameters.mime
					};

					callback.call(this, newResource);
				},
				failure : function(resp) {
					throw 'Error processing request parameter';
				}
			});
		} else {
			newResource.url = parameters.url;
			newResource.mime = parameters.mime;
		}
	}

	if (parameters.oc) {
		newResource.url = parameters.oc;
		newResource.mime = 'application/xml';
	} else if (parameters.json) {
		newResource.url = parameters.json;
		newResource.mime = 'application/x-om-u+json';
	} else if (parameters.tiff) {
		newResource.url = parameters.tiff;
		newResource.mime = 'image/geotiff';
	} else if (parameters.netcdf) {
		newResource.url = parameters.netcdf;
		newResource.mime = 'application/netcdf';
	} else if (parameters.rasterOM) {
		newResource.url = parameters.rasterOM;
		newResource.mime = 'application/vnd.ogc.om+xml';
	} else if (parameters.om2) {
		newResource.url = parameters.om2;
		newResource.mime = 'application/x-om-u+xml';
	} else if (parameters.ncwms) {
		newResource.url = parameters.ncwms;
		newResource.mime = 'ncwms';
	} else if (parameters.wms) {
		newResource.url = parameters.wms;
		newResource.mime = 'wms';
	}

	if (newResource.url) {
		callback.call(this, newResource);
	}
};

/**
 * Shows a window with a custom title rendering the html given by an url
 * 
 * @param title
 *          Title of the window
 * @param url
 *          URL of the html content to show
 */
VIS.showHTMLWindow = function(title, url) {
	new Ext.Window({
		layout : 'fit',
		constrainHeader : true,
		title : title,
		width : 500,
		height : 500,
		items : [ {
			xtype : 'panel',
			autoScroll : true,
			autoLoad : {
				url : url
			},
			style : {
				background : 'white'
			}
		} ]
	}).show();
};

/**
 * Shows a window to select a new layer to be added to the specified
 * OpenLayers.Map object. Shows different data sources and visualizations and
 * allows specification of new resources.
 */
VIS.showResourceWindow = function(resources, requestParam) {
	var maps = [];
	for ( var i = 0; i < VIS.mapComponents.length; i++) {
		maps.push(VIS.mapComponents[i].mapPanel.map);
	}
	// Show window
	new Ext.ux.VIS.ResourceWindow({
		resources : resources,
		requestParam : requestParam,
		maps : maps,
		title : 'Add Resource',
		height : 400,
		width : 600,
		constrainHeader : true,
		createNewMap : function(projCode, mapCallback) {

			VIS.getProjection(projCode, function(projection) {
				var map = VIS.addMap({
					projection : projection
				}).mapPanel.map;
				VIS.viewport.doLayout();
				var baseLayer = new OpenLayers.Layer('None', {
					isBaseLayer : true,
					projection : projection
				});
				map.reprojecting = true;
				map.addLayers([ baseLayer ]);
				map.setBaseLayer(baseLayer);
				map.reprojecting = false;
				mapCallback.call(this, map);
			});

		}
	}).show();

	return;
};

/**
 * Returns projection by projection code via callback mechanism. Ensures that
 * OpenLayers.Projection.defaults is updated with default max resolutions
 * 
 * @param projCode
 * @param projCallback
 */
VIS.getProjection = function(projCode, projCallback) {
	var projectionCallback = function() {
		var projection = new OpenLayers.Projection(projCode);

		if (!OpenLayers.Projection.defaults[projection.getCode()]) {
			// Define projection default settings if not set using whole world as
			// max extent
			if (projection.proj.units == 'm') {
				OpenLayers.Projection.defaults[projection.getCode()] = {
					units : 'm',
					maxExtent : [ -20037508.34, -20037508.34, 20037508.34, 20037508.34 ]
				};
			} else { // if (projection.proj.units == 'degrees') { // TODO handle
				// unkown unit
				OpenLayers.Projection.defaults[projection.getCode()] = {
					units : 'degrees',
					maxExtent : [ -180, -90, 180, 90 ]
				};
			}
		}

		projCallback.call(this, projection);
	};

	if (typeof Proj4js == "object") {
		// Proj4js library detected, so load projection manually and use
		// callback mechanism to ensure that projection is ready to use before
		// using it within OpenLayers
		new Proj4js.Proj(projCode, function() {
			projectionCallback.call(this);
		});
	} else {
		projectionCallback.call(this);
	}
};

VIS.projCodeTitleCache = {};
/**
 * Extracts the name of a projection of its WKT and caches the result. The
 * projection itself needs to be already cached to receive a result.
 */
VIS.getProjectionTitle = function(projCode) {
	if (typeof Proj4js != "object") {
		// No Proj4js
		return;
	}

	if (VIS.projCodeTitleCache[projCode]) {
		return VIS.projCodeTitleCache[projCode];
	}

	var wkt = Proj4js.defs[projCode];
	if (wkt == null || wkt.length == 0) {
		return;
	}

	var result = /\+title=([^+]*)/.exec(wkt);
	if (result != null && result[1] != null) {
		VIS.projCodeTitleCache[projCode] = result[1];
		return result[1];
	}
};

/**
 * Shows a message box with an error text automatically truncated to a maximum
 * length
 * 
 */
VIS.showServerError = function(error, title) {
	var message = error.message;
	if (message.length > 150) {
		message = message.substring(0, 150) + "...";
	}
	Ext.Msg.alert(title ? title : 'Error', message);
};