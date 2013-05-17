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

/**
 * Extension of OpenLayers.VIS.Symbology.Base class to handle vector features.
 * Provides styling mechanisms and vector layer event handling.
 */
OpenLayers.VIS.Symbology.Vector = OpenLayers.Class(OpenLayers.VIS.Symbology.Base, {
	CLASS_NAME : 'OpenLayers.VIS.VectorSymbology',

	title : null,
	layer : null,
	legendSymbolType : null,

	initialize : function(options) {
		this.legendSymbolType = 'point';

		options = options || {};

		OpenLayers.VIS.Symbology.Base.prototype.initialize.call(this, options);

		// update legend if symbology, value extent or opacity gets changed.
		this.events.register('change', this,
				function(evt) {
					if (evt.property == 'symbology' || evt.property == 'valueExtent'
							|| evt.property == 'opacity') {
						this.updateLegend();
					}
				});
	},

	/**
	 * Called by a layer during its initialization. Provides a reference to
	 * itself.
	 * 
	 * @param layer
	 */
	setLayer : function(layer) {
		this.layer = layer;
		// this.observedProperties = [];
		if (this.layer.events) {
			this.layer.events.register('beforefeatureadded', this, this.handleBeforeFeatureAdded);
			this.layer.events.register('featureadded', this, this.handleFeatureAdded);
			this.layer.events.register('beforefeaturesadded', this, this.handleBeforeFeaturesAdded);
			this.layer.events.register('featuresadded', this, this.handleFeaturesAdded);
		}

		// this.setMaskedProcedures(this.maskedProcedures);
	},

	removeLayer : function() {
		if (this.layer.events) {
			this.layer.events.unregister('beforefeatureadded', this, this.handleBeforeFeatureAdded);
			this.layer.events.unregister('featureadded', this, this.handleFeatureAdded);
			this.layer.events.unregister('beforefeaturesadded', this, this.handleBeforeFeaturesAdded);
			this.layer.events.unregister('featuresadded', this, this.handleFeaturesAdded);
		}
		this.layer = null;
		// this.maskedProceduresMap = {};
	},

	/**
	 * Convenience method to handle beforefeatureadded event of layer
	 * 
	 * @param evt
	 */
	handleBeforeFeatureAdded : function(evt) {
		// var proc = evt.feature.attributes.procedure;
		// if (this.maskedProceduresMap[proc]) {
		// // Procedure should be masked -> do not add feature but cache it
		// this.maskedProceduresMap[proc].push(evt.feature);
		//
		// return false; // Do no add
		// }
		//
		// return true;
	},

	/**
	 * Convenience method to handle featureadded event of layer
	 * 
	 * @param evt
	 */
	handleFeatureAdded : function(evt) {

	},

	/**
	 * Convenience method to handle beforefeaturesadded event of layer
	 * 
	 * @param evt
	 */
	handleBeforeFeaturesAdded : function(evt) {

	},

	/**
	 * Convenience method to handle featuresadded event of layer
	 * 
	 * @param evt
	 */
	handleFeaturesAdded : function(evt) {

	},

	/**
	 * Updates legendInfos property to reflect changes in visualization bounds and
	 * intervals. Automatically uses the stylers property.
	 */
	updateLegend : function() {
		// TODO use bounds getIntervals
		var max = (this.styler.bounds || this).getMaxValue();
		var min = (this.styler.bounds || this).getMinValue();
		var ints = (this.styler.bounds || this).getInts();
		var intCount;
		if (ints != null) {
			intCount = ints.length;
		} else {
			intCount = 10;
		}

		var valueWidth = (max - min) / (intCount);
		var labelUom = this.uom ? this.uom : '';

		if (!this.legendInfos)
			this.legendInfos = [];

		this.legendInfos.length = 0; // Clear array
		for ( var i = 0; i < intCount; i++) {
			var value;
			if (ints) {
				value = ints[i][0];
			} else {
				value = min + i * valueWidth;
			}
			var style = {};
			for ( var key in this.styler) {
				if (this.styler[key].isFeatureStyler !== false) {
					if (this.styler[key] == 'value') {
						style[key] = value;
					} else if (this.styler[key].getValue) {
						style[key] = this.styler[key].getValue(value);
					} else {
						style[key] = this.styler[key];
					}
				}
			}

			this.legendInfos.push({
				symbol : style,
				label : value.toFixed(2) + ' ' + labelUom,
				symbolType : this.legendSymbolType
			});
		}

		this.events.triggerEvent('change', {
			property : 'legend'
		});
	},

	/**
	 * Indicates if all needed options are provided to perform a valid
	 * visualization. Also indicates whether it is possible to request legend.
	 * 
	 * @returns {Boolean}
	 */
	isValid : function() {
		return false;
	},

	/**
	 * Returns an OpenLayers.Style object reflecting styling information based on
	 * each individual feature and customizable styling settings. The returned
	 * Style object is based on this objects styler attribute, with a
	 * corresponding context declaration which calls the getValue method of each
	 * styler with the corresponding result value of a feature. See
	 * http://openlayers.org/dev/examples/styles-context.html
	 * 
	 * The returned Style automatically hides features with a 'null' resultValue.
	 * 
	 * @returns {OpenLayers.Style}
	 */
	getStyle : function() {
		// var style =
		// OpenLayers.VIS.VectorSymbology.prototype.getStyle.call(this);

		// OpenLayers.Feature.Vector.style['default']

		var style = {
			display : '${getDisplay}'
		};
		var context = {
			getDisplay : function(feature) {
				return feature.attributes.resultValue == null ? 'none' : 'display';
			}
		};

		for ( var key in this.styler) {
			var styler = this.styler[key];
			if (styler.isFeatureStyler !== false) {
				style[key] = '${get' + key + '}';
				context['get' + key] = OpenLayers.Function.bind(function(feature) {
					return this.getValue.call(this, feature.attributes.resultValue);
				}, styler);
			}
		}

		// style = OpenLayers.VIS.mergeStyle(style, new OpenLayers.Style(style, {
		// context : context
		// }));

		return new OpenLayers.Style(style, {
			context : context
		});
	},

	// Override to aggregate all parameters from each styler
	createParameters : function() {
		var options = OpenLayers.VIS.Symbology.Base.prototype.createParameters.call(this);
		for ( var key in this.styler) {
			var styler = this.styler[key];

			if (styler.createParameters) {
				options.push(styler.createParameters());
			}
		}
		options.push({
			service : {
				comp : new Ext.form.FormPanel({
					border : false,
					items : [ {
						xtype : 'label',
						text : this.layer.resourceOptions.mime,
						fieldLabel : 'MIME Type'
					}, {
						xtype : 'label',
						text : this.layer.resourceOptions.url,
						fieldLabel : 'URL'
					} ]
				}),
				label : false
			},
			group : 'Source'
		});
		return options;
	},

	getTitle : function() {
		return this.title;
	},

	getToolTip : function(feature) {
		if (!feature instanceof OpenLayers.SOS.ObservationSeries) {
			return;
		}

		var val = feature.attributes.resultValue;
		val = isNaN(val) ? val : val.toFixed(3);

		if (feature.layer.visualization && feature.layer.visualization.uom) {
			val += ' ' + feature.layer.visualization.uom;
		}
		val += '<br/>' + feature.attributes.id;
		return val;
	}
});