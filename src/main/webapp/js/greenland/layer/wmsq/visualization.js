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
 * Class managing WMSQ visualizations. Maintains the legend, events to indicate
 * changes and handling of customizable parameters. Provides the logic to
 * combine multiple raster layers into a single new visualization.
 */
OpenLayers.Layer.VIS.WMSQ.Visualization = OpenLayers.Class(OpenLayers.VIS.Symbology.Base, {

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

		OpenLayers.Util.extend(this.parameters, {
			overlay_enabled : {
				fieldLabel : 'Show Data Overlay',
				value : false,
				type : 'boolean',
				action : function(value) {
					this.events.triggerEvent('change', {
						property : 'symbology'
					});
				},
				scope : this,
				required : true,
				group : 'Data Overlay',
				minVersion : 3
			},
			overlay_spacing : {
				fieldLabel : 'Aggregation Spacing',
				value : 32,
				items : [ 8, 16, 32, 64, 128 ],
				type : 'selectone',
				description : 'Text spacing in pixel',
				action : function(value) {
					this.events.triggerEvent('change', {
						property : 'symbology'
					});
				},
				scope : this,
				required : true,
				group : 'Data Overlay',
				minVersion : 3
			},
			overlay_layer : {
				fieldLabel : 'Layer',
				value : this.layerOptions[0],
				items : this.layerOptions,
				toString : function(value) {
					return value.name || '<No Name>';
				},
				type : 'selectone',
				description : 'Layer',
				action : function(value) {
					this.events.triggerEvent('change', {
						property : 'symbology'
					});
				},
				scope : this,
				required : true,
				group : 'Data Overlay',
				minVersion : 3
			},
			overlay_lines : {
				fieldLabel : 'Show Grid Lines',
				value : true,
				type : 'boolean',
				action : function(value) {
					this.events.triggerEvent('change', {
						property : 'symbology'
					});
				},
				scope : this,
				required : true,
				group : 'Data Overlay',
				minVersion : 3
			},
			overlay_opacity : {
				fieldLabel : 'Opacity',
				value : 90,
				minimum : 0,
				maximum : 100,
				type : 'integer',
				action : function(value) {
					this.events.triggerEvent('change', {
						property : 'symbology'
					});
				},
				scope : this,
				required : true,
				group : 'Data Overlay',
				minVersion : 3
			}
		});

		// VIS classes only handle a single layer instance for a
		// visualization. To change this restriction, every associated nested wms
		// layer gets an individual context (events, min/max, etc.) to which all
		// depending functions/objects are bound (such as styler).
		for ( var i = 0, styler, transformFunc; i < this.layerOptions.length; i++) {
			if (typeof this.layerOptions[i].min !== 'number' || typeof this.layerOptions[i].max !== 'number'
					|| this.layerOptions[i].name == '') {
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
					this.layerOptions[i].transformFunc = eval("(function(x) { return " + transformFunc + "; })");
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

			this.layerOptions[i].getValue = function(merger, x, y) {
				var colorValue = merger.getColor(this.layerIndex, x, y);
				if (colorValue[3] == 0 || colorValue[0] == 0) {
					// Transparent or 0 -> no value
					// TODO zero seems to be ambiguous, value is lesser or equal
					// to lower colorscalerange
					return null;
				}

				// Transformation from color to value, based on grayscale
				var value = this.currentScaleRange.min + (this.currentScaleRange.max - this.currentScaleRange.min)
						* (colorValue[0] / 255);

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

		var serviceVersion = this.layer.capabilities.version || '1.1.1';
		var capUrl = OpenLayers.Util.urlAppend(this.layer.url, OpenLayers.Util.getParameterString({
			'REQUEST' : 'GetCapabilities',
			'SERVICE' : 'WMS',
			'VERSION' : serviceVersion
		}));
		options.push({
			service : {
				comp : new Ext.form.FieldSet({
					title : 'Service',
					items : [ {
						xtype : 'label',
						text : '(nc)WMS',
						fieldLabel : 'Service Type'
					}, {
						xtype : 'label',
						text : serviceVersion,
						fieldLabel : 'Version'
					}, {
						xtype : 'label',
						text : this.layer.url,
						fieldLabel : 'URL'
					}, {
						xtype : 'displayfield',
						value : '<a href="' + capUrl + '" target="_blank">' + capUrl + '</a>',
						fieldLabel : 'GetCapabilities URL'
					} ]
				}),
				label : false
			},
			group : 'Source'
		});

		options.push({
			service : {
				comp : this.layer.createServiceMetadataPanel(),
				label : false
			},
			group : 'Source'
		});

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
	},

	drawOverlay : function(canvas, merger, ctx, tile) {
		if (!this.parameters.overlay_enabled.value) {
			return;
		}
		var ctx = canvas.getContext('2d');

		var w = canvas.width, height = canvas.height;
		var valueLayer = this.parameters.overlay_layer.value;
		var sx = this.parameters.overlay_spacing.value;
		var sy = sx;
		var showLines = this.parameters.overlay_lines.value;

		var textSizeFactor = 0.8;
		var textSizeY = sy * textSizeFactor;
		var textSizeX = sx * textSizeFactor;
		var textMarginLeft = sx * ((1 - textSizeFactor) / 2);
		var textMarginTop = sy * ((1 - textSizeFactor) / 2);
		ctx.font = textSizeY + 'px sans-serif';
		ctx.fillStyle = ctx.strokeStyle = 'rgba(0, 0, 0, ' + this.parameters.overlay_opacity.value / 100 + ')';
		ctx.textBaseline = 'top';

		for ( var y = 0; y < height; y += sy)
			for ( var x = 0; x < w; x += sx) {

				var valueSum = 0, valueCount = 0, value;
				for ( var yy = 0; yy < sy; yy++)
					for ( var xx = 0; xx < sx; xx++) {
						value = valueLayer.getValue(merger, x + xx, y + yy);
						if (value != null) {
							valueSum += value;
							valueCount++;
						}
					}

				if (valueCount != 0) {
					value = valueSum / valueCount;
					ctx.fillText(Math.round(value * 100) / 100 + '', textMarginLeft + x, textMarginTop + y, textSizeX);

					if (showLines) {
						ctx.beginPath();
						ctx.moveTo(x, y);
						ctx.lineTo(x + sx, y);
						ctx.lineTo(x + sx, y + sy);
						ctx.stroke();
					}
				}
			}
	}
});
