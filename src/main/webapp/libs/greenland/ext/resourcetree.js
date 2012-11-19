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
Ext.namespace('Ext.ux.VIS');
/**
 * Root node managing visualization resources. Allows to add OM vector and VISS
 * resources, and loads them asynchronously on demand using an
 * Ext.ux.VIS.ResourceLoader.
 */
Ext.ux.VIS.ResourceNodesContainer = Ext.extend(Ext.tree.AsyncTreeNode, {

	constructor : function(options) {
		if (!options) {
			options = {};
		}
		this.loader = new Ext.ux.VIS.ResourceLoader();
		options.text = 'Resources';
		options.loader = this.loader;
		Ext.ux.VIS.ResourceNodesContainer.superclass.constructor.apply(this, arguments);
	},

	/**
	 * Adds a new resource to show as child node. Requires a resource options
	 * definition object with at least mime and url as attributes
	 */
	addResource : function(options) {
		OpenLayers.VIS.ResourceLoader.loadResourceOptions(options, function(resourceOptions) {
			this.appendChild(this.loader.createNode(resourceOptions));
		}.createDelegate(this));
	},

	removeResource : function(resourceId) {
		var child = this.findChild('resourceId', resourceId);
		if (child != null) {
			this.removeChild(child);
		}
	},

	/**
	 * Adds multiple resources to show.
	 * 
	 * @param options
	 */
	addResources : function(options) {
		for ( var i = 0, len = options.length; i < len; i++) {
			this.addResource(options[i]);
		}
	}

});

/**
 * Custom Ext.tree.TreeLoader implementation loading resource details on demand.
 * Manages vector data using vector root, collection and observed property child
 * nodes. Raster data is separated into raster root, dataset and visualizer
 * child nodes. All information gathered by loading these nodes are provided in
 * the attributes of each node
 */
Ext.ux.VIS.ResourceLoader = Ext.extend(Ext.tree.TreeLoader, {
	load : function(node, callback, scope) {
		// every level of resource loading process gets wrapped into a node
		if (this.fireEvent('beforeload', this, node, callback) !== false && node.leaf !== true
				&& !node.isRoot) {

			var attributes = OpenLayers.Util.extend({}, node.attributes);
			delete attributes.id;
			delete attributes.loader;

			OpenLayers.VIS.ResourceLoader.loadResourceOptions(attributes, function(resourceOptions) {

				if (resourceOptions instanceof Error) {
					// Error handling
					this.addErrorNode(node, resourceOptions);
				} else {
					// Append child node for each resourceOption element
					resourceOptions = resourceOptions.length ? resourceOptions : [ resourceOptions ];
					for ( var i = 0; i < resourceOptions.length; i++) {
						node.appendChild(this.createNode(resourceOptions[i]));
					}
					this.fireEvent('load', this, node);
				}
				callback.call(node, scope);
			}.createDelegate(this));
		}
	},

	addErrorNode : function(node, error) {
		node.appendChild(this.createNode({
			text : 'Error - double click to show details',
			iconCls : 'x-form-invalid-icon',
			leaf : true,
			listeners : {
				dblClick : function() {
					Ext.Msg.alert('Error', Ext.util.Format.htmlEncode(error.message));
				}
			}
		}));

		this.fireEvent('loadexception', this, node);
	}

});
