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
OpenLayers.VIS.Control = OpenLayers.VIS.Control || {};
/**
 * Custom OpenLayers control allowing to swipe a layer by drag operations
 */
OpenLayers.VIS.Control.Swipe = OpenLayers.Class(OpenLayers.Control, {
	CLASS_NAME : 'OpenLayers.VIS.Control.Swipe',

	swipeMode : 'left', // last start point of swipe operation

	layer : null, // layer to swipe

	/**
	 * @param layer layer to swipe
	 */
	initialize : function(layer, options) {
		this.layer = layer;

		OpenLayers.Control.prototype.initialize.apply(this, [ options ]);
	},

	setLayer : function(layer) {
		this.panDone();
		this.layer = layer;
	},

	deactivate : function() {
		OpenLayers.Control.prototype.deactivate.call(this);
		this.panDone();
	},

	draw : function() {
		this.handler = new OpenLayers.Handler.Drag(this, {
			"move" : this.pan,
			"done" : this.panDone,
			"down" : this.panStart
		});
	},

	panStart : function(xy) {
		var mapSize = this.map.getSize();
		if (xy.y < mapSize.h / 4) {
			this.swipeMode = 'top';
		} else if (xy.y > mapSize.h * 3 / 4) {
			this.swipeMode = 'bottom';
		} else if (xy.x < mapSize.w / 2) {
			this.swipeMode = 'left';
		} else {
			this.swipeMode = 'right';
		}
	},

	pan : function(xy) {
		if (!this.layer)
			return;

		var mapSize = this.map.getSize();
		var offsetLeft = -this.map.layerContainerDiv.offsetLeft - this.layer.div.offsetLeft;
		var offsetTop = -this.map.layerContainerDiv.offsetTop - this.layer.div.offsetTop;

		var top, right, bottom, left;

		switch (this.swipeMode) { 
		case 'left':
			top = offsetTop;
			left = offsetLeft + xy.x;
			right = mapSize.w + offsetLeft;
			bottom = mapSize.h + offsetTop;
			break;
		case 'right':
			top = offsetTop;
			left = offsetLeft;
			right = offsetLeft + xy.x;
			bottom = mapSize.h + offsetTop;
			break;
		case 'top':
			top = offsetTop + xy.y;
			left = offsetLeft;
			right = mapSize.w + offsetLeft;
			bottom = mapSize.h + offsetTop;
			break;
		case 'bottom':
			top = offsetTop;
			left = offsetLeft;
			right = mapSize.w + offsetLeft;
			bottom = xy.y + offsetTop;
			break;
		default:
			return;
		}

		this.layer.div.style.clip = 'rect(' + top + 'px ' + right + 'px ' + bottom + 'px ' + left
				+ 'px)';
	},

	panDone : function() {
		if (this.layer)
			this.layer.div.style.clip = 'auto';	// no clip
	}
});
