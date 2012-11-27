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
Ext.namespace('Ext.ux.VIS');
/**
 * ExtJS component handling the legend/parameters of a map. Automatically
 * registers for layer events, manages all components for each new layer and
 * provides simple drag and drop functionality in conjunction with other
 * Ext.ux.VIS.Legend instances and their maps.
 */
Ext.ux.VIS.Legend = Ext.extend(Ext.Panel, {
	autoScroll : true,
	map : null,

	initComponent : function() {
		Ext.ux.VIS.Legend.superclass.initComponent.call(this);

		this.map.events.register('addlayer', this, this.handleAddLayer);
		this.map.events.register('removelayer', this, this.handleRemoveLayer);

		this.map.events.register('changelayer', this, this.handleChangeLayer);
	},

	initEvents : function() {
		Ext.ux.VIS.Legend.superclass.initEvents.call(this);
		this.dd = new Ext.ux.VIS.Legend.DropZone(this, this.dropConfig);
	},

	handleChangeLayer : function(evt) {

	},

	handleAddLayer : function(evt) {
		if (!this.hasLegendItemForLayer(evt.layer)) {
			// TODO Correct ordering of layers
			var item = this.createLegendItemForLayer(evt.layer);
			if (item == null) {
				return;
			}

			this.insert(0, item);
			this.doLayout();
		}
	},

	handleRemoveLayer : function(evt) {
		for ( var i = 0, len = this.items.items.length; i < len; i++) {
			var item = this.items.items[i];
			if (item.layer && item.layer == evt.layer) {
				this.remove(item);
				break;
			}
		}
	},

	insert : function(index, comp) {
		Ext.ux.VIS.Legend.superclass.insert.apply(this, arguments);
		if (comp.layer) {
			if (!this.hasLayerForLegendItem(comp)) {
				comp.layer.map.removeLayer(comp.layer);
				this.map.addLayer(comp.layer);
			}
			this.map.setLayerIndex(comp.layer, this.map.layers.length - 3 - index);
			this.map.resetLayersZIndex();
		}
	},

	// handleAddLegendItem : function(item) {
	// if (!this.hasLayerForLegendItem(item)) {
	// item.layer.map.removeLayer(item.layer);
	// this.map.addLayer(item.layer);
	// }
	// },

	hasLegendItemForLayer : function(layer) {
		for ( var i = 0, len = this.items.items.length; i < len; i++) {
			var item = this.items.items[i];
			if (item.layer && item.layer == layer) {
				return true;
			}
		}
		return false;
	},

	hasLayerForLegendItem : function(item) {
		for ( var i = 0, len = this.map.layers.length; i < len; i++) {
			if (this.map.layers[i] == item.layer) {
				return true;
			}
		}
		return false;
	},

	createLegendItemForLayer : function(layer) {
		if (layer instanceof OpenLayers.Layer.VIS.Raster
				|| layer instanceof OpenLayers.Layer.VIS.Vector || layer instanceof OpenLayers.Layer.WMSQ) {
			var options = layer.getParameterOptions();
			var visualization = layer.visualization || layer;

			var items = [ new Ext.ux.VIS.LegendScaleBar({
				anchor : '100%',
				visualization : visualization
			}), new Ext.form.Label({
				fieldLabel : 'Description',
				text : visualization.description
			}) ];

			var updateTask = new Ext.util.DelayedTask(function() {
				layer.updateVisualization();
			});
			var paramItems = createParameterControls(options, function() {
				updateTask.delay(1000);
			}, true);
			if (paramItems.length > 0) {
				items.push(new Ext.form.FieldSet({
					items : paramItems,
					title : 'Parameters',
					collapsible : true,
					listeners : {
						collapse : function(p) {
							var info = '';
							for ( var key in options) {
								var option = options[key];
								if (info != '') {
									info += ', ';
								}
								info += key + ' = ';
								if (option.value) {
									info += option.value;
								} else {
									info += 'NA';
								}
							}
							p.setTitle('Parameters - ' + info);
						},
						expand : function(p) {
							p.setTitle('Parameters');
						}
					}
				}));

			}

			items.push(new Ext.Button({
				text : 'Permalink',
				layer : layer,
				handler : function(button) {
					window.open(VIS.ResourceLoader.getPermalink(this.layer));
				}
			}));

			// Tools to show in legend panel (small icons in the header)
			var tools = [];
			tools.push({
				id : 'close',
				qtip : 'Remove layer',
				handler : function(event, toolEl, panel) {
					var layer = panel.layer;
					layer.map.removeLayer(layer);
				}
			});
			if (layer instanceof OpenLayers.Layer.Vector) {
				// Add zoom to layer tool if layer supports getDataExtent
				tools.push({
					id : 'maximize', // TODO find better image
					qtip : 'Zoom to layer',
					handler : function(event, toolEl, panel) {
						var layer = panel.layer;
						layer.map.zoomToExtent(layer.getDataExtent());
					}
				});
			}
			tools.push({
				id : 'gear',
				qtip : 'Layer settings',
				handler : function(event, toolEl, panel) {
					var layer = panel.layer;
					showLayerSettings(layer);
				}
			});

			var item = new Ext.form.FieldSet({
				title : layer.getTitle() || 'Loading...',
				collapsible : true,
				items : items,
				draggable : true,
				layer : layer,
				loading : false,
				tools : tools,
				listeners : {
					render : function(comp) {
						// add loading icon by inserting custom div into fieldset header
						var loadingCfg = {
							tag : 'div',
							cls : 'legend-loading x-tool'
						};
						comp.loadingIcon = comp.header.insertFirst(loadingCfg);
						comp.setLoading(comp.loading);

						// add visibility checkbox by inserting custom input element into
						// fieldset header
						var visibilityCfg = {
							tag : 'input',
							type : 'checkbox',
							name : 'test',
							checked : comp.layer.getVisibility()
						};
						comp.visibilityCheckbox = comp.header.insertFirst(visibilityCfg);
						comp.visibilityCheckbox.on('click', function(event) {
							layer.setVisibility(event.target.checked);
						}.createDelegate(comp));
					}
				},
				setLoading : function(l) {
					this.loading = l;
					if (this.loadingIcon) {
						if (this.loading) {
							this.loadingIcon.show();
						} else {
							this.loadingIcon.hide();
						}
					}
				}
			});
			layer.events.register('changetitle', this, function(evt) {
				item.setTitle(evt.layer.getTitle() || 'Loading...');
			});

			layer.events.register('loadstart', this, function(evt) {
				item.setLoading(true);
			});
			layer.events.register('loadend', this, function(evt) {
				item.setLoading(false);
			});

			return item;
			// } else if (layer instanceof OpenLayers.Layer.VIS.Vector) {
			// var items = [ new Ext.ux.VIS.LegendScaleBar({
			// visualization : layer.visualization
			// }) ];
			//
			// return new Ext.form.FieldSet({
			// title : 'test Vector',
			// collapsible : true,
			// items : items,
			// draggable : true,
			// layer : layer
			// });
		} else {
			return null;
		}
	},

	beforeDestroy : function() {
		if (this.dd) {
			this.dd.unreg();
		}

		this.map.events.unregister('addlayer', this, this.handleAddLayer);
		this.map.events.unregister('removelayer', this, this.handleRemoveLayer);
		this.map.events.unregister('changelayer', this, this.handleChangeLayer);

		Ext.ux.VIS.Legend.superclass.beforeDestroy.call(this);
	}
});

