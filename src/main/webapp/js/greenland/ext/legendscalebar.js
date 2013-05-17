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
 * ExtJs component encapsulating the getLegend functionality of a VIS Layer.
 * Displays the visualization legend and updates itself automatically
 */
Ext.ux.VIS.LegendScaleBar = Ext.extend(

Ext.Panel, {

	visualization : null,
	legendCmp : null,
	// autoHeight : true,
	layout : 'fit',
	border : false,
	baseCls : 'x-plain',

	initComponent : function() {
		Ext.ux.VIS.LegendScaleBar.superclass.initComponent.call(this);

		// register event handler to refresh the legend if it gets changed
		this.visualization.events.register('change', this, this.handleVisualizationChange);
		this.refresh();
	},

	refresh : function() {
		if (!this.visualization.isValid()) {
			return;
		}

		// gets new component from the visualization object and replaces current
		if (this.legendCmp) {
			this.remove(this.legendCmp);
		}
		this.legendCmp = this.visualization.getLegend();
		if (this.legendCmp) {
			this.add(this.legendCmp);
		}
		this.doLayout();
	},

	handleVisualizationChange : function(evt) {
		if (evt.property == 'legend') {
			this.refresh();
		}
	},

	beforeDestroy : function() {
		this.visualization.events.unregister('change', this, this.handleVisualizationChange);

		Ext.ux.VIS.LegendScaleBar.superclass.beforeDestroy.call(this);
	}
});
