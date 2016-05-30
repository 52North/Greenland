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
 * Styler usable for graphicName property of OpenLayers.Style object. User can
 * select from several predefined shapes.
 */
OpenLayers.VIS.Styler.Shape = OpenLayers.Class(OpenLayers.VIS.Styler.Base, {
	graphicName : null,
	shapes : [ [ 'Circle', 'circle' ], [ 'Star', 'star' ], [ 'Cross', 'cross' ], [ 'X', 'x' ],
			[ 'Square', 'square' ], [ 'Triangle', 'triangle' ] ],

	initialize : function(options) {
		OpenLayers.VIS.Styler.Base.prototype.initialize.apply(this, arguments);
		this.graphicName = this.graphicName || this.shapes[0][1];
	},

	getValue : function() {
		return this.graphicName;
	},

	createParameters : function() {
		var comboBoxShape = new Ext.form.ComboBox({
			triggerAction : 'all',
			lazyRender : true,
			mode : 'local',
			store : new Ext.data.ArrayStore({
				id : 0,
				fields : [ 'name', 'value' ],
				data : this.shapes
			}),
			valueField : 'value',
			displayField : 'name',
			editable : false,
			value : this.graphicName,
			listeners : {
				select : function(combo, record, index) {
					this.graphicName = record.data.value;
					this.triggerChangeEvent('symbology');
					this.symbology.layer.redraw();
				},
				scope : this
			}
		});

		var options = {
			shape : {
				fieldLabel: 'Shape',
				comp : comboBoxShape,
				required : true
			}
		};

		return options;
	},

	restore : function(parcel) {
		this.graphicName = parcel.readString();
	},

	store : function(parcel) {
		return parcel.writeString(this.graphicName);
	}
});
