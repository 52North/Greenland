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
