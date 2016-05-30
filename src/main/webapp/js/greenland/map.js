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
/**
 * A custom map extension to support time. Provides events to track currently
 * visualized time and time extents of contained layers.
 */
OpenLayers.VIS.Map = OpenLayers.Class(OpenLayers.Map, {
	CLASS_NAME : 'OpenLayers.VIS.Map',

	// EVENT_TYPES : [ 'changetimelimits', 'changetime' ],

	time : null, // current time

	initialize : function(options) {
		this.time = {
			min : Number.POSITIVE_INFINITY,
			max : Number.NEGATIVE_INFINITY,
			current : null
		};

		OpenLayers.Map.prototype.initialize.call(this, options);
		this.events.addEventType('changetime');
		this.events.addEventType('changetimelimits');

		// Update temporal extent information if layers get added/removed/changed
		this.events.register('addlayer', this, this.handleChangeLayer);
		this.events.register('removelayer', this, this.handleChangeLayer);
		this.events.register('changelayer', this, this.handleChangeLayer);
	},

	/**
	 * Event handler for changelayer events
	 * 
	 * @param evt
	 */
	handleChangeLayer : function(evt) {
		// recomputes the time limits set by all time-enabled layers if layer
		// visibility or time attributes changed
		if (!evt.property || (evt.property == 'time' || evt.property == 'visibility')) {
			if (evt.layer.time) {
				this.updateTimeLimits();
			}
		}
	},

	/**
	 * Computes the time limits of all time-enabled layers
	 */
	updateTimeLimits : function() {
		var oldMin = this.time.min;
		var oldMax = this.time.max;
		this.time.min = Number.POSITIVE_INFINITY;
		this.time.max = Number.NEGATIVE_INFINITY;
		for ( var i = 0, len = this.layers.length; i < len; i++) {
			var layer = this.layers[i];
			if (layer.time && layer.getVisibility()) {
				if (this.time.min > layer.time.min) {
					this.time.min = layer.time.min;
				}
				if (this.time.max < layer.time.max) {
					this.time.max = layer.time.max;
				}
			}
		}
		if (oldMin != this.time.min || oldMax != this.time.max) {
			this.events.triggerEvent('changetimelimits', {
				min : this.time.min,
				max : this.time.max
			});
		}
	},

	/**
	 * Sets the time to represent with this map
	 * 
	 * @param time
	 */
	setTime : function(time) {
		if (this.time.current != time) {
			this.time.current = time;
			this.events.triggerEvent('changetime', {
				time : time
			});
		}
	},

	getTime : function() {
		return this.time.current;
	},

	/**
	 * Returns all time extents from the underlying layers
	 * 
	 * @returns {Array} All single time extents of the layers as arrays containing
	 *          first and last time instance of an interval
	 */
	getTimeExtents : function() {
		var extents = [];
		for ( var i = 0, len = this.layers.length; i < len; i++) {
			var layer = this.layers[i];
			if (layer.getTimeExtents && layer.getVisibility()) {
				extents = extents.concat(layer.getTimeExtents());
			}
		}

		return extents;
	}

});