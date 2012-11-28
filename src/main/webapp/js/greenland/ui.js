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
/**
 * Shows a message box with an error text automatically truncated to a maximum
 * length
 * 
 */
function showServerError(error, title) {
	var message = error.message;
	if (message.length > 150) {
		message = message.substring(0, 150) + "...";
	}
	Ext.Msg.alert(title ? title : 'Error', message);
}

/**
 * Shows a window to select a new layer to be added to the specified
 * OpenLayers.Map object. Shows different data sources and visualizations and
 * allows specification of new resources.
 */
function showResourceWindow(map, resources, requestParam) {
	resources = resources || defaultResources;
	var layerList = new Ext.ux.VIS.ResourceNodesContainer();
	layerList.addResources(resources);

	var loadingMask = null; // will hold a Ext.LoadMask object to display a
	// loading mask while fetching server data

	var buttonAdd = new Ext.Button({
		text : 'Add to Map',
		disabled : true
	});

	// Right panel
	var resourceDetails = new Ext.form.FormPanel({
		autoScroll : true,
		region : 'east',
		width : 280,
		listeners : {
			render : function() {
				// LoadMask has to be set for a rendered component
				loadingMask = new Ext.LoadMask(this.getEl(), {
					msg : 'Please wait...'
				});
			}
		},
		bbar : [ '->', buttonAdd ],
		title : 'Details'
	});

	/**
	 * Loads last level of resource loading process, displays layer parameters (if
	 * available)
	 * 
	 * @param attributes
	 * @param allowImmediately
	 *          Allows to directly add layer to map if it has no parameters
	 */
	function loadLayer(attributes, allowImmediately) {

		if (loadingMask != null) {
			loadingMask.show();
		}

		// Loading result options should return a layer instance
		VIS.ResourceLoader.loadResourceOptions(attributes, function(result) {

			if (loadingMask != null) {
				loadingMask.hide();
			}
			resourceDetails.removeAll();

			if (result instanceof Error) {
				// Error handling
				Ext.Msg.alert('Error', Ext.util.Format.htmlEncode(result.message));
				return;
			} else if (result instanceof OpenLayers.Layer) {

				if (result.warning) {
					Ext.Msg.alert('Warning', result.warning);
				}

				// Set button handler
				buttonAdd.setText('Add to Map');
				buttonAdd.handler = function() {
					// add layer to map
					if (result != null) {
						map.addLayers([ result ]);
						delete result;
						resourceDetails.removeAll();
						buttonAdd.handler = function() {
						};
						buttonAdd.setDisabled(true);
					}
				};
				buttonAdd.setDisabled(false);

				// Create parameter controls
				var paramItems = createParameterControls(result.getParameterOptions());
				if (paramItems.length != 0) {
					resourceDetails.add({
						xtype : 'fieldset',
						title : 'Info',
						items : [ {
							xtype : 'label',
							text : 'The following parameters need to be set for this visualization.'
						} ]
					});
					resourceDetails.add(new Ext.form.FieldSet({
						title : 'Parameters',
						items : paramItems,
						labelWidth : 80
					}));

					resourceDetails.doLayout();

				} else if (allowImmediately === true) {
					// No parameters to set, directly add layer by calling button handler
					// if allowed
					buttonAdd.handler.call(this);
				} else {
					resourceDetails.add({
						xtype : 'fieldset',
						title : 'Info',
						items : [ {
							xtype : 'label',
							text : 'This visualization does not require any parameters.'
						} ]
					});

					resourceDetails.doLayout();
				}
			}

		});
	}

	/**
	 * Function called while loading resources to intercept wms layer loading.
	 * Allows user to set required layer information. Should return directly if
	 * attributes already contains all necessary information (automatic assignment
	 * based on WMS-Q metadata).
	 * 
	 * @param attributes
	 * @returns
	 */
	function assignLayers(attributes) {
		if (!attributes.requiredLayers) {
			return {};
		}

		var requiredLayers = attributes.requiredLayers;

		// Returns a layer configuration object matching names to layer entries from
		// requiredLayers structure based on WMS-Q metadata contained in
		// GetCapabilities response
		var autoMatching = function(reqLayers) {
			var layers = {};

			// prepare result object
			for ( var layerKey in reqLayers.layers) {
				layers[layerKey] = {};
			}

			// Gets uncertainty keyword from a nested layer WMS capabilities node
			var getUncertainty = function(nestedLayer) {
				if (!nestedLayer.keywords) {
					return null;
				}
				for ( var j = 0; j < nestedLayer.keywords.length; j++) {
					if (nestedLayer.keywords[j].vocabulary == 'http://www.uncertml.org/distributions/') {
						return nestedLayer.keywords[j].value;

					}
				}
				return null;
			};

			// Find matching layer descriptions from the requiredLayers structure for
			// each layer described in the capabilities response
			var nestedLayer, uncertaintyKeyword;
			for ( var i = 0; i < attributes.wmsLayer.nestedLayers.length; i++) {
				// For each specified layer from the capabilities
				nestedLayer = attributes.wmsLayer.nestedLayers[i];
				uncertaintyKeyword = getUncertainty(nestedLayer);

				if (uncertaintyKeyword == null) {
					// Layer has no uncertainty keyword
					continue;
				}

				for ( var layerKey in reqLayers.layers) {
					// For each layer description in requiredLayers
					if (!reqLayers.layers[layerKey].uncertainty) {
						continue;
					}
					compatible = reqLayers.layers[layerKey].uncertainty[uncertaintyKeyword];
					if (compatible != null) {
						if (layers[layerKey].name != null && layers[layerKey].transformFunc == null) {
							// Already found best match, i.e. has match which needs no
							// transformFunc
							continue;
						}
						layers[layerKey].name = nestedLayer.name;
						layers[layerKey].usedKeyword = uncertaintyKeyword;
						if (compatible !== true) {
							layers[layerKey].transformFunc = compatible;
						}
					}
				}
			}

			return layers;

		};

		// Creates combobox for all available WMS layers as defined in
		// GetCapabilities
		var createLayerComboBox = function() {
			var data = [];
			for ( var i = 0; i < attributes.wmsLayer.nestedLayers.length; i++) {
				data
						.push([
								attributes.wmsLayer.nestedLayers[i].name,
								attributes.wmsLayer.nestedLayers[i].title
										|| attributes.wmsLayer.nestedLayers[i].name ]);
			}

			return new Ext.form.ComboBox({
				triggerAction : 'all',
				lazyRender : true,
				mode : 'local',
				store : new Ext.data.ArrayStore({
					id : 0,
					fields : [ 'name', 'title' ],
					data : data
				}),
				valueField : 'name',
				displayField : 'title',
				fieldLabel : 'Layer',
				editable : false,
				anchor : '100%',
				allowBlank : false
			});
		};

		// Creates Combobox for all available requiredLayers configurations
		var createRequiredLayersTypeCombo = function() {
			var data = [];
			for ( var key in requiredLayers) {
				data.push([ key, requiredLayers[key].title || key ]);
			}

			return new Ext.form.ComboBox({
				triggerAction : 'all',
				lazyRender : true,
				mode : 'local',
				store : new Ext.data.ArrayStore({
					id : 0,
					fields : [ 'type', 'title' ],
					data : data
				}),
				valueField : 'type',
				displayField : 'title',
				fieldLabel : 'Layer Configuration',
				editable : false,
				anchor : '100%',
				allowBlank : false
			});
		};

		// Performs a GetMetadata request (ncWMS extension) to get min/mx values for
		// a specific WMS layer
		// Callback receives object with min and max
		var getScaleRange = function(name, callback) {
			var url = attributes.url;
			// Use GetMetadata URL as specified in capabilities
			if (attributes.capabilities && attributes.capabilities.capability
					&& attributes.capabilities.capability.request
					&& attributes.capabilities.capability.request.getmetadata) {
				url = attributes.capabilities.capability.request.getmetadata.href || url;
			}

			// Request
			OpenLayers.Request.GET({
				url : url,
				params : {
					item : 'layerDetails',
					layerName : name,
					request : 'GetMetadata'
				},
				success : function(resp) {
					var details = new OpenLayers.Format.JSON().read(resp.responseText);
					callback({
						min : Math.floor(details.scaleRange[0]),
						max : Math.ceil(details.scaleRange[1])
					});
				},
				failure : function(resp) {
					callback(new Error(resp.responseText));
				}
			});
		};

		var requiredLayersType = null;
		// Holds currently selected requiredLayers configuration type
		var layers = {}; // Holds components for each required layers

		resourceDetails.removeAll();

		resourceDetails.add(new Ext.form.FieldSet({
			title : 'Info',
			items : [ {
				xtype : 'label',
				text : 'Please assign WMS layers to the inputs required by this visualization below.'
			} ]
		}));

		// Panel will be used for the UI of the different requiredLayers
		// configurations
		var assignmentPanel = new Ext.Panel({
			layout : 'form',
			border : false
		});

		// Build the UI for a specific requiredLayers configuration, identified by
		// its type
		var updateLayerAssigmentItems = function(type) {

			var items = [], layerItems;
			requiredLayersType = type;
			layers = {};
			var requiredLayersForType = requiredLayers[requiredLayersType];

			var autoMatchedLayers = autoMatching(requiredLayersForType);

			for ( var key in requiredLayersForType.layers) {
				// Create layername, min and max components for each layer
				layers[key] = {};
				layerItems = [];
				if (autoMatchedLayers[key].usedKeyword) {
					// Auto matching info
					layerItems.push({
						xtype : 'label',
						fieldLabel : '',
						text : 'Automatic assignment based on uncertainty keyword "'
								+ autoMatchedLayers[key].usedKeyword + '"'
					});
				}

				if (autoMatchedLayers[key].name) {
					layerItems.push({
						xtype : 'label',
						fieldLabel : 'Layer',
						text : autoMatchedLayers[key].name
					});
					layers[key].name = autoMatchedLayers[key].name;
				} else {
					layerItems.push(layers[key].name = createLayerComboBox());
				}

				layerItems.push(layers[key].min = new Ext.form.NumberField({
					fieldLabel : 'Min',
					allowBlank : false,
					anchor : '100%',
					value : autoMatchedLayers[key].min
				}));

				layerItems.push(layers[key].max = new Ext.form.NumberField({
					fieldLabel : 'Max',
					allowBlank : false,
					anchor : '100%',
					value : autoMatchedLayers[key].max
				}));

				if (autoMatchedLayers[key].name) {
					// Automatically matched layer
					if (autoMatchedLayers[key].transformFunc != null) {
						// Transformation function set
						layerItems.push({
							xtype : 'label',
							fieldLabel : '',
							text : 'Automatic Transformation'
						});
						layers[key].transformFunc = autoMatchedLayers[key].transformFunc;
					}
				} else {
					layerItems.push(layers[key].transformFunc = new Ext.form.TextField({
						fieldLabel : 'Function f(x) = ',
						allowBlank : true,
						anchor : '100%',
						validator : function(value) {
							try {
								VIS.convertUserDefinedFunction(value, [ 'x' ]);
								return true;
							} catch (e) {
								return e;
							}
						}
					}));
				}

				// Add button for automatic scalerange detection
				layerItems.push(new Ext.Panel({
					layout : 'hbox',
					border : false,
					items : [
							new Ext.Spacer({
								flex : 1
							}),
							new Ext.Button({
								text : 'Auto',
								layers : layers[key],
								handler : function() {
									this.setDisabled(true);
									getScaleRange(this.layers.name.getValue ? this.layers.name.getValue()
											: this.layers.name, function(scale) {
										if (!(scale instanceof Error)) {
											this.layers.min.setValue(scale.min);
											this.layers.max.setValue(scale.max);
										}
										this.setDisabled(false);
									}.createDelegate(this));
								}
							}) ]
				}));

				// Optional description text
				if (requiredLayersForType.layers[key].description) {
					layerItems.push(new Ext.form.Label({
						text : requiredLayersForType.layers[key].description,
						fieldLabel : 'Description'
					}));
				}

				items.push(new Ext.form.FieldSet({
					title : requiredLayersForType.layers[key].title || key,
					items : layerItems,
					labelWidth : 100
				}));
			}

			assignmentPanel.removeAll();
			assignmentPanel.add(items);
			assignmentPanel.doLayout();
		};

		// Build UI
		var typeCombo = createRequiredLayersTypeCombo();
		if (typeCombo.getStore().getCount() != 1) {
			// Use Combobox for different requiredLayers types
			typeCombo.on('select', function(combo, record, index) {
				updateLayerAssigmentItems(record.data.type);
			});
			resourceDetails.add(typeCombo);

			// Find completely automatically assignable layer configuration
			for ( var typeKey in requiredLayers) {
				var autoMatchedLayers = autoMatching(requiredLayers[typeKey]);
				complete = true;
				// Check if every required layer has a name
				for ( var key in autoMatchedLayers) {
					if (!autoMatchedLayers[key].name) {
						complete = false;
						break;
					}
				}

				if (complete) {
					// Found matched layer configuration
					updateLayerAssigmentItems(typeKey);
					typeCombo.setValue(typeKey);
					break;
				}
			}
		} else {
			// Use first requiredLayers type if there is only one configuration
			updateLayerAssigmentItems(typeCombo.getStore().getAt(0).data.type);
		}

		resourceDetails.add(assignmentPanel);
		resourceDetails.doLayout();

		buttonAdd.setText('Next');
		buttonAdd.handler = function() {
			if (!resourceDetails.form.isValid()) {
				return;
			}
			// Get layer config from UI field values, project each value of 'layers'
			// using the getValue function
			layerConfig = {};
			for ( var layerKey in layers) {
				layerConfig[layerKey] = {};
				for ( var key in layers[layerKey]) {
					layerConfig[layerKey][key] = layers[layerKey][key].getValue ? layers[layerKey][key]
							.getValue() : layers[layerKey][key];
				}
			}

			// Actual resource loading options which are passed to the next loading
			// step/level
			attributes.layers = layerConfig;
			attributes.requiredLayersType = requiredLayersType;

			loadLayer(attributes, true);
		};
		buttonAdd.setDisabled(false);
	}

	// Resources tree
	var layerTree = new Ext.tree.TreePanel({
		title : 'Resources',
		root : layerList,
		region : 'center',
		rootVisible : false,
		autoScroll : true,
		listeners : {
			click : function(node, e) {
				if (node.leaf === true && node.attributes.resourceLoader) {
					// Node is leaf node

					if (node.attributes.resourceLoader == 'ncwms_layer' && node.attributes.requiredLayers) {
						// Intercept WMS loading
						// TODO method may have return value when automatic layer matching
						// works
						assignLayers(node.attributes);

						return;
					}

					loadLayer(node.attributes);

				}
			},
			contextmenu : function(node, e) {
				var menuItems = [];

				// Reload function in context menu
				menuItems.push({
					text : 'Reload',
					handler : function() {
						node.reload();
					}
				});

				// Manually added resources get a remove option in context menu
				if (node.attributes.resourceId != null) {
					menuItems.push({
						text : 'Remove',
						handler : function() {
							layerList.removeResource(node.attributes.resourceId);
							for ( var i = 0; i < defaultResources.length; i++) {
								if (defaultResources[i].resourceId != null
										&& defaultResources[i].resourceId == node.attributes.resourceId) {
									defaultResources.splice(i, 1);
									break;
								}
							}
						}
					});
				}

				// Show menu if it got items
				if (menuItems.length > 0) {
					var menu = new Ext.menu.Menu({
						items : menuItems
					});
					menu.showAt(e.getXY());
				}

			}
		}
	});

	var windowItems = [];

	if (requestParam !== true) {
		// Add general add resources dialog if not shown for adding request
		// parameters resource
		var comboBoxType = createInputTypeComboBox(); // combobox of supported input
		// data types

		var textFieldURL = new Ext.form.TextField({
			fieldLabel : 'URL',
			anchor : '100%'
		});

		var buttonNewResource = new Ext.Button({
			text : 'Add',
			handler : function() {
				if (comboBoxType.getValue().length > 0 && textFieldURL.getValue().length > 0) {
					// Add new resource
					var newResource = {
						resourceId : nextResourceId++,
						vissUrl : vissUrl,
						url : textFieldURL.getValue(),
						mime : comboBoxType.getValue()
					};
					layerList.addResource(newResource);
					defaultResources.push(newResource);

					comboBoxType.reset();
					textFieldURL.reset();
				}
			}
		});

		var buttonAdvancedResource = new Ext.Button({
			text : 'Advanced...',
			handler : function() {
				// Show window to specify a request as datasource
				showAdvancedNewResourceWindow(layerList, textFieldURL.getValue(), comboBoxType.getValue());
			}
		});

		var addResourcePanel = new Ext.form.FormPanel({
			title : 'Add Resource',
			region : 'south',
			height : 150,
			labelWidth : 50,
			padding : 5,
			items : [ textFieldURL, comboBoxType ],
			bbar : [ buttonAdvancedResource, '->', buttonNewResource ]
		});

		windowItems.push({
			region : 'center',
			layout : 'border',
			defaults : {
				split : true
			},
			items : [ layerTree, addResourcePanel ]
		});
	} else {
		// Special dialog for adding resources from request parameter
		// Does not include adding custom resources

		layerTree.expandAll();
		windowItems.push(layerTree);
	}

	windowItems.push(resourceDetails);

	// Show window
	new Ext.Window({
		title : 'Add Resource',
		layout : 'border',
		defaults : {
			split : true
		},
		items : windowItems,
		height : 400,
		width : 600,
		constrainHeader : true
	}).show();

}

