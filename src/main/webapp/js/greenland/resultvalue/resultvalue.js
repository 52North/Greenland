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
