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
 * Styler to set stroke width property of OpenLayers.Style object by the user.
 */
OpenLayers.VIS.Styler.StrokeWidth = OpenLayers.Class(OpenLayers.VIS.Styler.Base, {

	strokeWidth : null,

	initialize : function(options) {
		this.strokeWidth = 1;
		OpenLayers.VIS.Styler.Base.prototype.initialize.apply(this, arguments);
	},

	getValue : function() {
		return this.strokeWidth;
	},

	createParameters : function() {
		var options = {
			width : {
				fieldLabel : 'Width',
				value : this.strokeWidth,
				minimum : 1,
				maximum : 25,
				type : 'integer',
				description : 'Stroke width',
				action : function(value) {
					this.strokeWidth = value;
					this.triggerChangeEvent('symbology');
				},
				scope : this,
				required : true
			}
		};

		return options;
	},

	restore : function(parcel) {
		this.strokeWidth = parcel.readInt();
	},

	store : function(parcel) {
		return parcel.writeInt(this.strokeWidth);
	}
});
