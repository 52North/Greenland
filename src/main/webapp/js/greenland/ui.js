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
if (typeof VIS == 'undefined')
	VIS = {};

/**
 * Takes option descriptions as received from the visualization service or
 * specified on feature layers and creates ExtJs controls of them. Supports type
 * integer and number, optional parameters and min/max constraints
 * 
 * @param options
 * @param onChange
 * @returns {Array}
 */
VIS.createParameterControls = function(options, onChange, legend) {

	var addOptionItems = function(key, option, paramItems) {
		var optionHandler = {
			option : option,
			changeListener : [],
			onChange : function(value, sender) {
				this.option.value = value;
				for ( var i = 0; i < this.changeListener.length; i++) {
					this.changeListener[i].call(this, sender);
				}

				if (onChange) {
					onChange.call(this);
				}
				if (this.option.action) {
					this.option.action.call(this.option.scope || this, this.option.value, this.option);
				}
			}
		};
		var paramComp;
		if (!option.type && option.comp) {
			// option has its own component
			var comp = option.comp;
			if (comp.fieldLabel == null) {
				comp.fieldLabel = option.fieldLabel || key;
			}
			// paramItems.push(comp);
			paramComp = comp;
		} else if (option.type == 'number' || option.type == 'integer') {
			// type numeric
			var prec = (option.type == 'number') ? 2 : 0;
			if (!isNaN(option.minimum) && !isNaN(option.maximum)) {
				// option has min/max constraints -> SliderField

				var slider = new Ext.form.SliderField({
					fieldLabel : option.fieldLabel || key,
					value : option.value != null ? option.value : option.minimum,
					minValue : option.type != 'integer' ? Math.round(option.minimum - 1) : option.minimum,
					maxValue : option.type != 'integer' ? Math.round(option.maximum + 1) : option.maximum,
					onChange : function(slider, value) {
						// workaround for not working 'change' event...
						Ext.form.SliderField.prototype.onChange.apply(this, arguments);
						if (this.disabled || this.ownerCt.disabled)
							return;

						// if (onChange) {
						// onChange.call(this);
						// }
						// if (this.option.action) {
						// this.option.action.call(this.option.scope || this, value);
						//
						// }
						optionHandler.onChange(value, this);
					}// ,disabled : option.value == null
				});
				// Set properties of the actual slider within the slider field
				slider.slider.increment = Math.pow(10, -prec);
				slider.slider.decimalPrecision = prec;
				optionHandler.changeListener.push(function(sender) {
					if (sender != slider) {
						slider.setValue(this.option.value);
					}
				});

				// paramItems.push(slider);

				var field = new Ext.form.NumberField({
					value : option.value != null ? option.value : option.minimum,
					listeners : {
						valid : function(f) {
							if (this.disabled || this.ownerCt.disabled)
								return;
							optionHandler.onChange(this.getValue(), this);

						}
					},
					width : 50
				// ,anchor : '100%'
				});
				optionHandler.changeListener.push(function(sender) {
					if (sender != field) {
						field.setValue(this.option.value);
					}
				});

				// Special case min = max
				if (option.minimum == option.maximum && option.value != option.minimum) {
					option.value = option.minimum;

					optionHandler.onChange(null);
				}

				paramComp = new Ext.Panel({
					layout : 'hbox',
					border : false,
					items : [ Ext.apply(slider, {
						flex : 1
					}), field ],
					anchor : '100%',
					fieldLabel : option.fieldLabel || key,
					baseCls : 'x-plain',
					disabled : option.value == null
				});

				// paramComp = slider;
			} else {
				// No min/max constraint -> NumberField
				var textfield = new Ext.form.NumberField({
					value : option.value != null ? option.value : '0',
					listeners : {
						valid : function(f) {
							if (this.disabled || this.ownerCt.disabled)
								return;
							optionHandler.onChange(this.getValue(), this);
						}
					},
					flex : 1
				// ,anchor : '100%'
				});
				optionHandler.changeListener.push(function(sender) {
					if (sender != textfield) {
						textfield.setValue(this.option.value);
					}
				});
				var okbutton = new Ext.Button({
					text : 'OK',
					handler : function() {
						textfield.validate();
					}
				});
				paramComp = new Ext.Panel({
					layout : 'hbox',
					border : false,
					paramComp : textfield,
					items : [ textfield, okbutton ],
					anchor : '100%',
					fieldLabel : option.fieldLabel || key,
					disabled : option.value == null
				});

				// paramItems.push(new Ext.Panel({
				// layout : 'hbox',
				// border : false,
				// items : [ textfield, okbutton ],
				// anchor : '100%',
				// fieldLabel : key
				// }));
			}
		} else if (option.type == 'boolean') {
			var checkbox = new Ext.form.Checkbox({
				checked : option.value != null ? option.value : false,
				listeners : {
					check : function(comp, checked) {
						if (this.disabled || this.ownerCt.disabled)
							return;
						optionHandler.onChange(checked, this);
					}
				},
				flex : 1,
				disabled : option.value == null,
				fieldLabel : option.fieldLabel || key
			// ,anchor : '100%'
			});
			optionHandler.changeListener.push(function(sender) {
				if (sender != checkbox) {
					checkbox.setValue(this.option.value);
				}
			});

			paramComp = checkbox;
		} else if (option.type == 'selectmany') {

			if (!legend) {
				// Show MutliSelect if not used in legend -> Allows to directly select
				// items in list view

				// Store with all items
				var itemStore = new Ext.data.ArrayStore({
					expandData : true,
					fields : [ 'value' ],
					sortInfo : {
						field : 'value',
						direction : 'ASC'
					}
				});
				itemStore.loadData(option.items);

				// TODO maybe change to gridview
				// listView component
				var listView = new Ext.list.ListView({
					store : itemStore,
					anchor : '100%',
					height : 250,
					autoScroll : true,
					hideHeaders : true,
					displayField : 'value',
					fieldLabel : option.fieldLabel || key,
					multiSelect : true,
					reserveScrollOffset : true,
					columns : [ {
						header : 'Value',
						dataIndex : 'value'
					} ],
					listeners : {
						selectionchange : function(comp, selections) {
							if (this.disabled || (this.ownerCt && this.ownerCt.disabled))
								return;
							var selectedValues = [];
							var selectedRecords = comp.getSelectedRecords();
							for ( var i = 0, len = selectedRecords.length; i < len; i++) {
								selectedValues.push(selectedRecords[i].data.value);
							}
							optionHandler.onChange(selectedValues, this);
						},
						afterrender : function(comp) {
							// Find records in listview corresponding to currently
							// selected
							// option
							// items to also select them in the view
							var recordsToSelect = [];
							var valueCopy = option.value.slice(0); // Clone currently
							// selected
							// option items
							var records = itemStore.data.items;
							var valueIndex;
							for ( var i = 0; i < records.length; i++) {
								if ((valueIndex = valueCopy.indexOf(records[i].data.value)) >= 0) {
									recordsToSelect.push(records[i]);
									valueCopy.splice(valueIndex, 1);
								}
							}
							comp.select(recordsToSelect, false);
						}
					}
				});

				paramComp = listView;
			} else {

				// Simple text and link to selection window if used in legend

				function getText(value) {
					value = (value || []);
					if (value.length <= 5)
						return value.join(', ');
					else {
						return value.slice(0, 5).join(', ') + '... (' + (value.length - 5) + ' more)';
					}
				}

				var selectionLabel = new Ext.form.Label({
					text : getText(option.value)
				});
				optionHandler.changeListener.push(function(sender) {
					selectionLabel.setText(getText(option.value));
				});

				var changeButton = new Ext.Button({
					text : 'Select...',
					handler : function() {
						VIS.showSelectManyWindow(optionHandler);
					},
					scope : this
				});

				paramComp = new Ext.Panel({
					items : [ selectionLabel, changeButton ],
					border : false,
					anchor : '100%',
					fieldLabel : option.fieldLabel || key
				});
			}
		} else if (option.type == 'selectone') {

			var itemStore = new Ext.data.ArrayStore({
				fields : [ 'value', 'name' ],
				sortInfo : {
					field : 'name',
					direction : 'ASC'
				}
			});

			var storeData = [], storeRec;
			for ( var k = 0, lenK = option.items.length; k < lenK; k++) {
				storeRec = [ option.items[k] ];
				if (option.hasOwnProperty('toString')) {
					storeRec.push(option.toString(storeRec[0]));
				} else {
					storeRec.push(storeRec[0]);
				}
				storeData.push(storeRec);
			}

			itemStore.loadData(storeData);

			var combobox = new Ext.form.ComboBox({
				value : option.value != null ? option.value : '',
				triggerAction : 'all',
				lazyRender : true,
				mode : 'local',
				store : itemStore,
				valueField : 'value',
				displayField : 'name',
				fieldLabel : option.fieldLabel || key,
				editable : false,
				listeners : {
					select : function(comp, record) {
						if (this.disabled || this.ownerCt.disabled)
							return;
						optionHandler.onChange(record.data.value, this);
					}
				}
			});
			optionHandler.changeListener.push(function(sender) {
				if (sender != combobox) {
					combobox.setValue(this.option.value);
				}
			});
			paramComp = combobox;

		} else {
			return;
		}

		if (option.required === false) {
			// Option not required -> add checkbox to set value to null or restore
			// previously set value
			var checkBox = new Ext.form.Checkbox({
				buddy : paramComp,
				checked : option.value != null,
				handler : function(box, checked) {
					// var option = this.buddy.option || this.buddy.paramComp.option;
					var option = optionHandler.option;
					if (!checked) {
						option.cachedValue = option.value;
						this.buddy.disable();

						// option.value = null;
						optionHandler.onChange(null, this);
					} else {
						// option.value = option.cachedValue || option.defaultValue ||
						// option.minimum;
						this.buddy.enable();
						optionHandler.onChange(option.cachedValue || option.defaultValue || option.minimum, this);

						// var setValueComp = this.buddy.setValue ? this.buddy :
						// this.buddy.paramComp;
						// setValueComp.setValue.call(setValueComp, option.value);

					}
					// if (onChange) {
					// onChange.call(this);
					// }
					// if (option.action) {
					// option.action.call(option.scope || this, option.value);
					// }
				}
			});
			// paramComp.setDisabled(option.value == null);

			paramComp = new Ext.Panel({
				layout : 'hbox',
				border : false,
				items : [ checkBox, Ext.apply(paramComp, {
					flex : 1
				}) ],
				anchor : '100%',
				fieldLabel : option.fieldLabel || key,
				baseCls : 'x-plain'
			});
		}

		if (option.label === false) {
			paramComp.hideLabel = true;
			// TODO can not define defaults after layout
			paramComp.defaults = {
				anchor : '100%'
			};

			paramComp.labelStyle = 'display:none;';
			paramComp.on('render', function(comp) {
				comp.el.up('div.x-form-item').removeClass('x-hide-label');
				comp.el.up('div.x-form-element').setStyle({
					'padding-left' : 0
				});
			});
		}

		paramItems.push(paramComp);
		paramItems.push(new Ext.form.Label({
			text : option.description,
			fieldLabel : ' ',
			labelSeparator : ''
		}));
	};

	var paramItems = [];
	for ( var key in options) {
		addOptionItems(key, options[key], paramItems);
	}
	return paramItems;
};

