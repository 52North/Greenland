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
OpenLayers.Layer.VIS = OpenLayers.Layer.VIS || {};

/**
 * Special layer to solve problems with feature selection. Using a SelectFeature
 * control with a vector layer usually results in the layer being fixed always
 * on top of the layer stack. Using it with multiple vector layers results in a
 * RootContainer-Layer on top, also causing problems with layer ordering and
 * raster layers.
 * 
 * This MultiProxyVector creates invisible proxy features for every feature
 * added to any vector layer attached to the corresponding map. This allows this
 * layer to handle feature selection using these invisible features, while
 * keeping all layer reordering capabilities. It uses two independent
 * SelectFeature controls for selection and highlighting of features. An
 * Ext.Tooltip component is integrated to show tooltips for highlighted
 * features.
 */
OpenLayers.Layer.VIS.MultiProxyVector = OpenLayers.Class(OpenLayers.Layer.Vector, {
	CLASS_NAME : "OpenLayers.Layer.VIS.MultiProxyVector",
	selectControl : null,
	highlightControl : null,
	tooltip : null,

	initialize : function(name, options) {
		// Initialize Ext.Tooltip
		this.tooltip = new Ext.ToolTip({
			header : true,
			anchor : 'left',
			style : {
				'pointer-events' : 'none'
			}
		});

		// Set a StyleMap which reflects the size and shape of the
		// corresponding
		// original feature. It renders features completely transparent, but
		// adds a
		// flot-like gray border if selected
		options.styleMap = new OpenLayers.StyleMap({
			'default' : new OpenLayers.Style({
				fillOpacity : 0, // transparent
				// fillColor: 'blue',
				strokeOpacity : 0, // transparent
				pointRadius : '${getRadius}',
				display : '${getDisplay}',
				graphicName : '${getGraphicName}'
			}, {
				context : {
					getDisplay : function(feature) {
						if (!feature.originalFeature.attributes
								|| feature.originalFeature.attributes.resultValue == null) {
							return 'none';
						} else {
							return 'display';
						}
					}.createDelegate(this),
					getRadius : function(feature) {
						var radiusStyler = feature.originalFeature.layer.visualization.styler.pointRadius;
						if (radiusStyler && feature.originalFeature.attributes) {
							return radiusStyler.getValue(feature.originalFeature.attributes.resultValue) + 2;
						} else {
							return 10;
						}
					},
					getGraphicName : function(feature) {
						var graphicNameStyler = feature.originalFeature.layer.visualization.styler.graphicName;
						if (graphicNameStyler && feature.originalFeature.attributes) {
							return graphicNameStyler.getValue(feature.originalFeature.attributes.resultValue);
						} else {
							return 'circle';
						}
					}
				}
			}),
			'select' : {
				// Gray border on selection
				strokeOpacity : 0.7,
				strokeColor : 'gray',
				strokeWidth : 5
			}
		});
		OpenLayers.Layer.Vector.prototype.initialize.call(this, name, options);
	},

	handleAddLayer : function(evt) {
		// Ensure that the changetime event is received after all other
		// layers
		// processed it to work with valid resultValue attributes by
		// re-registering
		// for that event
		this.map.events.unregister('changetime', this, this.handleChangeTime);
		this.map.events.register('changetime', this, this.handleChangeTime);

		if (this.isCompatibleLayer(evt.layer)) {
			// this.addProxyFeatures(evt.layer.features);
			evt.layer.events.register('featuresadded', this, this.handleAddFeatures);
			evt.layer.events.register('featuresremoved', this, this.handleRemoveFeatures);
		}
	},

	isCompatibleLayer : function(layer) {
		return layer instanceof OpenLayers.Layer.Vector && this != layer && layer.name != 'grat_'
				&& layer.visualization && layer.visualization.styler && layer.visualization.getToolTip;
	},

	/**
	 * Event handler for featuresadded event of a vector layer
	 * 
	 * @param evt
	 */
	handleAddFeatures : function(evt) {
		this.addProxyFeatures(evt.features);
	},

	/**
	 * Event handler for featuresremoved event of a vector layer
	 * 
	 * @param evt
	 */
	handleRemoveFeatures : function(evt) {
		this.removeProxyFeatures(evt.features);
	},

	/**
	 * Event handler for removelayer event of the corresponding map object.
	 * Unregisters event listeners from removed layer.
	 * 
	 * @param evt
	 */
	handleRemoveLayer : function(evt) {
		if (this.isCompatibleLayer(evt.layer)) {
			evt.layer.events.unregister('featuresadded', this, this.handleAddFeatures);
			evt.layer.events.unregister('featuresremoved', this, this.handleRemoveFeatures);

			// Remove all proxy features for the removed layer
			var featuresToRemove = [];
			var f;
			for ( var i = 0, len = this.features.length; i < len; i++) {
				f = this.features[i];
				if (f.originalFeature && f.originalFeature.layer == evt.layer) {
					featuresToRemove.push(f);
				}
			}
			this.removeFeatures(featuresToRemove);
		}
	},

	/**
	 * Event handler for changelayer map event. Listens for visibility changes to
	 * add/remove proxy features if required.
	 * 
	 * @param evt
	 */
	handleChangeLayer : function(evt) {
		if (evt.property != 'visibility' || !this.isCompatibleLayer(evt.layer))
			return;

		if (evt.layer.getVisibility()) {
			this.handleAddLayer(evt);
			this.addProxyFeatures(evt.layer.features);
		} else {
			this.handleRemoveLayer(evt);
		}
	},

	/**
	 * Adds proxy features for the given array of features
	 * 
	 * @param features
	 */
	addProxyFeatures : function(features) {
		var proxyFeatures = new Array(features.length);
		for ( var i = 0, len = features.length; i < len; i++) {
			proxyFeatures[i] = new OpenLayers.Feature.Vector(features[i].geometry.clone());
			proxyFeatures[i].originalFeature = features[i];
		}
		this.addFeatures(proxyFeatures);
	},

	/**
	 * Removes the proxy features of the given features
	 * 
	 * @param features
	 */
	removeProxyFeatures : function(features) {
		var proxyFeaturesToRemove = [];
		var featureIndex;
		for ( var i = 0, len = this.features.length; i < len; i++) {
			featureIndex = features.indexOf(this.features[i].originalFeature);
			if (featureIndex >= 0) {
				proxyFeaturesToRemove.push(this.features[i]);
				features.splice(featureIndex, 1);
			}
		}
		this.removeFeatures(proxyFeaturesToRemove);
	},

	setMap : function(map) {
		OpenLayers.Layer.Vector.prototype.setMap.apply(this, arguments);

		// register for map events
		this.map.events.register('addlayer', this, this.handleAddLayer);
		this.map.events.register('preremovelayer', this, this.handleRemoveLayer);

		this.map.events.register('changetime', this, this.handleChangeTime);
		this.map.events.register('changelayer', this, this.handleChangeLayer);

		// Control for feature selection
		this.selectControl = new OpenLayers.Control.SelectFeature(this, {
			map : this.map,
			multiple : false,
			toggleKey : "ctrlKey",
			multipleKey : "shiftKey",
			box : true, // box mode has to be set, although it has to be
			// initially
			// disabled
			onSelect : function(feature) {
				// show charts for selected feature
				// createFeatureWindow(feature.originalFeature);
			}
		});
		this.selectControl.box = false; // disable box selection after
		// control
		// initialization

		// Control for feature highlighting
		this.highlightControl = new OpenLayers.Control.SelectFeature(this, {
			hover : true,
			highlightOnly : true,
			eventListeners : {
				featurehighlighted : function(evt) {
					// compute current pixel coordinates of highlighted
					// feature
					var centroid = evt.feature.geometry.getCentroid();
					var viewportpx = evt.feature.layer.map.getPixelFromLonLat(new OpenLayers.LonLat(
							centroid.x, centroid.y));
					var viewportEl = Ext.get(evt.feature.layer.map.viewPortDiv);
					var featurePos = [ viewportpx.x + viewportEl.getLeft() + 8,
							viewportpx.y + viewportEl.getTop() + 8 ];

					var tooltipvalue = evt.feature.originalFeature.layer.visualization
							.getToolTip(evt.feature.originalFeature);

					if (tooltipvalue) {
						this.tooltip.setTitle(tooltipvalue);
						this.tooltip.showAt(featurePos);
					}
				},
				featureunhighlighted : function() {
					// hide tooltip
					this.tooltip.hide();
				},
				scope : this
			}
		});

		map.addControl(this.highlightControl);
		map.addControl(this.selectControl);
		this.highlightControl.activate();
		this.selectControl.activate();

	},

	/**
	 * Unselects all selected features by forwarding call to underlying
	 * OpenLayers.Control.SelectFeature control
	 * 
	 * @param options
	 */
	unselectAll : function(options) {
		if (!this.selectControl)
			return;

		this.selectControl.unselectAll(options);
	},

	removeMap : function(map) {
		// Unregister event handlers
		this.map.events.unregister('addlayer', this, this.handleAddLayer);
		this.map.events.unregister('preremovelayer', this, this.handleRemoveLayer);

		this.map.events.unregister('changetime', this, this.handleChangeTime);

		this.map.removeControl(this.selectControl);
		this.map.removeControl(this.highlightControl);
		this.map = null;
		OpenLayers.Layer.Vector.prototype.removeMap.apply(this, arguments);
	},

	handleChangeTime : function(evt) {
		// redraw on time change, since feature visibility could have
		// changed
		this.redraw();
	},

	/**
	 * Enabled/Disables box selection of the underlying SelectFeature control
	 * 
	 * @param enabled
	 */
	setBoxSelectionEnabled : function(enabled) {
		if (!this.selectControl)
			return;

		this.selectControl.box = enabled;
		if (this.selectControl.active) {
			this.selectControl.deactivate();
			this.selectControl.activate();
		}
	}

});
