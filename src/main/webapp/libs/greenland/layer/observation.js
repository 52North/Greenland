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
OpenLayers.SOS = OpenLayers.SOS || {};
/**
 * Based on OpenLayers.SOS.ObservationSeries.
 */
OpenLayers.SOS.ObservationSeries = OpenLayers
		.Class(
				OpenLayers.Feature.Vector,
				{
					CLASS_NAME : "OpenLayers.SOS.ObservationSeries",

					srid : null,
					threshold : Number.NaN,
					time : Number.NaN,

					initialize : function(id, geometry, srid, procedure, observedProperty, uom, values) {
						function test(obj, name) {
							if (!obj)
								throw name + " is obligatory!";
						}
						test(id, "ID");
						test(srid, "SRID");
						test(geometry, "Geometry");
						test(procedure, "Procedure");
						test(observedProperty, "ObservedProperty");
						// test(uom,"UOM");
						test(values, "values");

						this.srid = srid;

						var timeValueArray = [];

						values.sort(function(a, b) {
							var time1, time2;
							a = (a.time.samplingTime) ? a.time.samplingTime : a.time;
							b = (b.time.samplingTime) ? b.time.samplingTime : b.time;
							if (a.timeInstant) {
								if (b.timeInstant) {
									time1 = a.timeInstant.timePosition;
									time2 = b.timeInstant.timePosition;
								} else {
									time1 = a.timeInstant.timePosition;
									time2 = b.timePeriod.beginPosition;
								}
							} else {
								if (b.timeInstant) {
									time1 = a.timePeriod.beginPosition;
									time2 = b.timeInstant.timePosition;
								} else {
									time1 = a.timePeriod.beginPosition;
									time2 = b.timePeriod.beginPosition;
								}
							}
							return time1.getTime() - time2.getTime();
						});

						var hasRealisations = false;
						var hasCategories = false;
						var hasDistributions = false;
						var hasStatistics = false;

						for ( var i = 0; i < values.length; i++) {
							// Process time
							var time;
							if (values[i].time.timeInstant) {
								time = [ values[i].time.timeInstant.timePosition.getTime() ];
							} else if (values[i].time.timePeriod) {
								time = [ values[i].time.timePeriod.beginPosition.getTime(),
										values[i].time.timePeriod.endPosition.getTime() ];
							} else {
								throw "Unknown SamplingTime Format";
							}
							timeValueArray.push([ time, values[i].value ]);

							// Check type
							if (values[i].value.length) {
								hasRealisations = true;
								if (values[i].value.length > 0 && (typeof values[i].value[0] === "string")) {
									hasCategories = true;
								}
							} else if (typeof values[i].value === "string") {
								hasCategories = true;
							} else if (values[i].value.getClassName
									&& values[i].value.getClassName().match(".*Distribution$")) {
								hasDistributions = true;
							} else if (values[i].value instanceof VIS.StatisticsValue) {
								hasStatistics = true;
							}
						}

						var attr = {
							id : id,
							uom : uom,
							procedure : procedure,
							observedProperty : observedProperty,
							isMultiFeature : values.length != 1,
							timeValueArray : timeValueArray,
							// resultValue : this.getMapValueForArray(timeValueArray),
							hasCategories : hasCategories,
							hasRealisations : hasRealisations,
							hasDistributions : hasDistributions,
							hasStatistics : hasStatistics
						};
						OpenLayers.Feature.Vector.prototype.initialize.apply(this, [ geometry, attr ]);
					},

					/**
					 * Transforms an array of feature values (arrays with time and data
					 * components) into a single representation to use as map value.
					 * 
					 * 
					 * @param values
					 * @returns
					 */
					getMapValue : function(values) {
						if (values.length == 0) {
							return null;
						}
						var valueArray = [];
						for ( var i = 0; i < values.length; i++) {
							valueArray.push(values[i][1]);
						}
						return this.layer.resultValue.getMapValue(valueArray);

						// if (values.length == 0) {
						// return null;
						// }
					},

					/**
					 * Computes the min and max time instance representing this feature
					 * point
					 * 
					 * @returns {Array}
					 */
					getTimeExtent : function() {
						var timeExtent = [ Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY ];
						var values = this.attributes.timeValueArray;
						for ( var j = 0, len = values.length; j < len; j++) {
							var t = values[j][0];

							// check temporal extent
							if (t.length == 1) {
								t = [ t[0], t[0] ];
							}
							if (t[0] < timeExtent[0]) {
								timeExtent[0] = t[0];
							}
							if (t[1] > timeExtent[1]) {
								timeExtent[1] = t[1];
							}
						}

						return timeExtent;
					},

					/**
					 * Gets the min and max values of this feature
					 * 
					 * @returns {Array}
					 */
					getValueExtent : function() {
						var valueExtent = [ Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY ];
						var v = this.attributes.timeValueArray;

						// Find temporal matches for every value
						for ( var j = 0, len = v.length; j < len; j++) {
							var matchedValues = [];

							for ( var i = j; i < len; i++) {
								if ((v[j][0][0] == v[i][0][0])
										|| (v[j][0].length == 2 && v[j][0][0] >= v[i][0][0] && v[j][0][1] <= v[i][0][v[i][0].length == 2 ? 1
												: 0])) {
									matchedValues.push(v[i]);
								}

								if (v[i][0][v[i][0].length == 2 ? 1 : 0] > v[j][0][v[j][0].length == 2 ? 1 : 0]) {
									break;
								}
							}

							// Set extent based on map value for time period
							var mapValue = this.getMapValue(matchedValues);
							if (mapValue != null) {
								if (mapValue < valueExtent[0]) {
									valueExtent[0] = mapValue;
								}
								if (mapValue > valueExtent[1]) {
									valueExtent[1] = mapValue;
								}
							}
						}
						return valueExtent;
					},

					/**
					 * Updates this features resultValue attribute based on the specified
					 * temporal extent
					 */
					_update : function() {
						if (isNaN(this.time)) {
							this.attributes.resultValue = null;
							return;
						}

						// map-value from values matching currently set time
						var rv = this.getMapValue(this.getCurrentValues());
						this.attributes.resultValue = (!this.attributes.hasCategories && isNaN(rv)) ? Number.NEGATIVE_INFINITY
								: rv;
					},

					/**
					 * Returns the values matching the currently set time, i.e. the values
					 * overlapping this time instance
					 */
					getCurrentValues : function() {
						var v = this.getValues(), matchedValues = [];
						for ( var i = 0; i < v.length; i++) {
							if ((v[i][0][0] == this.time)
									|| (v[i][0].length == 2 && v[i][0][0] <= this.time && v[i][0][1] > this.time)) {
								matchedValues.push(v[i]);
							}
						}
						return matchedValues;
					},

					setTime : function(time) {
						if (time)
							this.time = time.getTime();
						else
							this.time = Number.NaN;
						this._update();
					},

					update : function() {
						this._update();
					},

					// setThreshold : function(val) {
					// this.threshold = val;
					// this._update();
					// },
					// transform : function(dest) {
					// this.geometry.transform(this.srid, dest);
					// this.srid = dest;
					// },

					getHumanReadableObservedProperty : function() {
						return VIS.getHumanReadableObservedProperty(this.getObservedProperty());
					},

					getFoiId : function() {
						return this.attributes.id;
					},
					getUom : function() {
						return this.attributes.uom;
					},
					getObservedProperty : function() {
						return this.attributes.observedProperty;
					},
					getProcedure : function() {
						return this.attributes.procedure;
					},
					getValues : function() {
						return this.attributes.timeValueArray;
					},
					getValue : function() {
						return this.attributes.resultValue;
					},
					isMultiFeature : function() {
						return this.attributes.isMultiFeature;
					},
					hasCategories : function() {
						return this.attributes.hasCategories;
					},
					hasRealisations : function() {
						return this.attributes.hasRealisations;
					}
				});
