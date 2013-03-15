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
OpenLayers.Layer.VIS.WMSQ.ColorRange = OpenLayers.Class(OpenLayers.Layer.VIS.WMSQ.Visualization, {
	requiredLayers : {
		'default' : {
			layers : {
				valueLayer : {
					title : 'Value Layer',
					description : 'Variable to analyze'
				}
			}
		}
	},

	valueLayer : null,

	initialize : function(options) {

		options.valueLayer.styler = {

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
				fieldLabel : 'Value Bounds'
			}),
			opacity : new OpenLayers.VIS.Styler.Opacity()
		};

		options.layerOptions = [ options.valueLayer ];

		OpenLayers.Layer.VIS.WMSQ.Visualization.prototype.initialize.apply(this, arguments);

	},

	update : function() {
		// Use OpenLayers.VIS.Symbology.Vector.updateLegend for setting
		// legendInfos by providing special context using this layer's styler
		// objects
		if (!this.legendInfos)
			this.legendInfos = [];
		OpenLayers.VIS.Symbology.Vector.prototype.updateLegend.call({
			legendInfos : this.legendInfos,
			styler : this.valueLayer.styler,
			events : this.events,
			legendSymbolType : 'Polygon',
			uom: this.valueLayer.uom
		});

		OpenLayers.Layer.VIS.WMSQ.Visualization.prototype.update.call(this);
	},

	/**
	 * Applied for each tile, uses a color range for each pixel/value
	 * 
	 * @param imageData
	 * @param merger
	 */
	fillPixelArray : function(imageData, merger) {
		var cpa = imageData.data;
		var w = imageData.width;

		for ( var y = 0; y < imageData.height; y++)
			for ( var x = 0; x < w; x++) {

				value = this.valueLayer.getValue(merger, x, y);
				if (!value) {
					// No value -> transparent
					cpa[y * w * 4 + x * 4 + 3] = 0;
					continue;
				}

				rgb = this.valueLayer.styler.fillColor.getValueObject(value).toRGB();

				cpa[y * w * 4 + x * 4] = rgb.r;
				cpa[y * w * 4 + x * 4 + 1] = rgb.g;
				cpa[y * w * 4 + x * 4 + 2] = rgb.b;
				cpa[y * w * 4 + x * 4 + 3] = 255;
			}
	},

	getTitle : function() {
		return 'Colorrange, ' + this.valueLayer.name;
	}

});
