/*
 * Copyright 2012 52°North Initiative for Geospatial Open Source Software GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
/**
 * General vector visualization for ncWMS layers. Manages a
 * OpenLayers.Layer.Vector layer and styles to show and cache vector features.
 */
OpenLayers.Layer.VIS.WMSQ.Vector = OpenLayers.Class(OpenLayers.Layer.VIS.WMSQ.Visualization, {
	vectorLayer : null,

	handleVisibilityChanged : function(evt) {
		this.vectorLayer && this.vectorLayer.setVisibility(this.layer.getVisibility());
	},

	setLayer : function(layer) {
		OpenLayers.Layer.VIS.WMSQ.Visualization.prototype.setLayer.call(this, layer);
		this.layer.events.register('visibilitychanged', this, this.handleVisibilityChanged);
	},

	removeLayer : function(layer) {
		OpenLayers.Layer.VIS.WMSQ.Visualization.prototype.removeLayer.call(this, layer);
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

		OpenLayers.Layer.VIS.WMSQ.Visualization.prototype.setMap.call(this, map);

		map.events.register('changetime', this, this.handleChangeTime);
	},

	removeMap : function(map) {
		map.events.unregister('changetime', this, this.handleChangeTime);

		OpenLayers.Layer.VIS.WMSQ.Visualization.prototype.removeMap.call(this, map);
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
