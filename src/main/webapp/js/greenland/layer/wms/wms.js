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
 */
/**
 * Simple WMS Layer wrapper
 */
OpenLayers.Layer.VIS.WMS = OpenLayers.Class(OpenLayers.Layer.WMS, {

	initialize : function(name, visualization, options) {
		OpenLayers.Layer.WMS.prototype.initialize.apply(this, arguments);

		this.visualization = {
			layer : this,
			opacityStyler : new OpenLayers.VIS.Styler.Opacity(),
			events : new OpenLayers.Events(this, null, null, false),
			isValid : function() {
				return true;
			},
			getLegend : function() {
				return new Ext.Panel({
					border : false
				});
			},
			createParameters : function() {
				var parameters = [ this.opacityStyler.createParameters() ];
				var serviceVersion = this.layer.capabilities.version || '1.1.1';
				var capUrl = OpenLayers.Util.urlAppend(this.layer.url, OpenLayers.Util.getParameterString({
					'REQUEST' : 'GetCapabilities',
					'SERVICE' : 'WMS',
					'VERSION' : serviceVersion
				}));
				parameters.push({
					service : {
						comp : new Ext.form.FieldSet({
							title : 'Service',
							items : [ {
								xtype : 'label',
								text : 'WMS',
								fieldLabel : 'Service Type'
							}, {
								xtype : 'label',
								text : serviceVersion,
								fieldLabel : 'Version'
							}, {
								xtype : 'label',
								text : this.layer.url,
								fieldLabel : 'URL'
							}, {
								xtype : 'displayfield',
								value : '<a href="' + capUrl + '" target="_blank">' + capUrl + '</a>',
								fieldLabel : 'GetCapabilities URL' 
							} ]
						}),
						label : false
					},
					group : 'Source'
				});
				parameters.push({
					service : {
						comp : OpenLayers.Layer.VIS.WMSQ.prototype.createServiceMetadataPanel.call(this.layer),
						label : false
					},
					group : 'Source'
				});
				return parameters;
			}
		};

		this.visualization.opacityStyler.setSymbology(this.visualization);
	},

	getParameterOptions : function() {
		return {};
	},

	getTitle : function() {
		return this.wmsLayer.title || this.wmsLayer.name;
	},

	handleChangeBase : function() {
		if (this.map.projection != null) {
			this.projection = this.map.projection;
			this.redraw();
		}
	},

	setMap : function(map) {
		if (map.projection != null) {
			this.projection = map.projection;
		}
		OpenLayers.Layer.WMS.prototype.setMap.apply(this, arguments);
		this.map.events.register('changebaselayer', this, this.handleChangeBase);

	},

	removeMap : function(map) {
		this.map.events.unregister('changebaselayer', this, this.handleChangeBase);
		OpenLayers.Layer.WMS.prototype.removeMap.apply(this, arguments);
	}
});
