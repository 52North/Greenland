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