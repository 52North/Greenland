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
OpenLayers.Layer.VIS = OpenLayers.Layer.VIS || {};
/**
 * Layer for uncertainty collections. Allows to style features using a
 * customizable styling framework based on observation results. The results are
 * computed from raw data using a specific OpenLayers.VIS.ResultValue
 * implementation.
 */
OpenLayers.Layer.VIS.Vector = OpenLayers.Class(OpenLayers.Layer.Vector, {
	CLASS_NAME : "OpenLayers.Layer.VIS.Vector",
	visualization : null,
	resultValue : null,
	time : null,
	observedProperties : null,
	procedures : null,
	parameterOptions : null, // customizable options for this layer

	// procedure handling
	maskedProceduresMap : null, // Stores masked features
	maskedProcedures : null, // config property for initially masked procedures

	initialize : function(name, options) {
		this.observedProperties = [];
		this.procedures = [];
		this.parameterOptions = {};

		this.maskedProceduresMap = {};
		this.maskedProcedures = [];

		this.time = {
			min : Number.POSITIVE_INFINITY,
			max : Number.NEGATIVE_INFINITY,
			current : null
		};
		this.visualization = options.visualization;

		// Set StyleMap of this layer, gets default style from visualization object
		options.styleMap = new OpenLayers.StyleMap({
			'default' : this.visualization.getStyle(),
			'select' : {
				strokeColor : 'gray',
				strokeWidth : 5
			}
		});

		OpenLayers.Layer.Vector.prototype.initialize.call(this, name, options);

		// 'selectmany' option for selecting procedures to show
		// TODO sync with maskedProcedures config option
		this.parameterOptions.procedures = {
			type : 'selectmany',
			items : this.procedures,
			value : this.procedures.slice(0), // initially select all procedures
			description : 'Procedures',
			required : true,
			action : function(value) {
				this.setProcedures(value);
			},
			scope : this,
			store : false
		// do not include in permalink
		};

		this.visualization.setLayer(this);
		this.resultValue.setLayer(this);
		this.visualization.events.register('change', this, function(evt) {
			if (evt.property == 'valueExtent') {
				this.updateVisualization();
			} else if (evt.property == 'symbology') {
				this.redraw();
			}
		});
		this.events.register('beforefeatureadded', this, this.handleBeforeFeatureAdded); // TODO
		// unregister?
	},

	getTitle : function() {
		var obsProps = [];
		for ( var i = 0; i < this.observedProperties.length; i++) {
			obsProps.push(VIS.getHumanReadableObservedProperty(this.observedProperties[i]));
		}
		var title = obsProps.join(", ");
		if (this.title)
			title += ' - ' + this.title;
		if (this.visualization.getTitle())
			title += ' - ' + this.visualization.getTitle();
		if (this.resultValue.getTitle())
			title += ' - ' + this.resultValue.getTitle();
		return title;
	},

	/**
	 * Gets customizable options for the whole layer (layer, visualization and
	 * resultValue).
	 * 
	 * @returns
	 */
	getParameterOptions : function() {
		var options = OpenLayers.Util.extend({}, this.resultValue.options || {});
		OpenLayers.Util.extend(options, this.visualization.options || {});
		OpenLayers.Util.extend(options, this.parameterOptions || {});
		return options;
	},

	destroy : function() {
		OpenLayers.Layer.Vector.prototype.destroy.call(this);
		this.visualization.removeLayer();
	},

	handleChangeTime : function(evt) {
		this.setTime(evt.time);
	},

	/**
	 * Sets the current time for this layer, updates all features and redraws
	 * itself.
	 * 
	 * @param value
	 */
	setTime : function(value) {
		this.time.current = value;
		for ( var i = 0, len = this.features.length; i < len; i++) {
			this.features[i].setTime(value);
			// TODO feature does not support Date type
		}
		this.redraw();
	},

	// setThreshold : function(thresh) {
	// for ( var i = 0, len = this.features.length; i < len; i++) {
	// this.features[i].setThreshold(thresh);
	// }
	// },

	/**
	 * Forces this layer to update itself by (re)applying settings set for each
	 * feature
	 */
	updateVisualization : function() {
		for ( var i = 0, len = this.features.length; i < len; i++) {
			this.features[i].update();
		}
		this.redraw();
	},

	setMap : function(map) {
		OpenLayers.Layer.Vector.prototype.setMap.apply(this, arguments);

		// register map events
		this.map.events.register('changetime', this, this.handleChangeTime);
	},

	removeMap : function(map) {
		// unregister map events
		this.map.events.unregister('changetime', this, this.handleChangeTime);

		OpenLayers.Layer.Vector.prototype.removeMap.apply(this, arguments);
	},

	onFeatureInsert : function(feature) {
		// Update observed property
		if (this.observedProperties.indexOf(feature.attributes.observedProperty) == -1)
			this.observedProperties.push(feature.attributes.observedProperty);

		// Update procedures
		if (this.procedures.indexOf(feature.attributes.procedure) == -1)
			this.procedures.push(feature.attributes.procedure);
		// TODO Hashing

		// Update Time
		var timeExtent = feature.getTimeExtent();

		if (timeExtent[0] < this.time.min) {
			this.time.min = timeExtent[0];
		}
		if (timeExtent[1] > this.time.max) {
			this.time.max = timeExtent[1];
		}

		// TODO
		/*
		 * if (this.meta.probabilityConstraint) { this.meta.proposedTitle =
		 * this.meta.probabilityConstraint; } else { this.meta.proposedTitle =
		 * 'Request@' + new Date().toGMTString(); }
		 */

		// Set currently selected time for each new feature
		feature.setTime(this.time.current);
	},

	addFeatures : function(features, options) {
		OpenLayers.Layer.Vector.prototype.addFeatures.apply(this, arguments);

		// Assume that adding features usually changes time extent
		this.map.events.triggerEvent('changelayer', {
			layer : this,
			property : 'time'
		});
		this.events.triggerEvent('changetitle', {
			layer : this
		});
		this.redraw();
	},

	/**
	 * Returns current time extents of this layers features
	 * 
	 * @returns {Array}
	 */
	getTimeExtents : function() {
		var extents = [];
		for ( var i = 0, lenF = this.features.length; i < lenF; i++) {
			var values = this.features[i].getValues();
			for ( var j = 0, lenV = values.length; j < lenV; j++) {
				var t = values[j][0];
				if (t.length == 1) {
					t = [ t[0], t[0] ];
				}
				extents.push(t);
			}
		}
		// TODO Duplicates
		return extents;
	},

	/**
	 * Hides features which are assigned to any of the specified procedures and
	 * caches them for later unmasking.
	 * 
	 * @param procedures
	 */
	maskProcedures : function(procedures) {
		for ( var i = 0; i < procedures.length; i++) {
			if (this.maskedProceduresMap[procedures[i]]) {
				// Procedure already masked, do not consider
				procedures.splice(i, 1);
				i--;
			} else {
				// add cache array for masked features with this procedure
				this.maskedProceduresMap[procedures[i]] = [];
			}
		}

		var featuresToRemove = [];
		for ( var i = 0, len = this.features.length; i < len; i++) {
			var feature = this.features[i];
			if (procedures.indexOf(feature.attributes.procedure) != -1) {
				// feature has to get removed
				featuresToRemove.push(feature);
				// cache feature
				this.maskedProceduresMap[feature.attributes.procedure].push(feature);
			}
		}

		// remove features
		if (featuresToRemove.length > 0)
			this.removeFeatures(featuresToRemove);
	},

	/**
	 * Shows features assigned to the specified and previously masked procedures.
	 * 
	 * @param procedures
	 */
	unmaskProcedures : function(procedures) {
		var featuresToAdd = [];

		for ( var i = 0; i < procedures.length; i++) {
			if (this.maskedProceduresMap[procedures[i]]) {
				// use cached features
				featuresToAdd = featuresToAdd.concat(this.maskedProceduresMap[procedures[i]]);
				delete this.maskedProceduresMap[procedures[i]];
			}
		}
		// add features
		if (featuresToAdd.length > 0)
			this.addFeatures(featuresToAdd);
	},

	/**
	 * Explicitly sets the procedures to hide, this includes unmasking of all
	 * other procedures available in the layer.
	 * 
	 * @param procedures
	 */
	setMaskedProcedures : function(procedures) {
		var masked = [];
		var unmasked = [];
		for ( var i = 0; i < this.procedures.length; i++) {
			var proc = this.procedures[i];
			if (procedures.indexOf(proc) != -1)
				masked.push(proc);
			else
				unmasked.push(proc);
		}

		this.maskProcedures(masked);
		this.unmaskProcedures(unmasked);
	},

	/**
	 * Explicitly sets the procedures to show, this includes hiding all others.
	 * 
	 * @param procedures
	 */
	setProcedures : function(procedures) {
		var masked = [];
		var unmasked = [];
		for ( var i = 0; i < this.procedures.length; i++) {
			var proc = this.procedures[i];
			if (procedures.indexOf(proc) != -1)
				unmasked.push(proc);
			else
				masked.push(proc);
		}

		this.maskProcedures(masked);
		this.unmaskProcedures(unmasked);
	},

	handleBeforeFeatureAdded : function(evt) {
		// Determine before adding a feature to this layer if it should be hidden
		// because of its procedure attribute
		var proc = evt.feature.attributes.procedure;
		if (this.maskedProceduresMap[proc]) {
			// Procedure should be masked -> do not add feature but cache it
			this.maskedProceduresMap[proc].push(evt.feature);

			return false; // Do no add
		}

		return true;
	},

	restore : function(parcel) {
		this.visualization.restore(parcel);
		this.resultValue.restore(parcel);
		for ( var key in this.parameterOptions) {
			parcel.readParameter(this.parameterOptions[key]);
		}
		this.updateVisualization();
	},

	store : function(parcel) {
		this.visualization.store(parcel);
		this.resultValue.store(parcel);
		for ( var key in this.parameterOptions) {
			parcel.writeParameter(this.parameterOptions[key]);
		}
	}
});

OpenLayers.Layer.VIS.Strategy = OpenLayers.Layer.VIS.Strategy || {};
/**
 * Extension of OpenLayers.Strategy.Fixed strategy for loading observation
 * collection vector layers which projects every single resulting feature to the
 * desired projection. Every feature may be described using its own projection.
 */
OpenLayers.Layer.VIS.Strategy.FeatureProjection = OpenLayers.Class(OpenLayers.Strategy.Fixed, {
	CLASS_NAME : "OpenLayers.Layer.VIS.Strategy.FeatureProjection",

	merge : function(mapProjection, resp) {
		var layer = this.layer;
		layer.destroyFeatures();
		var features = resp.features;
		if (features && features.length > 0) {

			var geom;
			for ( var i = 0, len = features.length; i < len; ++i) {
				if (features[i].srid != mapProjection) {
					geom = features[i].geometry;
					if (geom) {
						// TODO check whether proj4 already processed projection information
						// (unknown ones are requested from a remote server automatically).
						// Possibly show an error
						geom.transform(features[i].srid, mapProjection);
					}
				}
			}

			layer.addFeatures(features);
		}
		layer.events.triggerEvent("loadend");
	}

});
