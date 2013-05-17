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
 *
 *
 * Extending Ext JS Library 3.4.0
 * Copyright(c) 2006-2011 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
/**
 * Shows details for a specific feature of a OpenLayers.Layer.VIS.Vector layer.
 * Gets plot data from the feature layer's resultValue and maintains its click
 * and select events.
 * 
 * Supports Ext.ux.TabCloseMenu
 * 
 * Requires Ext.ux.VIS.FeatureArrow
 */
Ext.ux.VIS.FeatureWindow = Ext.extend(Ext.Window, {

	layout : 'fit',

	height : 400,
	width : 550,
	/**
	 * @cfg {Object} VIS layer to which the features to show belong
	 */
	layer : null,
	/**
	 * @cfg {Array} features to show details for. All features have to belong to
	 *      the configured layer
	 */
	features : null,

	featureArrow : null,

	initComponent : function() {
		Ext.ux.VIS.FeatureWindow.superclass.initComponent.call(this);

		if (!this.layer) {
			throw "layer not set";
		}
		if (!this.features) {
			throw "features not set";
		}

		if (!this.features.length) {
			this.features = [ this.features ];
		}

		this.setTitle(this.layer.getTitle() || '');

		// Result value maps feature attributes to a map value, offers functions to
		// create flot plots of its data and to interact with them by managing click
		// and select events. For that purpose, the resultValue can provide
		// clickInfo
		// structures for flot feature points and offer a createSubPlotPanel method
		// which gets the clicked/selected clickInfo structures as argument
		var resultValue = this.layer.resultValue;

		var tabPanel = new Ext.TabPanel({
			enableTabScroll : true,
			plugins : Ext.ux.TabCloseMenu ? new Ext.ux.TabCloseMenu() : null,
			items : [],
			activeTab : 0
		});

		var plotPanel = resultValue.createPlotPanel(this.features, this.layer, {
			closable : false,
			padding : 5,
			title : resultValue.title
		});

		// Event handling for plot panel
		// Click handling -> create sub plot for clicked feature with clickInfo
		plotPanel.on('plotclick', function(event, pos, item) {
			if (item && item.series.clickInfos) {
				var clickInfo = item.series.clickInfos[item.dataIndex];
				if (clickInfo) {
					var itemId = item.dataIndex + '-' + item.dataIndex + '_' + item.seriesIndex;
					tabPanel.add(resultValue.createSubPlotPanel([ clickInfo ], {
						itemId : itemId,
						closable : true
					}));
					tabPanel.setActiveTab(itemId);
				}
			}
		});

		// Selection handling -> create sub plots for each selected clickInfo point
		plotPanel.on('plotselected', function(event, ranges, plot) {
			var series = plot.getData();
			for ( var i = 0, countSeries = series.length; i < countSeries; i++) {
				if (!series[i].clickInfos)
					continue;
				var clickInfos = [];
				var data = series[i].data;
				var minX = Number.MAX_VALUE, maxX = Number.MIN_VALUE;
				for ( var j = 0, countData = data.length; j < countData; j++) {
					if (!data[j])
						continue;

					if (data[j][0] >= ranges.xaxis.from && data[j][0] <= ranges.xaxis.to) {
						minX = Math.min(minX, data[j][0]);
						maxX = Math.max(maxX, data[j][0]);
						clickInfos.push(series[i].clickInfos[j]);
					}
				}
				if (clickInfos.length == 0)
					continue;

				var itemId = minX + '-' + maxX + '_' + i;
				tabPanel.add(resultValue.createSubPlotPanel(clickInfos, {
					itemId : itemId,
					closable : true
				}));
				tabPanel.setActiveTab(itemId);
			}
		});

		tabPanel.add(plotPanel);

		// init feature arrow
		this.featureArrow = new Ext.ux.VIS.FeatureArrow({
			renderTo : document.body,
			style : {
				position : 'absolute',
				pointerEvents : 'none'
			},
			symbolizers : [ {
				fillColor : 'gray',
				pointerEvents : 'none',
				fillOpacity : 0.4,
				strokeWidth : 0
			} ],
			hidden : this.features.length != 1
		});

		// Register events
		this.on({
			move : function() {
				this.updateFeatureIndicator();
			},
			resize : function() {
				this.updateFeatureIndicator();
			},
			drag : function() {
				this.updateFeatureIndicator();
			},
			destroy : function() {
				this.featureArrow.destroy();
			},
			show : function() {
				this.updateFeatureIndicator();
				this.layer.map.events.register('move', this, this.updateFeatureIndicator);
			},
			hide : function() {
				this.featureArrow.hide();
				if (this.layer && this.layer.map) {
					this.layer.map.events.unregister('move', this, this.updateFeatureIndicator);
				}
			},
			activate : function() {
				this.featureArrow.el.setStyle('z-index', this.el.getZIndex() - 1);
			},
			deactivate : function() {
				this.featureArrow.el.setStyle('z-index', this.el.getZIndex() - 1);
			}
		});

		this.add(tabPanel);
	},

	initDraggable : function() {
		Ext.ux.VIS.FeatureWindow.superclass.initDraggable.call(this);
		// Augment Ext.Window.DD for this window to fire drag event
		this.dd.onDrag = Ext.Window.DD.prototype.onDrag.createSequence(function() {
			this.win.fireEvent('drag');
		});
	},

	/**
	 * Function takes current window and feature position to update featureArrow
	 */
	updateFeatureIndicator : function() {
		if (this.features.length != 1)
			return;
		var feature = this.features[0];

		if (feature.onScreen()) {
			var winPos;
			if (this.activeGhost) {
				// Use "ghost" Element for window position if
				// existing, since getPosition() is not working
				// while dragging windows
				winPos = [ this.activeGhost.getLeft(), this.activeGhost.getTop() ];
			} else {
				winPos = this.getPosition();
			}
			var centroid = feature.geometry.getCentroid();
			var viewportpx = feature.layer.map.getPixelFromLonLat(new OpenLayers.LonLat(centroid.x, centroid.y));
			var viewportEl = Ext.get(feature.layer.map.viewPortDiv);
			var featurePos = [ viewportpx.x + viewportEl.getLeft(), viewportpx.y + viewportEl.getTop() ];

			this.featureArrow.setEndPosition(featurePos[0], featurePos[1]);

			var topOffset = winPos[1] - featurePos[1];
			var bottomOffset = featurePos[1] - (winPos[1] + this.getHeight());
			var leftOffset = winPos[0] - featurePos[0];
			var rightOffset = featurePos[0] - (winPos[0] + this.getWidth());

			if (topOffset > 0) {
				this.featureArrow.setOrientation('horizontal');
				this.featureArrow.setStartWidth(this.getWidth());
				this.featureArrow.setStartPosition(winPos[0], winPos[1]);

				this.featureArrow.updateFeature();
				this.featureArrow.show();

				this.featureArrow.setPagePosition(winPos[0] - Math.max(0, leftOffset), winPos[1] - topOffset);
			} else if (bottomOffset > 0) {
				this.featureArrow.setOrientation('horizontal');
				this.featureArrow.setStartWidth(this.getWidth());
				this.featureArrow.setStartPosition(winPos[0], winPos[1] + this.getHeight());

				this.featureArrow.updateFeature();
				this.featureArrow.show();

				this.featureArrow.setPagePosition(winPos[0] - Math.max(0, leftOffset), winPos[1] + this.getHeight());
			} else if (leftOffset > 0) {
				this.featureArrow.setOrientation('vertical');
				this.featureArrow.setStartWidth(this.getHeight());
				this.featureArrow.setStartPosition(winPos[0], winPos[1]);

				this.featureArrow.updateFeature();
				this.featureArrow.show();

				this.featureArrow.setPagePosition(winPos[0] - Math.max(0, leftOffset), winPos[1] - Math.max(0, topOffset));
			} else if (rightOffset > 0) {
				this.featureArrow.setOrientation('vertical');
				this.featureArrow.setStartWidth(this.getHeight());
				this.featureArrow.setStartPosition(winPos[0] + this.getWidth(), winPos[1]);

				this.featureArrow.updateFeature();
				this.featureArrow.show();

				this.featureArrow.setPagePosition(winPos[0] + this.getWidth(), winPos[1] - Math.max(0, topOffset));
			} else {
				this.featureArrow.hide();
				return;
			}

		} else {
			this.featureArrow.hide();
		}
	}

});