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
OpenLayers.VIS.ResultValue = OpenLayers.VIS.ResultValue || {};

OpenLayers.VIS.ResultValue.ModeProbability = OpenLayers.Class(OpenLayers.VIS.ResultValue, {

	title : null,

	initialize : function(options) {
		this.title = "Mode Probability";
		OpenLayers.VIS.ResultValue.prototype.initialize.call(this, options);
	},

	getMapValue : function(values) {
		var mode = OpenLayers.VIS.ResultValue.Mode.prototype.getMapValue(values);

		var prob = 0;
		for ( var i = 0, lenV = values.length; i < lenV; i++) {
			if (values[i].length && values[i].length > 0 && typeof values[i][0] === "string") {
				// Categorical realisations

				// Get frequencies
				var categoryFreqMap = {};
				var value = values[i];
				for ( var j = 0, lenR = value.length; j < lenR; j++) {
					if (!categoryFreqMap[value[j]]) {
						categoryFreqMap[value[j]] = 1;
					} else {
						categoryFreqMap[value[j]]++;
					}
				}
				if (categoryFreqMap[mode] != null) {
					prob += categoryFreqMap[mode] / value.length;
				}
			}
		}
		return (prob / values.length) * 100;
	},

	createPlotPanel : function(feature, layer, options) {
		OpenLayers.Util.extend(options, {
			time : layer.map.getTime()
		});
		var panel = OpenLayers.VIS.ResultValue.prototype.createPlotPanel.call(this, feature, layer,
				options);

		var tooltip = new Ext.ToolTip({
			header : true,
			anchor : 'left',
			style : {
				'pointer-events' : 'none'
			}
		});
		panel.on('plothover', function(event, pos, item) {
			if (item && item.datapoint) {
				tooltip.setTitle(item.datapoint[1].toFixed(3) + ' %<br>'
						+ new Date(item.datapoint[0]).toUTCString());
				tooltip.showAt([ item.pageX + 10, item.pageY + 10 ]);
			} else {
				tooltip.hide();
			}
		});

		var mapTimeChange = function(evt) {
			panel.time = evt.time;
			panel.replot();
		};
		layer.map.events.register('changetime', null, mapTimeChange);
		this.layer.visualization.events.register('change', panel, panel.replot);

		panel.on('destroy', function() {
			layer.map.events.unregister('changetime', null, mapTimeChange);
			this.layer.visualization.events.unregister('change', panel, panel.replot);
		}, this);

		return panel;
	},

	getPlotParamFunc : function(features, visualization) {
		// Get data
		var series = [];

		for ( var f = 0; f < features.length; f++) {
			var v = features[f].getValues();
			var data = [];

			for ( var i = 0, len = v.length; i < len; i++) {
				var time = v[i][0], value = v[i][1];
				for ( var j = 0; j < time.length; j++) {
					data.push([ time[j], visualization.getMapValue([ value ]) ]);
				}
			}

			// Get plot
			series.push({
				color : '#4F4F4F',
				points : {
					show : true
				},
				data : data
			});
		}

		var options = OpenLayers.VIS.ResultValue.Mean.prototype.createDefaultOptions
				.call(this, 0, 100);

		options.pan = {
			interactive : true
		};
		options.hooks = {
			draw : [ // this.verticalTimeLineHook.createDelegate(this),
			OpenLayers.VIS.ResultValue.Mean.prototype.colorPointHook.createDelegate(visualization) ]
		};

		if (this.time) {
			options.grid.markings = [ {
				color : '#000',
				lineWidth : 1,
				xaxis : {
					from : this.time,
					to : this.time
				}
			} ];
		}

		return {
			series : series,
			options : options
		};
	}
});