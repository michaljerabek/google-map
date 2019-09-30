/*jslint indent: 4, white: true, nomen: true, regexp: true, unparam: true, node: true, browser: true, devel: true, nomen: true, plusplus: true, regexp: true, sloppy: true, vars: true*/
/*global jQuery, window*/

(function ($) {

    /* Objekt sloužící zejména pro nápovědu v editoru,
     * jaké vlastnosti mapy je možné stylovat.
     */

    var GoogleMapFeature = window.GoogleMapFeature = {
        all: "all",

        administrative: {
            toString: function () { return "administrative"; },
            country: "administrative.country",
            landParcel: "administrative.land_parcel",
            locality: "administrative.locality",
            neighborhood: "administrative.neighborhood",
            province: "administrative.province"
        },

        country: "administrative.country",
        landParcel: "administrative.land_parcel",
        locality: "administrative.locality",
        neighborhood: "administrative.neighborhood",
        province: "administrative.province",

        landscape: {
            toString: function () { return "landscape"; },
            manMade: "landscape.man_made",
            natural: {
                toString: function () { return "landscape.natural"; },
                landcover: "landscape.natural.landcover",
                terrain: "landscape.natural.terrain"
            }
        },

        manMade: "landscape.man_made",
        natural: "landscape.natural",
        landcover: "landscape.natural.landcover",
        terrain: "landscape.natural.terrain",

        poi: {
            toString: function () { return "poi"; },
            attraction: "poi.attraction",
            business: "poi.business",
            government: "poi.government",
            medical: "poi.medical",
            park: "poi.park",
            placeOfWorship: "poi.place_of_worship",
            school: "poi.school",
            sportsComplex: "poi.sports_complex"
        },

        attraction: "poi.attraction",
        business: "poi.business",
        government: "poi.government",
        medical: "poi.medical",
        park: "poi.park",
        placeOfWorship: "poi.place_of_worship",
        school: "poi.school",
        sports: "poi.sports_complex",

        road: {
            toString: function () { return "road"; },
            arterial: "road.arterial",
            highway: {
                toString: function () { return "road.highway"; },
                controlledAccess: "road.highway.controlled_access"
            },
            local: "road.local"
        },

        arterialRoad: "road.arterial",
        highway: "road.highway",
        controlledAccessHighway: "road.highway.controlled_access",
        localRoad: "road.local",

        transit: {
            toString: function () { return "transit"; },
            line: "transit.line",
            station: {
                toString: function () { return "transit.station"; },
                airport: "transit.station.airport",
                bus: "transit.station.bus",
                rail: "transit.station.rail"
            }
        },

        transitLine: "transit.line",
        station: "transit.station",
        airport: "transit.station.airport",
        bus: "transit.station.bus",
        rail: "transit.station.rail",

        water: "water"
    };

}(jQuery));
