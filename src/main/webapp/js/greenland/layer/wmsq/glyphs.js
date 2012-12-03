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
 * Glyph visualization for ncWMS layers. Test case for UV-component movement,
 * e.g. wind/water speed/direction.
 */
OpenLayers.Layer.WMSQ.Glyphs = OpenLayers.Class(OpenLayers.Layer.WMSQ.Vector,
		{
			requiredLayers : {
				'default' : {
					layers : {
						uLayer : {
							title : 'U Layer',
							description : 'East-west component'
						},
						vLayer : {
							title : 'V Layer',
							description : 'North-south component'
						}
					}
				}
			},

			uLayer : null,
			vLayer : null,

			initialize : function(options) {
				// custom graphicName for features
				OpenLayers.Renderer.symbol.arrow1 = [ -5, 0, 0, 15, 5, 0 ];
				OpenLayers.Renderer.symbol.arrow2 = [ -5, 0, 0, 15, 5, 0, 0, 5 ];
				OpenLayers.Renderer.symbol.arrow3 = [ -2, 0, -2, 10, -4, 10, 0, 15, 4, 10, 2, 10, 2, 0 ];

				options.uLayer.styler = {
					bounds : [ new OpenLayers.VIS.Styler.Continuous(),
							new OpenLayers.VIS.Styler.EqualIntervals() ]
				};

				options.vLayer.styler = {
					bounds : [ new OpenLayers.VIS.Styler.Continuous(),
							new OpenLayers.VIS.Styler.EqualIntervals(), ]
				};

				var speedMin = Math.pow(Math.max(0, Math.min(options.uLayer.min, options.vLayer.min)), 2);
				var speedMax = Math.pow(Math.max(options.uLayer.max, options.vLayer.max), 2);

				options.styler = {
					fillColor : new OpenLayers.VIS.Styler.Color([ new OpenLayers.VIS.Styler.Color({
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
					}), new OpenLayers.VIS.Styler.Color({
						predefinedColors : [ // 
						[ [ 0, 100, 100 ], [ 0, 100, 100 ] ], // Red
						[ [ 30, 100, 100 ], [ 30, 100, 100 ] ], // Orange
						[ [ 120, 100, 100 ], [ 120, 100, 100 ] ], // Green
						[ [ 240, 100, 100 ], [ 240, 100, 100 ] ], // Blue
						[ [ 270, 100, 100 ], [ 270, 100, 100 ] ], // Purple
						[ [ 0, 0, 0 ], [ 0, 0, 0 ] ] // Gray
						],
						title : 'Solid'
					}) ], {
						fieldLabel : 'Color Scheme',
						attribute : '_speed'
					}),
					graphicName : new OpenLayers.VIS.Styler.Shape({
						shapes : [ [ 'Arrow 1', 'arrow1' ], [ 'Arrow 2', 'arrow2' ], [ 'Arrow 3', 'arrow3' ] ]
					}),
					bounds : new OpenLayers.VIS.Styler.Color([ new OpenLayers.VIS.Styler.Continuous(),
							new OpenLayers.VIS.Styler.EqualIntervals() ], {
						fieldLabel : 'Value Bounds',
						fixedMinValue : speedMin,
						fixedMaxValue : speedMax
					}),
					strokeWidth : {
						getValue : function() {
							return 0;
						}
					},
					rotation : '_angle',
					pointRadius : {
						attribute : '_speed',
						symbology : null,
						setSymbology : function(symbology) {
							this.symbology = symbology;
						},
						getValue : function(value) {
							var interval = this.symbology.styler.bounds.getInterval(value);
							if (interval == null) {
								return 5;
							}

							return 5 + (interval[0] + interval[1]) / 2;
						}
					}
				// TODO opacity
				};

				options.layerOptions = [ options.uLayer, options.vLayer ];

				// General Customizable parameters
				options.parameters = {
					spacing : {
						fieldLabel: 'Aggregation Spacing',
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

				OpenLayers.Layer.WMSQ.Vector.prototype.initialize.apply(this, arguments);
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

				var width = canvas.width, height = canvas.height;
				var gx = gy = this.parameters.spacing.value;
				var u, v, a, s, p;

				var features = [];

				var widthRatio = tile.bounds.getWidth() / width;
				var heightRatio = tile.bounds.getHeight() / height;

				for ( var y = 0; y < height; y += gy)
					for ( var x = 0; x < width; x += gx) {
						// u and v component
						u = 0, v = 0, count = 0;

						// Aggregation, mean of all values in gx/gy range
						for ( var i = 0, ut, vt; i < gy; i++)
							for ( var j = 0; j < gx; j++) {
								ut = this.uLayer.getValue(merger, x + j, y + i);
								vt = this.vLayer.getValue(merger, x + j, y + i);
								if (ut == null || vt == null) {
									continue;
								}
								u += ut;
								v += vt;
								count++;
							}

						if (count == 0) {
							continue;
						}
						u = u / count;
						v = v / count;
						// if (u == null || v == null)
						// continue;

						// speed value
						s = Math.sqrt(u * u + v * v);

						// direction value
						if (v == 0) {
							a = u > 0 ? 90 : 270;
						} else if (v < 0) {
							a = 270 - Math.atan(u / v) * 180 / Math.PI;
						} else {
							a = 90 - Math.atan(u / v) * 180 / Math.PI;

						}

						// create glyph with _angle and _speed attribute
						p = new OpenLayers.Geometry.Point(tile.bounds.left + (x + gx / 2) * widthRatio,
								tile.bounds.top - (y + gy / 2) * heightRatio);
						features.push(new OpenLayers.Feature.Vector(p, {
							_angle : a + 180, // OpenLayers rotation component compatible
							_speed : s
						}));

					}

				this.addFeatures(features, tile.bounds);
			},

			getTitle : function() {
				return 'Glyphs Test, ' + this.uLayer.name + ', ' + this.vLayer.name;
			},

			update : function() {
				// Use OpenLayers.VIS.Symbology.Vector.updateLegend for setting
				// legendInfos by providing special context using this layer's styler
				// objects
				if (!this.legendInfos)
					this.legendInfos = [];

				var rotLegendInfos = [];
				OpenLayers.VIS.Symbology.Vector.prototype.updateLegend.call({
					legendInfos : rotLegendInfos,
					styler : {
						rotation : 'value',
						bounds : {
							getMinValue : function() {
								return 0;
							},
							getMaxValue : function() {
								return 360;
							},
							getInts : function() {
								return null;
							},
							isFeatureStyler : false
						},
						fillColor : 'grey',
						strokeWidth : 0,
						pointRadius : 10,
						graphicName : this.styler.graphicName
					},
					events : this.events,
					legendSymbolType : 'Point',
					uom : '&#x00b0;'
				});

				var sizeColLegendInfos = [];
				OpenLayers.VIS.Symbology.Vector.prototype.updateLegend.call({
					legendInfos : sizeColLegendInfos,
					styler : {
						rotation : 90,
						bounds : this.styler.bounds,
						fillColor : this.styler.fillColor,
						strokeWidth : 0,
						pointRadius : this.styler.pointRadius,
						graphicName : this.styler.graphicName
					},

					events : this.events,
					legendSymbolType : 'Point'
				});

				this.legendInfos = rotLegendInfos.concat(sizeColLegendInfos);
				this.events.triggerEvent('change', {
					property : 'legend'
				});
				OpenLayers.Layer.WMSQ.Vector.prototype.update.call(this);
			}

		});
