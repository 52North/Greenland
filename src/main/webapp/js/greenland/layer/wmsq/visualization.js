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
 * Class managing WMSQ visualizations. Maintains the legend, events to indicate
 * changes and handling of customizable parameters. Provides the logic to
 * combine multiple raster layers into a single new visualization.
 */
OpenLayers.Layer.WMSQ.Visualization = OpenLayers.Class(OpenLayers.VIS.Symbology.Base, {

	EVENT_TYPES : [ 'change' ],

	requiredLayers : null,
	requiredLayersType : null,

	layer : null,

	layerOptions : null,
	layerParams : null,
	events : null,
	legendInfos : null,

	options : null,
	parameters : null,
	styler : null,

	initialize : function(options) {
		this.updateTask = new Ext.util.DelayedTask(this.update, this);

		this.events = new OpenLayers.Events(this, null, this.EVENT_TYPES, false);
		// Legend options, used by createLegendItemForLayer
		this.options = {};
		if (options) {
			OpenLayers.Util.extend(this.options, options.options || {});
		}
		this.parameters = {};

		OpenLayers.Util.extend(this, options);
		if (!this.layerOptions.length)
			this.layerOptions = [ this.layerOptions ];

		// VIS classes only handle a single layer instance for a
		// visualization. To
		// change this restriction, every associated nested wms layer gets
		// an
		// individual context (events, min/max, etc.) to which all depending
		// functions/objects are bound (such as styler).
		for ( var i = 0, styler, transformFunc; i < this.layerOptions.length; i++) {
			if (typeof this.layerOptions[i].min !== 'number'
					|| typeof this.layerOptions[i].max !== 'number' || this.layerOptions[i].name == '') {
				// Ensure that every layer has min/max values set
				throw 'Invalid layer parameters';
			}

			if (this.layerOptions[i].transformFunc != null) {
				transformFunc = this.layerOptions[i].transformFunc;
				// Check if transform function is set as string -> user defined function
				if (typeof transformFunc == 'string' && transformFunc.replace(/\s/g, '') !== '') {
					// function string not empty, store raw function def as special
					// parameter for permalink
					this.layerOptions[i].transformFuncString = transformFunc;

					transformFunc = VIS.convertUserDefinedFunction(transformFunc, [ 'x' ]);

					// use eval to "compile" as function
					this.layerOptions[i].transformFunc = eval("(function(x) { return " + transformFunc
							+ "; })");
				}

				// Remove function if its not a function
				if (!this.layerOptions[i].transformFunc.call) {
					delete this.layerOptions[i].transformFunc;
				}
			}

			styler = this.layerOptions[i].styler;
			this.layerOptions[i].layerIndex = i;

			// Set context for stylers
			this.layerOptions[i].context = {
				events : this.events,
				min : this.layerOptions[i].min,
				getMinValue : function() {
					return this.min;
				},
				max : this.layerOptions[i].max,
				getMaxValue : function() {
					return this.max;
				},
				styler : styler,
				layer : null
			};

			for ( var key in styler) {
				if (styler[key].length) {
					// Array -> Chooser
					styler[key] = new OpenLayers.VIS.Styler.Chooser({
						stylers : styler[key]
					});
				}

				if (styler[key].setSymbology) {
					styler[key].setSymbology(this.layerOptions[i].context);
				}
			}

			// Pixel access functions
			// this.layerOptions[i].cache = {};

			this.layerOptions[i].getValue = function(merger, x, y) {
				var colorValue = merger.getColor(this.layerIndex, x, y);
				if (colorValue[3] == 0 || colorValue[0] == 0) {
					// Transparent or 0 -> no value
					// TODO zero seems to be ambiguous, value is lesser or equal
					// to lower
					// colorscalerange
					return null;
				}

				// Transformation from color to value, based on grayscale
				var value = this.currentScaleRange.min
						+ (this.currentScaleRange.max - this.currentScaleRange.min) * (colorValue[0] / 255);

				if (this.transformFunc != null) {
					value = this.transformFunc(value);
				}

				return value;
			};

			this.layerOptions[i].getComponent = function(merger, x, y, c) {
				return merger.getComponent(this.layerIndex, x, y, c);
			};

			this.layerOptions[i].setComponent = function(merger, x, y, c, value) {
				merger.setComponent(this.layerIndex, x, y, c, value);
			};
		}

		// process visualization stylers
		for ( var key in this.styler || {}) {
			if (OpenLayers.Util.isArray(this.styler[key])) {
				// Array -> Chooser
				this.styler[key] = new OpenLayers.VIS.Styler.Chooser({
					stylers : this.styler[key]
				});
			}

			if (this.styler[key].setSymbology) {
				this.styler[key].setSymbology(this);
			}
		}

		this.events.register('change', this, function(evt) {
			if (evt.property != 'legend') {
				this.updateTask.delay(1000);
			}
		});
		this.updateLayerParams();
	},

	/**
	 * Updates this layer, recalculates legend, sets tile params, redraws
	 */
	update : function() {
		this.updateLayerParams();
		if (this.layer) {
			this.layer.redraw();
		}
	},

	/**
	 * Called to set request params specific to each "sublayer" such as layer name
	 * and color range
	 */
	updateLayerParams : function() {
		if (!this.layerParams) {
			this.layerParams = [];
		}
		for ( var i = 0; i < this.layerOptions.length; i++) {
			var bounds = this.layerOptions[i].styler.bounds;
			this.layerOptions[i].currentScaleRange = {
				min : bounds.getMinValue(),
				max : bounds.getMaxValue()
			};

			if (!this.layerParams[i]) {
				this.layerParams[i] = {};
			}
			this.layerParams[i].LAYERS = this.layerOptions[i].name;
			this.layerParams[i].COLORSCALERANGE = bounds.getMinValue() + ',' + bounds.getMaxValue();
		}
	},

	setLayer : function(layer) {
		this.layer = layer;
		for ( var i = 0; i < this.layerOptions.length; i++) {
			this.layerOptions[i].context.layer = layer;
		}
		this.update();
	},

	setMap : function(map) {

	},

	removeMap : function(map) {

	},

	createParameters : function() {
		var options = [], styler, stylerParameters, group;
		// parameters for each input layer
		for ( var i = 0, stylers; i < this.layerOptions.length; i++) {
			stylers = this.layerOptions[i].styler;
			for ( var key in stylers) {
				styler = stylers[key];

				if (styler.createParameters) {
					group = styler.group || this.layerOptions[i].name;

					stylerParameters = styler.createParameters();
					stylerParameters.group = group;

					options.push(stylerParameters);
				}
			}

			if (this.layerOptions[i].parameters) {
				options.push(this.layerOptions[i].parameters);
			}
		}
		options.push(this.parameters);

		// parameters for result styler
		var stylerParameters, styler;
		for ( var key in this.styler || {}) {
			styler = this.styler[key];

			if (styler.createParameters) {
				group = styler.group || 'Result';

				stylerParameters = styler.createParameters();
				stylerParameters.group = group;

				options.push(stylerParameters);
			}

		}

		return options;
	},

	getTitle : function() {
		return '';
	},

	isValid : function() {
		return true;
	},

	restore : function(parcel) {
		// wms-layer-specific styling parameters
		for ( var i = 0; i < this.layerOptions.length; i++) {
			stylers = this.layerOptions[i].styler;
			for ( var key in stylers) {
				if (stylers[key].restore) {
					stylers[key].restore(parcel);
				}
			}
		}

		// visualization-specific styling parameters
		for ( var key in this.styler || {}) {
			if (this.styler[key].restore) {
				this.styler[key].restore(parcel);
			}
		}

		// additional visualization-specific styling parameters
		for ( var key in this.parameters || {}) {
			parcel.readParameter(this.parameters[key]);
		}
		
		// visualization-specific parameters
		for ( var key in this.options || {}) {
			parcel.readParameter(this.options[key]);
		}
	},

	store : function(parcel) {
		// wms-layer-specific styling parameters
		for ( var i = 0; i < this.layerOptions.length; i++) {
			stylers = this.layerOptions[i].styler;
			for ( var key in stylers) {
				if (stylers[key].store) {
					stylers[key].store(parcel);
				}
			}
		}

		// visualization-specific styling parameters
		for ( var key in this.styler || {}) {
			if (this.styler[key].store) {
				this.styler[key].store(parcel);
			}
		}

		// additional visualization-specific styling parameters
		for ( var key in this.parameters || {}) {
			parcel.writeParameter(this.parameters[key]);
		}

		// visualization-specific parameters
		for ( var key in this.options || {}) {
			parcel.writeParameter(this.options[key]);
		}
	}
});
