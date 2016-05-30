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
 * Styler to set radius property of OpenLayers.Style object by the user.
 */
OpenLayers.VIS.Styler.Size = OpenLayers.Class(OpenLayers.VIS.Styler.Base, {

	pointRadius : null,

	initialize : function(options) {
		this.pointRadius = 8;
		OpenLayers.VIS.Styler.Base.prototype.initialize.apply(this, arguments);
	},

	getValue : function() {
		return this.pointRadius;
	},

	createParameters : function() {
		var options = {
			size : {
				fieldLabel : 'Size',
				value : this.pointRadius,
				minimum : 1,
				maximum : 25,
				type : 'integer',
				description : 'Marker size',
				action : function(value) {
					this.pointRadius = value;
					this.triggerChangeEvent('symbology');
					this.symbology.layer.redraw();
				},
				scope : this,
				required : true
			}
		};

		return options;
	},

	restore : function(parcel) {
		this.pointRadius = parcel.readInt();
	},

	store : function(parcel) {
		return parcel.writeInt(this.pointRadius);
	}
});
