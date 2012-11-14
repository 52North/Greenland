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
OpenLayers.SOS.Format = OpenLayers.SOS.Format || {};
OpenLayers.SOS.Format.JSOM = OpenLayers.Class(OpenLayers.Format.JSON, {
	CLASS_NAME : "OpenLayers.SOS.Format.JSOM",
	nextId : 0,

	// Limitation to specific observed property name
	obsProp : null,

	initialize : function(options) {
		OpenLayers.Format.JSON.prototype.initialize.apply(this, [ options ]);
	},

	readCollectionInfo : function(o) {
		var info = {};
		this.read(o, info);
		return info;
	},

	read : function(o, info) {
		info = info || {};
		info.format = this;
		var j = (typeof (o) === "string") ? OpenLayers.Format.JSON.prototype.read(o) : o;
		var result;
		if (j.OM_MeasurementCollection) {
			result = this.parsers.collection(j.OM_MeasurementCollection, "OM_Measurement", info);
		} else if (j.OM_DiscreteNumericObservationCollection) {
			result = this.parsers.collection(j.OM_DiscreteNumericObservationCollection, "OM_Measurement",
					info);
		} else if (j.OM_UncertaintyObservationCollection) {
			result = this.parsers.collection(j.OM_UncertaintyObservationCollection,
					"OM_UncertaintyObservation", info);
		} else if (j.OM_TextObservationCollection) {
			result = this.parsers.collection(j.OM_TextObservationCollection, "OM_TextObservation", info);
		} else if (j.OM_ReferenceObservationCollection) {
			throw "OM_ReferenceObservations are not supported.";
		} else {
			throw "JSON does not contain a parsable collection.";
		}
		info.observations = result;
		return result;
	},

	parsers : {
		collection : function(json, obsType, info) {
			// var collection = [];
			// var obsPropertyMapping = {};
			var featureMapping = {};
			// var foiMapping = {};
			info.obsProps = info.obsProps || [];
			info.procedures = info.procedures || [];
			info.statistics = info.statistics || [];
			info.hasCategories = false;
			info.hasRealisations = false;
			info.hasStatistics = false;
			info.hasDistributions = false;

			for ( var i = 0; i < json.length; i++) {
				var o = this.observation(json[i][obsType], obsType);

				if (info.format.obsProp != null && info.format.obsProp != o.obsProp)
					continue;

				var oId = "FOI" + o.id + "PROP" + o.obsProp + "PROC" + o.proc;
				if (!featureMapping[oId]) {
					featureMapping[oId] = o;
					if (info.obsProps.indexOf(o.obsProp) == -1) {
						info.obsProps.push(o.obsProp);
					}
					if (info.procedures.indexOf(o.proc) == -1) {
						info.procedures.push(o.proc);
					}
				} else {
					// TODO ensure equal uoms
					featureMapping[oId].values = featureMapping[oId].values.concat(o.values);
				}

				if (o.values[0] && o.values[0].value instanceof VIS.StatisticsValue) {
					var statisticsType = o.values[0].value.statisticsType;
					if (info.statistics.indexOf(statisticsType) == -1) {
						info.statistics.push(statisticsType);
					}
				}
			}

			var collection = [];
			for ( var key in featureMapping) {
				var o = featureMapping[key];
				var f = new OpenLayers.SOS.ObservationSeries(o.id, o.geom, o.srid, o.proc, o.obsProp,
						o.uom, o.values);
				if (f.attributes.hasCategories)
					info.hasCategories = true;
				if (f.attributes.hasRealisations)
					info.hasRealisations = true;
				if (f.attributes.hasStatistics)
					info.hasStatistics = true;
				if (f.attributes.hasDistributions)
					info.hasDistributions = true;
				collection.push(f);
			}

			return collection;
		},
		observation : function(json, obsType) {
			if (!json.phenomenonTime)
				throw "Invalid JSOM: no PhenomenonTime";
			if (!json.featureOfInterest)
				throw "Invalid JSOM: no FeatureOfInterest.";
			if (typeof (json.procedure) != "string")
				throw "Invalid JSOM: no Procedure.";
			if (typeof (json.observedProperty) !== "string")
				throw "Invalid JSOM: no ObservedProperty";

			var result = this.result(json, obsType);
			var time = this.time(json.phenomenonTime);
			var foi = this.featureOfInterest(json.featureOfInterest);
			return {
				id : foi.id,
				geom : foi.geom,
				srid : foi.srid,
				proc : json.procedure,
				obsProp : json.observedProperty,
				uom : result.uom,
				values : [ {
					time : time,
					value : result.value
				} ]
			};
		},
		featureOfInterest : function(json) {
			if (!json.SF_SpatialSamplingFeature)
				throw "Invalid JSOM.";
			json = json.SF_SpatialSamplingFeature;
			if (!json.shape)
				throw "Invalid JSOM: no shape.";
			var id;
			if (!json.identifier || !json.identifier.value) {
				// If no identifier set
				if (json.sampledFeature) {
					// Use sampledFeature as id if existing
					id = json.sampledFeature;
				} else {
					// Create new unique id otherwise
					id = "" + (OpenLayers.SOS.Format.JSOM.prototype.nextId++);
				}
			} else {
				id = json.identifier.value;
			}

			if (json.shape.type == 'MultiSurface') {
				json.shape.type = 'MultiPolygon';
			}

			var geom = new OpenLayers.Format.GeoJSON().parseGeometry(json.shape);
			if (!json.shape.crs)
				throw "No CRS specified!";
			if (json.shape.crs.type != "name")
				throw "Currently only CRS of type 'name' are supported!";
			var crs = json.shape.crs.properties.name;

			if (crs.match("^http")) {
				crs = crs.split("/");
			} else if (crs.match("^urn")) {
				crs = crs.split(":");
			} else {
				throw "Unsupported CRS notation: " + crs;
			}
			var srid = new OpenLayers.Projection("EPSG:" + parseInt(crs[crs.length - 1]));

			return {
				id : id,
				geom : geom,
				srid : srid
			};
		},
		time : function(json) {
			parseInstant = function(json) {
				if (!json.timePosition)
					throw "Invalid JSOM.";
				if (!(json.timePosition instanceof Date)) {
					json.timePosition = OpenLayers.Date.parse(json.timePosition);
				}
			};
			parsePeriod = function(json) {
				if (!json.begin)
					throw "Invalid JSOM.";
				if (!json.end)
					throw "Invalid JSOM.";
				parseInstant(json.begin.TimeInstant);
				json.beginPosition = json.begin.TimeInstant.timePosition;
				parseInstant(json.end.TimeInstant);
				json.endPosition = json.end.TimeInstant.timePosition;
			};
			if (json.TimePeriod) {
				parsePeriod(json.TimePeriod);
				json.timePeriod = json.TimePeriod;
			} else if (json.TimeInstant) {
				parseInstant(json.TimeInstant);
				json.timeInstant = json.TimeInstant;
			} else {
				throw "Unsupported Time Format";
			}
			return json;
		},
		result : function(json, type) {

			function parseUncertainty(uom, j) {
				var value = null;
				try {
					if (j.Realisation) {
						// Realization
						if (j.Realisation.values)
							value = j.Realisation.values;
						else
							value = j.Realisation.categories;
					} else if (j.Mean) {
						// **Statistics**

						// Mean
						value = new VIS.StatisticsValue('Mean', j.Mean);
					} else if (j.Variance) {
						// Variance
						value = new VIS.StatisticsValue('Variance', j.Variance);
					} else if (j.Probability) {
						// Probability
						value = new VIS.ProbabilityValue(j.Probability);
					} else if (j.StandardDeviation) {
						// SD
						value = new VIS.StatisticsValue('SD', j.StandardDeviation);
					} else if (j.Quantile) {
						// Quantile
						value = new VIS.QuantileValue(j.Quantile);
					} else {
						// **Distributions**

						if (j.GaussianDistribution) {
							j.NormalDistribution = j.GaussianDistribution;
							j.NormalDistribution.standardDeviation = j.NormalDistribution.variance;
							for ( var i = 0; i < j.NormalDistribution.standardDeviation.length; i++) {
								j.NormalDistribution.standardDeviation[i] = Math
										.sqrt(parseFloat(j.NormalDistribution.standardDeviation[i]));
							}
							delete j.GaussianDistribution;
						}
						if (j.NormalDistribution) {
							// Variance to SD
							j.NormalDistribution.standardDeviation = j.NormalDistribution.variance;
							for ( var i = 0; i < j.NormalDistribution.standardDeviation.length; i++) {
								j.NormalDistribution.standardDeviation[i] = Math
										.sqrt(parseFloat(j.NormalDistribution.standardDeviation[i]));
							}
						}
						if (j.LogNormalDistribution) {
							j.LogNormalDistribution.location = j.LogNormalDistribution.mean
									|| j.LogNormalDistribution.logScale;
							j.LogNormalDistribution.scale = j.LogNormalDistribution.variance
									|| j.LogNormalDistribution.shape;
							for ( var i = 0; i < j.LogNormalDistribution.scale.length; i++) {
								j.LogNormalDistribution.scale[i] = Math
										.sqrt(parseFloat(j.LogNormalDistribution.scale[i]));
							}
							// TODO may be errorneus?
						}

						// Not available with new jStat
						value = DistributionFactory.build(j);
					}
				} catch (e) {
					throw "Unsupported uncertainty type";
				}
				if (value == null)
					throw "Unsupported uncertainty type";
				return value;
			}

			var uom, value;
			switch (type) {
			case "OM_UncertaintyObservation":
				if (json.result.uom)
					uom = json.result.uom;
				value = parseUncertainty(uom, json.result.value ? json.result.value : json.result);
				break;
			case "OM_Measurement":
				if (json.result.uom)
					uom = json.result.uom;
				if (json.result.value) {
					if (typeof json.result.value === 'number') {
						value = [ json.result.value ];
					} else {
						value = json.result.value;
					}
				} else
					value = json.result;
				if (json.resultQuality) {
					if (json.resultQuality[0]) {
						if (json.resultQuality[0].uom)
							uom = json.resultQuality[0].uom;
						if (!json.resultQuality[0].values)
							throw "Invalid JSOM: no values in resultQuality";
						if (json.resultQuality[0].values.length != 1)
							throw "Currently only one resultQuality value is supported.";
						value = parseUncertainty(uom, json.resultQuality[0].values[0]);
					}
				}
				break;
			// TODO
			case "OM_TextObservation":
				if (json.result.value)
					value = json.result.value;
				else
					value = json.result;
				break;
			}
			if (!value)
				throw "No value in type " + type;

			return {
				value : value,
				uom : uom
			};
		}
	}
});
/* vim: set ts=4 sts=4 sw=4 noet ft=javascript fenc=utf-8 */
