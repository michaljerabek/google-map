/*jslint indent: 4, white: true, nomen: true, regexp: true, unparam: true, node: true, browser: true, devel: true, nomen: true, plusplus: true, regexp: true, sloppy: true, vars: true*/
/*global jQuery, google*/
(function ($) {

    /**
     * Zajišťuje inicializaci map po spojení s Googlem.
     *
     * K GoogleMaps.onInit lze přiřadit funkci, která se spustí při inicializaci.
     */
    var GoogleMaps = (function GoogleMaps() {

        var maps = [],

            initialized = false,

            /*
             * Přidá novou GoogleMap a inicializuje ji, pokud již byly Google Maps inicializovány.
             *
             * map - instance GoogleMap.
             * */
            addMap = function (map) {

                if (!(map instanceof window.GoogleMap)) {

                    return false;
                }

                maps.push(map);

                if (initialized) {

                    map.init();
                }

                return map;
            },

            /**
             * Inicializuje připravené GoogleMapy.
             */
            init = function () {

                maps.forEach(function (map) {

                    map.init();
                });

                initialized = true;
            };

        /*Funkce, kterou zavolá skript Googlu (nastavená v callbacku).*/
        window.googleMapsInit = function googleMapsInit() {

            window.GoogleMaps.$EVENT.trigger("googleMapInit.GoogleMap");

            if (typeof window.GoogleMaps.onInit === "function") {

                window.GoogleMaps.onInit();
            }

            google.maps.event.addDomListener(window, "load", init);
        };

        window.GoogleMaps = {
            //window.GoogleMaps.onInit
            addMap: addMap
        };

        return window.GoogleMaps;

    }());

    GoogleMaps.$EVENT = $({});

}(jQuery));
