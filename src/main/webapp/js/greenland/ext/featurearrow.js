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
/*
 * Based on GeoExt.FeatureRenderer class, represents a simple triangle to point
 * to a specific feature
 */
Ext.ux.VIS.FeatureArrow = Ext.extend(GeoExt.FeatureRenderer, {

	startPos : null,

	endPos : null,

	startWidth : null,

	orientation : 'vertical',

	initComponent : function() {
		Ext.ux.VIS.FeatureArrow.superclass.initComponent.apply(this, arguments);

		this.feature = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.Polygon(
				[ new OpenLayers.Geometry.LinearRing([ new OpenLayers.Geometry.Point(0, 0),
						new OpenLayers.Geometry.Point(0, 50), new OpenLayers.Geometry.Point(-50, 25),
						new OpenLayers.Geometry.Point(0, 0) ]) ]));
		this.startPos = [ 0, 0 ];
		this.endPos = [ 0, 0 ];
		this.startWidth = 100;
	},

	setStartPosition : function(x, y) {
		this.startPos = [ x, y ];
	},

	setStartWidth : function(w) {
		this.startWidth = w;
	},

	setEndPosition : function(x, y) {
		this.endPos = [ x, y ];
	},

	setOrientation : function(orientation) {
		this.orientation = orientation;
	},

	updateFeature : function() {
		var startOffsetX, startOffsetY;
		switch (this.orientation) {
		case 'vertical':
			startOffsetX = 0;
			startOffsetY = this.startWidth;
			break;
		case 'horizontal':
			startOffsetX = this.startWidth;
			startOffsetY = 0;
			break;
		}

		var height = this.endPos[1] - this.startPos[1];
		this.setFeature(new OpenLayers.Feature.Vector(new OpenLayers.Geometry.Polygon(
				[ new OpenLayers.Geometry.LinearRing([
						new OpenLayers.Geometry.Point(this.startPos[0], height - this.startPos[1]),
						new OpenLayers.Geometry.Point(this.startPos[0] + startOffsetX, height
								- this.startPos[1] - startOffsetY),
						new OpenLayers.Geometry.Point(this.endPos[0], height - this.endPos[1]),
						new OpenLayers.Geometry.Point(this.startPos[0], height - this.startPos[1]) ]) ])));
	}

});