/**
 * Creates a combobox of supported resource types with mime as item value
 * 
 * @returns {Ext.form.ComboBox}
 */
function createInputTypeComboBox() {
	var comboBoxType = new Ext.form.ComboBox({
		triggerAction : 'all',
		lazyRender : true,
		mode : 'local',
		store : new Ext.data.ArrayStore({
			id : 0,
			fields : [ 'name', 'mime' ],
			data : [
					[ 'NetCDF (*.nc)', 'application/netcdf' ],
					[ 'GeoTIFF (*.tiff)', 'image/geotiff' ],
					[ 'ncWMS(-Q) Resource', 'ncwms' ],
					[ 'WMS Resource', 'wms' ],
					[ 'O&M2 Raster', 'application/vnd.ogc.om+xml' ],
					[ '', null ],
					[ 'O&M Vector (*.xml)', 'application/xml' ],
					[ 'O&M2 Vector(*.xml)', 'application/x-om-u+xml' ],
					[ 'JSOM (*.json)', 'application/x-om-u+json' ],
					[ 'Uncertainty Collection',
							'application/vnd.org.uncertweb.viss.uncertainty-collection+json' ] ]
		}),
		valueField : 'mime',
		displayField : 'name',
		fieldLabel : 'Type',
		editable : false
	});

	return comboBoxType;
}

