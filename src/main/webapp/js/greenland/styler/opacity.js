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
 * Styler may be used to set the opacity styling attribute. Also sets the
 * opacity attribute of the corresponding layer (usable for raster layers,
 * vector layers do not support it anyway).
 */
OpenLayers.VIS.Styler.Opacity = OpenLayers.Class(OpenLayers.VIS.Styler.Base, {

	opacity : null,

	initialize : function(options) {
		options = options || {};
		options.isFeatureStyler = false;
		this.opacity = 0.8;
		OpenLayers.VIS.Styler.Base.prototype.initialize.apply(this, arguments);
	},

	setSymbology : function(symbology) {
		OpenLayers.VIS.Styler.Base.prototype.setSymbology.apply(this, arguments);
		this.opacity = this.symbology.opacity || 0.8;
	},

	getValue : function() {
		return this.opacity;
	},

	createParameters : function() {
		var options = {
			opacity : {
				fieldLabel : 'Opacity',
				value : this.opacity * 100,
				minimum : 0,
				maximum : 100,
				type : 'integer',
				description : 'Opacity of this layer in %',
				action : function(value) {
					this.opacity = value / 100;
					this.symbology.layer.setOpacity(this.opacity);
					this.triggerChangeEvent('opacity');
					// this.symbology.events.triggerEvent('change');
				},
				scope : this,
				required : true
			}
		};
		return options;
	},

	restore : function(parcel) {
		this.opacity = parcel.readFloat();
		// TODO set layer opacity?
	},

	store : function(parcel) {
		return parcel.writeFloat(this.opacity);
	}
});
