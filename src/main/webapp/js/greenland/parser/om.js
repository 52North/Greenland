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
/* 
 * Contains portions of OpenLayers Map Viewer Library (http:/openlayers.org):
 * 
 * Copyright 2005-2010 OpenLayers Contributors, released under the Clear BSD
 * license. Please see http://svn.openlayers.org/trunk/openlayers/license.txt
 * for the full text of the license.
 *
 */
OpenLayers.SOS = OpenLayers.SOS || {};
OpenLayers.SOS.Format = OpenLayers.SOS.Format || {};

OpenLayers.SOS.Format.ExceptionReport = OpenLayers.Class(OpenLayers.Format.XML, {
	CLASS_NAME : "OpenLayers.SOS.Format.ExceptionReport",
	namespaces : {
		ows : "http://www.opengis.net/ows/1.1"
	},
	schemaLocation : "http://www.opengis.net/ows/1.1"
			+ " http://schemas.opengis.net/ows/1.1.0/owsAll.xsd",
	defaultPrefix : "ows",
	regExes : {
		trimSpace : (/^\s*|\s*$/g)
	},
	initialize : function(options) {
		OpenLayers.Format.XML.prototype.initialize.apply(this, [ options ]);
	},
	read : function(data, destinationProjection) {
		if (typeof data === "string") {
			data = OpenLayers.Format.XML.prototype.read.apply(this, [ data ]);
		}
		if (data && data.nodeType === 9) {
			data = data.documentElement;
		}
		var info = {};
		this.readNode(data, info);
		return info;
	},
	readers : {
		"ows" : {
			"ExceptionReport" : function(node, obj) {
				obj.exceptions = [];
				obj.version = node.getAttribute("version");
				this.readChildNodes(node, obj);
			},
			"Exception" : function(node, report) {
				var ex = {
					exceptionTexts : []
				};
				ex.exceptionCode = node.getAttribute("exceptionCode");
				var locator = node.getAttribute("locator");
				if (locator) {
					ex.locator = locator;
				}
				report.exceptions.push(ex);
				this.readChildNodes(node, ex);
			},
			"ExceptionText" : function(node, exception) {
				exception.exceptionTexts.push(this.getChildValue(node));
			}
		}
	},
	write : function() {/* we don't need to write any xml */
	},
	writers : {/* we don't need to write any xml */}
});

