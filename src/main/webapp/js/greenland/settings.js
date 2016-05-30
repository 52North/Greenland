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
// OM conversion service url
if (typeof VIS == 'undefined')
	VIS = {};

VIS.omConversionServiceUrl = "http://giv-uw.uni-muenster.de:8080/omcs";

// url of visualization service to use
VIS.vissUrl = "http://giv-uw.uni-muenster.de:8080/viss";

VIS.wmsCapabilitiesProxy = "wmsproxy";
VIS.threddsProxy = "threddsproxy";

// Resources to show by default
VIS.defaultResources = [
// ncWMS
{
	url : 'http://geoviqua.dev.52north.org/WMSQAdapter/local/wms',
	mime : 'ncwms'
}, {
	url : 'http://geoviqua.dev.52north.org/ncWMS/wms',
	mime : 'ncwms'
}, {
	url : 'http://behemoth.nerc-essc.ac.uk/ncWMS/wms',
	mime : 'ncwms'
},

// VISS
{
	url : 'http://giv-uw.uni-muenster.de/data/netcdf/biotemp-t.nc',
	mime : 'application/netcdf'
}, {
	url : 'http://giv-uw.uni-muenster.de/data/netcdf/biotemp.nc',
	mime : 'application/netcdf'
},

// Client vector
{
	url : 'http://giv-uw.uni-muenster.de/vis/v2/data/json/uncertainty-collection.json',
	mime : 'application/vnd.org.uncertweb.viss.uncertainty-collection+json'
}, {
	url : 'data/json/gaussian.json',
	mime : 'application/x-om-u+json'
},

// Conversion service
{
	// absolute path required for conversion service
	url : 'http://giv-uw.uni-muenster.de/vis/v2/data/xml/cropallocations_realisations.xml',
	mime : 'application/x-om-u+xml'
}, {
	url : 'http://giv-uw.uni-muenster.de/data/om/MS_points_PM10.xml',
	mime : 'application/x-om-u+xml'
},

{
	url : 'http://motherlode.ucar.edu:8080/thredds/topcatalog.xml',
	mime : 'threddscatalog'
}

];

// Id for user-defined resources, for internal use, connects between
// defaultResource map and Ext.ux.VIS.ResourceNodesContainer
VIS.nextResourceId = 0;