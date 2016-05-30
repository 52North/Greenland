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
OpenLayers.VIS.Color = {
	RGB : OpenLayers.Class({
		CLASS_NAME : 'OpenLayers.VIS.Color.RGB',
		HEX_DIGITS : '0123456789ABCDEF',
		initialize : function(red, green, blue) {
			this.r = red;
			this.g = green;
			this.b = blue;
		},

		toHex : function() {
			return '#' + this.hexify(this.r) + this.hexify(this.g)
					+ this.hexify(this.b);
		},

		hexify : function(number) {
			var lsd = number % 16;
			var msd = (number - lsd) / 16;
			return this.HEX_DIGITS.charAt(msd) + this.HEX_DIGITS.charAt(lsd);
		}
	}),

	HSV : OpenLayers.Class({
		CLASS_NAME : 'OpenLayers.VIS.Color.HSV',

		initialize : function(hue, sat, val) {
			this.h = hue;
			this.s = sat;
			this.v = val;
		},

		toRGB : function() {
			var h = this.h / 360;
			var s = this.s / 100;
			var v = this.v / 100;
			var r = null, g = null, b = null;
			if (s === 0) {
				r = g = b = v;
			} else {
				var h6, i, x, y, z;
				h6 = h * 6;
				i = Math.floor(h6);
				x = v * (1 - s);
				y = v * (1 - s * (h6 - i));
				z = v * (1 - s * (1 - (h6 - i)));
				switch (i) {
				case 0:
					r = v;
					g = z;
					b = x;
					break;
				case 1:
					r = y;
					g = v;
					b = x;
					break;
				case 2:
					r = x;
					g = v;
					b = z;
					break;
				case 3:
					r = x;
					g = y;
					b = v;
					break;
				case 4:
					r = z;
					g = x;
					b = v;
					break;
				case 5:
					r = v;
					g = x;
					b = y;
					break;
				}
			}
			return new OpenLayers.VIS.Color.RGB(r * 255, g * 255, b * 255);
		}
	}),

	HSI : OpenLayers.Class({
		CLASS_NAME : 'OpenLayers.VIS.Color.HSI',

		initialize : function(hue, sat, inte) {
			this.h = hue;
			this.s = sat;
			this.i = inte;
		},

		// see
		// http://www.had2know.com/technology/hsi-rgb-color-converter-equations.html
		toRGB : function() {
			var h = this.h, s = this.s, i = this.i;
			var cos = function(d) {
				return Math.cos(d / 180 * Math.PI);
			};
			var r = 0, g = 0, b = 0;
			if (h == 0) {
				r = i + 2 * i * s;
				g = b = i - i * s;
			} else if (h < 120) {
				r = i + i * s * cos(h) / cos(60 - h);
				g = i + i * s * (1 - cos(h) / cos(60 - h));
				b = i - i * s;
			} else if (h == 120) {
				r = b = i - i * s;
				g = i + 2 * i * s;
			} else if (h < 240) {
				r = i - i * s;
				g = i + i * s * cos(h - 120) / cos(180 - h);
				b = i + i * s * (1 - cos(h - 120) / cos(180 - h));
			} else if (h == 240) {
				r = g = i - i * s;
				b = i + s * i * s;
			} else {
				r = i + i * s * (1 - cos(h - 240) / cos(300 - h));
				g = i - i * s;
				b = i + i * s * cos(h - 240) / cos(300 - h);
			}
			return new OpenLayers.VIS.Color.RGB(r, g, b);
		}
	})
};