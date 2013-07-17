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
 * ncWMS Layer
 */
OpenLayers.Layer.VIS.WMSQ = OpenLayers.Class(OpenLayers.Layer.WMS, {

	visualization : null,
	time : null,
	timeExtents : null,
	maxZoom : null,
	urls : null,

	pauseRedraw : null,

	initialize : function(name, url, params, options) {
		if (!OpenLayers.CANVAS_SUPPORTED)
			throw "Canvas not supported";

		this.urls = {
			getMap : url,
			getFeatureInfo : url,
			getMetadata : url
		};

		// Obtain urls as specified in capabilities
		if (options.capabilities && options.capabilities.capability && options.capabilities.capability.request) {
			var req = options.capabilities.capability.request;
			if (req.getmap)
				this.urls.getMap = req.getmap.href;
			if (req.getfeatureinfo)
				this.urls.getFeatureInfo = req.getfeatureinfo.href;
			if (req.getmetadata)
				this.urls.getMetadata = req.getmetadata.href;
		}

		// Initialization of delayed update function
		this.updateTask = new Ext.util.DelayedTask(function() {
			this.pauseRedraw = false;
			this.redraw();
		}, this);
		this.pauseRedraw = false;
		this.time = {
			min : Number.POSITIVE_INFINITY,
			max : Number.NEGATIVE_INFINITY,
			current : null
		};

		options = options || {};
		OpenLayers.Util.applyDefaults(options, {
			// Set class to use for this layer's tiles
			tileClass : OpenLayers.Tile.Image.MultiImage,
			maxZoom : 10
		// maximum zoom level to request
		// TODO make maxZoom a layer parameter
		});

		// Options to use for tile construction
		options.tileOptions = OpenLayers.Util.extend(options.tileOptions, {
			layerParams : options.visualization.layerParams
		});
		OpenLayers.Layer.WMS.prototype.initialize.call(this, name, this.urls.getMap, params, options);

		this.visualization.setLayer(this);
		// this.updateTimeExtents();
	},

	/**
	 * Gets the time dimension information valid for the used layers
	 */
	updateTimeExtents : function() {

		function getLayer(name) {
			for ( var i = 0; i < this.wmsLayer.nestedLayers.length; i++) {
				if (this.wmsLayer.nestedLayers[i].name == name) {
					return this.wmsLayer.nestedLayers[i];
				}
			}
			return null;
		}

		this.timeExtents = [];
		var layer, instances;
		for ( var i = 0; i < this.visualization.layerOptions.length; i++) {
			layer = getLayer.call(this, this.visualization.layerOptions[i].name);
			if (layer && layer.dimensions && layer.dimensions.time) {
				instances = VIS.ResourceLoader.parseIntervals(layer.dimensions.time.values);
				for ( var j = 0; j < instances.length; j++) {
					this.timeExtents.push([ instances[j].getTime(), instances[j].getTime() ]);
				}

			}
		}

		if (this.timeExtents.length == 0) {
			this.time = null;
		} else {
			var min = Number.POSITIVE_INFINITY, max = Number.NEGATIVE_INFINITY;
			for ( var i = 0; i < this.timeExtents.length; i++) {
				if (this.timeExtents[i][0] < min)
					min = this.timeExtents[i][0];
				if (this.timeExtents[i][1] > max)
					max = this.timeExtents[i][1];
			}
			this.time = {
				min : min,
				max : max,
				current : (this.time && this.time.current) ? this.time.current : null
			};
		}
	},

	/**
	 * Override to make use of some kind of maximum zoom level above which no
	 * further tiles will get requested
	 * 
	 * @param resolution
	 * @returns
	 */
	getServerResolution : function(resolution) {
		if (this.map.getZoom() > this.maxZoom) {
			return this.map.getResolutionForZoom(this.maxZoom);
		} else {
			return OpenLayers.Layer.WMS.prototype.getServerResolution.call(this, resolution);
		}
	},

	/**
	 * Extends the usual OpenLayers.Layer.WMS getURL by a custom params parameter
	 * which allows to specify additional request parameters for a single request
	 * 
	 * @param bounds
	 * @param params
	 * @returns
	 */
	getURL : function(bounds, params) {
		var imageSize = this.getImageSize();
		var newParams = params || {};
		// WMS 1.3 introduced axis order
		var reverseAxisOrder = this.reverseAxisOrder();
		newParams.BBOX = this.encodeBBOX ? bounds.toBBOX(null, reverseAxisOrder) : bounds.toArray(reverseAxisOrder);
		newParams.WIDTH = imageSize.w;
		newParams.HEIGHT = imageSize.h;

		var requestString = this.getFullRequestString(newParams);

		return requestString;
	},

	handleChangeBase : function() {
		if (this.map.projection != null) {
			this.projection = this.map.projection;
			this.redraw();
		}
	},

	setMap : function(map) {
		if (map.projection != null) {
			this.projection = map.projection;
		}
		OpenLayers.Layer.WMS.prototype.setMap.apply(this, arguments);
		this.map.events.register('changetime', this, this.handleChangeTime);
		this.map.events.register('changebaselayer', this, this.handleChangeBase);

		this.visualization.setMap(map);

		this.updateTimeExtents();
		this.handleChangeTime({
			time : this.map.time.current
		});
		this.map.events.triggerEvent('changelayer', {
			layer : this,
			property : 'time'
		});
	},

	removeMap : function(map) {
		this.map.events.unregister('changetime', this, this.handleChangeTime);
		this.map.events.unregister('changebaselayer', this, this.handleChangeBase);

		OpenLayers.Layer.WMS.prototype.removeMap.apply(this, arguments);

		this.visualization.removeMap(map);
	},

	/**
	 * Override to prevent layer from getting drawn when pauseRedraw is true while
	 * actually being 'visible'
	 * 
	 * @returns
	 */
	calculateInRange : function() {
		if (this.pauseRedraw === true) {
			return false;
		} else {
			return OpenLayers.Layer.WMS.prototype.calculateInRange.call(this);
		}
	},

	// Vis stuff
	getParameterOptions : function() {
		var options = OpenLayers.Util.extend({}, this.visualization.options || {});

		return options;
	},

	updateVisualization : function() {
		this.visualization.update();
	},

	getLegend : function() {
		if (this.visualization.getLegend) {
			return this.visualization.getLegend();
		}

		return OpenLayers.VIS.Symbology.Base.prototype.getLegend.call(this);
	},

	getTitle : function() {
		return this.visualization.getTitle();
	},

	handleChangeTime : function(evt) {
		if (this.time && this.timeExtents) {

			var newTime = null;
			if (evt.time != null) {
				var time = evt.time.getTime();
				for ( var i = 0; i < this.timeExtents.length; i++) {
					var extent = this.timeExtents[i];
					if (time == extent[0] || (time >= extent[0] && time < extent[1])) {
						newTime = extent[0];
						break;
					}
				}
			}
			if (newTime != null) {
				if (this.time.current != newTime) {
					this.time.current = newTime;
					// this.mergeNewParams({
					// time : OpenLayers.Date.toISOString(new Date(newTime))
					// });
					this.params.TIME = OpenLayers.Date.toISOString(new Date(newTime));
					this.pauseRedraw = false;
					this.updateTask.delay(1000);
				} else {
					this.updateTask.cancel();
				}
			} else {
				this.time.current = null;
				this.pauseRedraw = true;
				this.display(false);
				this.updateTask.cancel();
			}

		}
	},

	getTimeExtents : function() {
		return this.timeExtents;
	},

	/**
	 * Override of redraw method to pass redraw call to this layer's tiles. Gives
	 * ability to apply new visualization parameters without reloading images.
	 * Default forced redraw of WMS layer would simply add random request
	 * parameter and consequently break cached tiles.
	 */
	redraw : function() {
		if (OpenLayers.Layer.WMS.prototype.redraw.call(this)) {

			// Call special redraw method on each tile, if available
			for ( var i = 0; i < this.grid.length; i++) {
				for ( var j = 0; j < this.grid[i].length; j++) {
					if (this.grid[i][j].redraw) {
						this.grid[i][j].redraw();
					}
				}
			}
		}
	},

	featureInfo : function(loc) {
		var data = this.getTileData(loc);
		if (!data.tile || data.tile.loadingMask != 0) {
			return 'Not yet available';
		}

		var result = '', layer, value;
		var merger = OpenLayers.Tile.Image.MultiImage.SharedCanvasMerger.getMerger(data.tile.layerImages, data.tile);
		for ( var i = 0; i < this.visualization.layerOptions.length; i++) {
			if (i != 0) {
				result += '\n';
			}
			layer = this.visualization.layerOptions[i];
			value = layer.getValue(merger, Math.floor(data.i), Math.floor(data.j));
			result += layer.name + ': ' + (value != null ? value.toFixed(2) : 'No Value');
		}

		return result;

	},

	restore : function(parcel) {
		this.visualization.restore(parcel);
		this.updateVisualization();
	},

	store : function(parcel) {
		this.visualization.store(parcel);
	},

	/**
	 * Creates and returns a FormPanel with all information from this layer's
	 * capability service metadata
	 * 
	 * @returns {Ext.form.FormPanel}
	 */
	createServiceMetadataPanel : function() {
		var panel = new Ext.form.FormPanel({
			border : false
		});

		var service = this.capabilities.service;
		if (service == null) {
			panel.add({
				xtype : 'label',
				text : 'No service metadata available'
			});
			return panel;
		}

		if (service.title) {
			panel.add({
				xtype : 'label',
				fieldLabel : 'Title',
				text : service.title
			});
		}
		if (service['abstract']) {
			panel.add({
				xtype : 'textarea',
				fieldLabel : 'Abstract',
				value : service['abstract'],
				readOnly : true,
				anchor : '100%'
			});
		}
		if (service.keywords || service.keyword) {
			panel.add({
				xtype : 'label',
				fieldLabel : 'Keywords',
				text : service.keywords || service.keyword
			});
		}

		if (service.contactInformation) {
			var cI = service.contactInformation;
			var fieldset = new Ext.form.FieldSet({
				title : 'Contact Information',
				labelWidth : 50
			});
			panel.add(fieldset);
			fieldset.add({
				xtype : 'label',
				fieldLabel : 'Address',
				text : cI.address || ''
			});
			fieldset.add({
				xtype : 'label',
				fieldLabel : 'City',
				text : cI.city || ''
			});
			fieldset.add({
				xtype : 'label',
				fieldLabel : 'Country',
				text : cI.country || ''
			});
			fieldset.add({
				xtype : 'label',
				fieldLabel : 'Postcode',
				text : cI.postcode || ''
			});
			fieldset.add({
				xtype : 'label',
				fieldLabel : 'State/Province',
				text : cI.stateOrProvince || ''
			});

			if (cI.personPrimary) {
				fieldset.add({
					xtype : 'label',
					fieldLabel : 'Organization',
					text : cI.organization || ''
				});
				fieldset.add({
					xtype : 'label',
					fieldLabel : 'Person',
					text : cI.person || ''
				});
			}
			fieldset.add({
				xtype : 'label',
				fieldLabel : 'Phone',
				text : cI.phone || ''
			});
			fieldset.add({
				xtype : 'label',
				fieldLabel : 'Fax',
				text : cI.fax || ''
			});
			fieldset.add({
				xtype : 'label',
				fieldLabel : 'E-Mail',
				text : cI.email || ''
			});
			fieldset.add({
				xtype : 'label',
				fieldLabel : 'Position',
				text : cI.poition || ''
			});
		}

		if (service.accessConstraints) {
			panel.add({
				xtype : 'textarea',
				fieldLabel : 'Access Constraints',
				value : service.accessConstraints,
				readOnly : true,
				anchor : '100%'
			});
		}

		if (service.fees) {
			panel.add({
				xtype : 'textarea',
				fieldLabel : 'Fees',
				value : service.fees,
				readOnly : true,
				anchor : '100%'
			});
		}

		return panel;
	}

});

