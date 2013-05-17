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
OpenLayers.VIS = OpenLayers.VIS || {};

/**
 * Class manages and represents a resource according to the visualization
 * service.
 */
OpenLayers.VIS.Resource = OpenLayers.Class({
	CLASS_NAME : 'OpenLayers.VIS.Resource',
	EVENT_TYPES : [ 'create' ],
	url : null,
	mime : null,
	request : null,
	resource : null,
	vissUrl : null,
	autoCreate : false,
	dataSets : null,

	initialize : function(vissUrl, options) {
		options.vissUrl = vissUrl;
		OpenLayers.Util.extend(this, options);

		if (this.autoCreate) {
			this.createResource();
		}
	},

	/**
	 * Creates a new resource from the specified url, mime and request parameters.
	 * Returns the created resource response by a callback function
	 * 
	 * @param callback
	 *          decoded server response or Error object
	 */
	createResource : function(callback) {
		var req = {
			// url : this.url,
			responseMediaType : this.mime
		};
		if (this.url) {
			req.url = this.url;
		}
		if (this.request && this.request.trim()) {
			OpenLayers.Util.applyDefaults(req, {
				request : this.request,
				method : 'POST',
				requestMediaType : 'application/xml'
			});
		} else {
			req.method = 'GET';
		}
		this.loading = true;
		OpenLayers.Request.POST({
			headers : {
				'Content-Type' : 'application/vnd.org.uncertweb.viss.request+json'
			},
			url : this.vissUrl + '/resources',
			data : new OpenLayers.Format.JSON().write(req),
			success : this.handleResourceResponse.createDelegate(this, [ callback ], true),
			failure : function(resp) {
				// throw new Error(resp.responseText); // error propagation does not
				// work properly
				callback(new Error(resp.responseText));
			}
		});
	},

	/**
	 * Handles the server response to the createResource request
	 * 
	 * @param resp
	 *          server response
	 * @param callback
	 *          callback to pass the result to
	 */
	handleResourceResponse : function(resp, callback) {
		this.resource = new OpenLayers.Format.JSON().read(resp.responseText);
		this.resource.resourceUrl = this.vissUrl + '/resources/' + this.resource.id;
		callback(this.resource);
	},

	/**
	 * Gets the resource description, requests it if needed from the visualization
	 * service
	 * 
	 * @param callback
	 */
	getResource : function(callback) {
		if (this.resource != null) {
			callback.call(this, this.resource);
		} else {
			this.createResource(callback);
		}
	},

	/**
	 * Gets the datasets description for the managed resource
	 * 
	 * @param callback
	 *          function to take array of OpenLayers.VIS.DataSet objects
	 */
	getDataSets : function(callback) {
		if (this.dataSets != null) {
			callback.call(this, this.dataSets);
		} else {
			OpenLayers.Request.GET({
				url : this.resource.resourceUrl + '/datasets',
				success : this.handleDataSetsResponse.createDelegate(this, [ callback ], true),
				failure : function(resp) {
					// throw new Error(resp.responseText);
					callback(new Error(resp.responseText));
				}
			});
		}
	},

	/**
	 * handles the response of the datasets server request
	 * 
	 * @param resp
	 * @param callback
	 */
	handleDataSetsResponse : function(resp, callback) {
		var dataSetsJson = new OpenLayers.Format.JSON().read(resp.responseText).dataSets;
		this.dataSets = [];
		for ( var i = 0; i < dataSetsJson.length; i++) {
			dataSetsJson[i].resource = this.resource;
			this.dataSets.push(new OpenLayers.VIS.DataSet(dataSetsJson[i]));
		}
		callback(this.dataSets);
	},

	/**
	 * Performs the delete operation for the managed resource
	 */
	deleteResource : function() {
		if (this.resource) {
			OpenLayers.Request.DELETE({
				url : this.resource.resourceUrl,
				callback : function() {
				}
			});
		}
	}

});

