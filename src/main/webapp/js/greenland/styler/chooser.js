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
 * Special styler combining multiple others. Shows a combobox to switch between
 * the stylers and shows parameters of current styler. Passes calls to selected
 * styler.
 */
OpenLayers.VIS.Styler.Chooser = OpenLayers.Class(OpenLayers.VIS.Styler.Base, {

	stylers : null,
	stylerStore : null,
	currentStylerIndex : null,

	initialize : function(options) {
		this.stylers = [];
		this.currentStylerIndex = 0;
		OpenLayers.VIS.Styler.Base.prototype.initialize.apply(this, arguments);

		OpenLayers.Util.extend(this, this.stylers);
		var stylerData = [];
		for ( var i = 0; i < this.stylers.length; i++) {
			for ( var key in this.stylers) {
				if (typeof this.stylers[key] != 'function') {
					this.stylers[i][key] = this.stylers[key];
				}
			}
			// OpenLayers.Util.extend(this.stylers[i], this.stylers);
			stylerData.push([ i, this.stylers[i].title || '<No Title>' ]);
		}

		this.stylerStore = new Ext.data.ArrayStore({
			fields : [ 'id', 'title' ],
			data : stylerData
		});

		this.selectStyler(this.currentStylerIndex);
	},

	getValue : function(value) {
		return this.stylers[this.currentStylerIndex].getValue(value);
	},

	getValueObject : function(value) {
		return this.stylers[this.currentStylerIndex].getValueObject(value);
	},

	getMinValue : function() {
		return this.stylers[this.currentStylerIndex].getMinValue();
	},

	getMaxValue : function() {
		return this.stylers[this.currentStylerIndex].getMaxValue();
	},

	getInts : function() {
		return this.stylers[this.currentStylerIndex].getInts();
	},

	getInterval : function(val) {
		return this.stylers[this.currentStylerIndex].getInterval(val);
	},

	setSymbology : function(symbology) {
		OpenLayers.VIS.Styler.Base.prototype.setSymbology.apply(this, arguments);
		for ( var i = 0; i < this.stylers.length; i++) {
			this.stylers[i].setSymbology(symbology);
		}
	},

	selectStyler : function(index) {
		this.currentStylerIndex = index;
		this.isFeatureStyler = this.stylers[this.currentStylerIndex].isFeatureStyler;
	},

	createParameters : function() {
		var updatePanel = null;
		var comboBoxStyler = new Ext.form.ComboBox({
			triggerAction : 'all',
			lazyRender : true,
			mode : 'local',
			store : this.stylerStore,
			valueField : 'id',
			displayField : 'title',
			editable : false,
			value : this.currentStylerIndex,
			listeners : {
				select : function(combo, record, index) {
					this.selectStyler(record.data.id);
					updatePanel.call(this);
					this.triggerChangeEvent('symbology');
				},
				scope : this
			}
		});

		var panelCurrentStyler = new Ext.form.FieldSet({
			title : this.stylers.fieldLabel || null,
			items : [ comboBoxStyler ],
			// hideLabel : true,
			hideLabels : false,
			defaults : {
				anchor : '100%'
			}
		// labelStyle : 'display:none;',
		// listeners : {
		// render : function(comp) {
		// comp.el.up('div.x-form-item').removeClass('x-hide-label');
		// comp.el.up('div.x-form-element').setStyle({
		// 'padding-left' : 0
		// });
		// }
		// }
		});

		updatePanel = function() {
			panelCurrentStyler.items.each(function(item) {
				if (item != comboBoxStyler)
					panelCurrentStyler.remove(item);
			});
			panelCurrentStyler.add(VIS.createParameterControls(this.stylers[this.currentStylerIndex]
					.createParameters(), null));
			panelCurrentStyler.doLayout();
		};
		updatePanel.call(this);

		var options = {
			// type : {
			// comp : comboBoxStyler,
			// description : '',
			// required : true
			// },
			test : {
				comp : panelCurrentStyler,
				description : '',
				required : true,
				label : false
			}
		};

		// OpenLayers.Util.extend(options,
		// this.stylers[this.currentStylerIndex].createParameters());

		return options;
	},

	restore : function(parcel) {
		this.currentStylerIndex = parcel.readInt();
		this.stylers[this.currentStylerIndex].restore(parcel);
	},

	store : function(parcel) {
		parcel.writeInt(this.currentStylerIndex);
		this.stylers[this.currentStylerIndex].store(parcel);
	}
});
