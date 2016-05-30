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