/**
 * Special OpenLayers.Tile.Image extension which loads several Tiles
 * representing one single traditional Tile. Loads one Image for each set of
 * layerParams for a common resource url, monitors its loading states and
 * finally applies a transformation function provided by the associated
 * layer.visualization instance.
 * 
 * TODO load events, still bugs
 */
OpenLayers.Tile.Image.MultiImage = OpenLayers.Class(OpenLayers.Tile.Image, {
	layerParams : null, // Set of parameters for each image
	layerImages : null, // Image objects for each "sub"-tile
	loadingMask : null, // Bitmask representing the loading state of each
	// "sub"-image

	forceRedraw : null, // Flag indicates that tile has to get recalculated

	previousBounds : null,

	initialize : function(layer, position, bounds, url, size, options) {
		OpenLayers.Tile.Image.prototype.initialize.apply(this, arguments);
		this.layerImages = [];
		this.loadingMask = 0;
		this.forceRedraw = false;
	},

	renderTile : function() {
		this.layer.div.appendChild(this.getTile());

		// Set all "sub" images loading, i.e. set last 'length' least significant
		// bits
		this.loadingMask = (1 << this.layerParams.length) - 1;
		this.events.triggerEvent(this._loadEvent);

		for ( var i = 0, image, layerUrl, imageInfo; i < this.layerParams.length; i++) {
			imageInfo = {
				layerId : i,
				tile : this,
				bounds : this.bounds.clone()
			};
			if (!(image = this.layerImages[i])) {
				image = new Image();
				image.crossOrigin = 'anonymous';
				this.layerImages[i] = image;
			}

			OpenLayers.Event.stopObservingElement(image);

			layerUrl = this.layer.getURL(this.bounds, this.layerParams[i]);
			if (image.src == layerUrl && image.complete === true) {
				// Already loaded correct image
				this.onLayerImageLoad.call(imageInfo);
			} else {
				// Monitor loading state
				OpenLayers.Event.observe(image, "load", OpenLayers.Function.bind(this.onLayerImageLoad, imageInfo));
				OpenLayers.Event.observe(image, "error", OpenLayers.Function.bind(this.onLayerImageError, imageInfo));

				// Load image
				image.src = layerUrl;
			}
		}

	},

	/**
	 * Called whenever a "sub"-tile is loaded completely. Calls initImage if all
	 * images are loaded for a tile
	 */
	onLayerImageLoad : function() {
		if (this.tile.layerImages[this.layerId]) {
			OpenLayers.Event.stopObservingElement(this.tile.layerImages[this.layerId]);
		}
		if (!this.bounds.equals(this.tile.bounds)) {
			return;
		}
		this.tile.loadingMask &= ~(1 << this.layerId);
		if (this.tile.loadingMask == 0) {
			// All images loaded
			this.tile.initImage();
		}
	},

	onLayerImageError : function() {
		this.tile.loadingMask &= ~(1 << this.layerId);
	},

	/**
	 * Override to apply a custom transformation function for a completely loaded
	 * tile by creating a canvas object with the dimension of this tile together
	 * with a OpenLayers.Tile.Image.MultiImage.SharedCanvasMerger of all images
	 * and passing these to either fillPixelArray or fillCanvas of the layers
	 * visualization object
	 */
	initImage : function() {
		var img = this.getImage();

		if (!this.forceRedraw && this.bounds.equals(this.previousBounds) && img.getAttribute('src') != '') {
			// Do not recalculate image if bounds did not change and not forced to
			// redraw
			this.onImageLoad();
			return;
		}

		// merger combines all images in a single canvas and provides functions to
		// access their pixel values
		var merger = OpenLayers.Tile.Image.MultiImage.SharedCanvasMerger.getMerger(this.layerImages, this);

		var canvas = document.createElement("canvas");
		canvas.width = this.size.w;
		canvas.height = this.size.h;

		var ctx = canvas.getContext("2d");

		// Pass data to transformation function
		if (this.layer.visualization.fillPixelArray) {
			var imgdata = ctx.getImageData(0, 0, canvas.width, canvas.height);
			this.layer.visualization.fillPixelArray(imgdata, merger, ctx, this);
			ctx.putImageData(imgdata, 0, 0);
		} else {
			this.layer.visualization.fillCanvas(canvas, merger, ctx, this);
		}

		if (this.layer.visualization.drawOverlay) {
			this.layer.visualization.drawOverlay(canvas, merger, ctx, this);
		}

		var imageDataUrl = ctx.canvas.toDataURL();
		if (img.src == imageDataUrl) {
			this.onImageLoad();
		} else {
			// Set result
			OpenLayers.Event.stopObservingElement(img);
			OpenLayers.Event.observe(img, "load", OpenLayers.Function.bind(this.onImageLoad, this));
			OpenLayers.Event.observe(img, "error", OpenLayers.Function.bind(this.onImageError, this));

			this.previousBounds = this.bounds.clone();
			this.forceRedraw = false;
			img.style.visibility = 'hidden';
			img.style.opacity = 0;

			// Trigger loading
			img.src = imageDataUrl;
		}
	},

	onImageError : function() {
		var img = this.imgDiv;
		if (img.src != null) {
			OpenLayers.Element.addClass(img, "olImageLoadError");
			this.events.triggerEvent("loaderror");
			this.onImageLoad();
		}
	},

	redraw : function() {
		this.forceRedraw = true;
	}
});


