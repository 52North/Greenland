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
 * Layer for VISS. Acts as usual OpenLayers.Layer.WMS, but needs a
 * OpenLayers.VIS.Visualization object for initialization
 */
OpenLayers.Layer.VIS.Raster = OpenLayers.Class(OpenLayers.Layer.WMS, {
	CLASS_NAME : "OpenLayers.Layer.VIS.Raster",
	visualization : null,
	resultValue : {},
	timeExtents : null,
	time : null,
	updateTask : null, // to delay update requests
	pauseRedraw : null, // cancels redraw calls if true

	initialize : function(name, visualization, options) {
		// initialize update task
		this.updateTask = new Ext.util.DelayedTask(this.updateVisualization, this);

		this.time = {
			min : Number.POSITIVE_INFINITY,
			max : Number.NEGATIVE_INFINITY,
			current : null
		};
		// visualization initialization
		this.visualization = visualization;
		this.visualization.setLayer(this);

		if (!this.visualization.reference) {
			// if visualization has no WMS reference information -> initialize layer
			// with dummy data and cancel draw operations until WMS reference is
			// received

			this.pauseRedraw = true;
			OpenLayers.Layer.WMS.prototype.initialize.call(this, name, null, {
				transparent : true,
				tiled : true
			}, options);
			if (!this.visualization.options.time) {
				// request visualization to receive WMS reference
				this.updateVisualization();
			}
		} else {
			// WMS reference already set, directly initialize Layer with current
			// information
			this.pauseRedraw = false;
			OpenLayers.Layer.WMS.prototype.initialize.call(this, name, this.visualization.reference.url,
					{
						layers : this.visualization.reference.layers, // join?
						transparent : true,
						tiled : true,
						imageCacheWorkaround : Math.random()
					}, options);

			// set style
			this.updateSld(function(info) {
				if (info instanceof Error) {
					showServerError(info, 'Error setting SLD');
					return;
				}
				this.redraw();
			}.createDelegate(this));
		}

		// register listeners for changes of visualization options
		this.visualization.events.register('change', this, function(evt) {
			if (evt.property == 'valueExtent' || evt.property == 'symbology') {
				if (!(evt.sender && evt.sender == this.visualization)) {
					this.updateTask.delay(1000);
				}
			}
		});

		// this.visualization.visualizer.dataSet.getTimeExtents(function(extents) {
		// timeExtents = extents;
		// this.map.events.triggerEvent('changelayer', {
		// layer : this,
		// property : 'time'
		// });
		// });
	},

	getParameterOptions : function() {
		var options = OpenLayers.Util.extend({}, this.resultValue.options || {});
		OpenLayers.Util.extend(options, this.visualization.options || {});
		// OpenLayers.Util.extend(options, this.parameterOptions || {});

		return options;
	},

	getTitle : function() {
		var title = this.title || '';
		if (this.visualization.getTitle())
			title += ' - ' + this.visualization.getTitle();
		return title;
	},

	setMap : function(map) {
		OpenLayers.Layer.WMS.prototype.setMap.apply(this, arguments);
		this.map.events.register('changetime', this, this.handleChangeTime);

		// request time extent and report back to map
		this.visualization.visualizer.dataSet.getTimeExtents(function(extents) {
			this.timeExtents = extents;
			this.time.min = Number.POSITIVE_INFINITY;
			this.time.max = Number.NEGATIVE_INFINITY;
			if (extents.length > 0) {
				this.time.min = extents[0][0];
				this.time.max = extents[extents.length - 1][1];
			}
			this.handleChangeTime({
				time : this.map.time.current
			});
			this.map.events.triggerEvent('changelayer', {
				layer : this,
				property : 'time'
			});
		}.createDelegate(this));
	},

	removeMap : function(map) {
		this.map.events.unregister('changetime', this, this.handleChangeTime);
		OpenLayers.Layer.WMS.prototype.removeMap.apply(this, arguments);
	},

	handleChangeTime : function(evt) {
		if (this.visualization.options.time && this.timeExtents) {

			var newTime = null;
			if (evt.time != null) {
				var time = evt.time.getTime();
				for ( var i = 0; i < this.timeExtents.length; i++) {
					var extent = this.timeExtents[i];
					if (time == extent[0] || (time >= extent[0] && time < extent[1])) {
						newTime = extent[0];
						break;
					}
				}
			}
			if (newTime != null) {
				if (this.time.current != newTime) {
					this.time.current = newTime;

					this.visualization.options.time.value = new Date(newTime);
					// this.updateVisualization();
					this.updateTask.delay(1000);
				} else {
					this.updateTask.cancel();
				}
			} else {
				this.time.current = null;
				this.pauseRedraw = true;
				this.display(false);
				// this.setVisibility(false);
				this.updateTask.cancel();
			}

		}
	},

	getTimeExtents : function() {
		return this.timeExtents;
	},

	/**
	 * Forces layer to apply current visualization and style settings to the
	 * backing VISS resources and redraws itself
	 */
	updateVisualization : function() {
		var visualizationUpdated = function(info) {

			if (info instanceof Error) {
				showServerError(info, 'Error updating visualization');
				this.events.triggerEvent('loadend');
				return;
			}

			this.updateSld(function(info) {
				if (info instanceof Error) {
					showServerError(info, 'Error setting SLD');
					return;
				}

				this.setUrl(this.visualization.reference.url);
				this.mergeNewParams(OpenLayers.Util.extend({
					layers : this.visualization.reference.layers,
					// "Image Cache Workaround"
					imageCacheWorkaround : Math.random(),
					styles : info.id
				}, info || {}));
				// this.setVisibility(true);
				this.pauseRedraw = false;
				this.events.triggerEvent('loadend');
				this.events.triggerEvent('changetitle', {
					layer : this
				});
				this.redraw();
			}.createDelegate(this));
		};
		this.pauseRedraw = true;
		this.events.triggerEvent('loadstart');
		this.visualization.createVisualization(visualizationUpdated.createDelegate(this));
	},

	/**
	 * Forces layer to apply current style settings to VISS resources.
	 * Automatically creates new style and reuses already created styles
	 * 
	 * @param callback
	 */
	updateSld : function(callback) {
		this.visualization.setSld(this.visualization.styler.fillColor.getSld(), callback);
	},

	destroy : function() {
		// Remove VISS resources
		if (this.visualization && this.visualization.visualizer) {
			OpenLayers.Request.DELETE({
				url : this.visualization.visualizer.resource.resourceUrl,
				callback : function() {
				}
			});
		}
		if (this.visualization) {
			this.visualization.removeSld();
		}
		this.visualization.removeLayer();
		OpenLayers.Layer.WMS.prototype.destroy.call(this);
	},

	/**
	 * Override to prevent layer from getting drawn when pauseRedraw is true while
	 * actually being 'visible'
	 * 
	 * @returns
	 */
	calculateInRange : function() {
		if (this.pauseRedraw === true) {
			return false;
		} else {
			return OpenLayers.Layer.WMS.prototype.calculateInRange.call(this);
		}
	},

});