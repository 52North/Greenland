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
OpenLayers.VIS.Styler = OpenLayers.VIS.Styler || {};
/**
 * Used to get fillColor or strokeColor styling attributes. Also provides
 * methods to create a SLD from the currently set color options.
 */
OpenLayers.VIS.Styler.Color = OpenLayers
		.Class(
				OpenLayers.VIS.Styler.Base,
				{

					startColor : null,
					endColor : null,
					swap : false,

					// lessColor : '#000000',
					// moreColor : '#FF0000',

					colorNoData : '#000000',

					predefinedColors : null,

					colorStore : null,
					customColorRecord : null,

					initialize : function(options) {
						this.startColor = null;
						this.endColor = null;
						this.predefinedColors = [ //
						[ [ 120, 100, 100 ], [ 0, 100, 100 ] ], // Green-Red
						[ [ 0, 100, 100 ], [ 120, 100, 100 ] ], // Red-Green
						[ [ 0, 0, 100 ], [ 0, 100, 100 ] ], // Red
						[ [ 0, 100, 0 ], [ 0, 100, 100 ] ], // Red
						[ [ 0, 100, 100 ], [ 359, 100, 100 ] ], // All
						[ [ 359, 100, 100 ], [ 0, 100, 100 ] ] // All
						];

						OpenLayers.VIS.Styler.Base.prototype.initialize.apply(this, arguments);

						if (this.startColor == null || this.endColor == null) {
							this.startColor = this.predefinedColors[0][0];
							this.endColor = this.predefinedColors[0][1];
						}

						// Create store to use color information in combobox
						this.colorStore = new Ext.data.ArrayStore({
							fields : [ 'id', 'start', 'end', 'custom' ]
						});
						for ( var i = 0, rec, color; i < this.predefinedColors.length; i++) {
							color = this.predefinedColors[i];
							rec = new this.colorStore.recordType({
								start : color[0],
								end : color[1],
								id : color[0].concat(color[1]).join()
							});
							this.colorStore.add(rec);
						}
						this.customColorRecord = new this.colorStore.recordType({
							custom : true
						});
						// this.colorStore.add(this.customColorRecord);
					},

					getValueObject : function(value) {
						if (typeof value === 'undefined') {
							return null;
						}

						var interval = this.symbology.styler.bounds.getInterval(value);
						if (interval == null) {
							return null;
						}

						return this.getColorObject((interval[0] + interval[1]) / 2,
								this.symbology.styler.bounds.getMinValue(), this.symbology.styler.bounds
										.getMaxValue(), null);

					},

					getValue : function(value) {
						var valObj = this.getValueObject(value);
						if (valObj)
							return valObj.toRGB().toHex();
						else
							return this.colorNoData;
					},

					getColorObject : function(value, minValue, maxValue, ints) {

						// if ((ints != null && ints < 1) || value < minValue) {
						// return this.colorNoData;
						// }
						// if (value > maxValue) {
						// return this.colorNoData;
						// }

						var diff = new Array(3);
						for ( var i = 0; i < diff.length; i++)
							diff[i] = (this.endColor[i] - this.startColor[i]) / (ints ? ints : 1);

						var valueIntervalSize = (maxValue - minValue) / (ints ? ints : 1);

						var segment = (value - minValue) / valueIntervalSize;
						// if (ints)
						// segment = Math.floor(segment);

						var hsv = new Array(3);
						for ( var j = 0; j < diff.length; j++)
							hsv[j] = this.startColor[j] + segment * diff[j];
						return new OpenLayers.VIS.Color.HSV(hsv[0], hsv[1], hsv[2]);
					},

					getColor : function(value, minValue, maxValue, ints) {
						return this.getColorObject(value, minValue, maxValue, ints).toRGB().toHex();
					},

					getSld : function() {
						// var max = this.symbology.styler.bounds.getMaxValue(); // max is never read
						var min = this.symbology.styler.bounds.getMinValue();
						// var ints = this.symbology.styler.bounds.getInts();

						var entries = [];
						// var intervalSize = (max - min) / (ints - 1);
						var displayFactor = (this.symbology.uom == '%') ? 1 / 100 : 1;
						// transparent until min value
						entries.push({
							"color" : this.colorNoData,
							"quantity" : displayFactor * min,
							"opacity" : 0
						});
						var intervals = this.symbology.styler.bounds.getIntervals();

						for ( var i = 0; i < intervals.length; i++) {
							// var q = min + (i * intervalSize);
							var interval = intervals[i];
							var quantity = displayFactor * interval[1];
							if (i == intervals.length - 1) {
								// last class, include max value by adding small number TODO
								quantity += 0.000000001;
							}
							entries.push({
								"color" : this.getValue(interval[0]),
								// "color" : this.getColor(interval[0], min, max, null),
								"quantity" : quantity,
								"opacity" : 1
							});
						}

						// transparent until Number.MAX_VALUE
						entries.push({
							"color" : this.colorNoData,
							"quantity" : Number.MAX_VALUE,
							"opacity" : 0
						});
						var sld = {
							"namedLayers" : [ {
								"name" : "OpenLayersScaleBar",
								"userStyles" : [ {
									"rules" : [ {
										"symbolizer" : {
											"Raster" : {
												"colorMap" : {
													"type" : "intervals",
													"entries" : entries
												}
											}
										}
									} ]
								} ]
							} ]
						};
						return new OpenLayers.Format.SLD.Custom().write(sld);
					},

					createParameters : function() {
						var getGradientCSS = function(start, end) {
							var grad = 'left';
							var diff = new Array(3);
							var steps = 15;

							for ( var i = 0; i < diff.length; i++)
								diff[i] = (end[i] - start[i]) / steps;
							var hsv = new Array(3);
							for ( var i = 0; i < steps; i++) {
								for ( var j = 0; j < diff.length; j++)
									hsv[j] = start[j] + i * diff[j];
								grad += ', ' + new OpenLayers.VIS.Color.HSV(hsv[0], hsv[1], hsv[2]).toRGB().toHex();
							}
							var pre = [ '-webkit-linear-gradient', '-o-linear-gradient', '-moz-linear-gradient',
									'-ms-linear-gradient' ];
							for ( var i = 0; i < pre.length; i++)
								pre[i] = pre[i] + '(' + grad + ')';

							return pre;
						};

						// Special combobox with gradient background image
						var comboBoxColor = new Ext.form.ComboBox(
								{
									triggerAction : 'all',
									lazyRender : true,
									mode : 'local',
									store : this.colorStore,
									valueField : 'id',
									editable : false,
									tpl : new Ext.XTemplate(
											'<tpl for="."><div class="x-combo-list-item">' //
													+ '<div style="<tpl for="this.getGradientCSS(start, end)">background-image:{.};</tpl>padding:2px">&nbsp;</div>'//
													+ '</div></tpl>', {
												getGradientCSS : getGradientCSS
											}),
									listeners : {
										select : function(combo, record, index) {
											this.startColor = this.swap ? record.data.end : record.data.start;
											this.endColor = this.swap ? record.data.start : record.data.end;

											this.triggerChangeEvent('symbology');
											combo.setColorBackground(this.startColor, this.endColor);
										},
										scope : this
									},
									getGradientCSS : getGradientCSS,
									setColorBackground : function(start, end) {
										for ( var i = 0, gradCSSs = this.getGradientCSS(start, end); i < gradCSSs.length; i++) {
											this.el.dom.style.backgroundImage = gradCSSs[i];
										}
									}
								});
						comboBoxColor.on('render', function(combo) {
							combo.setColorBackground(this.startColor, this.endColor);
						}, this);

						var options = {
							// Color combobox
							color : {
								fieldLabel : 'Color',
								comp : comboBoxColor,
								required : true
							},
							// Option to swap ends of color gradient
							swap : {
								fieldLabel : 'Swap Ends',
								value : this.swap,
								minimum : 0,
								maximum : 100,
								type : 'boolean',
								action : function(value) {
									if (value != this.swap) {
										var t = this.endColor;
										this.endColor = this.startColor;
										this.startColor = t;
									}
									this.swap = value;
									this.triggerChangeEvent('symbology');
								},
								scope : this,
								required : true
							}
						};
						return options;
					},

					restore : function(parcel) {
						this.startColor = parcel.readIntArray();
						this.endColor = parcel.readIntArray();
						this.swap = parcel.readBoolean();
					},

					store : function(parcel) {
						parcel.writeIntArray(this.startColor);
						parcel.writeIntArray(this.endColor);
						parcel.writeBoolean(this.swap);
					}

				});