OpenLayers.SOS.Format.ObservationCollection = OpenLayers
		.Class(
				OpenLayers.Format.XML,
				{
					CLASS_NAME : "OpenLayers.SOS.Format.ObservationCollection",
					VERSION : "1.0.0",
					namespaces : {
						sos : "http://www.opengis.net/sos/1.0",
						gml : "http://www.opengis.net/gml",
						swe : "http://www.opengis.net/swe/1.0.1",
						sa : "http://www.opengis.net/sampling/1.0",
						ows : "http://www.opengis.net/ows/1.1",
						ogc : "http://www.opengis.net/ogc",
						om : "http://www.opengis.net/om/1.0",
						xlink : "http://www.w3.org/1999/xlink",
						xsi : "http://www.w3.org/2001/XMLSchema-instance"
					},
					schemaLocation : "http://www.opengis.net/sos/1.0 http://schemas.opengis.net/sos/1.0.0/sosAll.xsd",
					defaultPrefix : "sos",

					regExes : {
						trimSpace : (/^\s*|\s*$/g),
						removeSpace : (/\s*/g),
						splitSpace : (/\s+/),
						trimComma : (/\s*,\s*/g),
						splitComma : (/,/),
						splitColon : (/:/)
					},

					obsProp : null,

					initialize : function(options) {
						OpenLayers.Format.XML.prototype.initialize.apply(this, [ options ]);
					},

					readCollectionInfo : function(data) {
						var info = {
							obsProps : [ null ]
						};
						// TODO parse data
						return info;
					},

					read : function(data) {
						if (typeof data === "string") {

							if (data.replace(this.regExes.trimSpace, "") === "") {
								throw "Can not parse empty response.";
							}
							data = OpenLayers.Format.XML.prototype.read.apply(this, [ data ]);
						}
						if (data && data.nodeType === 9) {
							data = data.documentElement;
						}
						var info = {};
						this.readNode(data, info);
						if (info.exceptions) {
							var message = "";
							for ( var i = 0; i < info.exceptions.length; i++) {
								message += info.exceptions[i].exceptionCode + ": ";
								for ( var j = 0; j < info.exceptions[i].exceptionTexts.length; j++) {
									message += info.exceptions[i].exceptionTexts[j] + "\n";
								}
							}
							throw message;
						}
						/* create measurements out of observations */
						for ( var i = 0; i < info.observations.length; i++) {
							var o = info.observations[i];
							for ( var j = 0; j < o.result.values.length; j++) {
								var m = {
									fois : o.fois,
									procedure : o.procedure,
									observedProperty : o.result.values[j].observedProperty,
									result : o.result.values[j].result,
									samplingTime : o.result.values[j].samplingTime
								};
								info.measurements.push(m);
							}
						}
						var f = this.generateFeatures(info.measurements, this.externalProjection);
						this.externalProjection = null;
						delete info;
						return f;
					},

					generateFeatures : function(obs, eP) {
						if (!obs)
							return;

						var mapping = {}, features = [];

						/* "Sort" the observations by feature id */
						for ( var i = 0; i < obs.length; i++) {

							// Filter for observed property
							if (this.obsProp != null && this.obsProp != obs[i].observedProperty)
								continue;

							var foi = obs[i].fois[0].features[0];
							var mappingKey = "FOI" + foi.attributes.id + "PROP" + obs[i].observedProperty
									+ "PROC" + obs[i].procedure;
							if (!mapping[mappingKey]) {
								mapping[mappingKey] = {
									feature : foi,
									values : []
								};
							}
							attr = {
								resultValue : obs[i].result.value,
								uom : obs[i].result.uom,
								samplingTime : obs[i].samplingTime,
								observedProperty : obs[i].observedProperty,
								procedure : obs[i].procedure
							};
							mapping[mappingKey].values.push(attr);
						}

						/* Merge observations with the same feature */
						for (key in mapping) {
							var o = mapping[key];
							var id = o.feature.attributes.id;
							var geometry = o.feature.geometry;
							var procedure = o.values[0].procedure;
							var observedProperty = o.values[0].observedProperty;
							var uom = o.values[0].uom;

							var values = [];
							for ( var i = 0; i < o.values.length; i++) {
								// if (mapping[key].values[i].procedure != procedure)
								// throw "Currently a FOI is limited to 1 Procedure!";
								// if (mapping[key].values[i].observedProperty !=
								// observedProperty)
								// throw "Currently a FOI is limited to 1 ObservedProperty!";
								if (o.values[i].uom != uom)
									throw "Currently a FOI is limited to 1 uom!";
								values.push({
									time : o.values[i].samplingTime,
									value : o.values[i].resultValue
								});

							}
							features.push(new OpenLayers.SOS.ObservationSeries(id, geometry, eP, procedure,
									observedProperty, uom, values));
						}
						return features;
					},

					readers : {
						"ows" : OpenLayers.SOS.Format.ExceptionReport.prototype.readers.ows,
						"swe" : {
							"DataArray" : function(node, obj) {
								this.readChildNodes(node, obj);
							},
							"elementCount" : function(node, obj) {
								/* do nothing */
							},
							"Count" : function(node, obj) {
								/* do nothing */
							},
							"value" : function(node, obj) {
								/* do nothing */
							},
							"elementType" : function(node, obj) {
								this.readChildNodes(node, obj);
							},
							"DataRecord" : function(node, obj) {
								var fields = [];
								obj.fields = fields;
								this.readChildNodes(node, fields);
							},
							"field" : function(node, fields) {
								var field = {
									name : node.getAttribute("name")
								};
								fields.push(field);
								this.readChildNodes(node, field);
							},
							"Time" : function(node, obj) {
								obj.definition = node.getAttribute("definition");
							},
							"Text" : function(node, obj) {
								obj.definition = node.getAttribute("definition");
							},
							"Quantity" : function(node, obj) {
								obj.definition = node.getAttribute("definition");
								this.readChildNodes(node, obj);
							},
							"uom" : function(node, obj) {
								obj.uom = node.getAttribute("code");
							},
							"encoding" : function(node, obj) {
								var encoding = {};
								obj.encoding = encoding;
								this.readChildNodes(node, encoding);
							},
							"TextBlock" : function(node, obj) {
								obj.dSeperator = node.getAttribute("decimalSeperator") || '.';
								obj.tSeperator = node.getAttribute("tokenSeperator") || ",";
								obj.bSeperator = node.getAttribute("blockSeperator") || ";";
							},
							"values" : function(node, result) {
								var valueBlocks = this.getChildValue(node).replace(this.regExes.trimSpace, "")
										.replace(new RegExp(result.encoding.bSeperator + "$"), "").split(
												new RegExp(result.encoding.bSeperator));
								var timeField, phenField, foiField;
								if (result.fields.length != 3) {
									throw "Unsupported Field Format";
								}
								for ( var i = 0; i < result.fields.length; i++) {
									switch (result.fields[i].definition) {
									case "http://www.opengis.net/def/property/OGC/0/SamplingTime":
									case "urn:ogc:data:time:iso8601":
										timeField = i;
										break;
									case "http://www.opengis.net/def/property/OGC/0/FeatureOfInterest":
									case "urn:ogc:data:feature":
										foiField = i;
										break;
									default:
										phenField = i;
									}
								}
								function isValid(value) {
									return (!value || value === 0);
								}
								if (isValid(timeField) && isValid(foiField) && isValid(phenField)) {
									throw "Unsupported Field Format: timeField:" + timeField + " foiField:"
											+ foiField + " phenField:" + phenField;
								}
								result.values = [];
								for ( var i = 0; i < valueBlocks.length; i++) {
									var tokens = valueBlocks[i].split(new RegExp(result.encoding.tSeperator));
									result.values.push({
										samplingTime : {
											timeInstant : {
												timePosition : OpenLayers.Date.parse(tokens[timeField])
											}
										},
										result : {
											value : parseFloat(tokens[phenField]),
											uom : result.fields[phenField].uom
										},
										observedProperty : result.fields[phenField].definition
									});
								}
							}
						},
						"sa" : {
							"SamplingPoint" : function(node, obj) {
								if (!obj.attributes) {
									var feature = {
										attributes : {}
									};
									obj.features.push(feature);
									obj = feature;
								}
								obj.attributes.id = this.getAttributeNS(node, this.namespaces.gml, "id");
								this.readChildNodes(node, obj);
							},
							"SamplingSurface" : function(node, obj) {
								if (!obj.attributes) {
									var feature = {
										attributes : {}
									};
									obj.features.push(feature);
									obj = feature;
								}
								obj.attributes.id = this.getAttributeNS(node, this.namespaces.gml, "id");
								this.readChildNodes(node, obj);
							},
							"shape" : function(node, obj) {
								this.readChildNodes(node, obj);
							},
							"position" : function(node, obj) {
								this.readChildNodes(node, obj);
							}
						},
						"gml" : OpenLayers.Util.applyDefaults({
							"coordinates" : function(node, obj) {
								var str = this.getChildValue(node);
								str = str.replace(this.regExes.trimSpace, "");
								str = str.replace(this.regExes.trimComma, ",");
								var pointList = str.split(this.regExes.splitComma);
								var coords;
								var numPoints = pointList.length;
								var points = new Array(numPoints);
								for ( var i = 0; i < numPoints; ++i) {
									coords = pointList[i].split(this.regExes.splitSpace);
									points[i] = new OpenLayers.Geometry.Point(coords[1], coords[0], coords[2]);
								}
								obj.points = points;
							},
							"CompositeSurface" : function(node, obj) {
								OpenLayers.Format.GML.v3.prototype.readers.gml.MultiPolygon.apply(this,
										[ node, obj ]);
							},
							"TimeInstant" : function(node, samplingTime) {
								var timeInstant = {};
								samplingTime.timeInstant = timeInstant;
								this.readChildNodes(node, timeInstant);
							},
							"TimePeriod" : function(node, samplingTime) {
								var timePeriod = {};
								samplingTime.timePeriod = timePeriod;
								this.readChildNodes(node, timePeriod);
							},
							"timePosition" : function(node, timeInstant) {
								timeInstant.timePosition = OpenLayers.Date.parse(this.getChildValue(node));
							},
							"beginPosition" : function(node, timePeriod) {
								timePeriod.beginPosition = OpenLayers.Date.parse(this.getChildValue(node));
							},
							"endPosition" : function(node, timePeriod) {
								timePeriod.endPosition = OpenLayers.Date.parse(this.getChildValue(node));
							},
							"FeatureCollection" : function(node, obj) {
								this.readChildNodes(node, obj);
							},
							"featureMember" : function(node, obj) {
								var feature = {
									attributes : {}
								};
								obj.features.push(feature);
								this.readChildNodes(node, feature);
							},
							"name" : function(node, obj) {
								obj.attributes.name = this.getChildValue(node);
							},
							"pos" : function(node, obj) {
								var attr = node.getAttribute("srsName");
								if (attr) {
									var splittedSrsName = attr.split(this.regExes.splitColon);
									this.externalProjection = new OpenLayers.Projection("EPSG:"
											+ splittedSrsName[splittedSrsName.length - 1]);
								}
								OpenLayers.Format.GML.v3.prototype.readers.gml.pos.apply(this, [ node, obj ]);
							},
							"Polygon" : function(node, obj) {
								var attr = node.getAttribute("srsName");
								if (attr) {
									var splittedSrsName = attr.split(this.regExes.splitColon);
									this.externalProjection = new OpenLayers.Projection("EPSG:"
											+ splittedSrsName[splittedSrsName.length - 1]);
								}
								OpenLayers.Format.GML.v3.prototype.readers.gml.Polygon.apply(this, [ node, obj ]);
							}
						}, OpenLayers.Format.GML.v3.prototype.readers.gml),
						"om" : {
							"ObservationCollection" : function(node, obj) {
								obj.id = this.getAttributeNS(node, this.namespaces.gml, "id");
								obj.measurements = [];
								obj.observations = [];
								this.readChildNodes(node, obj);
							},
							"member" : function(node, observationCollection) {
								this.readChildNodes(node, observationCollection);
							},
							"Measurement" : function(node, observationCollection) {
								var measurement = {};
								observationCollection.measurements.push(measurement);
								this.readChildNodes(node, measurement);
							},
							"Observation" : function(node, observationCollection) {
								var observation = {};
								observationCollection.observations.push(observation);
								this.readChildNodes(node, observation);
							},
							"samplingTime" : function(node, measurement) {
								var samplingTime = {};
								measurement.samplingTime = samplingTime;
								this.readChildNodes(node, samplingTime);
							},
							"observedProperty" : function(node, measurement) {
								measurement.observedProperty = this.getAttributeNS(node, this.namespaces.xlink,
										"href");
								this.readChildNodes(node, measurement);
							},
							"procedure" : function(node, measurement) {
								measurement.procedure = this.getAttributeNS(node, this.namespaces.xlink, "href");
								this.readChildNodes(node, measurement);
							},
							"featureOfInterest" : function(node, observation) {
								var foi = {
									features : []
								};
								observation.fois = [];
								observation.fois.push(foi);
								this.readChildNodes(node, foi);
								// postprocessing to get actual features
								var features = [];
								for ( var i = 0, len = foi.features.length; i < len; i++) {
									var feature = foi.features[i];
									features.push(new OpenLayers.Feature.Vector(feature.components[0],
											feature.attributes));
								}
								foi.features = features;
							},
							"result" : function(node, measurement) {
								var result = {};
								measurement.result = result;
								var uom = node.getAttribute("uom");
								if (uom) {
									result.value = parseFloat(this.getChildValue(node));
									result.uom = uom;
								} else {
									this.readChildNodes(node, result);
								}
							}
						}
					},
					write : function(options) {/* we don't need to write any xml */
					},
					writers : {/* we don't need to write any xml */}
				});

/* vim: set ts=4 sts=4 sw=4 noet ft=javascript fenc=utf-8 */
