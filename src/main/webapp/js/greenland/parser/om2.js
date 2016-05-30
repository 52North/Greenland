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


// XXX currently unused, using conversion service xml->json

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

OpenLayers.SOS.Format.ObservationCollection2 = OpenLayers
		.Class(
				OpenLayers.Format.XML,
				{
					CLASS_NAME : "OpenLayers.SOS.Format.ObservationCollection",
					VERSION : "2.0.0",
					namespaces : {
						sos : "http://www.opengis.net/sos/1.0",
						gml : "http://www.opengis.net/gml/3.2",
						swe : "http://www.opengis.net/swe/1.0.1",
						sam : "http://www.opengis.net/sampling/2.0",
						sams : "http://www.opengis.net/samplingSpatial/2.0",
						ows : "http://www.opengis.net/ows/1.1",
						ogc : "http://www.opengis.net/ogc",
						om2 : "http://www.opengis.net/om/2.0",
						xlink : "http://www.w3.org/1999/xlink",
						gmd : "http://www.isotc211.org/2005/gmd",
						xsi : "http://www.w3.org/2001/XMLSchema-instance",
						un : "http://www.uncertml.org/2.0"
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

					resultLinkMap : {},

					unmarshalNode : function(node) {
						var obj = {};
						for ( var i = 0, len = node.attributes.length; i < len; i++) {
							var attr = node.attributes[i];
							obj[attr.localName] = attr.value;
						}
						obj.value = this.getChildValue(node);
						return obj;
					},

					linkResult : function(node, obj) {
						var id = this.getAttributeNS(node, this.namespaces.gml, "id");
						if (id) {
							this.resultLinkMap[id] = obj;
						}
					},

					getLinkedResult : function(node) {
						var id = this.getAttributeNS(node, this.namespaces.xlink, "href");
						if (id && this.resultLinkMap[id.substring(1)]) {
							return this.resultLinkMap[id.substring(1)];
						} else {
							return {};
						}
					},

					initialize : function(options) {
						OpenLayers.Format.XML.prototype.initialize.apply(this, [ options ]);
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

						this.resultLinkMap = {};
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

						var jsom = new OpenLayers.SOS.Format.JSOM();
						return jsom.read(info);

						/* create measurements out of observations */
						/*
						 * for ( var i = 0; i < info.observations.length; i++) { var o =
						 * info.observations[i]; for ( var j = 0; j <
						 * o.result.values.length; j++) { var m = { fois : o.fois, procedure :
						 * o.procedure, observedProperty :
						 * o.result.values[j].observedProperty, result :
						 * o.result.values[j].result, samplingTime :
						 * o.result.values[j].samplingTime }; info.measurements.push(m); } }
						 * 
						 * var f = this.generateFeatures(info.observations,
						 * this.externalProjection); this.externalProjection = null; delete
						 * info; return f;
						 */
					},

					generateFeatures : function(obs, eP) {
						if (!obs)
							return;

						var mapping = {}, features = [];

						/* Sort the observations by feature id */
						for ( var i = 0; i < obs.length; i++) {
							var foi = obs[i].fois[0].features[0];
							if (!mapping[foi.attributes.id]) {
								mapping[foi.attributes.id] = {
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
							mapping[foi.attributes.id].values.push(attr);
						}

						/* Merge observations with the same feature */
						for (key in mapping) {
							var id = mapping[key].feature.attributes.id;
							var geometry = mapping[key].feature.geometry;
							var procedure = mapping[key].values[0].procedure;
							var observedProperty = mapping[key].values[0].observedProperty;
							var uom = mapping[key].values[0].uom;

							var values = [];
							for ( var i = 0; i < mapping[key].values.length; i++) {
								if (mapping[key].values[i].procedure != procedure)
									throw "Currently a FOI is limited to 1 Procedure!";
								if (mapping[key].values[i].observedProperty != observedProperty)
									throw "Currently a FOI is limited to 1 ObservedProperty!";
								if (mapping[key].values[i].uom != uom)
									throw "Currently a FOI is limited to 1 uom!";
								values.push({
									time : mapping[key].values[i].samplingTime,
									value : mapping[key].values[i].resultValue
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
						"gmd" : {
							"DQ_QuantitativeAttributeAccuracy" : function(node, obj) {
								this.readChildNodes(node, obj);
							},
							"result" : function(node, obj) {
								this.readChildNodes(node, obj);
							},
							"DQ_UncertaintyResult" : function(node, obj) {
								obj.values = [];
								this.readChildNodes(node, obj);
							},
							"valueUnit" : function(node, obj) {
								this.readChildNodes(node, obj);
							},
							"value" : function(node, obj) {
								this.readChildNodes(node, obj.values);
							}
						},
						"sam" : {
							"type" : function(node, obj) {
								obj.type = this.getAttributeNS(node, this.namespaces.xlink, "href");
							},
							"sampledFeature" : function(node, obj) {
								obj.sampledFeature = this.unmarshalNode(node).href;
							}
						},
						"sams" : {
							"SF_SpatialSamplingFeature" : function(node, obj) {
								var ssf = {};
								obj.SF_SpatialSamplingFeature = ssf;

								// TODO sampled feature

								this.readChildNodes(node, ssf);
								this.linkResult(node, {
									"SF_SpatialSamplingFeature" : ssf
								});
							},
							"shape" : function(node, obj) {
								var shape = this.getLinkedResult(node);
								obj.shape = shape;
								this.readChildNodes(node, shape);
							},
							"position" : function(node, obj) {
								var pos = {};
								obj.position = pos;
								this.readChildNodes(node, pos);
							}
						},
						"gml" : OpenLayers.Util.applyDefaults({
							"UnitDefinition" : function(node, obj) {
								var objIdent = {};
								this.readChildNodes(node, objIdent);
								obj.uom = objIdent.identifier.value;
								// TODO id
							},
							"identifier" : function(node, obj) {
								obj.identifier = this.unmarshalNode(node);
							},
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
							"TimeInstant" : function(node, phenomenonTime) {
								var timeInstant = {};
								phenomenonTime.TimeInstant = timeInstant;
								this.readChildNodes(node, timeInstant);
								this.linkResult(node, {
									TimeInstant : timeInstant
								});
							},
							"TimePeriod" : function(node, samplingTime) {
								var timePeriod = {};
								samplingTime.TimePeriod = timePeriod;
								this.readChildNodes(node, timePeriod);
								this.linkResult(node, {
									TimePeriod : timePeriod
								});
							},
							"begin" : function(node, timePeriod) {
								var begin = {};
								timePeriod.begin = begin;
								this.readChildNodes(node, begin);
							},
							"end" : function(node, timePeriod) {
								var end = {};
								timePeriod.end = end;
								this.readChildNodes(node, end);
							},
							"timePosition" : function(node, timeInstant) {
								timeInstant.timePosition = this.getChildValue(node);
							},
							"beginPosition" : function(node, timePeriod) {
								timePeriod.beginPosition = this.getChildValue(node);
							},
							"endPosition" : function(node, timePeriod) {
								timePeriod.endPosition = this.getChildValue(node);
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
							"Point" : function(node, obj) {
								obj.type = "Point";
								obj.coordinates = {};
								this.readChildNodes(node, obj);
								this.linkResult(node, {
									Point : obj
								});
							},
							"LineString" : function(node, obj) {
								obj.type = "LineString";
								obj.coordinates = [];
								this.readChildNodes(node, obj);
								this.linkResult(node, {
									LineString : obj
								});
							},
							"pos" : function(node, obj) {
								var posObj = {};
								OpenLayers.Format.GML.v3.prototype.readers.gml.pos.apply(this, [ node, posObj ]);
								var attr = node.getAttribute("srsName");
								obj.crs = {
									type : "name",
									properties : {
										name : attr
									}
								};

								for ( var i = 0, len = posObj.points.length; i < len; i++) {
									var point = [ posObj.points[i].y, posObj.points[i].x ];
									if (obj.coordinates instanceof Array) {
										obj.coordinates.push(point);
									} else {
										obj.coordinates = point;
									}
								}
							},
							"Polygon" : function(node, obj) {
								// TODO
								var attr = node.getAttribute("srsName");
								if (attr) {
									var splittedSrsName = attr.split(this.regExes.splitColon);
									this.externalProjection = new OpenLayers.Projection("EPSG:"
											+ splittedSrsName[splittedSrsName.length - 1]);
								}
								OpenLayers.Format.GML.v3.prototype.readers.gml.Polygon.apply(this, [ node, obj ]);
							}
						}, OpenLayers.Format.GML.v3.prototype.readers.gml),
						/*
						 * "om" : { "ObservationCollection" : function(node, obj) { obj.id =
						 * this.getAttributeNS(node, this.namespaces.gml, "id");
						 * obj.measurements = []; obj.observations = [];
						 * this.readChildNodes(node, obj); }, "member" : function(node,
						 * observationCollection) { this.readChildNodes(node,
						 * observationCollection); }, "Measurement" : function(node,
						 * observationCollection) { var measurement = {};
						 * observationCollection.measurements.push(measurement);
						 * this.readChildNodes(node, measurement); }, "Observation" :
						 * function(node, observationCollection) { var observation = {};
						 * observationCollection.observations.push(observation);
						 * this.readChildNodes(node, observation); }, "samplingTime" :
						 * function(node, measurement) { var samplingTime = {};
						 * measurement.samplingTime = samplingTime;
						 * this.readChildNodes(node, samplingTime); }, "observedProperty" :
						 * function(node, measurement) { measurement.observedProperty =
						 * this.getAttributeNS( node, this.namespaces.xlink, "href");
						 * this.readChildNodes(node, measurement); }, "procedure" :
						 * function(node, measurement) { measurement.procedure =
						 * this.getAttributeNS(node, this.namespaces.xlink, "href");
						 * this.readChildNodes(node, measurement); }, "featureOfInterest" :
						 * function(node, observation) { var foi = { features : [] };
						 * observation.fois = []; observation.fois.push(foi);
						 * this.readChildNodes(node, foi); // postprocessing to get actual
						 * features var features = []; for ( var i = 0, len =
						 * foi.features.length; i < len; i++) { var feature =
						 * foi.features[i]; features.push(new OpenLayers.Feature.Vector(
						 * feature.components[0], feature.attributes)); } foi.features =
						 * features; }, "result" : function(node, measurement) { var result =
						 * {}; measurement.result = result; var uom =
						 * node.getAttribute("uom"); if (uom) { result.value =
						 * parseFloat(this.getChildValue(node)); result.uom = uom; } else {
						 * this.readChildNodes(node, result); } } },
						 */
						"un" : {
							"GaussianDistribution" : function(node, values) {
								var distribution = {};
								values.push({
									"GaussianDistribution" : distribution
								});
								this.readChildNodes(node, distribution);
							},
							"mean" : function(node, distribution) {
								distribution.mean = [ this.getChildValue(node) ];
							},
							"variance" : function(node, distribution) {
								distribution.variance = [ this.getChildValue(node) ];
							},
							"Probability" : function(node, result) {
								var probability = {
									values : []
								};
								result.Probability = probability;
								this.readChildNodes(node, probability);

								var type, value;
								if (node.hasAttribute("gt")) {
									type = "GREATER_THAN";
									value = node.getAttribute("gt");
								} else if (node.hasAttribute("lt")) {
									type = "LESS_THAN";
									value = node.getAttribute("lt");
								} else if (node.hasAttribute("ge")) {
									type = "GREATER_OR_EQUAL";
									value = node.getAttribute("ge");
								} else if (node.hasAttribute("le")) {
									type = "LESS_OR_EQUAL";
									value = node.getAttribute("le");
								}
								probability.constraints = [ {
									"type" : type,
									"value" : value
								} ];
							},
							"probabilities" : function(node, probability) {
								probability.values = this.getChildValue(node).split(this.regExes.splitSpace);
							},
							"Realisation" : function(node, result) {
								var realisation = {};
								result.Realisation = realisation;
								realisation.id = node.getAttribute("id");
								this.readChildNodes(node, realisation);
							},
							"weight" : function(node, realisation) {
								realisation.weight = this.getChildValue(node);
							},
							"values" : function(node, realisation) {
								realisation.values = this.getChildValue(node).split(this.regExes.splitSpace);
							},
							"categories" : function(node, realisation) {
								realisation.categories = this.getChildValue(node).split(this.regExes.splitSpace);
							}
						},
						"om2" : {
							"OM_MeasurementCollection" : function(node, obj) {
								// obj.id = this.getAttributeNS(node,
								// this.namespaces.gml, "id");
								var collection = [];
								obj.OM_MeasurementCollection = collection;
								this.readChildNodes(node, collection);
							},
							"OM_UncertaintyObservationCollection" : function(node, obj) {
								// obj.id = this.getAttributeNS(node,
								// this.namespaces.gml, "id");
								var collection = [];
								obj.OM_UncertaintyObservationCollection = collection;
								this.readChildNodes(node, collection);
							},
							"OM_DiscreteNumericObservationCollection" : function(node, obj) {
								// obj.id = this.getAttributeNS(node,
								// this.namespaces.gml, "id");
								var collection = [];
								obj.OM_DiscreteNumericObservationCollection = collection;
								this.readChildNodes(node, collection);
							},
							"OM_TextObservationCollection" : function(node, obj) {
								// obj.id = this.getAttributeNS(node,
								// this.namespaces.gml, "id");
								var collection = [];
								obj.OM_TextObservationCollection = collection;
								this.readChildNodes(node, collection);
							},
							"OM_Measurement" : function(node, collection) {
								var measurement = {};
								collection.push({
									"OM_Measurement" : measurement
								});
								this.readChildNodes(node, measurement);
							},
							"OM_UncertaintyObservation" : function(node, collection) {
								var measurement = {};
								collection.push({
									"OM_UncertaintyObservation" : measurement
								});
								this.readChildNodes(node, measurement);
							},
							"OM_TextObservation" : function(node, collection) {
								var measurement = {};
								collection.push({
									"OM_TextObservation" : measurement
								});
								this.readChildNodes(node, measurement);
							},
							"OM_DiscreteNumericObservation" : function(node, collection) {
								var measurement = {};
								collection.push({
									"OM_DiscreteNumericObservation" : measurement
								});
								this.readChildNodes(node, measurement);
							},
							"phenomenonTime" : function(node, observation) {
								var phenomenonTime = this.getLinkedResult(node);
								observation.phenomenonTime = phenomenonTime;
								this.readChildNodes(node, phenomenonTime);
							},
							"resultTime" : function(node, observation) {
								var resultTime = this.getLinkedResult(node);
								observation.resultTime = resultTime;
								this.readChildNodes(node, resultTime);
							},
							"procedure" : function(node, observation) {
								observation.procedure = this.getAttributeNS(node, this.namespaces.xlink, "href");
								this.readChildNodes(node, observation);
							},
							"observedProperty" : function(node, observation) {
								observation.observedProperty = this.getAttributeNS(node, this.namespaces.xlink,
										"href");
								this.readChildNodes(node, observation);
							},
							"featureOfInterest" : function(node, observation) {
								var foi = this.getLinkedResult(node);
								if (foi.SF_SpatialSamplingFeature) {
									var test;
								}
								observation.featureOfInterest = foi;
								this.readChildNodes(node, foi);
							},
							"resultQuality" : function(node, observation) {
								var quality = {};
								observation.resultQuality = quality;
								this.readChildNodes(node, quality);
							},
							"result" : function(node, measurement) {
								switch (node.parentNode.localName) {
								case "OM_Measurement":
									measurement.result = {
										"uom" : node.getAttribute("uom"),
										"value" : this.getChildValue(node)
									};
									break;
								case "OM_UncertaintyObservation":
									var result = {};
									measurement.result = result;
									this.readChildNodes(node, result);
									break;
								case "OM_TextObservation":
									measurement.result = this.getChildValue(node);
									break;
								}

							}
						}
					},
					write : function(options) {/*
																			 * we don't need to write any xml
																			 */
					},
					writers : {/* we don't need to write any xml */}
				});
