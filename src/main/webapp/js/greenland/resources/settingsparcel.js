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
 * General class to hold instance state information. Offers various methods to
 * read and write from and to a saved state. This class is used for saving the
 * layer settings in permalinks.
 * 
 * It directly supports storing and restoring common UI definition objects.
 */
VIS.SettingsParcel = function(value, version) {
	this.splitString = '~';
	this.parcelStringValues = value ? value.split(this.splitString) : [];
	this.index = 0;
	this.version = version || 0;

	this.toString = function() {
		return this.parcelStringValues.join(this.splitString);
	};

	// reader
	this.readInt = function() {
		var v = this.parcelStringValues[this.index++];
		if (v == '')
			return null;
		else
			return parseInt(v);
	};
	this.readFloat = function() {
		var v = this.parcelStringValues[this.index++];
		if (v == '')
			return null;
		else
			return parseFloat(v);
	};
	this.readString = function() {
		return this.parcelStringValues[this.index++];
	};
	this.readBoolean = function() {
		return this.parcelStringValues[this.index++] == 'Y';
	};
	this.readIntArray = function() {
		var length = this.readInt();
		var res = [];
		for ( var i = 0; i < length; i++) {
			res.push(this.readInt());
		}
		return res;
	};
	this.readFloatArray = function() {
		var length = this.readInt();
		var res = [];
		for ( var i = 0; i < length; i++) {
			res.push(this.readFloat());
		}
		return res;
	};
	this.readStringArray = function() {
		var length = this.readInt();
		var res = [];
		for ( var i = 0; i < length; i++) {
			res.push(this.readString());
		}
		return res;
	};
	this.readParameter = function(paramDef) {
		if (paramDef.minVersion != null && paramDef.minVersion > this.version)
			// Can not read parameters which were not set in the applied permalink
			// version
			return;

		if (!paramDef.type || paramDef.store === false)
			return;

		if (paramDef.restore) {
			paramDef.restore(this);
			return;
		}

		switch (paramDef.type) {
		case 'number':
			paramDef.value = this.readFloat();
			break;
		case 'integer':
			paramDef.value = this.readInt();
			break;
		case 'boolean':
			paramDef.value = this.readBoolean();
			break;
		case 'selectmany':
			if (paramDef.items.length == 0)
				break;

			if (typeof paramDef.items[0] === 'number') {
				paramDef.value = this.readFloatArray();
			} else {
				paramDef.value = this.readStringArray();
			}
			break;
		case 'selectone':
			if (paramDef.items.length == 0)
				break;

			if (this.version <= 2) {
				// permalink version <= 2 stored value directly
				if (typeof paramDef.items[0] === 'number') {
					paramDef.value = this.readFloat();
				} else {
					paramDef.value = this.readString();
				}
			} else {
				// storing of value changed from permalink version 2, now storing index
				// instead of actual value, required for non-literal values
				paramDef.value = paramDef.items[this.readInt()];
			}
			break;
		}
	};

	// writer
	this.writeInt = function(value) {
		this.parcelStringValues.push(value != null ? value : '');
	};
	this.writeFloat = function(value) {
		this.parcelStringValues.push(value != null ? value : '');
	};
	this.writeString = function(value) {
		this.parcelStringValues.push(value);
	};
	this.writeBoolean = function(value) {
		this.parcelStringValues.push(value ? 'Y' : 'N');
	};
	this.writeIntArray = function(value) {
		this.writeInt(value.length);
		for ( var i = 0; i < value.length; i++) {
			this.writeInt(value[i]);
		}
	};
	this.writeStringArray = function(value) {
		this.writeInt(value.length);
		for ( var i = 0; i < value.length; i++) {
			this.writeString(value[i]);
		}
	};
	this.writeParameter = function(paramDef) {
		if (!paramDef.type || paramDef.store === false)
			return;

		if (paramDef.store) {
			paramDef.store(this);
			return;
		}

		switch (paramDef.type) {
		case 'number':
			this.writeFloat(paramDef.value);
			break;
		case 'integer':
			this.writeInt(paramDef.value);
			break;
		case 'boolean':
			this.writeBoolean(paramDef.value);
			break;
		case 'selectmany':
			this.writeStringArray(paramDef.value);
			break;
		case 'selectone':
			if (paramDef.items.length == 0)
				break;
			this.writeInt(paramDef.items.indexOf(paramDef.value));
			break;
		}
	};

};