/**
 * Class represents a Datasets resource of the visualization service for a
 * specific data resource
 */
OpenLayers.VIS.DataSet = OpenLayers.Class({
	CLASS_NAME : 'OpenLayers.VIS.DataSet',
	visualizers : null,
	resource : null,

	initialize : function(options) {
		OpenLayers.Util.extend(this, options);
	},

	/**
	 * Gets the datasets description from the visualization service
	 * 
	 * @param callback
	 *          function to which the request result gets passed
	 */
	getDataSet : function(callback) {
		if (this.dataSetInfo != null) {
			callback.call(this, this.dataSetInfo);
		} else {
			OpenLayers.Request.GET({
				url : this.href,
				success : this.handleDataSetResponse.createDelegate(this, [ callback ], true),
				failure : function(resp) {
					// throw resp.responseText;
					callback(new Error(resp.responseText));
				}
			});
		}
	},

	/**
	 * Handles the datasets request response from the service
	 * 
	 * @param resp
	 * @param callback
	 */
	handleDataSetResponse : function(resp, callback) {
		this.dataSetInfo = new OpenLayers.Format.JSON().read(resp.responseText);
		callback(this.dataSetInfo);
	},

	/**
	 * Gets the visualizers for this datasource, if needed from visualization
	 * service
	 * 
	 * @param callback
	 *          function to take array of OpenLayers.VIS.Visualizer objects
	 */
	getVisualizers : function(callback) {
		if (this.visualizers != null) {
			callback.call(this, this.visualizers);
		} else {
			OpenLayers.Request.GET({
				url : this.href + '/visualizers',
				success : this.handleVisualizersResponse.createDelegate(this, [ callback ], true),
				failure : function(resp) {
					callback(new Error(resp.responseText));
					// throw resp.responseText;
				}
			});
		}
	},

	getValue : function(lonLat, projection, callback) {
		var epsgCodeString = projection.getCode().substring(5);
		if (epsgCodeString == '900913')
			epsgCodeString = '3857';

		var location = {
			type : 'Point',
			coordinates : [ lonLat.lon, lonLat.lat ],
			crs : {
				type : 'name',
				properties : {
					name : 'http://www.opengis.net/def/crs/EPSG/0/' + epsgCodeString
				}
			}
		};

		OpenLayers.Request.POST({
			headers : {
				'Content-Type' : 'application/vnd.org.uncertweb.viss.value-request+json'
			},
			url : this.href + '/value',
			data : new OpenLayers.Format.JSON().write({
				location : location
			}),
			success : function(resp) {
				var v = new OpenLayers.Format.JSON().read(resp.responseText);

				callback.call(this, v);
			}.createDelegate(this),
			failure : function(resp) {
				callback(new Error(resp.responseText));
			}
		});
	},

	/**
	 * Handles the response from the visualizers request
	 * 
	 * @param resp
	 * @param callback
	 */
	handleVisualizersResponse : function(resp, callback) {
		var visualizersJson = new OpenLayers.Format.JSON().read(resp.responseText).visualizers;
		this.visualizers = [];
		for ( var i = 0; i < visualizersJson.length; i++) {
			visualizersJson[i].dataSet = this;
			this.visualizers.push(new OpenLayers.VIS.Visualizer(visualizersJson[i]));
		}
		callback(this.visualizers);
	},

	/**
	 * Gets the time extends encoded into the datasource description as array of
	 * arrays containing the lower and upper bounds of of a time interval
	 * 
	 * @param callback
	 *          function getting the result of this operation passed
	 */
	getTimeExtents : function(callback) {
		this.getDataSet(function(info) {
			var extents = [];
			if (info.temporalExtent) {
				var temporalExtent = info.temporalExtent;
				if (temporalExtent.instant) {
					var date = OpenLayers.Date.parse(temporalExtent.instant);
					extents.push([ date.getTime(), date.getTime() ]);
				}
				if (temporalExtent.begin && temporalExtent.end) {
					var beginDate = OpenLayers.Date.parse(temporalExtent.begin), endDate = OpenLayers.Date
							.parse(temporalExtent.end);
					var interval = 0, separator = 0;
					if (temporalExtent.intervalSize != null) {
						interval = temporalExtent.intervalSize;
					}
					if (temporalExtent.seperator != null) {
						separator = temporalExtent.seperator;
					}

					if (interval != 0 || separator != 0) {
						// TODO types
						for ( var time = beginDate.getTime(); time <= endDate.getTime(); time += interval
								+ separator) {
							extents.push([ time, time + interval ]);
						}
					}
				}
				if (temporalExtent.intervals) {
					for ( var i = 0, len = temporalExtent.intervals.length; i < len; i++) {
						extents.push([ OpenLayers.Date.parse(temporalExtent.intervals.begin).getTime(),
								OpenLayers.Date.parse(temporalExtent.intervals.end).getTime() ]);
					}
				}
				if (temporalExtent.instants) {
					for ( var i = 0, len = temporalExtent.instants.length; i < len; i++) {
						var date = OpenLayers.Date.parse(temporalExtent.instants[i]);
						extents.push([ date.getTime(), date.getTime() ]);
					}
				}
			}
			callback(extents);
		});
	}

});

