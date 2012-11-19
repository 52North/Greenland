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
OpenLayers.VIS = OpenLayers.VIS || {};

/**
 * Manages the transformation from input observations to a simple map value and
 * advanced plots
 */
OpenLayers.VIS.ResultValue = OpenLayers.Class({

	layer : null,
	title : null,

	styleDefaults : {
		fillColor : 'gray',
		pointRadius : 8
	},

	initialize : function(options) {
		OpenLayers.Util.extend(this, options);
	},

	getTitle : function() {
		return this.title || '';
	},

	/**
	 * Called by parent layer with reference to itself during initialization
	 * 
	 * @param layer
	 */
	setLayer : function(layer) {
		this.layer = layer;
	},

	/**
	 * Function to provide flot parameters to create a plot for a specific feature
	 */
	getPlotParamFunc : function(feature, visualization) {
	},

	/**
	 * Returns a custom FlotPanel for a specific feature
	 */
	createPlotPanel : function(feature, layer, options) {
		options = Ext.apply({
			height : 400,
			title : 'Title'
		}, options);

		var panel = new Ext.ux.VIS.FlotPanel(options);
		panel.getPlotParams = this.getPlotParamFunc.createDelegate(panel, [ feature, this ]);
		return panel;
	},

	/**
	 * Function to receive flot parameters for a sub plot accessible through the
	 * main plot. Whereas getPlotParamFunc is based on a feature, sub plots are
	 * based on the clickInfo structure, individually defined by the plot params
	 * of the "main" plot.
	 */
	getSubPlotParamFunc : function(clickInfo, visualization) {
	},

	/**
	 * Returns a custom FlotPanel for a specific clickInfo as defined by the main
	 * plot
	 */
	createSubPlotPanel : function(clickInfo, options) {
		options = Ext.apply({
			height : 400,
			title : 'Title'
		}, options);

		var panel = new Ext.ux.VIS.FlotPanel(options);
		panel.getPlotParams = this.getSubPlotParamFunc.createDelegate(panel, [ clickInfo, this ]);
		return panel;
	},

	/**
	 * Helper function to use custom visualization style variables in flot plots.
	 * Guarantees access to valid values of styleDefaults config if requested
	 * visualization style does not exists for current layer.
	 * 
	 * Example: get color using the current style settings of a specific value
	 * this.getStyleParam('fillColor', value);
	 * 
	 * @param param
	 * @param value
	 * @returns
	 */
	getStyleParam : function(param, value) {
		if (this.layer.visualization.styler && this.layer.visualization.styler[param]) {
			return this.layer.visualization.styler[param].getValue(value);
		} else {
			return this.styleDefaults[param];
		}
	},

	restore : function(parcel) {
		for ( var key in this.options || {}) {
			parcel.readParameter(this.options[key]);
		}
	},

	store : function(parcel) {
		for ( var key in this.options || {}) {
			parcel.writeParameter(this.options[key]);
		}
	}
});
