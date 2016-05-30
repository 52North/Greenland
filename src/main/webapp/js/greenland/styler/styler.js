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