/**
 * Shows a window for selectmany parameter options
 * 
 * @param optionHandler
 */
VIS.showSelectManyWindow = function(optionHandler) {
	// TODO Find alternative for Ext.ux.form.ItemSelector, no resizing
	// capabilities

	var items = optionHandler.option.items;
	var selectedItems = optionHandler.option.value || []; // if value == null ->
	// no items selected
	var availableItems = [];

	for ( var i = 0; i < items.length; i++) {
		if (selectedItems.indexOf(items[i]) == -1) {
			availableItems.push(items[i]);
		}
	}

	var availableItemsStore = new Ext.data.ArrayStore({
		expandData : true,
		fields : [ 'value' ],
		sortInfo : {
			field : 'value',
			direction : 'ASC'
		}
	});
	availableItemsStore.loadData(availableItems);

	var selectedItemsStore = new Ext.data.ArrayStore({
		expandData : true,
		fields : [ 'value' ],
		sortInfo : {
			field : 'value',
			direction : 'ASC'
		}
	});
	selectedItemsStore.loadData(selectedItems);

	var selector = new Ext.ux.form.ItemSelector({
		fieldLabel : 'Procedures',
		imagePath : 'js/ExtUx/images/',
		multiselects : [ {
			width : 250,
			height : 320,
			store : availableItemsStore,
			valueField : 'value',
			displayField : 'value'
		}, {
			width : 250,
			height : 320,
			store : selectedItemsStore,
			valueField : 'value',
			displayField : 'value',
			tbar : [ {
				text : 'clear',
				handler : function() {
					selector.reset();
				}
			} ]
		} ],
		listeners : {
			change : function(comp) {
				if (this.disabled || this.ownerCt.disabled)
					return;

				var selectedValues = [];
				selectedItemsStore.each(function(record) {
					selectedValues.push(record.data.value);
				});

				optionHandler.onChange(selectedValues, this);
			}
		}
	});

	selWindow = new Ext.Window({
		title : 'Select Items',
		layout : 'fit',
		items : [ selector ],
		height : 370,
		width : 550,
		constrainHeader : true
	});
	selWindow.show();
};

