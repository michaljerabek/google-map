/*jslint indent: 4, white: true, nomen: true, regexp: true, unparam: true, node: true, browser: true, devel: true, nomen: true, plusplus: true, regexp: true, sloppy: true, vars: true*/
/*global jQuery, window*/

(function ($) {

    /* Objekt sloužící zejména pro nápovědu v editoru,
     * jaké možnosti stylů jsou k dispozici.
     */

    var GoogleMapStyler = window.GoogleMapStyler = {
        hue: "hue",
        lightness: "lightness",
        gamma: "gamma",
        invertLightness: {
            toString: function () { return "invert_lightness"; },
            "true": true,
            "false": false
        },
        visibility: {
            toString: function () { return "visibility"; },
            on: "on",
            off: "off",
            simplified: "simplified"
        },
        color: "color",
        weight: "weight"
    };

}(jQuery));