/**
 * Based on Ext.ux.Portal.DropZone example code
 */
Ext.ux.VIS.Legend.DropZone = Ext.extend(Ext.dd.DropTarget, {

	constructor : function(legend, cfg) {
		this.legend = legend;
		Ext.dd.ScrollManager.register(legend.body);
		Ext.ux.VIS.Legend.DropZone.superclass.constructor.call(this, legend.bwrap.dom, cfg);
		legend.body.ddScrollConfig = this.ddScrollConfig;
	},

	ddScrollConfig : {
		vthresh : 50,
		hthresh : -1,
		animate : true,
		increment : 200
	},

	createEvent : function(dd, e, data, pos) {
		return {
			legend : this.legend,
			panel : data.panel,
			position : pos,
			data : data,
			source : dd,
			rawEvent : e,
			status : this.dropAllowed
		};
	},

	notifyOver : function(dd, e, data) {
		if (!data.panel.layer) {
			return;
		}
		var xy = e.getXY(), legend = this.legend, px = dd.proxy;

		// handle case scroll where scrollbars appear during drag
		var cw = legend.body.dom.clientWidth;
		if (!this.lastCW) {
			this.lastCW = cw;
		} else if (this.lastCW != cw) {
			this.lastCW = cw;
			this.legend.doLayout();
		}

		var p, match = false, pos = 0, items = legend.items.items, overSelf = false;

		for ( var len = items.length; pos < len; pos++) {
			p = items[pos];
			var h = p.el.getHeight();
			if (h === 0) {
				overSelf = true;
			} else if ((p.el.getY() + (h / 2)) > xy[1]) {
				match = true;
				break;
			}
		}

		pos = (match && p ? pos : legend.items.getCount()) + (overSelf ? -1 : 0);
		var overEvent = this.createEvent(dd, e, data, pos);

		// make sure proxy width is fluid
		px.getProxy().setWidth('auto');

		if (p) {
			px.moveProxy(p.el.dom.parentNode, match ? p.el.dom : null);
		} else {
			px.moveProxy(legend.el.dom, null);
		}

		this.lastPos = {
			p : overSelf || (match && p) ? pos : false
		};
		this.scrollPos = legend.body.getScroll();

		legend.fireEvent('dragover', overEvent);

		return overEvent.status;

	},

	notifyDrop : function(dd, e, data) {
		if (!this.lastPos || !data.panel.layer) {
			return;
		}
		var pos = this.lastPos.p, panel = dd.panel, dropEvent = this.createEvent(dd, e, data,
				pos !== false ? pos : this.legend.items.getCount());

		dd.proxy.getProxy().remove();
		panel.el.dom.parentNode.removeChild(dd.panel.el.dom);

		this.legend.insert(pos, panel);

		// TODO
		this.legend.doLayout();

		// this.legend.handleAddLegendItem(data.panel);

		// scroll position is lost on drop, fix it
		var st = this.scrollPos.top;
		if (st) {
			var d = this.legend.body.dom;
			setTimeout(function() {
				d.scrollTop = st;
			}, 10);
		}

		delete this.lastPos;
	},

	// unregister the dropzone from ScrollManager
	unreg : function() {
		Ext.dd.ScrollManager.unregister(this.legend.body);
		Ext.ux.VIS.Legend.DropZone.superclass.unreg.call(this);
	}
});