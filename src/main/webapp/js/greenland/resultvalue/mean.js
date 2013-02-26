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
 * OpenLayers.VIS.ResultValue implementation for handling Mean statistics.
 */
OpenLayers.VIS.ResultValue = OpenLayers.VIS.ResultValue || {};

OpenLayers.VIS.ResultValue.Mean = OpenLayers.Class(OpenLayers.VIS.ResultValue, {

	initialize : function(options) {
		this.title = "Mean";
		OpenLayers.VIS.ResultValue.prototype.initialize.call(this, options);
	},

	getMapValue : function(values) {
		if (values.length == 0) {
			return null;
		}
		var valueSum = 0.0;
		var valueCount = 0; // Actual number of valid values
		for ( var i = 0, lenV = values.length; i < lenV; i++) {
			if (typeof values[i] == "number") {
				valueSum += values[i][1];
				valueCount++;
			} else if (values[i].getClassName && values[i].getClassName().match(".*Distribution$")) {
				valueSum += values[i].getMean();
				valueCount++;
			} else if (values[i].length && values[i].length > 0 && typeof values[i][0] === "number") {
				// Numeric realizations
				var m = 0;
				for ( var j = 0, lenR = values[i].length; j < lenR; j++) {
					m += values[i][j];
				}
				valueSum += m / values[i].length;
				valueCount++;
			} else if (values[i] instanceof VIS.StatisticsValue) {
				// Mean statistics type
				if (values[i].statisticsType == 'Mean') {
					valueSum += values[i].getValue();
					valueCount++;
				}
			}
		}
		if (valueCount == 0) {
			return null;
		}
		return valueSum / valueCount;// Mean
	},

	createPlotPanel : function(feature, layer, options) {
		OpenLayers.Util.extend(options, {
			confidence : 95,
			showBars : false,
			showArea : true,
			time : layer.map.getTime(),
			tbar : [],
			pan : true,
			selection : false,
			connectRealizations : true
		});
		var panel = OpenLayers.VIS.ResultValue.prototype.createPlotPanel.call(this, feature, layer, options);

		var toggleGroup = 'interval' + (++Ext.Component.AUTO_ID);
		// Unique toggle group across different windows

		var barButton = new Ext.Button({
			text : 'Bars',
			enableToggle : true,
			pressed : panel.showBars,
			toggleGroup : toggleGroup,
			toggleHandler : function(b, pressed) {
				panel.showBars = pressed;
				panel.replot();
			}
		});
		var areaButton = new Ext.Button({
			text : 'Area',
			enableToggle : true,
			pressed : panel.showArea,
			toggleGroup : toggleGroup,
			toggleHandler : function(b, pressed) {
				panel.showArea = pressed;
				panel.replot();
			}
		});
		var selectionButton = new Ext.Button({
			text : 'Selection',
			enableToggle : true,
			pressed : panel.selection,
			toggleHandler : function(b, pressed) {
				panel.selection = pressed;
				panel.pan = !pressed;
				panel.replot();
			}
		});
		var connectButton = new Ext.Button({
			text : 'Connect Realizations',
			enableToggle : true,
			pressed : panel.connectRealizations,
			toggleHandler : function(b, pressed) {
				panel.connectRealizations = pressed;
				panel.replot();
			}
		});

		// var ciLabel = new Ext.form.Label({
		// text : 'Confidence Interval'
		// });

		var setConfidence; // Function to set confidence interval

		var sliderConfidence = new Ext.form.SliderField({
			value : panel.confidence,
			minValue : 1,
			maxValue : 99,
			increment : 1,
			width : 100,
			tipText : function(thumb) {
				return String.format('<b>{0} %</b>', thumb.value);
			},
			onChange : function(slider, value) {
				// workaround for not working 'change' event...
				Ext.form.SliderField.prototype.onChange.apply(this, arguments);
				setConfidence(value);
			}
		});

		var comboboxConfidence = new Ext.form.ComboBox({
			triggerAction : 'all',
			mode : 'local',
			store : new Ext.data.ArrayStore({
				id : 0,
				fields : [ 'name', 'value' ],
				data : [ [ '80%', 80 ], [ '90%', 90 ], [ '95%', 95 ], [ '99%', 99 ] ]
			}),
			valueField : 'value',
			displayField : 'name',
			value : panel.confidence,
			editable : false,
			width : 100,
			listeners : {
				select : function(comp, record) {
					setConfidence(record.data.value);
				}
			}
		});

		setConfidence = function(value) {
			if (value == panel.confidence)
				return;

			sliderConfidence.setValue(value);

			if (comboboxConfidence.getStore().find('value', value) == -1) {
				comboboxConfidence.setValue(value + ' %');
			} else {
				comboboxConfidence.setValue(value);
			}
			// ciLabel.setText(value + ' % Confidence Interval ');
			panel.confidence = value;
			panel.replot();
		};

		// add toolbar items
		panel.getTopToolbar().add([ new Ext.form.Label({
			text : 'Confidence Interval'
		}), comboboxConfidence, sliderConfidence, '-', barButton, areaButton ]);

		// add buttons specific for realizations if a feature has realizations
		for ( var i = 0; i < feature.length; i++) {
			if (feature[i].attributes.hasRealisations) {
				panel.getTopToolbar().add([ '-', selectionButton, '-', connectButton ]);
				break;
			}
		}

		var tooltip = new Ext.ToolTip({
			header : true,
			anchor : 'left',
			style : {
				'pointer-events' : 'none'
			}
		});

		panel.on('plothover', function(event, pos, item) {
			if (item && item.datapoint) {
				tooltip.setTitle(item.datapoint[1].toFixed(3) + '<br>' + new Date(item.datapoint[0]).toUTCString());
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

	createSubPlotPanel : function(clickInfo, options) {
		var minX = clickInfo[0].time[0];
		var maxTime = clickInfo[clickInfo.length - 1].time;
		var maxX = maxTime[maxTime.length - 1];
		var title = new Date(minX).toGMTString();
		if (minX != maxX) {
			title += ' - ' + new Date(maxX).toGMTString();
		}
		options = Ext.apply({
			height : 400,
			title : title
		}, options);

		if (clickInfo[0].realization) {
			return this.createSubPlotPanelRealizations(clickInfo, options);
		} else {
			return this.createSubPlotPanelDistribution(clickInfo[0], options);
		}
	},

	createSubPlotPanelDistribution : function(clickInfo, options) {
		// clickInfo consists of time array and distribution object

		options = Ext.apply({
			distributionPlot : null,
			distribution : clickInfo.distribution,
			listeners : {
				resize : function(p) {
					if (this.rendered) {
						// replot on resize
						if (this.distributionPlot == null) {
							var element = this.el.child('.x-panel-body');							
							this.distributionPlot = new DistributionPlot(element.dom.id, this.distribution);
							this.distributionPlot.setFill(true);
						} else {
							this.distributionPlot.render();
						}
					}
				}
			}
		}, options);

		return new Ext.Panel(options);
	},

	createSubPlotPanelRealizations : function(clickInfos, options) {
		options = Ext.apply({
			binCount : 10,
			tbar : []
		}, options);
		var panel = new Ext.ux.VIS.FlotPanel(options);
		var binLabel = new Ext.form.Label({
			text : panel.binCount + ' Bins'
		});
		var sliderBins = new Ext.form.SliderField({
			value : panel.binCount,
			minValue : 1,
			maxValue : 50,
			increment : 1,
			width : 100,
			tipText : function(thumb) {
				return String.format('<b>{0}</b>', thumb.value);
			},
			onChange : function(slider, value) {
				// workaround for not working 'change' event...
				Ext.form.SliderField.prototype.onChange.apply(this, arguments);
				binLabel.setText(value + ' Bins ');
				panel.binCount = value;
				panel.replot();
			}
		});

		panel.getTopToolbar().add([ binLabel, sliderBins ]);

		panel.getPlotParams = this.getHistogramPlotParamFunc.createDelegate(panel, [ clickInfos, this ]);

		var tooltip = new Ext.ToolTip({
			header : true,
			anchor : 'left',
			style : {
				'pointer-events' : 'none'
			}
		});

		panel.on('plothover', function(event, pos, item) {
			if (item && item.datapoint) {
				tooltip.setTitle(item.datapoint[1].toFixed(3) + '<br>' //
						+ item.datapoint[0].toFixed(3) + ' - ' + (item.datapoint[0] + item.series.binSize).toFixed(3));
				tooltip.showAt([ item.pageX + 10, item.pageY + 10 ]);
			} else {
				tooltip.hide();
			}
		});

		return panel;
	},

	getHistogramPlotParamFunc : function(clickInfos, visualization) {
		var minValue = Number.MAX_VALUE, maxValue = Number.MIN_VALUE;
		for ( var i = 0, count = clickInfos.length; i < count; i++) {
			minValue = Math.min(minValue, clickInfos[i].realization);
			maxValue = Math.max(maxValue, clickInfos[i].realization);
		}
		var binSize = Math.max((maxValue - minValue) / this.binCount, minValue == maxValue ? 1 : 0);
		var bins = new Array(this.binCount);
		for ( var i = 0, count = clickInfos.length; i < count; i++) {
			var binIndex = Math.min(Math.floor((clickInfos[i].realization - minValue) / binSize), this.binCount - 1);
			if (!bins[binIndex])
				bins[binIndex] = 1;
			else
				bins[binIndex]++;
		}
		var data = [];
		var ticks = [];
		for ( var i = 0; i < this.binCount; i++) {
			data.push([ minValue + i * binSize, bins[i] ]);
			ticks.push(minValue + i * binSize);
		}

		return {
			series : [ {
				data : data,
				label : "# Realizations",
				binSize : binSize
			} ],
			options : {
				grid : {
					// color : '#B6B6B6',
					hoverable : true,
					clickable : true,
					mouseActiveRadius : 25
				},
				bars : {
					show : true,
					align : 'left',
					barWidth : binSize,
					fill : 0.9
				},
				xaxis : {
					autoscaleMargin : 0.1,
					ticks : ticks,
					tickDecimals : 2
				},
				zoom : {
					interactive : true
				},
				pan : {
					interactive : true
				}
			}
		};
	},

	getPlotParamFunc : function(features, visualization) {
		var series = [];
		var min = Number.POSITIVE_INFINITY, max = Number.NEGATIVE_INFINITY;
		var p = (100 - (100 - this.confidence) / 2) / 100;

		// Get data
		for ( var f = 0; f < features.length; f++) {

			var v = features[f].getValues();
			var u = [], l = [], m = [];

			var clickInfos = [];

			// array of data points for each sequence of realizations
			var realisationSeq = [];
			var realisationClickInfoSeq = [];

			for ( var i = 0, len = v.length; i < len; i++) {
				var time = v[i][0], value = v[i][1];

				if (value.length) { // realisation
					for ( var j = 0; j < value.length; j++) {
						if (!realisationSeq[j]) {
							// init array
							realisationSeq[j] = [];
							realisationClickInfoSeq[j] = [];
						}
						for ( var k = 0; k < time.length; k++) {
							realisationSeq[j].push([ time[k], value[j] ]);
							realisationClickInfoSeq[j].push({
								time : time,
								realization : value[j]
							});
							if (min > value[j])
								min = value[j];
							if (max < value[j])
								max = value[j];
						}
					}
				} else {
					var clickInfo = null;
					if (typeof value === 'number') {
						value = [ null, value, null ];
					} else if (value.getClassName && value.getClassName().match('.*Distribution$')) {
						var distribution = value;
						var cI = distribution.getConfidenceInterval(p);
						value = [ cI[1], distribution.getMean(), cI[0] ];
						clickInfo = {
							time : time,
							distribution : distribution
						};
					} else if (value instanceof VIS.StatisticsValue && value.statisticsType == 'Mean') {
						// Mean statistics
						value = [ null, value.getValue(), null ];
					} else {
						continue;
						// throw "Unknown Value Type: " + value;
					}
					// min/max with lower/upper border
					if (min > value[0])
						min = value[0];
					if (max < value[2])
						max = value[2];

					// min/max with mean (if no lower/upper border)
					if (min > value[1])
						min = value1[1];
					if (max < value[1])
						max = value[1];

					for ( var j = 0; j < time.length; j++) {
						l.push([ time[j], value[0] ]);
						m.push([ time[j], value[1] ]);
						u.push([ time[j], value[2] ]);
						clickInfos.push(clickInfo);
					}
				}
			}

			// Get plot

			if (this.showArea) {
				/* reverse lower to get background color... */
				var pL = [].concat(l);

				if (pL.length > 0) {
					pL.sort(function(a, b) {
						return (a[0] > b[0]) ? -1 : ((a[0] < b[0]) ? 1 : 0);
					});
					pL.push(u[0]);
				}
				// put in the background
				series.unshift({
					color : '#FF0000',
					lines : {
						fill : true
					},
					data : u.concat(pL)
				});
			}

			// Mean
			if (m.length > 0) {
				series.push({
					color : (features.length > 1) ? null : '#4F4F4F',
					points : {
						show : true
					},
					data : m,
					lower : l,
					upper : u,
					clickInfos : clickInfos,
					label : features[f].getFoiId()
				});
			}

			// Realizations
			if (realisationSeq.length > 0) {
				// Concatenate all realization data sequences
				var realisationData = [];
				var realisationClickInfo = [];
				for ( var i = 0; i < realisationSeq.length; i++) {
					if (i != 0) {
						// insert null to separate lines
						realisationData.push(null);
						realisationClickInfo.push(null);
					}
					realisationData = realisationData.concat(realisationSeq[i]);
					realisationClickInfo = realisationClickInfo.concat(realisationClickInfoSeq[i]);
				}

				series.push({
					color : (features.length > 1) ? null : '#4F4F4F',
					data : realisationData,
					points : {
						show : true
					},
					lines : {
						show : this.connectRealizations === true
					},
					clickInfos : realisationClickInfo,
					label : features[f].getFoiId()
				});
			}
		}

		// Options
		var d = max - min;
		min -= d * 0.1;
		max += d * 0.1;
		var options = visualization.createDefaultOptions(min, max); // .createDelegate(visualization)

		if (this.pan) {
			options.pan = {
				interactive : true
			};
		}
		if (this.selection) {
			options.selection = {
				mode : "x"
			};
		}

		// if (features.length > 1) {
		// options.legend = options.legend || {};
		// options.legend.labelFormatter = function(label, series) {
		// return label + ' <input type="checkbox"/>';
		// };
		// // TODO enable/disable series
		// }

		options.hooks = {
			draw : [ // this.verticalTimeLineHook.createDelegate(this),
			visualization.colorPointHook.createDelegate(visualization) ]
		};
		if (this.showBars) {
			options.hooks.draw.unshift(visualization.errorBarHook.createDelegate(visualization));
		}
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
	},

	createDefaultOptions : function(min, max) {
		if (isNaN(min))
			min = this.min;
		if (isNaN(max))
			max = this.max;

		var options = {
			xaxis : {
				// color : '#B6B6B6',
				mode : 'time',
				timeformat : '%y/%m/%d %H:%M:%S',
				axisLabel : 'Time',
				axisLabelUseCanvas : true,
				axisLabelFontSizePixels : this.fontSize,
				axisLabelFontFamily : this.fontFamily,
				autoscaleMargin : 0.05
			},
			yaxis : {
				// color : '#B6B6B6',
				min : min,
				max : max,
				axisLabel : this.axisLabel,
				axisLabelUseCanvas : true,
				axisLabelFontSizePixels : this.fontSize,
				axisLabelFontFamily : this.fontFamily
			},
			grid : {
				// color : '#B6B6B6',
				hoverable : true,
				clickable : true,
				mouseActiveRadius : 25
			},
			lines : {
				show : true
			},
			zoom : {
				interactive : true
			}
		};
		return options;
	},

	colorPointHook : function(plot, ctx) {
		var maxX = plot.getPlotOffset().left + plot.getAxes().xaxis.p2c(plot.getAxes().xaxis.max);
		var minX = plot.getPlotOffset().left + plot.getAxes().xaxis.p2c(plot.getAxes().xaxis.min);

		for ( var i = 0; i < plot.getData().length; i++) {
			if (plot.getData()[i].points.show) {
				var data = plot.getData()[i].data;
				for ( var j = 0; j < data.length; j++) {
					if (!data[j])
						continue;
					if (data[j][1] >= plot.getAxes().yaxis.min && data[j][1] <= plot.getAxes().yaxis.max) {
						var x = plot.getPlotOffset().left + plot.getAxes().xaxis.p2c(data[j][0]);
						if (x > maxX || x < minX)
							continue;

						var y = plot.getPlotOffset().top + plot.getAxes().yaxis.p2c(data[j][1]);
						ctx.lineWidth = 0;
						ctx.beginPath();
						ctx.arc(x, y, 3, 0, Math.PI * 2, true);
						ctx.closePath();
						ctx.fillStyle = this.getStyleParam('fillColor', data[j][1]);
						ctx.fill();
					}
				}
			}
		}
	},

	errorBarHook : function(plot, ctx) {
		var data = plot.getData();
		var b = 4;
		ctx.strokeStyle = '#F00';
		ctx.lineWidth = 2;
		var maxY = plot.getPlotOffset().top + plot.getAxes().yaxis.p2c(plot.getAxes().yaxis.max);
		var minY = plot.getPlotOffset().top + plot.getAxes().yaxis.p2c(plot.getAxes().yaxis.min);
		var maxX = plot.getPlotOffset().left + plot.getAxes().xaxis.p2c(plot.getAxes().xaxis.max);
		var minX = plot.getPlotOffset().left + plot.getAxes().xaxis.p2c(plot.getAxes().xaxis.min);

		for ( var i = 0, lenD = data.length; i < lenD; i++) {
			var row = data[i];
			if (!row.lower || !row.upper)
				continue;

			for ( var j = 0, lenR = row.lower.length; j < lenR; j++) {
				var x = plot.getPlotOffset().left + plot.getAxes().xaxis.p2c(row.lower[j][0]);
				if (x > maxX || x < minX)
					continue;

				var yu = plot.getPlotOffset().top + plot.getAxes().yaxis.p2c(row.upper[j][1]);
				var yl = plot.getPlotOffset().top + plot.getAxes().yaxis.p2c(row.lower[j][1]);
				ctx.beginPath();
				if (yl < minY && yl > maxY) {
					ctx.moveTo(x - b, yl);
					ctx.lineTo(x + b, yl);
				}

				ctx.moveTo(x, Math.max(Math.min(yl, minY), maxY));
				ctx.lineTo(x, Math.max(Math.min(yu, minY), maxY));

				if (yu < minY && yu > maxY) {
					ctx.moveTo(x - b, yu);
					ctx.lineTo(x + b, yu);
				}
				ctx.closePath();
				ctx.stroke();
			}
		}

	}

});