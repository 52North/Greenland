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
				parameters.push({
					service : {
						comp : new Ext.form.FieldSet({
							title : 'Service',
							items : [
									{
										xtype : 'label',
										text : 'WMS',
										fieldLabel : 'Service Type'
									},
									{
										xtype : 'label',
										text : serviceVersion,
										fieldLabel : 'Version'
									},
									{
										xtype : 'label',
										text : this.layer.url,
										fieldLabel : 'URL'
									},
									{
										xtype : 'label',
										text : OpenLayers.Util.urlAppend(this.layer.url, OpenLayers.Util
												.getParameterString({
													'REQUEST' : 'GetCapabilities',
													'SERVICE' : 'WMS',
													'VERSION' : serviceVersion
												})),
										fieldLabel : 'GetCapabilities URL'
									} ]
						}),
						label : false
					},
					group : 'Source'
				});
				parameters.push({
					service : {
						comp : new Ext.form.FieldSet({
							title : 'Metadata',
							items : [ OpenLayers.Layer.VIS.WMSQ.prototype.createServiceMetadataPanel
									.call(this.layer) ]
						}),
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

	setMap : function(map) {
		if (map.projection != null) {
			this.projection = map.projection;
		}
		OpenLayers.Layer.WMS.prototype.setMap.apply(this, arguments);
	}
});
