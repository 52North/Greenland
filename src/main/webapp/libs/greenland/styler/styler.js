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
OpenLayers.VIS.Styler = OpenLayers.VIS.Styler || {};

/**
 * A Styler is used to compute the value for an OpenLayers styling property
 * based on the value of a feature and further customizable attributes.
 */
OpenLayers.VIS.Styler.Base = OpenLayers.Class({

	isFeatureStyler : null,

	symbology : null,

	initialize : function(options) {
		this.isFeatureStyler = true;
		OpenLayers.Util.extend(this, options);
	},

	getValue : function(value) {

	},

	/**
	 * Called during the initialization of a symbology
	 * 
	 * @param symbology
	 */
	setSymbology : function(symbology) {
		this.symbology = symbology;
	},

	/**
	 * Returns the customizable parameters.
	 * 
	 * @returns {Array}
	 */
	createParameters : function() {
		return [];
	},

	triggerChangeEvent : function(property) {
		this.symbology.events.triggerEvent('change', {
			property : property
		});
	},

	restore : function(parcel) {

	},

	store : function(parcel) {

	}
});