function showMapSettings(map) {

	var supportedSrs = {};
	supportedSrs[map.getProjection()] = true;
	for ( var i = 0, len = map.layers.length; i < len; i++) {
		var layer = map.layers[i];
		if (layer.supportedSrs) {
			OpenLayers.Util.extend(supportedSrs, layer.supportedSrs);
		}
	}

	var srsData = [];
	for ( var srs in supportedSrs) {
		if (srs.substr(0, 4) == 'EPSG') {
			// Only EPSG
			srsData.push([ srs, VIS.getProjectionTitle(srs) ]);
		}
	}
	var srsStore = new Ext.data.ArrayStore({
		idIndex : 0,
		fields : [ 'code', 'title' ],
		data : srsData
	});

	// Only EPSG
	var srsNumberField = new Ext.form.NumberField({
		fieldLabel : 'EPSG Code',
		value : map.getProjection().substr(5)
	});

	var srsGrid = new Ext.grid.GridPanel({
		xtype : 'grid',
		store : srsStore,
		height : 200,
		columns : [ {
			header : 'Code',
			sortable : true,
			dataIndex : 'code'
		}, {
			header : 'Title',
			sortable : true,
			dataIndex : 'title'
		} ]
	});

	srsGrid.getSelectionModel().on('rowselect', function(model, undex, record) {
		srsNumberField.setValue(record.data.code.substr(5));
	});

	var loadingMask = null;
	var window = null;
	window = new Ext.Window({
		layout : 'form',
		title : 'Map Settings',
		items : [ {
			xtype : 'fieldset',
			title : 'SRS',
			items : [ {
				xtype : 'label',
				text : 'Specify the projection to use for this map.'
			}, srsNumberField ]
		}, {
			xtype : 'fieldset',
			title : 'Supported SRS',
			items : [ {
				xtype : 'label',
				text : 'Projections supported by layers in this map'
			}, srsGrid ]
		} ],
		height : 400,
		width : 350,
		constrainHeader : true,
		listeners : {
			render : function() {
				// LoadMask has to be set for a rendered component
				loadingMask = new Ext.LoadMask(this.getEl(), {
					msg : 'Loading Projection Information...'
				});
			}
		},
		buttons : [ {
			text : 'OK',
			handler : function() {
				var projCode = 'EPSG:' + srsNumberField.getValue();
				loadingMask.show();
				VIS.getProjection(projCode, function(projection) {
					loadingMask.hide();
					map.reprojecting = true;
					var oldCenter = map.getCenter(), oldProj = map.getProjectionObject();
					map.projection = projection;
					map.maxExtent = new OpenLayers.Bounds(OpenLayers.Projection.defaults[projCode].maxExtent);

					var baseLayer = new OpenLayers.Layer('None', {
						isBaseLayer : true,
						projection : projection
					});

					map.addLayers([ baseLayer ]);

					map.setBaseLayer(baseLayer);
					map.setCenter(oldCenter.transform(oldProj, projection));
					map.reprojecting = false;
					window.close();
				});
			}
		}, {
			text : 'Cancel',
			handler : function() {
				window.close();
			}
		} ]
	});

	window.show();
}
