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
OpenLayers.VIS.Symbology = OpenLayers.VIS.Symbology || {};

OpenLayers.VIS.mergeStyle = function(tar, src) {
	var merge = new OpenLayers.Style(OpenLayers.Util.extend(tar.defaultStyle, src.defaultStyle), {
		context : OpenLayers.Util.extend(tar.context, src.context)
	});
	return merge;
};

OpenLayers.VIS.extendStyler = function(tar, src) {

	for ( var key in src) {
		if (tar[key]) {
			if (tar[key].length) {
				tar[key].push(src[key]);
			} else {
				tar[key] = [ tar[key], src[key] ];
			}
		} else {
			tar[key] = src[key];				
		}
	}

	return tar;
};
/**
 * Class managing the symbology of a visualization. Maintains the legend, events
 * to indicate changes and handling of customizable parameters
 */
OpenLayers.VIS.Symbology.Base = OpenLayers.Class({

	EVENT_TYPES : [ 'change' ],
	events : null,
	uom : null,
	legendInfos : null,
	styler : null,
	options : null,

	initialize : function(options) {
		this.events = new OpenLayers.Events(this, null, this.EVENT_TYPES, false);

		// Legend options, used by createLegendItemForLayer
		this.options = {};
		if (options) {
			OpenLayers.Util.extend(this.options, options.options || {});
		}

		OpenLayers.Util.extend(this, options);
		// Initialize styler objects, transform arrays of styler into Chooser
		for ( var key in this.styler) {
			if (this.styler[key].length) {
				// Array -> Chooser
				this.styler[key] = new OpenLayers.VIS.Styler.Chooser({
					stylers : this.styler[key]
				});
			}

			if (this.styler[key].setSymbology) {
				this.styler[key].setSymbology(this);
			}
		}
	},

	/**
	 * Provides an Ext.Panel shown as the legend of this visualization. Uses the
	 * legendInfos attribute which may be provided by subclasses to conveniently
	 * define the legend. legendInfos consists of objects with attributes label
	 * (text describing the value), symbolType (defaults to polygon, see
	 * GeoExt.FeatureRenderer) and symbol (object defining a OpenLayers style,
	 * automatically extended to reflect this layer's opacity)
	 * 
	 * @returns {Ext.Panel}
	 */
	getLegend : function() {
		if (!this.legendInfos)
			return;

		var items = [];

		for ( var i = 0; i < this.legendInfos.length; i++) {
			var legendInfo = this.legendInfos[i];

			items.push(new Ext.Panel({
				items : [ new GeoExt.FeatureRenderer({
					symbolType : legendInfo.symbolType || 'Polygon',
					symbolizers : [ OpenLayers.Util.extend(legendInfo.symbol, {
						fillOpacity : this.layer.opacity
					}) ]
				}), new Ext.form.Label({
					html : legendInfo.label,
					style : 'font-size: 10px'
				}) ],
				padding : '0px 5px 0px',
				baseCls : 'x-plain'
			}));
		}

		return new Ext.Panel({
			layout : 'column',
			autoScroll : true,
			defaults : {
				border : false
			},
			items : items,
			border : false,
			baseCls : 'x-plain'
		});
	},

	onChange : function() {
		this.events.triggerEvent('change', {
			property : 'symbology'
		});
		// this.layer.updateVisualization();
	},

	/**
	 * Returns an array of parameter config objects. Used by the layer settings
	 * dialog to allow the user to change visualization parameters
	 * 
	 * See VIS.createParameterControls (ui.js) for config objects.
	 * 
	 * @returns {Array}
	 */
	createParameters : function() {
		return [];
	},

	destroy : function() {
		this.events = this.events.destroy();
	},

	restore : function(parcel) {
		// visualization-specific styling parameters
		for ( var key in this.styler || {}) {
			if (this.styler[key].restore) {
				this.styler[key].restore(parcel);
			}
		}

		// visualization-specific parameters
		for ( var key in this.options || {}) {
			parcel.readParameter(this.options[key]);
		}
	},

	store : function(parcel) {
		// visualization-specific styling parameters
		for ( var key in this.styler || {}) {
			if (this.styler[key].store) {
				this.styler[key].store(parcel);
			}
		}

		// visualization-specific parameters
		for ( var key in this.options || {}) {
			parcel.writeParameter(this.options[key]);
		}
	}
});