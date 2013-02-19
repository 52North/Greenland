/**
 * Resolves conflicts when using Greenland within an existing webapp which
 * already uses a (different) version of jQuery.
 * 
 * Stores current $ as jQueryFlot and reverts previously loaded $
 */
var jQueryFlot = $.noConflict(true);