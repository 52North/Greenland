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
 * ncWMS visualization implementing Whitening effect as described by Hengl et al
 * in "A generic framework for spatial prediction of soil variables based on
 * regression-kriging".
 */
OpenLayers.Layer.VIS.WMSQ.Whitening = OpenLayers.Class(OpenLayers.Layer.VIS.WMSQ.Visualization, {
	requiredLayers : {
		'default' : {
			title : 'Custom Selection',
			layers : {
				valueLayer : {
					title : 'Value Layer',
					description : 'Variable to analyze'
				},
				errorLayer : {
					title : 'Error Layer',
					description : 'Error Variable'
				}
			}
		},

		normal : {
			title : 'Normal Distribution',
			layers : {
				valueLayer : {
					title : 'Value Layer',
					description : 'Mean',
					uncertainty : {
						'normal#mean' : true
					}
				},
				errorLayer : {
					title : 'Error Layer',
					description : 'Standard Deviation',
					uncertainty : {
						'normal#variance' : true
					}
				}
			}
		}
	},

	valueLayer : null,
	errorLayer : null,

	initialize : function(options) {

		options.valueLayer.styler = {

			fillColor : new OpenLayers.VIS.Styler.Color({
				predefinedColors : [ // 
				[ [ 120, 100, 100 ], [ 0, 100, 100 ] ], // Green-Red
				[ [ 30, 20, 100 ], [ 0, 100, 100 ] ], // Orange-Red
				[ [ 60, 20, 100 ], [ 120, 100, 80 ] ], // Yellow-Green
				[ [ 0, 100, 100 ], [ 359, 100, 100 ] ] // All
				]
			}),
			bounds : VIS.createPropertyArray([ new OpenLayers.VIS.Styler.Continuous(),
					new OpenLayers.VIS.Styler.EqualIntervals() ], {
				fieldLabel : 'Value Bounds'
			}),
			opacity : new OpenLayers.VIS.Styler.Opacity()
		};

		options.errorLayer.styler = {
			bounds : VIS.createPropertyArray([ new OpenLayers.VIS.Styler.Continuous(),
					new OpenLayers.VIS.Styler.EqualIntervals() ], {
				fieldLabel : 'Value Bounds'
			})
		};

		options.layerOptions = [ options.valueLayer, options.errorLayer ];

		OpenLayers.Layer.VIS.WMSQ.Visualization.prototype.initialize.apply(this, arguments);

	},

	update : function() {
		OpenLayers.Layer.VIS.WMSQ.Visualization.prototype.update.call(this);
		this.events.triggerEvent('change', {
			property : 'legend'
		});
	},

	/**
	 * Fills canvas pixel array with color values calculated according to
	 * whitening procedure by Hengl et al.
	 * 
	 * @param imageData
	 * @param merger
	 */
	fillPixelArray : function(imageData, merger) {
		var cpa = imageData.data;
		var w = imageData.width;
		var maxErrorValue = this.errorLayer.styler.bounds.getMaxValue();

		for ( var y = 0; y < imageData.height; y++)
			for ( var x = 0; x < w; x++) {
				// Whitening Hengl et al
				value = this.valueLayer.getValue(merger, x, y);
				if (!value) {
					// no value -> transparent
					cpa[y * w * 4 + x * 4 + 3] = 0;
					continue;
				}

				hue = this.valueLayer.styler.fillColor.getValueObject(value).h;

				error = this.errorLayer.getValue(merger, x, y) || 0;
				error = this.errorLayer.styler.bounds.getInterval(error)[0];
				error = error / maxErrorValue; // normalized

				// rgb = this.hsiToRgb((phi + 360) * (240 / 360), (1 - v2),
				// (1 + v2) * 120);
				// rgb = this.hsiToRgb(color.h, (1 - v2), (1 + v2) * 120);
				rgb = new OpenLayers.VIS.Color.HSI(hue, (1 - error), (1 + error) * 120).toRGB();
				cpa[y * w * 4 + x * 4] = rgb.r;
				cpa[y * w * 4 + x * 4 + 1] = rgb.g;
				cpa[y * w * 4 + x * 4 + 2] = rgb.b;
				cpa[y * w * 4 + x * 4 + 3] = 255;
			}
	},

	getTitle : function() {
		return 'Whitening Test, ' + this.valueLayer.name + ', ' + this.errorLayer.name;
	},

	/**
	 * Override to create custom legend
	 * 
	 * @returns {Ext.Panel}
	 */
	getLegend : function() {
		var self = this;
		var leftMargin = 80;
		var bottomMargin = 20;

		var panel = new Ext.Panel({
			border : false,
			cursor : null,
			listeners : {
				render : function(comp) {
					var el = comp.el.child('.x-panel-body');
					comp.cursor = el.createChild({
						tag : 'div',
						style : {
							position : 'absolute',
							width : '3px',
							height : '3px',
							border : 'solid 2px gray'
						}
					});

					var canvas = document.createElement("canvas");
					var width = 250, height = 100;

					var legendWidth = width - leftMargin, legendHeight = height - bottomMargin;

					canvas.width = width;
					canvas.height = height;
					var ctx = canvas.getContext("2d");

					// Get bounds
					comp.valueMin = self.valueLayer.styler.bounds.getMinValue();
					var valueMax = self.valueLayer.styler.bounds.getMaxValue();
					comp.valueRangeRatio = (valueMax - comp.valueMin) / legendWidth;

					comp.errorMin = self.errorLayer.styler.bounds.getMinValue();
					var errorMax = self.errorLayer.styler.bounds.getMaxValue();

					comp.errorRangeRatio = (errorMax - comp.errorMin) / legendHeight;

					var imgdata = ctx.getImageData(0, 0, canvas.width, canvas.height);
					var cpa = imgdata.data;

					var opacity = 255 * self.layer.opacity;
					// Fill canvas with color values derived from value (x) and error
					// (y)
					for ( var i = 0; i < legendHeight; i++) {
						for ( var j = 0; j < legendWidth; j++) {

							value = comp.valueMin + comp.valueRangeRatio * j;
							error = comp.errorMin + comp.errorRangeRatio * i;
							hue = self.valueLayer.styler.fillColor.getValueObject(value).h;

							error = self.errorLayer.styler.bounds.getInterval(error)[0];
							error = error / errorMax; // normalized

							// rgb = this.hsiToRgb((phi + 360) * (240 / 360), (1 - v2),
							// (1 + v2) * 120);
							// rgb = this.hsiToRgb(color.h, (1 - v2), (1 + v2) * 120);
							rgb = new OpenLayers.VIS.Color.HSI(hue, (1 - error), (1 + error) * 120).toRGB();
							cpa[i * width * 4 + j * 4] = rgb.r;
							cpa[i * width * 4 + j * 4 + 1] = rgb.g;
							cpa[i * width * 4 + j * 4 + 2] = rgb.b;
							cpa[i * width * 4 + j * 4 + 3] = opacity;

						}
					}
					ctx.putImageData(imgdata, leftMargin, 0);

					// Text
					ctx.textBaseline = 'hanging';
					ctx.fillText('Value', 0, legendHeight - 5);
					if (self.valueLayer.uom.length != 0) {
						ctx.fillText('(' + self.valueLayer.uom + ')', 0, legendHeight + 5);
					}
					for ( var i = 0; i < legendWidth; i += legendWidth / 5) {
						ctx.beginPath();
						ctx.moveTo(i + leftMargin, legendHeight);
						ctx.lineTo(i + leftMargin, legendHeight + 5);
						ctx.stroke();
						ctx.fillText((comp.valueMin + (comp.valueRangeRatio) * i).toFixed(2), i + leftMargin, legendHeight + 5);
					}

					ctx.fillText('Error', 0, 0);
					if (self.errorLayer.uom.length != 0) {
						ctx.fillText('(' + self.errorLayer.uom + ')', 0, 10);
					}
					ctx.textAlign = 'right';
					for ( var i = 0; i < legendHeight; i += legendHeight / 5) {
						ctx.beginPath();
						ctx.moveTo(leftMargin, i);
						ctx.lineTo(leftMargin - 5, i);
						ctx.stroke();
						ctx.fillText((comp.errorMin + (comp.errorRangeRatio) * i).toFixed(2), leftMargin, i);
					}
					el.appendChild(canvas);
				}
			},

			setCursorPosition : function(v, e) {
				if (this.cursor) {
					this.cursor.setLeft(leftMargin + ((v - this.valueMin) / this.valueRangeRatio));
					this.cursor.setTop((e - this.errorMin) / this.errorRangeRatio);
				}
			},

			setCursorVisible : function(visible) {
				if (this.cursor) {
					this.cursor.setVisible(visible);
				}
			}
		});

		var map = this.layer.map;

		var cursorUpdateFunction = function(e) {
			if (!this.layer.getVisibility()) {
				return;
			}
			var lonLat = map.getLonLatFromViewPortPx(e.xy);

			var data = this.layer.getTileData(lonLat);
			if (!data || !data.tile || data.tile.loadingMask != 0) {
				panel.setCursorVisible(false);
				return;
			}

			var merger = OpenLayers.Tile.Image.MultiImage.CanvasMerger.getMerger(data.tile.layerImages, data.tile);

			var v = this.valueLayer.getValue(merger, Math.floor(data.i), Math.floor(data.j));
			var e = this.errorLayer.getValue(merger, Math.floor(data.i), Math.floor(data.j));
			if (v == null || e == null) {
				panel.setCursorVisible(false);
				return;
			}
			panel.setCursorPosition(v, e);
			panel.setCursorVisible(true);
		};

		map.events.register('mousemove', this, cursorUpdateFunction);
		panel.on('destroy', function() {
			map.events.unregister('mousemove', this, cursorUpdateFunction);
		}, this);

		return panel;
	}

});
