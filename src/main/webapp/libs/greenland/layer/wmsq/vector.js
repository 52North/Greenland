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
/**
 * General vector visualization for ncWMS layers. Manages a
 * OpenLayers.Layer.Vector layer and styles to show and cache vector features.
 */
OpenLayers.Layer.WMSQ.Vector = OpenLayers.Class(OpenLayers.Layer.WMSQ.Visualization, {
	vectorLayer : null,

	handleVisibilityChanged : function(evt) {
		this.vectorLayer && this.vectorLayer.setVisibility(this.layer.getVisibility());
	},

	setLayer : function(layer) {
		OpenLayers.Layer.WMSQ.Visualization.prototype.setLayer.call(this, layer);
		this.layer.events.register('visibilitychanged', this, this.handleVisibilityChanged);
	},

	removeLayer : function(layer) {
		OpenLayers.Layer.WMSQ.Visualization.prototype.removeLayer.call(this, layer);
		this.layer.events.unregister('visibilitychanged', this, this.handleVisibilityChanged);
	},

	handleChangeTime : function() {
		if (this.vectorLayer && this.layer.getVisibility()) {
			this.vectorLayer.setVisibility(this.layer.calculateInRange());
		}
	},

	setMap : function(map) {
		// Initialization of vector layer and style to make use of stylers
		var style = {};
		var context = {};
		var styler;
		for ( var key in this.styler) {
			styler = this.styler[key];
			if (typeof styler == 'string') {
				style[key] = '${' + styler + '}';
			} else if (styler.isFeatureStyler !== false) {
				style[key] = '${get' + key + '}';
				context['get' + key] = function(feature) {
					return this.getValue.call(this, feature.attributes[this.attribute || 'resultValue']);
				}.createDelegate(styler);
			}
		}

		this.featureCache = {};
		this.vectorLayer = new OpenLayers.Layer.Vector('Test', {
			styleMap : new OpenLayers.StyleMap(new OpenLayers.Style(style, {
				context : context
			})),
			visualization : this
		});
		map.addLayer(this.vectorLayer);

		OpenLayers.Layer.WMSQ.Visualization.prototype.setMap.call(this, map);

		map.events.register('changetime', this, this.handleChangeTime);
	},

	removeMap : function(map) {
		map.events.unregister('changetime', this, this.handleChangeTime);

		OpenLayers.Layer.WMSQ.Visualization.prototype.removeMap.call(this, map);
		if (!this.vectorLayer)
			return;

		// Remove vector layer
		map.removeLayer(this.vectorLayer);
		this.vectorLayer.destroy();
	},

	/**
	 * Adds features to the vector layer and caches them for the specified
	 * bounding box. Existing features for these bounds get removed first.
	 * 
	 * @param features
	 * @param bounds
	 */
	addFeatures : function(features, bounds) {
		if (!this.vectorLayer)
			return;

		var compBounds = bounds.clone();
		compBounds.right -= 5;
		compBounds.bottom += 5;
		compBounds.top -= 5;
		compBounds.left += 5;
		var featuresToRemove = [];
		for ( var key in this.featureCache) {
			if (compBounds.intersectsBounds(this.featureCache[key].bounds, false)) {
				featuresToRemove = featuresToRemove.concat(this.featureCache[key].features);
				delete this.featureCache[key];
			}
		}
		this.vectorLayer.removeFeatures(featuresToRemove);

		this.vectorLayer.addFeatures(features);
		this.featureCache[bounds.toBBOX()] = {
			bounds : bounds.clone(),
			features : features
		};

	}
});