/**
 * Shows a windows to add a custom resource with advanced options, such as a
 * request string
 * 
 * @param layerList
 *          layer list from resource window
 * @param url
 *          preset url
 * @param typeValue
 *          preset resource type
 */
function showAdvancedNewResourceWindow(layerList, url, typeValue) {
	var advWindow;

	var comboBoxType = createInputTypeComboBox();
	comboBoxType.setValue(typeValue);

	var textFieldURL = new Ext.form.TextField({
		fieldLabel : 'URL',
		anchor : '100%',
		value : url
	});

	var textAreaRequest = new Ext.form.TextArea({
		fieldLabel : 'Request',
		anchor : '100% -50'
	});

	var buttonNewResource = new Ext.Button({
		text : 'Add',
		handler : function() {
			if (comboBoxType.getValue().length > 0
					&& (textFieldURL.getValue().length > 0 || textAreaRequest.getValue().length > 0)) {
				var newResource = {
					resourceId : nextResourceId++,
					vissUrl : vissUrl,
					url : textFieldURL.getValue(),
					mime : comboBoxType.getValue(),
					request : textAreaRequest.getValue()
				};
				layerList.addResource(newResource);
				defaultResources.push(newResource);
				advWindow.close();
			}
		}
	});

	var addResourcePanel = new Ext.form.FormPanel({
		title : 'Add Resource',
		region : 'south',
		height : 150,
		labelWidth : 50,
		padding : 5,
		items : [ textFieldURL, comboBoxType, textAreaRequest ],
		bbar : [ '->', buttonNewResource ]
	});

	// Show window
	advWindow = new Ext.Window({
		title : 'Add new Resource',
		layout : 'fit',
		items : [ addResourcePanel ],
		height : 300,
		width : 350,
		constrainHeader : true
	});
	advWindow.show();
}