/**
 * Canvas to maintain multiple images and access their pixel values
 */
OpenLayers.Tile.Image.MultiImage.CanvasMerger = function() {
	this.canvas = null;

	/**
	 * Returns a merger structure for given images and tile
	 * 
	 * @param images
	 *          Array of Image objects
	 * @param tile
	 *          OpenLayers.Tile used for dimensioning of images
	 */
	this.getMerger = function(images, tile) {
		var reqW = tile.size.w, reqH = tile.size.h * images.length, imageH = tile.size.h, imageW = tile.size.w;

		// Reuse single shared canvas
		if (this.canvas == null) {
			this.createCanvas(reqW, reqH);
		} else if (this.canvas.width < reqW || this.canvas.height < reqH) {
			this.canvas.width = reqW;
			this.canvas.height = reqH;
		}
		var ctx = this.canvas.getContext("2d");
		ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

		// Draw all images in a column
		for ( var i = 0; i < images.length; i++) {
			ctx.drawImage(images[i], 0, i * imageH);
		}
		var cpa = null;
		try {
			cpa = ctx.getImageData(0, 0, reqW, reqH).data; // Canvas pixel array
		} catch (e) {
			if (e instanceof DOMException && e.code == 18) {
				// A non CORS-enabled image was loaded and "tainted" the merger canvas!
				this.canvas = null;
				// reset canvas so that it gets recreated on new call
				throw new Error('A non CORS-enabled image was loaded');
			} else {
				throw e;
			}
		}

		// Return access functions
		return {
			/**
			 * Gets color of a pixel as array of length 4
			 * 
			 * @param imageIndex
			 *          Index of image in merger-structure
			 * @param x
			 *          X coordinate
			 * @param y
			 *          Y coordinate
			 */
			getColor : function(imageIndex, x, y) {
				var startIndex = imageH * imageIndex * imageW * 4 + y * imageW * 4 + x * 4;
				return [ cpa[startIndex], cpa[startIndex + 1], cpa[startIndex + 2], cpa[startIndex + 3] ];
			},

			/**
			 * Gets specific color component/channel of a pixel
			 * 
			 * @param imageIndex
			 *          Index of image in merger-structure
			 * @param x
			 *          X coordinate
			 * @param y
			 *          Y coordinate
			 * @param c
			 *          Color component
			 */
			getComponent : function(imageIndex, x, y, c) {
				var startIndex = imageH * imageIndex * imageW * 4 + y * imageW * 4 + x * 4;
				return cpa[startIndex + c];
			},

			/**
			 * Sets specific color component/channel of a pixel
			 * 
			 * @param imageIndex
			 *          Index of image in merger-structure
			 * @param x
			 *          X coordinate
			 * @param y
			 *          Y coordinate
			 * @param c
			 *          Color component
			 * @param value
			 *          Value to set
			 */
			setComponent : function(imageIndex, x, y, c, value) {
				var index = imageH * imageIndex * imageW * 4 + y * imageW * 4 + x * 4;
				cpa[index + c] = value;

			}
		};
	};
	this.createCanvas = function(w, h) {
		this.canvas = document.createElement("canvas");
		this.canvas.width = w;
		this.canvas.height = h;
	};
};

/**
 * Providing a single shared Canvas to maintain multiple images and access their
 * pixel values
 */
OpenLayers.Tile.Image.MultiImage.SharedCanvasMerger = new OpenLayers.Tile.Image.MultiImage.CanvasMerger();
