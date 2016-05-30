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
 * Styler to set the label property of a style object. Currently returns en
 * empty string. TODO make user defined labeling function
 */
OpenLayers.VIS.Styler.Label = OpenLayers.Class(OpenLayers.VIS.Styler.Base, {

	initialize : function(options) {
		options = options || {};
		options.isFeatureStyler = true;
		OpenLayers.VIS.Styler.Base.prototype.initialize.apply(this, arguments);
	},

	setSymbology : function(symbology) {
		OpenLayers.VIS.Styler.Base.prototype.setSymbology.apply(this, arguments);
	},

	getValue : function(value) {
		// if (value != null)
		// return '' + value.toFixed(3);
		// else
		return '';
	},

	createParameters : function() {
		return {};
	},

	restore : function(parcel) {
		// TODO
	},

	store : function() {
		// TODO
	}
});
