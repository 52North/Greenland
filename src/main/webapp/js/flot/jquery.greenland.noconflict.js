/**
 * Resolves conflicts when using Greenland within an existing webapp which
 * already uses a (different) version of jQuery.
 * 
 * Stores current $ as jQueryFlot and reverts previously loaded $
 */
var jQueryFlot = $.noConflict(true);

/**
 * Overrides DistributionPlot to swap external jQuery($) and greenland jQuery
 * (jQueryFlot) while rendering
 */
DistributionPlot = DistributionPlot.extend({
	render : function() {
		// XXX better solution?
		// Swapping $ with jQueryFlot, jstat has to use jQueryFlot,
		// but expects $
		var _$ = $;
		$ = jQueryFlot;
		this._super(); // Call the parent plot method
		jQueryFlot = $;
		$ = _$;
	}
});
