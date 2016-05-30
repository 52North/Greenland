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
if (typeof VIS == 'undefined')
	VIS = {};

/**
 * Base class for representing UncertML Statistics types. Returns the mean of an
 * array of values as default behavior, corresponding to the usual JSON encoding
 * 'values' attribute. This is adequate for value types not depending on
 * specific parameters. Values such as Quantile and Probability need less
 * abstract representations.
 * 
 * The constructor takes a statistics type identifier and value config object as
 * arguments, usually as received from the json output.
 */
VIS.StatisticsValue = function(type, value) {
	this.statisticsType = type;
	this.uom = null;
	this.id = type;
	this.numeric = true;
	OpenLayers.Util.extend(this, value);
	// called to receive the value represented by an object
	this.getValue = function() {
		var sum = 0;
		for ( var i = 0; i < this.values.length; i++)
			sum += this.values[i];
		return sum / this.values.length;
	};
	this.getIdentifier = function() {
		return this.id;
	};
	// Return the title of the underlying statistics
	this.getTitle = function() {
		return this.statisticsType;
	};
	// Used by the custom result value layer creation
	this.isNumeric = function() {
		return this.numeric;
	};
};

/**
 * Extension of {VIS.StatisticsValue} to consider the constraints parameter of a
 * Probability statistics value
 * 
 * @param value
 * @returns {VIS.ProbabilityValue}
 */
VIS.ProbabilityValue = function(value) {
	// extract possible constraints from json encoding
	var constraints = value.constraints;
	this.lt = null;
	this.le = null;
	this.gt = null;
	this.ge = null;
	for ( var i = 0; i < constraints.length; i++) {
		switch (constraints[i].type) {
		case 'GREATER_THAN':
			this.gt = constraints[i].value;
			break;
		case 'GREATER_OR_EQUAL':
			this.ge = constraints[i].value;
			break;
		case 'LESS_THAN':
			this.lt = constraints[i].value;
			break;
		case 'LESS_OR_EQUAL':
			this.le = constraints[i].value;
			break;
		}
	}
	var type = 'Prob' + (this.gt ? 'GT' + this.gt : '') + (this.ge ? 'GE' + this.ge : '')
			+ (this.le ? 'LE' + this.le : '') + (this.lt ? 'LT' + this.lt : '');

	// include probability constraints in statistics type, do not store
	// constraints encoding
	VIS.StatisticsValue.call(this, type, {
		values : value.values
	});

	// override of getTitle to include constraints
	this.getTitle = function() {
		var constraint = 'Probability ';
		if (this.gt != null)
			constraint += this.gt + ' &lt; ';
		if (this.ge != null)
			constraint += this.ge + ' &le; ';
		constraint += 'x';
		if (this.le != null)
			constraint += ' &le; ' + this.le;
		if (this.lt != null)
			constraint += ' &lt; ' + this.lt;

		return constraint;
	};
};
VIS.ProbabilityValue.prototype = new VIS.StatisticsValue();

/**
 * Extension of {VIS.StatisticsValue} to consider the 'level' parameter of a
 * Quantile statistics value
 * 
 * @param value
 * @returns {VIS.QuantileValue}
 */
VIS.QuantileValue = function(value) {
	// use quantile level to distinguish statistics type id
	VIS.StatisticsValue.call(this, 'Quantile' + value.level, value);

	// Override getTitle to include quantile level
	this.getTitle = function() {
		return this.level + ' Quantile';
	};
};
VIS.QuantileValue.prototype = new VIS.StatisticsValue();
