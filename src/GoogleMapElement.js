/*jslint indent: 4, white: true, nomen: true, regexp: true, unparam: true, node: true, browser: true, devel: true, nomen: true, plusplus: true, regexp: true, sloppy: true, vars: true*/
/*global jQuery, window*/

(function ($) {

    /* Objekt sloužící zejména pro nápovědu v editoru,
     * jaké elementy vlastností je možné stylovat.
     */

    var GoogleMapElement = window.GoogleMapElement = {
        all: "all",

        geometry: {
            toString: function () { return "geometry"; },
            fill: "geometry.fill",
            stroke: "geometry.stroke"
        },

        fill: "geometry.fill",
        stroke: "geometry.stroke",

        labels: {
            toString: function () { return "labels"; },
            icon: "labels.icon",
            text: {
                toString: function () { return "labels.text"; },
                fill: "labels.text.fill",
                stroke: "labels.text.stroke"
            }
        },

        icon: "labels.icon",
        text: "labels.text",
        textFill: "labels.text.fill",
        textStroke: "labels.text.stroke"
    };

}(jQuery));