/**
 * Class representing a VIS visualizer resource
 */
OpenLayers.VIS.Visualizer = OpenLayers.Class({
	CLASS_NAME : 'OpenLayers.VIS.Visualizer',
	initialize : function(options) {
		OpenLayers.Util.extend(this, options);
	},

	/**
	 * Queries for the corresponding visualization resource
	 * 
	 * @param callback
	 *          Function to handle the response
	 */
	getVisualization : function(callback) {
		OpenLayers.Request.GET({
			url : this.href,
			success : this.handleVisualizationResponse.createDelegate(this, [ callback ], true),
			failure : function(resp) {
				callback(new Error(resp.responseText));
				// throw resp.responseText;
			}
		});
	},

	/**
	 * Handles the get visualization response
	 * 
	 * @param resp
	 * @param callback
	 */
	handleVisualizationResponse : function(resp, callback) {
		var v = new OpenLayers.Format.JSON().read(resp.responseText);

		// Function to initialize visualization options
		var process = function(timeExtents) {

			// Initialize option value
			for ( var key in v.options) {
				var option = v.options[key];

				if (option.required !== false && key != 'time') {
					// Required field -> zero or specified minimum
					option.value = option.minimum ? option.minimum : 0;
				} else {
					// Field not required -> null
					option.value = null;
				}
			}
			v.visualizer = this;
			var visualization = new OpenLayers.VIS.Visualization(v);

			callback.call(this, visualization);
		};

		if (v.options && v.options.time) {
			// apply time transformation if options contain time attribute
			this.dataSet.getTimeExtents(process.createDelegate(this));
		} else {
			process.call(this, null);
		}
	}
});

/**
 * Class representing and providing symbology information for a VIS layer
 * visualization resource.
 * 
 * This implementation hides the fact that every change of visualization
 * parameters requires the creation of a new VISS visualization resource, that
 * means each object may manage multiple visualization resources.
 */
