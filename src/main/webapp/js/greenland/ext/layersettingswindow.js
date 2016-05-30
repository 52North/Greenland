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
/**
 * Window to control the layer settings of a VIS layer. Requests the
 * visualization parameters from the layer and displays them in a window.
 * 
 */
Ext.ux.VIS.LayerSettingsWindow = Ext.extend(Ext.Window, {

	strings : {
		title : 'Layer Settings',
		group_symbology : 'Symbology'
	},

	layout : 'fit',
	height : 400,
	width : 350,

	allowBlank : true,
	/**
	 * @cfg {Object} VIS layer to show settings for
	 */
	layer : null,

	initComponent : function() {
		Ext.ux.VIS.LayerSettingsWindow.superclass.initComponent.call(this);
		
		if (!this.layer) {
			throw "layer not set";
		}

		// Get visualization parameters
		var params = this.layer.visualization.createParameters();

		// Regroup parameter objects based on their individual group attributes
		var i = 0, newParams, paramSet, groups;
		while (i < params.length) {

			paramSet = params[i];
			groups = {};
			for ( var param in paramSet) {
				if (paramSet[param].length) {
					continue;
				}
				paramGroup = paramSet[param].group || paramSet.group || this.strings.group_symbology;
				if (groups[paramGroup] == null) {
					groups[paramGroup] = {
						group : paramGroup
					};
				}
				groups[paramGroup][param] = paramSet[param];
			}

			newParams = [];
			for ( var group in groups) {
				newParams.push(groups[group]);
			}

			params.splice(i, 1);
			Array.prototype.unshift.apply(params, newParams);
			i += newParams.length;
		}
		params.reverse();

		var optionsGroupMap = {};
		var group, controls;
		for ( var i = 0; i < params.length; i++) {
			controls = VIS.createParameterControls(params[i], null);
			if (controls.length != 0) {
				group = params[i].group || this.string.group_symbology;

				if (!optionsGroupMap[group]) {
					optionsGroupMap[group] = [];
				}

				// Convert parameter descriptions into ExtJs controls
				optionsGroupMap[group] = optionsGroupMap[group].concat(controls);
			}
		}

		var tabs = [];
		for ( var key in optionsGroupMap) {
			tabs.push(new Ext.Panel({
				autoScroll : true,
				padding : 10,
				layout : 'form',
				title : key,
				items : optionsGroupMap[key],
				defaults : {
					anchor : '100%'
				}
			}));
		}

		this.setTitle(this.strings.title + ' - ' + this.layer.getTitle() || '');

		// Close window if layer gets removed
		var handleLayerRemoved = function(evt) {
			this.close();
		};
		this.layer.events.register('removed', this, handleLayerRemoved);
		this.on('close', function() {
			this.layer.events.unregister('removed', this, handleLayerRemoved);
		}, this);

		this.add(new Ext.TabPanel({
			enableTabScroll : true,
			activeTab : 0,
			items : tabs
		}));
	}

});