/**
 * Takes option descriptions as received from the visualization service or
 * specified on feature layers and creates ExtJs controls of them. Supports type
 * integer and number, optional parameters and min/max constraints
 * 
 * @param options
 * @param onChange
 * @returns {Array}
 */
function createParameterControls(options, onChange, legend) {

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
			comp.fieldLabel = key;
			// paramItems.push(comp);
			paramComp = comp;
		} else if (option.type == 'number' || option.type == 'integer') {
			// type numeric
			var prec = (option.type == 'number') ? 2 : 0;
			if (!isNaN(option.minimum) && !isNaN(option.maximum)) {
				// option has min/max constraints -> SliderField

				var slider = new Ext.form.SliderField({
					fieldLabel : key,
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
					fieldLabel : key,
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
					fieldLabel : key,
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
				value : option.value != null ? option.value : false,
				listeners : {
					check : function(comp, checked) {
						if (this.disabled || this.ownerCt.disabled)
							return;
						optionHandler.onChange(checked, this);
					}
				},
				flex : 1,
				disabled : option.value == null,
				fieldLabel : key
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
					fieldLabel : key,
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
						showSelectManyWindow(optionHandler);
					},
					scope : this
				});

				paramComp = new Ext.Panel({
					items : [ selectionLabel, changeButton ],
					border : false,
					anchor : '100%',
					fieldLabel : key
				});
			}
		} else if (option.type == 'selectone') {

			var itemStore = new Ext.data.ArrayStore({
				expandData : true,
				fields : [ 'value' ],
				sortInfo : {
					field : 'value',
					direction : 'ASC'
				}
			});
			itemStore.loadData(option.items);

			var combobox = new Ext.form.ComboBox({
				value : option.value != null ? option.value : '',
				triggerAction : 'all',
				lazyRender : true,
				mode : 'local',
				store : itemStore,
				valueField : 'value',
				displayField : 'value',
				fieldLabel : key,
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
						optionHandler.onChange(option.cachedValue || option.defaultValue || option.minimum,
								this);

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
				fieldLabel : key,
				baseCls : 'x-plain'
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
}

/**
 * Shows a window for selectmany parameter options
 * 
 * @param optionHandler
 */
function showSelectManyWindow(optionHandler) {
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
}

/**
 * Shows a window with details of a specific feature, see overloaded function
 * for details.
 * 
 * @param feature
 */
function createFeatureWindow(feature) {
	createFeatureWindow([ feature ], feature.layer);
}

/**
 * Shows details for a specific feature of a OpenLayers.Layer.VIS.Vector layer.
 * Gets plot data from the feature layer's resultValue and maintains its click
 * and select events
 * 
 * @param features
 * @param layer
 */
function createFeatureWindow(features, layer) {

	var resultValue = layer.resultValue;
	// Result value maps feature attributes to a map value, offers functions to
	// create flot plots of its data and to interact with them by managing click
	// and select events. For that purpose, the resultValue can provide clickInfo
	// structures for flot feature points and offer a createSubPlotPanel method
	// which gets the clicked/selected clickInfo structures as argument

	var tabPanel = new Ext.TabPanel({
		enableTabScroll : true,
		plugins : new Ext.ux.TabCloseMenu(),
		items : [],
		activeTab : 0
	});

	var plotPanel = resultValue.createPlotPanel(features, layer, {
		closable : false,
		padding : 5,
		title : resultValue.title
	});

	// Click handling -> create sub plot for clicked feature with clickInfo
	plotPanel.on('plotclick', function(event, pos, item) {
		if (item && item.series.clickInfos) {
			var clickInfo = item.series.clickInfos[item.dataIndex];
			if (clickInfo) {
				var itemId = item.dataIndex + '-' + item.dataIndex + '_' + item.seriesIndex;
				tabPanel.add(resultValue.createSubPlotPanel([ clickInfo ], {
					itemId : itemId,
					closable : true
				}));
				tabPanel.setActiveTab(itemId);
			}
		}
	});

	// Selection handling -> create sub plots for each selected clickInfo point
	plotPanel.on('plotselected', function(event, ranges, plot) {
		var series = plot.getData();
		for ( var i = 0, countSeries = series.length; i < countSeries; i++) {
			if (!series[i].clickInfos)
				continue;
			var clickInfos = [];
			var data = series[i].data;
			var minX = Number.MAX_VALUE, maxX = Number.MIN_VALUE;
			for ( var j = 0, countData = data.length; j < countData; j++) {
				if (!data[j])
					continue;

				if (data[j][0] >= ranges.xaxis.from && data[j][0] <= ranges.xaxis.to) {
					minX = Math.min(minX, data[j][0]);
					maxX = Math.max(maxX, data[j][0]);
					clickInfos.push(series[i].clickInfos[j]);
				}
			}
			if (clickInfos.length == 0)
				continue;

			var itemId = minX + '-' + maxX + '_' + i;
			tabPanel.add(resultValue.createSubPlotPanel(clickInfos, {
				itemId : itemId,
				closable : true
			}));
			tabPanel.setActiveTab(itemId);
		}
	});

	tabPanel.add(plotPanel);

	// Create and show window. Special functions and event handling to show a
	// indicator to mark the corresponding feature
	var window = new Ext.Window(
			{
				layout : 'fit',
				title : layer.getTitle() || '',
				// title : feature.getHumanReadableObservedProperty(), // + ' - ' +
				// feature.getFoiId(),
				items : [ tabPanel ],
				height : 400,
				width : 550,
				constrainHeader : true,
				initDraggable : function() {
					// Augment Ext.Window.DD for this window to fire drag event
					Ext.Window.prototype.initDraggable.call(this);
					this.dd.onDrag = Ext.Window.DD.prototype.onDrag.createSequence(function() {
						this.win.fireEvent('drag');
					});
				},
				// Marker to illustrate selected feature
				featureArrow : new Ext.ux.VIS.FeatureArrow({
					renderTo : document.body,
					style : {
						position : 'absolute',
						pointerEvents : 'none'
					},
					symbolizers : [ {
						fillColor : 'gray',
						pointerEvents : 'none',
						fillOpacity : 0.4,
						strokeWidth : 0
					} ],
					hidden : features.length != 1
				}),
				// Function takes current window and feature position to update
				// featureArrow
				updateFeatureIndicator : function() {
					if (features.length != 1)
						return;
					var feature = features[0];

					if (feature.onScreen()) {
						var winPos;
						if (this.activeGhost) {
							// Use "ghost" Element for window position if
							// existing, since getPosition() is not working
							// while dragging windows
							winPos = [ this.activeGhost.getLeft(), this.activeGhost.getTop() ];
						} else {
							winPos = this.getPosition();
						}
						var centroid = feature.geometry.getCentroid();
						var viewportpx = feature.layer.map.getPixelFromLonLat(new OpenLayers.LonLat(centroid.x,
								centroid.y));
						var viewportEl = Ext.get(feature.layer.map.viewPortDiv);
						var featurePos = [ viewportpx.x + viewportEl.getLeft(),
								viewportpx.y + viewportEl.getTop() ];

						this.featureArrow.setEndPosition(featurePos[0], featurePos[1]);

						var topOffset = winPos[1] - featurePos[1];
						var bottomOffset = featurePos[1] - (winPos[1] + this.getHeight());
						var leftOffset = winPos[0] - featurePos[0];
						var rightOffset = featurePos[0] - (winPos[0] + this.getWidth());

						if (topOffset > 0) {
							this.featureArrow.setOrientation('horizontal');
							this.featureArrow.setStartWidth(this.getWidth());
							this.featureArrow.setStartPosition(winPos[0], winPos[1]);

							this.featureArrow.updateFeature();
							this.featureArrow.show();

							this.featureArrow.setPagePosition(winPos[0] - Math.max(0, leftOffset), winPos[1]
									- topOffset);
						} else if (bottomOffset > 0) {
							this.featureArrow.setOrientation('horizontal');
							this.featureArrow.setStartWidth(this.getWidth());
							this.featureArrow.setStartPosition(winPos[0], winPos[1] + this.getHeight());

							this.featureArrow.updateFeature();
							this.featureArrow.show();

							this.featureArrow.setPagePosition(winPos[0] - Math.max(0, leftOffset), winPos[1]
									+ this.getHeight());
						} else if (leftOffset > 0) {
							this.featureArrow.setOrientation('vertical');
							this.featureArrow.setStartWidth(this.getHeight());
							this.featureArrow.setStartPosition(winPos[0], winPos[1]);

							this.featureArrow.updateFeature();
							this.featureArrow.show();

							this.featureArrow.setPagePosition(winPos[0] - Math.max(0, leftOffset), winPos[1]
									- Math.max(0, topOffset));
						} else if (rightOffset > 0) {
							this.featureArrow.setOrientation('vertical');
							this.featureArrow.setStartWidth(this.getHeight());
							this.featureArrow.setStartPosition(winPos[0] + this.getWidth(), winPos[1]);

							this.featureArrow.updateFeature();
							this.featureArrow.show();

							this.featureArrow.setPagePosition(winPos[0] + this.getWidth(), winPos[1]
									- Math.max(0, topOffset));
						} else {
							this.featureArrow.hide();
							return;
						}

					} else {
						this.featureArrow.hide();
					}
				},
				// register listeners to update featureArrow
				listeners : {
					move : function() {
						this.updateFeatureIndicator();
					},
					resize : function() {
						this.updateFeatureIndicator();
					},
					drag : function() {
						this.updateFeatureIndicator();
					},
					destroy : function() {
						this.featureArrow.destroy();
					},
					show : function() {
						this.updateFeatureIndicator();
						layer.map.events.register('move', this, this.updateFeatureIndicator);
					},
					hide : function() {
						this.featureArrow.hide();
						if (layer) {
							layer.map.events.unregister('move', this, this.updateFeatureIndicator);
						}
					},
					activate : function() {
						this.featureArrow.el.setStyle('z-index', this.el.getZIndex() - 1);
					},
					deactivate : function() {
						this.featureArrow.el.setStyle('z-index', this.el.getZIndex() - 1);
					}
				}
			});

	window.show();

}

/**
 * Shows a window to control the layer settings of a VIS layer. Requests the
 * visualization parameters from the layer and displays them in a window.
 * 
 * @param layer
 */
function showLayerSettings(layer) {
	// Get visualization parameters
	var params = layer.visualization.createParameters();

	var optionsGroupMap = {};
	var group, controls;

	for ( var i = 0; i < params.length; i++) {
		controls = createParameterControls(params[i], null);
		if (controls.length != 0) {
			group = params[i].group || 'Symbology';

			if (!optionsGroupMap[group]) {
				optionsGroupMap[group] = [];
			}

			// Convert parameter descriptions into ExtJs controls
			optionsGroupMap[group] = optionsGroupMap[group].concat(controls);
		}
	}

	var tabs = [];
	for ( var key in optionsGroupMap) {
		tabs.push(new Ext.Panel({
			autoScroll : true,
			padding : 10,
			layout : 'form',
			title : key,
			items : optionsGroupMap[key],
			defaults : {
				anchor : '100%'
			}
		}));
	}

	var window = null;
	var handleLayerRemoved = function(evt) {
		window.close();
	};

	window = new Ext.Window({
		layout : 'fit',
		title : 'Layer Settings - ' + layer.getTitle() || '',
		items : [ new Ext.TabPanel({
			activeTab : 0,
			items : tabs
		}) ],
		height : 400,
		width : 350,
		listeners : {
			close : function() {
				layer.events.unregister('removed', this, handleLayerRemoved);
			}
		},
		constrainHeader : true
	});

	layer.events.register('removed', this, handleLayerRemoved);
	window.show();
}