OpenLayers.VIS.Visualization = OpenLayers.Class(OpenLayers.VIS.Symbology.Vector, {
	CLASS_NAME : 'OpenLayers.VIS.Visualization',

	id : null,
	reference : null,
	description : null,
	visualizer : null,
	sld : null,
	visualizationRequest : null,

	legendSymbolType : 'polygon',
	baseOnChangeTask : null,

	timeVisualizationMap : null,
	sldVisualizationMap : null,

	initialize : function(options) {
		this.visualizationRequest = {};
		this.timeVisualizationMap = {};
		this.sldVisualizationMap = {};
		// Cache/delay change events to reduce traffic and requests
		this.baseOnChangeTask = new Ext.util.DelayedTask(function() {
			OpenLayers.VIS.Symbology.Base.prototype.onChange;
			this.updateLegend();
		}, this);
		options = options || {};

		// Add specific styler
		var styler = {
			fillColor : new OpenLayers.VIS.Styler.Color(),
			opacity : new OpenLayers.VIS.Styler.Opacity(),
			strokeWidth : {
				getValue : function() {
					return 0;
				}
			},
			pointRadius : {
				getValue : function() {
					return 8;
				}
			},
			bounds : new OpenLayers.VIS.Styler.EqualIntervals()
		};
		options.styler = OpenLayers.VIS.extendStyler(styler, options.styler || {});

		OpenLayers.VIS.Symbology.Vector.prototype.initialize.call(this, options);
	},

	/**
	 * requests a new visualization with the current option values If using time,
	 * the results are cached automatically and reused transparently.
	 * 
	 * @param callback
	 */
	createVisualization : function(callback) {
		// this.options used by createLegendItemForLayer
		var options = {};
		for ( var key in this.options) {
			var option = this.options[key];
			if (option.required && option.value == null) {
				callback(new Error('Invalid parameter "' + key + '"'));
				return;
			}
			if (option.value != null) {
				options[key] = option.value;
			}
		}

		// get visualization response cached by time
		var cachedValue = options.time ? this.timeVisualizationMap[options.time] : null;
		var refParams = cachedValue ? cachedValue.params : this.params;

		if (refParams != null) {
			// Check if request parameters of current visualization differ from
			// current or cached object state
			var equalParams = true;

			for ( var key in options) {
				if (refParams[key] == null || options[key].valueOf() != refParams[key].valueOf()) {
					equalParams = false;
					break;
				}
			}
			if (equalParams) {
				for ( var key in refParams) {
					if (refParams[key].valueOf() != options[key].valueOf()) {
						equalParams = false;
						break;
					}
				}
			}

			if (equalParams) {
				if (cachedValue) {
					// requested params are equal to cached params -> reuse them
					this.updateValues(cachedValue);
					callback.call(this);
				} else {
					// Return if request parameters are already up to date
					callback.call(this);
				}
				return;
			}
		}

		// params are different to previous calls

		if (!options.time)
			this.removeSld(); // Remove sld directly if not using time

		// if possible, cancel ongoing request
		if (this.visualizationRequest.abort)
			this.visualizationRequest.abort();

		this.visualizationRequest = OpenLayers.Request.POST({
			headers : {
				'Content-Type' : 'application/vnd.org.uncertweb.viss.create+json'
			},
			url : this.visualizer.href,
			data : new OpenLayers.Format.JSON().write(options),
			success : function(resp) {
				var v = new OpenLayers.Format.JSON().read(resp.responseText);
				this.updateValues(v);
				callback.call(this);
			}.createDelegate(this),
			failure : function(resp) {
				callback(new Error(resp.responseText));
			}
		});
	},

	/**
	 * Function handling new visualization information from VIS
	 * 
	 * @param v
	 */
	updateValues : function(v) {
		if (v.params && v.params.time) {
			// decode time parameter
			if (!v.params.time.getTime)
				v.params.time = OpenLayers.Date.parse(v.params.time);
			// cache result if using time parameter
			this.timeVisualizationMap[v.params.time] = v;
		}

		var tMin = this.minValue, tMax = this.maxValue;
		var tVisualizer = this.visualizer;
		OpenLayers.Util.extend(this, v); // update object state
		this.visualizer = tVisualizer;
		if (this.uom == '%') {
			// Percentage reported in 0..1 range
			this.maxValue *= 100;
			this.minValue *= 100;
		}

		if (tMin != this.minValue || tMax != this.maxValue) {
			// Fire event if min/max value changed
			this.events.triggerEvent('change', {
				property : 'valueExtent',
				sender : this
			});
			this.updateLegend();
		}
	},

	getMinValue : function() {
		return this.minValue;
	},

	getMaxValue : function() {
		return this.maxValue;
	},

	getTitle : function() {
		if (this.visualizer) {
			if (this.visualizer.dataSet.dataSetInfo) {
				return this.visualizer.dataSet.dataSetInfo.phenomenon + ' - ' + this.visualizer.id;
			} else {
				return this.visualizer.dataSet.resource.id + ' - ' + this.visualizer.id;
			}
		} else {
			return null;
		}
	},

	isValid : function() {
		return this.maxValue != null && this.minValue != null;
	},

	// mergable : function(other) {
	// return false;
	// },

	onChange : function() {
		this.baseOnChangeTask.delay(1500);
		// OpenLayers.VIS.Symbology.Base.prototype.onChange.call(this);
	},

	sldToString : function(sld) {
		var data = sld.xml || new XMLSerializer().serializeToString(sld);
		// IE has no XMLSerializer, but xml attribute

		// TODO
		while (data.match(/xmlns:sld="http:\/\/www.opengis.net\/sld"/g).length > 1) {
			data = data.replace(/xmlns:sld="http:\/\/www.opengis.net\/sld"/, '');
		}

		return data;
	},

	/**
	 * Creates or puts/reuses style resource automatically
	 * 
	 * @param sld
	 * @param callback
	 */
	setSld : function(sld, callback) {
		if (this.sldVisualizationMap[this.id]) {
			this.putSld(sld, callback);
		} else {
			this.createSld(sld, callback);
		}
	},

	/**
	 * Create new sld resource
	 * 
	 * @param callback
	 */
	createSld : function(sld, callback) {
		this.loading = true;
		var visualizationHref = this.visualizer.dataSet.href + '/visualizations/' + this.id;

		OpenLayers.Request.POST({
			headers : {
				'Content-Type' : 'application/vnd.ogc.sld+xml'
			},
			data : this.sldToString(sld),
			url : visualizationHref + '/styles',
			success : this.handleSldResponse.createDelegate(this, [ callback, this.id ], true),
			failure : function(resp) {
				// throw new Error(resp.responseText);
				callback(new Error(resp.responseText));
			}
		});
	},

	handleSldResponse : function(resp, callback, visualizationId) {
		var sld = new OpenLayers.Format.JSON().read(resp.responseText);
		this.sldVisualizationMap[visualizationId] = sld;
		// this.sld = new OpenLayers.Format.JSON().read(resp.responseText);
		callback(sld);
	},

	/**
	 * gets current sld / creates new if required
	 * 
	 * @param callback
	 */
	// getSld : function(callback) {
	// if (this.sld != null) {
	// callback.call(this, this.sld);
	// } else {
	// this.createSld(callback);
	// }
	// },
	/**
	 * performs delete request on current sld, if any
	 */
	removeSld : function() {
		var sld = this.sldVisualizationMap[this.id];
		if (sld) {
			var styleHref = this.visualizer.dataSet.href + '/visualizations/' + this.id + '/styles/'
					+ sld.id;

			OpenLayers.Request.DELETE({
				url : styleHref, // this.sld.href,
				success : function() {
				}.createDelegate(this)
			});
			delete this.sldVisualizationMap[this.id];
		}
	},

	/**
	 * Updates sld, i.e. performs put operation on style resource with new sld
	 * 
	 * @param newSld
	 * @param callback
	 */
	putSld : function(newSld, callback) {
		var sld = this.sldVisualizationMap[this.id];
		if (sld) {
			var styleHref = this.visualizer.dataSet.href + '/visualizations/' + this.id + '/styles/'
					+ sld.id;

			OpenLayers.Request.PUT({
				url : styleHref, // this.sld.href,
				headers : {
					'Content-Type' : 'application/vnd.ogc.sld+xml'
				},
				data : this.sldToString(newSld),
				success : this.handleSldResponse.createDelegate(this, [ callback, this.id ], true),
				failure : function(resp) {
					callback(new Error(resp.responseText));
				}
			});
		} else {
			callback(new Error("No SLD created"));
		}
	}

});
