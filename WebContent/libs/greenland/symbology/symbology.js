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
	 * See createParameterControls (ui.js) for config objects.
	 * 
	 * @returns {Array}
	 */
	createParameters : function() {
		return [];
	},

	destroy : function() {
		this.events = this.events.destroy();
	}
});