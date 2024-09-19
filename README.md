# ARCHIVED

This project is no longer maintained and will not receive any further updates. If you plan to continue using it, please be aware that future security issues will not be addressed.

# Greenland

Greenland is a client-side tool to render quality-aware geospatial data, implemented as OpenLayers-based webpage. It is based on work originally developed within the UncertWeb project known as "the visualization client". 

## License

Greenland's source code is published under the GNU General Public License Version 3.

### Libraries

Graphics are by http://projects.opengeo.org/geosilk (Creative Commons Attribution 3.0 License) 

#### Java libraries

See NOTICE file.

#### Javascript libraries

* OpenLayers 2.12 - 2-clause BSD license
* ExtJS 3.4 (http://docs.sencha.com/ext-js/3-4/) - GPL v3, see http://www.sencha.com/legal/
* GeoExt 1.0 (http://geoext.org/) - BSD license
* Flot  - MIT license
* jQuery - MIT license

## Extensions of standard GUI components

Extensions are published under the GNU General Public License Version 3.

* Ext.ux.VIS.Slider (slider.js), extend Ext.slider.MultiSlider with snapValues for irregular ticks
* Ext.ux.VIS.FlotPanel (flotpanel.js), extend Ext.Panel to display Flot plots including event handling
* Ext.ux.VIS.FeatureArrow (featurearrow.js), extend/"misuse" of GeoExt.FeatureRenderer to draw triangles dynamically (not supported by ExtJS 3.4) 
* Ext.ux.VIS.LegendScaleBar (scalebar.js), extend Ext.Panel, accepts visualisation as config option and dynamically updates legend
* Ext.ux.VIS.ResourceNodesContainer (resourcetree.js) root of resource selection, addResource method adds a resource expecting an object with mime,url,(request), to be used in Ext.tree.TreePanel
* Ext.ux.VIS.ResourceLoader (resourcetree.js) uses Ext.ux.VIS.ResourceNodesContainer, manages the loading of nodes - lazy loading of Greenland ressources and lokal OM data, provides access to all config options
