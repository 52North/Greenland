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
 *
 *
 * Extending Ext JS Library 3.4.0
 * Copyright(c) 2006-2011 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
Ext.ux.VIS.ResourceWindow = Ext.extend(Ext.Window, {

	strings : {
		button_next : 'Next',
		button_prev : 'Previous',
		panel_wizard : 'Details',
		panel_resources : 'Resources',
		wait : 'Please Wait...'
	},

	layout : 'border',
	defaults : {
		split : true
	},

	resourceWizard : null,

	map : null,

	initComponent : function() {
		Ext.ux.VIS.ResourceWindow.superclass.initComponent.call(this);
		this.initResourceWizard();

		this.resources = this.resources || VIS.defaultResources;
		var resourcesNode = new Ext.ux.VIS.ResourceNodesContainer();
		resourcesNode.addResources(this.resources);

		this.resourceWizard.buttonNext = new Ext.Button({
			text : this.strings.button_next,
			disabled : true,
			scope : this
		});

		this.resourceWizard.buttonPrev = new Ext.Button({
			text : this.strings.button_prev,
			disabled : true,
			scope : this
		});

		this.resourceWizard.panel = new Ext.form.FormPanel({
			autoScroll : true,
			region : 'east',
			width : 280,
			listeners : {
				render : function(comp) {
					// LoadMask has to be set for an already rendered component
					this.resourceWizard.loadMask = new Ext.LoadMask(comp.getEl(), {
						msg : this.strings.wait
					});
				},
				scope : this
			},
			bbar : [ '->', this.resourceWizard.buttonPrev, this.resourceWizard.buttonNext ],
			title : this.strings.panel_wizard
		});

		var resourcesTree = new Ext.tree.TreePanel({
			title : this.strings.panel_resources,
			root : resourcesNode,
			region : 'center',
			rootVisible : false,
			autoScroll : true,
			listeners : {
				scope : this,
				click : function(node, e) {
					if (node.leaf === true && node.attributes.resourceLoader) {
						// Node is leaf node
						this.loadResource(node.attributes);
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

					// Manually added resources get a remove option in context
					// menu
					if (node.attributes.resourceId != null) {
						menuItems.push({
							text : 'Remove',
							handler : function() {
								resourcesNode.removeResource(node.attributes.resourceId);
								for ( var i = 0; i < VIS.defaultResources.length; i++) {
									if (VIS.defaultResources[i].resourceId != null
											&& VIS.defaultResources[i].resourceId == node.attributes.resourceId) {
										VIS.defaultResources.splice(i, 1);
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
			},
			tools : [ VIS.createHelpToolDef('resource_tree') ]
		});

		var windowItems = [];

		if (this.requestParam !== true) {
			// Add general add resources dialog if not shown for adding
			// request
			// parameters resource
			var comboBoxType = this.createInputTypeComboBox();
			// combobox of supported input data types

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
							resourceId : VIS.nextResourceId++,
							url : textFieldURL.getValue(),
							mime : comboBoxType.getValue()
						};
						resourcesNode.addResource(newResource);
						VIS.defaultResources.push(newResource);

						comboBoxType.reset();
						textFieldURL.reset();
					}
				}
			});

			var buttonAdvancedResource = new Ext.Button({
				text : 'Advanced...',
				handler : function() {
					// Show window to specify a request as datasource
					this.showAdvancedNewResourceWindow(resourcesNode, textFieldURL.getValue(), comboBoxType.getValue());
				},
				scope : this
			});

			var addResourcePanel = new Ext.form.FormPanel({
				title : 'Add Resource',
				region : 'south',
				height : 150,
				labelWidth : 50,
				padding : 5,
				items : [ textFieldURL, comboBoxType ],
				bbar : [ buttonAdvancedResource, '->', buttonNewResource ],
				tools : [ VIS.createHelpToolDef('add_resource') ]
			});

			windowItems.push({
				region : 'center',
				layout : 'border',
				defaults : {
					split : true
				},
				items : [ resourcesTree, addResourcePanel ]
			});
		} else {
			// Special dialog for adding resources from request parameter
			// Does not include adding custom resources

			resourcesTree.expandAll();
			windowItems.push(resourcesTree);
		}

		windowItems.push(this.resourceWizard.panel);
		this.add(windowItems);
	},

	initResourceWizard : function() {
		this.resourceWizard = {
			buttonNext : null,
			buttonPrev : null,
			panel : null,
			loadMask : null,
			updateButtons : function(previousHandler, nextHandler) {
				if (nextHandler != null) {
					this.buttonNext.setText(nextHandler.text || 'Next');
					this.buttonNext.handler = nextHandler;
				} else {
					this.buttonNext.setText('Next');
					this.buttonNext.handler = null;
				}
				this.buttonNext.setDisabled(nextHandler == null);

				if (previousHandler != null) {
					this.buttonPrev.setText(previousHandler.text || 'Previous');
					this.buttonPrev.handler = previousHandler;
				} else {
					this.buttonPrev.setText('Previous');
					this.buttonPrev.handler = null;
				}
				this.buttonPrev.setDisabled(previousHandler == null);
			},
			reset : function() {
				this.panel.removeAll();
				this.updateButtons(null, null);
			},
			clear : function() {
				if (this.loadMask != null) {
					this.loadMask.hide();
				}
				this.panel.removeAll();
			},
			showLoadMask : function() {
				if (this.loadMask != null) {
					this.loadMask.show();
				}
			},
			isValid : function() {
				return this.panel.form.isValid();
			}
		};
	},

	loadResource : function(attributes, allowImmediately) {
		var previousHandler = null;

		/**
		 * Callback for layer loading from resource. Should return a layer instance
		 */
		var loadResourceOptionsCallback = function(result) {
			if (result instanceof Error) {
				// Error handling
				Ext.Msg.alert('Error', Ext.util.Format.htmlEncode(result.message));
				return;
			} else if (result instanceof OpenLayers.Layer) {
				// Loading result options should return a layer instance
				this.showParameters(result, previousHandler, allowImmediately);
			}
		};

		if (attributes.resourceLoader == 'ncwms_layer' && attributes.requiredLayers) {
			// (nc)WMS-Q resource -> layer assignment step first
			previousHandler = this.assignLayersForResource.createDelegate(this, [ attributes, function(attributes) {
				this.resourceWizard.showLoadMask();
				VIS.ResourceLoader.loadResourceOptions(attributes, loadResourceOptionsCallback, this);
			} ]);
			previousHandler();
		} else {
			// any other resource -> directly load resource
			this.resourceWizard.showLoadMask();
			VIS.ResourceLoader.loadResourceOptions(attributes, loadResourceOptionsCallback, this);
		}
	},

	showParameters : function(layer, previousHandler, allowImmediately) {
		// var handlerAddToMap = function() {
		// // add layer to map
		// this.map.addLayers([ layer ]);
		//
		// // reset wizard
		// this.resourceWizard.reset();
		// };
		// handlerAddToMap.text = 'Add to Map';
		// this.resourceWizard.updateButtons(previousHandler,
		// handlerAddToMap);

		var handlerSelectMap = function() {
			this.selectMap(layer, this.showParameters.createDelegate(this, [ layer, previousHandler, allowImmediately ]));
		};
		this.resourceWizard.updateButtons(previousHandler, handlerSelectMap);

		this.resourceWizard.clear();
		var panel = this.resourceWizard.panel;

		// Create parameter controls
		var paramItems = createParameterControls(layer.getParameterOptions());
		if (paramItems.length != 0) {
			panel.add({
				xtype : 'fieldset',
				title : 'Info',
				items : [ {
					xtype : 'label',
					text : 'The following parameters need to be set for this visualization.'
				} ]
			});
			panel.add(new Ext.form.FieldSet({
				title : 'Parameters',
				items : paramItems,
				labelWidth : 80
			}));

			panel.doLayout();
		} else if (allowImmediately) {
			// No parameters -> next step
			handlerAddToMap.call(this);
		} else {
			panel.add({
				xtype : 'fieldset',
				title : 'Info',
				items : [ {
					xtype : 'label',
					text : 'This visualization requires no parameters.'
				} ]
			});

			panel.doLayout();
		}
	},

	assignLayersForResource : function(attributes, callback) {
		if (!attributes.requiredLayers) {
			return {};
		}

		var requiredLayers = attributes.requiredLayers;

		// Returns a layer configuration object matching names to layer
		// entries from
		// requiredLayers structure based on WMS-Q metadata contained in
		// GetCapabilities response
		var autoMatching = function(reqLayers) {
			var layers = {};

			// prepare result object
			for ( var layerKey in reqLayers.layers) {
				layers[layerKey] = {};
			}

			// Gets uncertainty keyword from a nested layer WMS capabilities
			// node
			var getUncertainty = function(nestedLayer) {
				if (!nestedLayer.keywords) {
					return null;
				}
				for ( var j = 0; j < nestedLayer.keywords.length; j++) {
					// TODO multiple vocabularies?
					if (nestedLayer.keywords[j].vocabulary == 'http://www.uncertml.org/distributions/') {
						return nestedLayer.keywords[j].value;

					}
				}
				return null;
			};

			// Find matching layer descriptions from the requiredLayers
			// structure for
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
				data.push([ attributes.wmsLayer.nestedLayers[i].name,
						attributes.wmsLayer.nestedLayers[i].title || attributes.wmsLayer.nestedLayers[i].name ]);
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

		// Performs a GetMetadata request (ncWMS extension) to get min/max
		// values for a specific WMS layer
		// Callback receives object with min and max
		var getScaleRange = function(name, callback) {
			var url = attributes.url;
			// Use GetMetadata URL as specified in capabilities
			if (attributes.capabilities && attributes.capabilities.capability && attributes.capabilities.capability.request
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
						max : Math.ceil(details.scaleRange[1]),
						uom : details.units || ''
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

		this.resourceWizard.reset();
		var panel = this.resourceWizard.panel;

		panel.add(new Ext.form.FieldSet({
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

		// Build the UI for a specific requiredLayers configuration,
		// identified by
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
						text : 'Automatic assignment based on uncertainty keyword "' + autoMatchedLayers[key].usedKeyword + '"'
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
				
				layerItems.push(layers[key].uom = new Ext.form.TextField({
					fieldLabel : 'Unit',
					allowBlank : true,
					anchor : '100%',
					value : autoMatchedLayers[key].uom
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
									getScaleRange(this.layers.name.getValue ? this.layers.name.getValue() : this.layers.name, function(
											scale) {
										if (!(scale instanceof Error)) {
											this.layers.min.setValue(scale.min);
											this.layers.max.setValue(scale.max);
											this.layers.uom.setValue(scale.uom);
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
			panel.add(typeCombo);

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
			// Use first requiredLayers type if there is only one
			// configuration
			updateLayerAssigmentItems(typeCombo.getStore().getAt(0).data.type);
		}

		panel.add(assignmentPanel);
		panel.doLayout();

		var setParametersHandler = function() {
			if (!this.resourceWizard.isValid()) {
				return;
			}
			// Get layer config from UI field values, project each value of
			// 'layers'
			// using the getValue function
			layerConfig = {};
			for ( var layerKey in layers) {
				layerConfig[layerKey] = {};
				for ( var key in layers[layerKey]) {
					layerConfig[layerKey][key] = layers[layerKey][key].getValue ? layers[layerKey][key].getValue()
							: layers[layerKey][key];
				}
			}

			// Actual resource loading options which are passed to the next
			// loading
			// step/level
			attributes.layers = layerConfig;
			attributes.requiredLayersType = requiredLayersType;

			callback.call(this, attributes);
		};
		this.resourceWizard.updateButtons(null, setParametersHandler);
	},

	selectMap : function(layer, previousHandler) {

		var existingMapFieldSet = new Ext.form.FieldSet({
			checkboxToggle : {
				tag : 'input',
				type : 'radio',
				name : 'addMapType',
				checked : 'true'
			},
			title : 'Add as overlay',
			listeners : {
				expand : function(comp) {
					newMapFieldSet.collapse();
				}
			},
			items : [ {
				xtype : 'label',
				text : 'Adds this resource to the first compatible map viewport. '
						+ 'Resources can get arranged within and between maps later by drag and drop.'
			} ]
		});

		var newMapFieldSet = new Ext.form.FieldSet({
			checkboxToggle : {
				tag : 'input',
				type : 'radio',
				name : 'addMapType'
			},
			title : 'Add to new Map',
			collapsed : true,
			listeners : {
				expand : function(comp) {
					existingMapFieldSet.collapse();
				}
			}
		});

		var infoTexts = [];
		var compatibleMap = null, srsGrid = null, srsNumberField = null;

		if (layer.supportedSrs) {
			for ( var i = 0; i < this.maps.length; i++) {
				if (this.maps[i].getProjection() in layer.supportedSrs) {
					compatibleMap = this.maps[i];
					break;
				}
			}

			var srsData = [];
			for ( var srs in layer.supportedSrs) {
				srsData.push([ srs, VIS.getProjectionTitle(srs) ]);
			}
			var srsStore = new Ext.data.ArrayStore({
				idIndex : 0,
				fields : [ 'code', 'title' ],
				data : srsData
			});

			srsGrid = new Ext.grid.GridPanel({
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

			newMapFieldSet.add({
				xtype : 'label',
				text : 'Select the projection code to use for the new map '
						+ 'from the list of projections supported by this resource.'
			});
			newMapFieldSet.add(srsGrid);
		} else {

			newMapFieldSet.add({
				xtype : 'label',
				text : 'Select the EPSG code of the projection to use for the new map.'
			});

			// Only EPSG
			srsNumberField = new Ext.form.NumberField({
				fieldLabel : 'EPSG Code'
			});

			newMapFieldSet.add(srsNumberField);

			compatibleMap = this.maps[0];
			infoTexts.push('This resource has no projection information');
		}

		if (compatibleMap == null) {
			existingMapFieldSet.setDisabled(true);
			infoTexts.push('This resource does not support the projections used by the current maps');
		}

		this.resourceWizard.clear();
		var panel = this.resourceWizard.panel;

		if (infoTexts.length != 0) {
			panel.add({
				xtype : 'fieldset',
				title : 'Info',
				items : [ {
					xtype : 'label',
					text : infoTexts.join('<br/>')
				} ]
			});
		}
		panel.add(existingMapFieldSet);
		panel.add(newMapFieldSet);
		panel.doLayout();

		var handlerAddToMap = function() {
			if (!existingMapFieldSet.collapsed && compatibleMap) {
				// add layer to map
				compatibleMap.addLayers([ layer ]);
			} else if (srsGrid != null && srsGrid.getSelectionModel().getSelected() != null) {
				// Selection via srs grid
				this.createNewMap(srsGrid.getSelectionModel().getSelected().data.code, function(map) {
					map.addLayers([ layer ]);
				});

			} else if (srsNumberField != null && srsNumberField.getValue() != null) {
				// selection vie srs number field
				this.createNewMap('EPSG:' + srsNumberField.getValue(), function(map) {
					map.addLayers([ layer ]);
				});
			} else {
				// TODO possible?
				return;
			}

			// reset wizard
			this.resourceWizard.reset();
		};
		handlerAddToMap.text = 'Add to Map';
		this.resourceWizard.updateButtons(previousHandler, handlerAddToMap);
	},

	/**
	 * Called to create and return a new map object using callback mechanism. Has
	 * to be provided within the actual implementation/usage of resource window.
	 * 
	 * @param projCode
	 */
	createNewMap : function(projCode, mapCallback) {

	},

	/**
	 * Creates a combobox of supported resource types with mime as item value
	 * 
	 * @returns {Ext.form.ComboBox}
	 */
	createInputTypeComboBox : function() {
		var comboBoxType = new Ext.form.ComboBox({
			triggerAction : 'all',
			lazyRender : true,
			mode : 'local',
			store : new Ext.data.ArrayStore({
				id : 0,
				fields : [ 'name', 'mime' ],
				data : [ [ 'NetCDF (*.nc)', 'application/netcdf' ], [ 'GeoTIFF (*.tiff)', 'image/geotiff' ],
						[ 'ncWMS(-Q) Resource', 'ncwms' ], [ 'WMS Resource', 'wms' ],
						[ 'O&M2 Raster', 'application/vnd.ogc.om+xml' ], [ '', null ], [ 'O&M Vector (*.xml)', 'application/xml' ],
						[ 'O&M2 Vector(*.xml)', 'application/x-om-u+xml' ], [ 'JSOM (*.json)', 'application/x-om-u+json' ],
						[ 'Uncertainty Collection', 'application/vnd.org.uncertweb.viss.uncertainty-collection+json' ],
						[ 'THREDDS Data Server Catalog', 'threddscatalog' ] ]
			}),
			valueField : 'mime',
			displayField : 'name',
			fieldLabel : 'Type',
			editable : false
		});

		return comboBoxType;
	},

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
	showAdvancedNewResourceWindow : function(layerList, url, typeValue) {
		var advWindow = null;

		var comboBoxType = this.createInputTypeComboBox();
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
						resourceId : VIS.nextResourceId++,
						url : textFieldURL.getValue(),
						mime : comboBoxType.getValue(),
						request : textAreaRequest.getValue()
					};
					layerList.addResource(newResource);
					VIS.defaultResources.push(newResource);
					advWindow.close();
				}
			}
		});

		var addResourcePanel = new Ext.form.FormPanel({
			title : 'Add New Resource',
			region : 'south',
			height : 150,
			labelWidth : 50,
			padding : 5,
			items : [ textFieldURL, comboBoxType, textAreaRequest ],
			bbar : [ '->', buttonNewResource ]
		});

		// Show window
		advWindow = new Ext.Window({
			title : 'Add Resource',
			layout : 'fit',
			items : [ addResourcePanel ],
			height : 300,
			width : 350,
			constrainHeader : true
		});
		advWindow.show();
	}

});