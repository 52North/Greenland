<%@ page language="java" contentType="text/html; charset=UTF-8"
	pageEncoding="ISO-8859-1"%>
<%@ taglib uri="/WEB-INF/tld/liferay-portlet.tld" prefix="portlet"%>
<portlet:defineObjects />

<!-- ** Javascript ** -->

<!-- ExtJS + User Extensions -->
<script type="text/javascript"
	src="<%=request.getContextPath()%>/js/ExtJs/ext-base.js"></script>
<script type="text/javascript"
	src="<%=request.getContextPath()%>/js/ExtJs/ext-all.js"></script>
<!-- <script type="text/javascript" src="<%=request.getContextPath()%>/js/Extjs/ext-all-debug.js"></script>  -->
<script type="text/javascript"
	src="<%=request.getContextPath()%>/js/ExtUx/FitToParent.js"></script>
<script type="text/javascript"
	src="<%=request.getContextPath()%>/js/ExtUx/TabCloseMenu.js"></script>
<script type="text/javascript"
	src="<%=request.getContextPath()%>/js/ExtUx/MultiSelect.js"></script>
<script type="text/javascript"
	src="<%=request.getContextPath()%>/js/ExtUx/ItemSelector.js"></script>

<!-- OpenLayers + Proj4js-->
<script type="text/javascript"
	src="<%=request.getContextPath()%>/js/OpenLayers/OpenLayers.js"></script>
<!-- Debug Script -->
<!-- <script type="text/javascript" src="<%=request.getContextPath()%>/js/OpenLayers/lib/OpenLayers.js"></script> -->

<script type="text/javascript"
	src="<%=request.getContextPath()%>/js/proj4/proj4js-compressed.js"></script>
<script type="text/javascript"
	src="<%=request.getContextPath()%>/js/proj4/defs.js"></script>


<!-- GeoExt -->
<script type="text/javascript"
	src="<%=request.getContextPath()%>/js/GeoExt/GeoExt.js"></script>


<!-- Greenland Ext Extensions -->
<script type="text/javascript"
	src="<%=request.getContextPath()%>/js/greenland/greenland-ext.min.js"></script>

<!-- Base Maps -->
<script type="text/javascript"
	src="<%=request.getContextPath()%>/js/OpenLayers/OpenStreetMap.js"></script>
<script type="text/javascript"
	src="http://maps.google.com/maps/api/js?sensor=false"></script>

<!-- JStat -->
<script type="text/javascript"
	src="<%=request.getContextPath()%>/js/jstat/jstat.js"></script>
<script type="text/javascript"
	src="<%=request.getContextPath()%>/js/jstat/jstat.additions.js"></script>

<!-- Flot/JQuery -->
<script type="text/javascript"
	src="<%=request.getContextPath()%>/js/flot/jquery-flot.js"></script>

<!-- Greenland -->

<script type="text/javascript"
	src="<%=request.getContextPath()%>/js/greenland/greenland.min.js"></script>


<div id="greenlandDiv" style="width: 100%; height: 600px;"></div>