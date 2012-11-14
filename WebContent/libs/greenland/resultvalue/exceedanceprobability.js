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

OpenLayers.VIS.ResultValue.ExceedanceProbability = OpenLayers.Class(OpenLayers.VIS.ResultValue, {
	title : null,
	options : null, // this.options used by createLegendItemForLayer

	initialize : function(options) {
		this.title = "Exceedance Probability";
		this.options = {
			threshold : {
				value : 0,
				type : 'number',
				description : 'Threshold for Exceedance Probability'
			}
		};
		OpenLayers.VIS.ResultValue.prototype.initialize.call(this, options);
	},

	getMapValue : function(values) {
		if (values.length == 0) {
			return null;
		}
		var mapValue = 0.0;
		for ( var i = 0, lenV = values.length; i < lenV; i++) {
			mapValue += this.calculateExceedanceProbability(this.options.threshold.value, values[i]);
		}
		return mapValue / values.length;
	},

	calculateExceedanceProbability : function(t, val) {
		var result;
		if (typeof (val) === "number") {
			result = (val < t) ? 0 : 100;
		} else if (val.getClassName && val.getClassName().match(".*Distribution$")) {
			// result = val.getExceedanceProbability(t) * 100; // Apparently not
			// implemented
			result = (1 - val.cumulativeDensity(t)) * 100;
		} else if (val.length) {
			var u = 0;
			for ( var i = 0; i < val.length; i++) {
				if (val[i] > t) {
					u++;
				}
			}
			return 100 * (u / val.length);
		} else {
			throw "Unsupported value type: " + val;
		}
		return result;
	},

	createPlotPanel : function(feature, layer, options) {
		var panel = OpenLayers.VIS.ResultValue.prototype.createPlotPanel.call(this, feature, layer,
				options);

		var tooltip = new Ext.ToolTip({
			header : true,
			anchor : 'left',
			time : layer.map.getTime(),
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

		var series = [];

		// Get plot
		for ( var f = 0; f < features.length; f++) {
			var values = features[f].getValues();
			var data = [];
			// var t = this.ctrl.getThreshold();
			for ( var i = 0, len = values.length; i < len; i++) {
				var ep = visualization.calculateExceedanceProbability(
						visualization.options.threshold.value, values[i][1]);
				for ( var j = 0; j < values[i][0].length; j++) {
					data.push([ values[i][0][j], ep ]);
				}
			}
			series.push({
				data : data,
				color : '#4F4F4F',
				points : {
					show : true
				}
			});
		}

		var options = OpenLayers.VIS.ResultValue.Mean.prototype.createDefaultOptions(0, 100);

		options.pan = {
			interactive : true
		};
		options.hooks = {
			draw : [ OpenLayers.VIS.ResultValue.Mean.prototype.colorPointHook
					.createDelegate(visualization) ]
		// , this.verticalTimeLineHook.createDelegate(this) ]
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