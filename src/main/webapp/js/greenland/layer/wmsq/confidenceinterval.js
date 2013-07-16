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
 * Simple visualization for ncWMS layer applying a colorrange to a single nested
 * layer.
 */
OpenLayers.Layer.VIS.WMSQ.ConfidenceInterval = OpenLayers.Class(OpenLayers.Layer.VIS.WMSQ.Visualization, {
	requiredLayers : {
		// Each configuration has a distirbutionClass field and a
		// getConfidenceInterval function. These will be used to fill the
		// pixel
		// array. The returned value should represent a pixel rect with
		// dimensions sx*sy
		normal : {
			title : 'Normal Distribution',
			layers : {
				meanLayer : {
					title : 'Mean Layer',
					description : 'Mean',
					uncertainty : {
						'normal#mean' : true
					}
				},
				sdLayer : {
					title : 'Standard Deviation Layer',
					description : 'Standard Deviation',
					uncertainty : {
						'normal#sd' : true, // Wenn es das gibt
						'normal#variance' : function(x) {
							return Math.sqrt(x);
						}
					}
				}
			},
			distributionClass : NormalDistribution, // jStat class
			getConfidenceInterval : function(merger, x, y, sx, sy, distribution, p) {
				var mean = 0, sd = 0, count = 0;
				for ( var i = 0, meant, sdt; i < sy; i++)
					for ( var j = 0; j < sx; j++) {
						meant = this.meanLayer.getValue(merger, x + j, y + i);
						sdt = this.sdLayer.getValue(merger, x + j, y + i);
						if (meant == null || sdt == null || sdt < 0) {
							continue;
						}
						mean += meant;
						sd += sdt;
						count++;
					}

				if (count == 0) {
					return null;
				}

				// distribution will be a reused NormalDistirbution instance
				distribution._mean = mean / count;
				distribution._sigma = sd / count;
				return [ distribution.getQuantile(1 - p), distribution.getQuantile(p) ];
			}

		}
	},

	initialize : function(options) {

		options.layerOptions = [];

		for ( var layerKey in this.requiredLayers[options.requiredLayersType].layers) {
			options[layerKey].styler = {
				bounds : [ new OpenLayers.VIS.Styler.Continuous(), new OpenLayers.VIS.Styler.EqualIntervals() ]
			};
			options.layerOptions.push(options[layerKey]);
		}

		options.styler = {
			fillColor : VIS.createPropertyArray([ new OpenLayers.VIS.Styler.Color({
				predefinedColors : [ // 
				[ [ 120, 100, 100 ], [ 0, 100, 100 ] ], // Green-Red
				[ [ 30, 20, 100 ], [ 0, 100, 100 ] ], // Orange-Red
				[ [ 60, 20, 100 ], [ 120, 100, 80 ] ], // Yellow-Green
				[ [ 0, 100, 100 ], [ 359, 100, 100 ] ] // All
				],
				title : 'Multi Hue'
			}), new OpenLayers.VIS.Styler.Color({
				predefinedColors : [ // 
				[ [ 0, 0, 100 ], [ 0, 100, 100 ] ], // Red
				[ [ 30, 0, 100 ], [ 30, 100, 100 ] ], // Orange
				[ [ 120, 0, 100 ], [ 120, 100, 80 ] ], // Green
				[ [ 240, 0, 100 ], [ 240, 100, 80 ] ], // Blue
				[ [ 270, 0, 100 ], [ 270, 100, 80 ] ], // Purple
				[ [ 0, 0, 100 ], [ 0, 0, 0 ] ] // Gray
				],
				title : 'Single Hue'
			}) ], {
				fieldLabel : 'Color Scheme'
			}),
			strokeWidth : {
				// Only for legend
				getValue : function() {
					return 0;
				}
			},
			bounds : VIS.createPropertyArray([ new OpenLayers.VIS.Styler.Continuous(),
					new OpenLayers.VIS.Styler.EqualIntervals() ], {
				fieldLabel : 'Value Bounds',
				// TODO make dependent on "mean" layer
				fixedMinValue : options.layerOptions[0].min,
				fixedMaxValue : options.layerOptions[0].max
			}),
			opacity : new OpenLayers.VIS.Styler.Opacity()
		};

		options.options = {
			confidence : {
				fieldLabel : 'Confidence Value',
				value : 95,
				minimum : 1,
				maximum : 100,
				type : 'integer',
				description : 'Confidence interval value in %',
			}
		};

		// General Customizable parameters
		options.parameters = {
			spacing : {
				fieldLabel : 'Aggregation Spacing',
				value : 32,
				items : [ 8, 16, 32, 64, 128 ],
				type : 'selectone',
				description : 'Glyph spacing in pixel',
				action : function(value) {
					this.events.triggerEvent('change', {
						property : 'symbology'
					});
				},
				scope : this,
				required : true
			},
			group : 'Result'
		};

		OpenLayers.Layer.VIS.WMSQ.Visualization.prototype.initialize.apply(this, arguments);

	},

	update : function() {
		// Use OpenLayers.VIS.Symbology.Vector.updateLegend for setting
		// legendInfos by providing special context using this layer's
		// styler
		// objects
		if (!this.legendInfos)
			this.legendInfos = [];
		OpenLayers.VIS.Symbology.Vector.prototype.updateLegend.call({
			legendInfos : this.legendInfos,
			styler : this.styler,
			events : this.events,
			legendSymbolType : 'Polygon'
		});

		OpenLayers.Layer.VIS.WMSQ.Visualization.prototype.update.call(this);
	},

	/**
	 * Called by each tile. Extracts glyphs for a set of pixels as set by the
	 * customizable spacing parameter
	 * 
	 * @param canvas
	 * @param merger
	 * @param ctx
	 * @param tile
	 */
	fillCanvas : function(canvas, merger, ctx, tile) {
		var ctx = canvas.getContext('2d');
		ctx.strokeWidth = 0.5;
		var w = canvas.width, height = canvas.height;
		var reqLayers = this.requiredLayers[this.requiredLayersType];
		var distribution = new reqLayers.distributionClass();
		var p = (100 - (100 - this.options.confidence.value) / 2) / 100;
		var value, color;
		var sx = this.parameters.spacing.value;
		var sy = sx;
		for ( var y = 0; y < height; y += sy)
			for ( var x = 0; x < w; x += sx) {

				value = reqLayers.getConfidenceInterval.call(this, merger, x, y, sx, sy, distribution, p);
				if (value == null) {
					// No value
					continue;
				}

				// lower boundary
				color = this.styler.fillColor.getValueObject(value[0]);
				if (color != null) {
					ctx.fillStyle = ctx.strokeStyle = color.toRGB().toHex();
					ctx.beginPath();

					ctx.moveTo(x, y);
					ctx.lineTo(x + sx, y + sy);
					ctx.lineTo(x, y + sy);

					ctx.closePath();

					ctx.stroke();
					ctx.fill();

				}

				// upper boundary
				color = this.styler.fillColor.getValueObject(value[1]);
				if (color != null) {
					ctx.fillStyle = color.toRGB().toHex();
					ctx.beginPath();

					ctx.moveTo(x, y);
					ctx.lineTo(x + sx, y);
					ctx.lineTo(x + sx, y + sy);

					ctx.closePath();
					ctx.fill();
				}
			}
	},

	getTitle : function() {
		return 'Confidence Inteval ' + this.layerOptions[0].name;
	},

	getHelpHtml : function() {
		return 'The lower left triangle shows the lower bounds of the confidence interval, '
				+ 'the upper right the upper bounds. Therefore more contrasting cells contain '
				+ 'less certain values';
	}

});
