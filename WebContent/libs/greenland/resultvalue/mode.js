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

OpenLayers.VIS.ResultValue.Mode = OpenLayers.Class(OpenLayers.VIS.ResultValue,
		{
			title : null,

			initialize : function(options) {
				this.title = "Mode";
				OpenLayers.VIS.ResultValue.prototype.initialize.call(this, options);
			},

			getFrequencyMap : function(realisations, freqMap) {
				var categoryFreqMap = freqMap || {};
				for ( var j = 0, lenR = realisations.length; j < lenR; j++) {
					if (!categoryFreqMap[realisations[j]]) {
						categoryFreqMap[realisations[j]] = 1;
					} else {
						categoryFreqMap[realisations[j]]++;
					}
				}
				return categoryFreqMap;
			},

			getMapValue : function(values) {
				if (values.length == 0) {
					return null;
				}

				var mapValue = [];
				for ( var i = 0, lenV = values.length; i < lenV; i++) {
					if (values[i].length && values[i].length > 0 && typeof values[i][0] === "string") {
						// Categorical realisations

						// Get max frequency
						var categoryFreqMap = this.getFrequencyMap(values[i]);

						var maxCat = [ 0, null ];
						for ( var key in categoryFreqMap) {
							if (categoryFreqMap[key] > maxCat[0]) {
								maxCat[0] = categoryFreqMap[key];
								maxCat[1] = key;
							}
						}

						maxCat[0] /= values[i].length;
						mapValue.push(maxCat);
					}
				}
				var maxCat = [ 0, null ]; // Mode
				for ( var i = 0, len = mapValue.length; i < len; i++) {
					if (mapValue[i][0] > maxCat[0]) {
						maxCat = mapValue[i];
					}
				}
				return maxCat[1];

			},

			createPlotPanel : function(feature, layer, options) {
				OpenLayers.Util.extend(options, {
					tbar : [],
					orderBy : 'freq',
					showLegend : true
				});
				var panel = OpenLayers.VIS.ResultValue.prototype.createPlotPanel.call(this, feature,
						layer, options);

				var tooltip = new Ext.ToolTip({
					header : true,
					anchor : 'left',
					style : {
						'pointer-events' : 'none'
					}
				});

				panel.on('plothover', function(event, pos, item) {
					if (item && item.series.hoverInfo) {
						var hoverInfo = item.series.hoverInfo;
						tooltip.setTitle(hoverInfo.category + '<br>' + hoverInfo.frequency + ' ('
								+ hoverInfo.percent.toFixed(2) + ' %)');
						tooltip.showAt([ item.pageX + 10, item.pageY + 10 ]);
					} else {
						tooltip.hide();
					}
				});

				var sortButton = new Ext.Button({
					text : 'Sort',
					iconCls : 'icon-sort',
					menu : [ {
						text : 'Frequency',
						handler : function() {
							panel.orderBy = 'freq';
							panel.replot();
						}
					}, {
						text : 'Category',
						handler : function() {
							panel.orderBy = 'cat';
							panel.replot();
						}
					} ]
				});

				var legendButton = new Ext.Button({
					text : 'Legend',
					enableToggle : true,
					pressed : panel.showLegend,
					toggleHandler : function(b, pressed) {
						panel.showLegend = pressed;
						panel.replot();
					}
				});

				panel.getTopToolbar().add([ sortButton, '->', legendButton ]);

				this.layer.visualization.events.register('change', panel, panel.replot);
				panel.on('destroy', function() {
					this.layer.visualization.events.unregister('change', panel, panel.replot);
				}, this);

				return panel;
			},

			getPlotParamFunc : function(features, visualization) {
				// Get data
				var dataMap = {};

				for ( var f = 0; f < features.length; f++) {
					var v = features[f].getValues();

					for ( var i = 0, len = v.length; i < len; i++) {
						var time = v[i][0], value = v[i][1];
						var timeId = 'f' + time[0] + 't' + (time[1] || '');
						if (!dataMap[timeId]) {
							dataMap[timeId] = {
								time : time
							};
						}
						if (value.length && value.length > 0 && typeof value[0] === "string") {
							// Categorical realisations
							dataMap[timeId].freqMap = visualization.getFrequencyMap(value,
									dataMap[timeId].freqMap);
						}
					}
				}

				var dataList = [];
				for ( var key in dataMap) {
					var data = dataMap[key];
					var freqList = [];
					var freqSum = 0;
					for ( var cat in data.freqMap) {
						freqList.push([ data.freqMap[cat], cat ]);
						freqSum += data.freqMap[cat];
					}
					switch (this.orderBy) {
					case 'freq':
						freqList.sort(function(a, b) {
							return a[0] - b[0];
						});
						break;
					case 'cat':
						freqList.sort(function(a, b) {
							if (a[1] < b[1])
								return -1;
							if (a[1] > b[1])
								return 1;
							return 0;
						});
						break;
					}
					dataList.push({
						time : data.time,
						freqList : freqList,
						freqSum : freqSum
					});
				}
				dataList.sort(function(a, b) {
					return a.time[0] - b.time[0];
				});

				var series = [];
				var ticks = [];
				var labelList = [];
				for ( var i = 0, lenT = dataList.length; i < lenT; i++) {
					for ( var j = 0, lenF = dataList[i].freqList.length; j < lenF; j++) {
						var value = dataList[i].freqList[j];
						// var percent = (value / this.categoryFreqSum) * 100;
						series.push({
							label : labelList.indexOf(value[1]) == -1 ? value[1] : null,
							stack : i,
							bars : {
								show : true,
								barWidth : 0.5,
								align : 'center',
								fill : 0.8
							},
							color : visualization.getStyleParam('fillColor', value[1]),
							data : [ [ i, value[0] ] ],
							clickInfos : [ dataList[i] ],
							hoverInfo : {
								category : value[1],
								frequency : value[0],
								percent : (value[0] / dataList[i].freqSum) * 100
							}
						});
						labelList.push(value[1]);
					}
					var timeString = Ext.util.Format.date(new Date(dataList[i].time[0]), 'm/d/Y H:i:s');
					if (dataList[i].time.length == 2) {
						timeString += ' -<br>'
								+ Ext.util.Format.date(new Date(dataList[i].time[1]), 'm/d/Y H:i:s');
					}
					ticks.push([ i, timeString ]);

				}

				return {
					series : series,
					options : {
						xaxis : {
							ticks : ticks,
							autoscaleMargin : 0.05
						},
						grid : {
							clickable : true,
							hoverable : true
						},
						legend : {
							show : this.showLegend
						}
					}
				};
			},

			createSubPlotPanel : function(clickInfos, options) {
				var clickInfo = clickInfos[0];
				var title = new Date(clickInfo.time[0]).toGMTString();
				if (clickInfo.time.length == 2) {
					title += ' - ' + new Date(clickInfo.time[1]).toGMTString();
				}

				options = OpenLayers.Util.extend({
					title : title,
					plotType : 'bar',
					orderBy : 'freq',
					showLegend : true,
					tbar : []
				}, options);

				var subPanel = OpenLayers.VIS.ResultValue.prototype.createSubPlotPanel.call(this,
						[ clickInfo ], options);

				var toggleGroup = 'type' + (++Ext.Component.AUTO_ID);
				var barButton = new Ext.Button({
					text : 'Bar Chart',
					enableToggle : true,
					pressed : subPanel.plotType == 'bar',
					toggleGroup : toggleGroup,
					allowDepress : false,
					toggleHandler : function(b, pressed) {
						subPanel.plotType = 'bar';
						subPanel.replot(true);
					},
					iconCls : 'icon-barchart'
				});
				var pieButton = new Ext.Button({
					text : 'Pie Chart',
					enableToggle : true,
					pressed : subPanel.plotType == 'pie',
					toggleGroup : toggleGroup,
					allowDepress : false,
					toggleHandler : function(b, pressed) {
						subPanel.plotType = 'pie';
						subPanel.replot(true);
					},
					iconCls : 'icon-piechart'
				});

				var sortButton = new Ext.Button({
					text : 'Sort',
					iconCls : 'icon-sort',
					menu : [ {
						text : 'Frequency',
						handler : function() {
							subPanel.orderBy = 'freq';
							subPanel.replot();
						}
					}, {
						text : 'Category',
						handler : function() {
							subPanel.orderBy = 'cat';
							subPanel.replot();
						}
					} ]
				});
				var legendButton = new Ext.Button({
					text : 'Legend',
					enableToggle : true,
					pressed : subPanel.showLegend,
					toggleHandler : function(b, pressed) {
						subPanel.showLegend = pressed;
						subPanel.replot();
					}
				});

				subPanel.getTopToolbar().add([ barButton, pieButton, sortButton, '->', legendButton ]);

				var tooltip = new Ext.ToolTip({
					header : true,
					anchor : 'left',
					style : {
						'pointer-events' : 'none'
					}
				});

				subPanel.on('plothover', function(event, pos, item) {
					if (item && item.series.hoverInfo) {
						var hoverInfo = item.series.hoverInfo;
						tooltip.setTitle(hoverInfo.category + '<br>' + hoverInfo.frequency + ' ('
								+ hoverInfo.percent.toFixed(2) + ' %)');
						tooltip.showAt([ item.pageX + 10, item.pageY + 10 ]);
					} else {
						tooltip.hide();
					}
				});

				this.layer.visualization.events.register('change', subPanel, subPanel.replot);
				subPanel.on('destroy', function() {
					this.layer.visualization.events.unregister('change', subPanel, subPanel.replot);
				}, this);

				return subPanel;
			},

			getSubPlotParamFunc : function(clickInfos, visualization) {
				var clickInfo = clickInfos[0];
				var showLegend = this.showLegend;
				var barPlot = function() {
					var series = [];
					var ticks = [];

					for ( var i = 0, len = freqList.length; i < len; i++) {
						var value = freqList[i];
						var percent = (value[0] / freqSum) * 100;
						series.push({
							label : value[1],
							bars : {
								show : true,
								barWidth : 0.5,
								align : 'center',
								fill : 0.8
							},
							color : visualization.getStyleParam('fillColor', value[1]),
							data : [ [ i, value[0] ] ],
							hoverInfo : {
								category : value[1],
								frequency : value[0],
								percent : percent
							}
						});
						ticks.push([ i, value[1] + '<br>(' + percent.toFixed(2) + ' %)' ]);
					}

					return {
						series : series,
						options : {
							xaxis : {
								ticks : ticks,
								autoscaleMargin : 0.05
							},
							grid : {
								hoverable : true
							},
							legend : {
								show : showLegend
							}
						}
					};
				};

				var piePlot = function() {
					var data = [];
					for ( var i = 0, len = freqList.length; i < len; i++) {
						var value = freqList[i];
						data.push({
							label : value[1],
							data : value[0],
							color : visualization.getStyleParam('fillColor', value[1]),
							fill : 0.8
						});
					}
					var options = {
						series : {
							pie : {
								show : true,
								radius : 0.8,
								label : {
									show : true,
									radius : 0.8,
									formatter : function(label, series) {
										return '<div style="font-size:8pt;text-align:center;padding:2px;color:white;">'
												+ label + '<br/>' + series.data[0][1] + ' (' + series.percent.toFixed(1)
												+ '%)</div>';
									},
									background : {
										opacity : 0.5,
										color : '#000'
									}
								}
							}
						},
						grid : {
						// hoverable : true
						},
						legend : {
							show : showLegend
						}
					};
					return {
						series : data,
						options : options
					};
				};

				var freqList = clickInfo.freqList;
				var freqSum = 0;
				for ( var i = 0, len = freqList.length; i < len; i++) {
					freqSum += freqList[i][0];
				}
				switch (this.orderBy) {
				case 'freq':
					freqList.sort(function(a, b) {
						return b[0] - a[0];
					});
					break;
				case 'cat':
					freqList.sort(function(a, b) {
						if (a[1] < b[1])
							return -1;
						if (a[1] > b[1])
							return 1;
						return 0;
					});
					break;
				}

				switch (this.plotType) {
				case 'bar':
					return barPlot();
					break;
				case 'pie':
					return piePlot();
					break;
				}
			}
		});