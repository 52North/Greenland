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

// Utility method to extract human readable part of observed property
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

Ext.BLANK_IMAGE_URL = 'libs/ExtJs/resources/images/default/s.gif';

// represents the two map views
var mapComponents = [];

Ext.onReady(function() {
	// Executed when Ext framework is ready, i.e. website is loaded

	Ext.QuickTips.init();

	// Flags for viewport sync
	var syncPointers = true;
	var syncViewports = true;

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
			for ( var i = 0, len = mapComponents.length; i < len; i++) {
				var mouseMarkerLayer = mapComponents[i].mouseMarkerLayer;
				mouseMarkerLayer.setVisibility(false);
			}
		}
	}

	// Function to synchronize viewports. The center location and zoom level
	// of each map gets adapted to the values of the first map
	function enableSyncViewports(enable) {
		syncViewports = enable;
		if (syncViewports) {
			var mainMap = mapComponents[0].mapPanel.map;
			var center = mainMap.getCenter().clone();
			var zoom = mainMap.getZoom();
			for ( var i = 0, len = mapComponents.length; i < len; i++) {
				var map = mapComponents[i].mapPanel.map;
				if (map != mainMap) {
					map.setCenter(center, zoom, false);
				}
			}
		}
	}

	function enableBoxSelection(enable) {
		for ( var i = 0, len = mapComponents.length; i < len; i++) {
			mapComponents[i].selectLayer.setBoxSelectionEnabled(enable);
		}
	}

	// Shows feature windows for the selected features of each layer from all
	// map components
	function showSelectedFeatureDetails() {
		var layerFeatureMap = {};

		for ( var i = 0, len = mapComponents.length; i < len; i++) {
			var selectLayer = mapComponents[i].selectLayer;
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
			createFeatureWindow(entry.features, entry.layer);
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

		for ( var i = 0, len = mapComponents.length; i < len; i++) {
			var mouseMarker = mapComponents[i].mouseMarker;
			if (evt.object == mouseMarker.map) {
				continue;
			}
			mouseMarker.moveTo(mouseMarker.map.getLayerPxFromLonLat(lonLat));
		}
	};

	var handleMouseOver = function(evt) {
		if (!syncPointers)
			return;
		for ( var i = 0, len = mapComponents.length; i < len; i++) {
			var mouseMarkerLayer = mapComponents[i].mouseMarkerLayer;
			if (evt.object != mouseMarkerLayer.map) {
				mouseMarkerLayer.setVisibility(true);
				mouseMarkerLayer.map
						.setLayerIndex(mouseMarkerLayer, mouseMarkerLayer.map.layers.length - 1);
			} else {
				mouseMarkerLayer.setVisibility(false);
				mouseMarkerLayer.map.setLayerIndex(mouseMarkerLayer, 0);

			}

		}
	};

	var handleMouseOut = function(evt) {
		if (!syncPointers)
			return;
		for ( var i = 0, len = mapComponents.length; i < len; i++) {
			var mouseMarkerLayer = mapComponents[i].mouseMarkerLayer;
			mouseMarkerLayer.setVisibility(false);
		}
	};

	var handleMapMove = function(evt) {
		if (!syncViewports)
			return;

		var center = evt.object.getCenter().clone();
		var zoom = evt.object.getZoom();
		for ( var i = 0, len = mapComponents.length; i < len; i++) {
			var map = mapComponents[i].mapPanel.map;
			if (map != evt.object && (map.zoom != zoom || !map.center.equals(center))) {
				map.setCenter(center, zoom, false);
			}
		}
	};

	var handleChangeTimeLimits = function(evt) {
		var min = Number.POSITIVE_INFINITY;
		var max = Number.NEGATIVE_INFINITY;
		var extents = [];
		for ( var i = 0, len = mapComponents.length; i < len; i++) {
			var map = mapComponents[i].mapPanel.map;
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
		for ( var i = 0, len = mapComponents.length; i < len; i++) {
			var map = mapComponents[i].mapPanel.map;
			map.setTime(newTimeValue);
		}

	};

	// Function creates all components needed for a single map view
	function createMapComponents() {
		// Base layers
		var baseLayers = [ new OpenLayers.Layer.OSM.Mapnik('OpenStreetMap Mapnik', {
			transitionEffect : 'resize'
		}), new OpenLayers.Layer.OSM.Osmarender('OpenStreetMap Osmarender', {
			transitionEffect : 'resize'
		}), new OpenLayers.Layer.OSM.CycleMap('OpenStreetMap CycleMap', {
			transitionEffect : 'resize'
		}), new OpenLayers.Layer.Google('Google Streets', {
			transitionEffect : 'resize'
		}), new OpenLayers.Layer.Google('Google Satellite', {
			type : google.maps.MapTypeId.SATELLITE,
			transitionEffect : 'resize'
		}), new OpenLayers.Layer.Google('Google Hybrid', {
			type : google.maps.MapTypeId.HYBRID,
			transitionEffect : 'resize'
		}), new OpenLayers.Layer.Google('Google Physical', {
			type : google.maps.MapTypeId.TERRAIN,
			transitionEffect : 'resize'
		}) ];
		// Map itself
		var map = new OpenLayers.VIS.Map({
			maxExtent : new OpenLayers.Bounds(-128 * 156543.0339, -128 * 156543.0339, 128 * 156543.0339,
					128 * 156543.0339),
			maxResolution : 156543.0339,
			units : 'm',
			projection : new OpenLayers.Projection('EPSG:3857'),
			displayProjection : new OpenLayers.Projection('EPSG:4326'),
			controls : [ new OpenLayers.Control.ScaleLine(), // new
			// OpenLayers.Control.ZoomBox(),
			new OpenLayers.Control.Navigation({
				dragPanOptions : {
					enableKinetic : true,
					documentDrag : true
				}
			}) ], // , new OpenLayers.Control.KeyboardDefaults() ]
		});
		map.addLayers(baseLayers);

		var center = new OpenLayers.LonLat(7.6, 51.9);
		center.transform(new OpenLayers.Projection('EPSG:4326'), map.getProjectionObject());
		map.setCenter(center, 4); // Needed for marker layer, although
		// eventually specified by GeoExt.MapPanel

		// Mouse marker, to show the position of the mouse in other map views
		var mouseMarkerLayer = new OpenLayers.Layer.Markers("MouseMarker");
		map.addLayer(mouseMarkerLayer);

		var mouseMarker = new OpenLayers.Marker(map.getCenter(), new OpenLayers.Icon(
				'images/cross.png', new OpenLayers.Size(20, 20), new OpenLayers.Pixel(-10, -10)));
		mouseMarkerLayer.addMarker(mouseMarker);

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
			numPoints : 2,
			labelled : true,
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
				}
			}
		});
		for ( var i = 0, len = baseLayers.length; i < len; i++) {
			layerMenu.add({
				text : baseLayers[i].name,
				layer : baseLayers[i],
				checked : i == 0,
				group : map.id + 'baselayer'
			});
		}

		var featureInfoControl = new OpenLayers.Control.WMSGetFeatureInfo({
			infoFormat : 'application/vnd.ogc.gml'
		});
		map.addControl(featureInfoControl);

		/**
		 * Function called on render event of the MapPanel. Performs actions which
		 * require a rendered map view, i.e. when the map is reflected as html
		 * elements
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
				var clickPosition = new OpenLayers.Pixel(e.xy[0] - viewportEl.getLeft(), e.xy[1]
						- viewportEl.getTop()); // mouse position within map view

				/**
				 * Function to perform getFeatureInfo request used by the queryable
				 * layers menu
				 */
				function getFeatureInfoForLayerItem() {
					var lonLat = map.getLonLatFromViewPortPx(clickPosition);

					if (this.layer instanceof OpenLayers.Layer.WMSQ) {
						Ext.Msg.alert('Feature Info', this.layer.featureInfo(lonLat).replace('\n', '<br/>'));
					} else {

						this.layer.visualization.visualizer.dataSet.getValue(lonLat, map.getProjectionObject(),
								function(value) {

								});

						var featureInfoOptions = featureInfoControl.buildWMSOptions(this.layer.url,
								[ this.layer ], this.clickPosition, "application/vnd.ogc.se_xml");

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
							|| layer instanceof OpenLayers.Layer.WMSQ) {
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

		// Return object of all required parts for a map component
		return {
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
											if (layer.getVisibility() && layer != mouseMarkerLayer
													&& layer != selectLayer && layer.name != 'grat_') {
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
			// Selection layer
			selectLayer : selectLayer,
			// Feature Info Control
			featureInfoControl : featureInfoControl,
			// Cache controls
			cacheWriteControl : cacheWriteControl,
			cacheReadControl : cacheReadControl
		};
	}

	mapComponents = [];

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
		items : []
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
			Ext.each(mapComponents, function(components) {
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

		mapComponents.push(components);
	};

	var removeMap = function(components) {
		centerPanel.remove(components.mapPanel);

		bottomPanel.remove(components.legendPanel);

		// TODO possibly unregister feature selection events

		mapComponents.remove(components);
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
			Ext.each(mapComponents, function(components) {
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
			Ext.each(mapComponents, function(components) {
				components.selectLayer.unselectAll();
			});
		}
	});

	timeSlider.on('change', function(slider, value) {
		// Set selected time for all map views
		for ( var i = 0, len = mapComponents.length; i < len; i++) {
			var map = mapComponents[i].mapPanel.map;
			map.setTime(new Date(value));
		}
		timeLabel.setText(new Date(value).toUTCString());
	});

	// Viewport eventually combining all ExtJs components
	var viewport = null;

	// Toolbar creation
	var toolbar = new Ext.Toolbar({
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
					showResourceWindow(mapComponents[0].mapPanel.map);
				},
				iconCls : 'icon-database'
			}, {
				text : 'Refresh',
				handler : function() {
					Ext.each(mapComponents, function(components) {
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
			columns : 2,
			defaults : {
				scale : 'small'
			},
			items : [ {
				xtype : 'button',
				text : 'Sync Pointer',
				enableToggle : true,
				pressed : syncPointers,
				toggleHandler : function(button, pressed) {
					enableSyncPointers(pressed);
				}
			}, {
				xtype : 'button',
				text : 'Add Map',
				iconCls : 'icon-addmap',
				handler : function(button) {
					addMap(createMapComponents());
					viewport.doLayout();
				}
			}, {
				xtype : 'button',
				text : 'Sync Viewports',
				enableToggle : true,
				pressed : syncViewports,
				toggleHandler : function(button, pressed) {
					enableSyncViewports(pressed);
				}
			}, {
				xtype : 'button',
				text : 'Remove Map',
				iconCls : 'icon-deletemap',
				handler : function(button) {
					if (mapComponents.length > 1) {
						removeMap(mapComponents[mapComponents.length - 1]);
						viewport.doLayout();
					}
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
			items : [ timeSlider, timeForward, timeAnimateButton, timeLabel, timeBackward ]
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
		// About and help links, directly from html
		{
			xtype : 'box',
			autoEl : {
				tag : 'div',
				cn : [ {
					tag : 'a',
					href : 'javascript:showHTMLWindow(\'About\', \'about.html\')',
					cn : 'About',
					style : {
						'margin-right' : '10px'
					}
				}, '<br/>', {
					tag : 'a',
					href : 'javascript:showHTMLWindow(\'Help\', \'help.html\')',
					cn : 'Help',
					style : {
						'margin-right' : '10px'
					}
				} ]
			}
		}

		]
	});

	// Initialize 2 map component sets
	addMap(createMapComponents());
	addMap(createMapComponents());

	// The complete ui layout
	viewport = new Ext.Viewport({
		layout : 'border',
		items : [ centerPanel, toolbar, bottomPanel ]
	});

	// Check for get parameters
	checkForResourceRequest(function(newResource) {
		// Add new resource info at te beginning of default resources
		defaultResources.unshift(newResource);
		showResourceWindow(mapComponents[0].mapPanel.map, [ newResource ], true);
	});

	checkForPermalink();

}); // end onReady

function getAllLayers() {
	var res = [];
	for ( var i = 0; i < mapComponents.length; i++) {
		var layers = mapComponents[i].mapPanel.map.layers;
		for ( var j = 0; j < layers.length; j++) {
			res.push(layers[j]);
		}
	}
	return res;
}

/**
 * Processes "permalink" url parameters and adds resulting layers to first map
 */
function checkForPermalink() {

	var parameters = OpenLayers.Util.getParameters();
	if (!parameters.perma) {
		return;
	}

	if (parameters.perma && parameters.perma.join)
		// Check if perma is parsed as array
		parameters.perma = parameters.perma.join(',');

	OpenLayers.VIS.ResourceLoader.loadResourcesFromPermalink(parameters.perma, function(result) {
		if (result instanceof Error) {
			Ext.Msg.alert('Error loading permalink', Ext.util.Format.htmlEncode(result.message));
			return;
		}
		mapComponents[0].mapPanel.map.addLayers([ result ]);
	});

}

/**
 * Processes url parameters, callback function will receive a resource object
 */
function checkForResourceRequest(callback) {

	var parameters = OpenLayers.Util.getParameters();
	if (parameters.url && parameters.url.join) // Check if url is parsed as array
		parameters.url = parameters.url.join(',');

	var newResource = {
		resourceId : nextResourceId++,
		vissUrl : vissUrl
	};

	if (parameters.url) {
		if (parameters.request) {
			OpenLayers.Request.GET({
				url : parameters.request,
				success : function(resp) {
					var newResource = {
						resourceId : nextResourceId++,
						vissUrl : vissUrl,
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
		newResource.mime = 'application/jsom';
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
	} else if (parameters.wms) {
		newResource.url = parameters.wms;
		newResource.mime = 'application/vnd.ogc.wms';
	}

	if (newResource.url) {
		callback.call(this, newResource);
	}
}

/**
 * Shows a window with a custom title rendering the html given by an url
 * 
 * @param title
 *          Title of the window
 * @param url
 *          URL of the html content to show
 */
function showHTMLWindow(title, url) {
	new Ext.Window({
		layout : 'fit',
		constrainHeader : true,
		title : title,
		autoScroll : true,
		width : 500,
		height : 500,
		items : [ {
			xtype : 'panel',
			autoLoad : {
				url : url
			},
			style : {
				background : 'white'
			}
		} ]
	}).show();
}