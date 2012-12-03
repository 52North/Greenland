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
