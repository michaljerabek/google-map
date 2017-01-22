/*jslint indent: 4, white: true, nomen: true, regexp: true, unparam: true, node: true, browser: true, devel: true, nomen: true, plusplus: true, regexp: true, sloppy: true, vars: true*/
/*global jQuery, google*/

(function ($) {

    /*
     * {
     *     el: "#map",
     *     coords: [50.0879712, 14.4172372],
     *     icon: "marker.png",
     *     markers: [{icon: "marker.png", coords: []}],
     *     zoom: 14,
     *     styles: [],
     *     info: "",
     *     mapOptions: {},
     *     controls: false
     * }
     * */

    var DEFAUlTS = {
            el: "#map",

            zoom: 13,
            controls: false,
            styles: []
        },

        GoogleMaps = (function GoogleMaps() {

            var maps = [],

                initialized = false,

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

                init = function () {

                    maps.forEach(function (map) {

                        map.init();
                    });

                    initialized = true;
                };

            window.googleMapsInit = function googleMapsInit() {

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

        }()),

        GoogleMap = window.GoogleMap = function GoogleMap(options) {

            if (typeof options !== "object") {

                throw "Options required: {el: \"#map\", coords: [50.0879712, 14.4172372], icon: \"marker.png\", zoom: 14, mapOptions: {}, info: \"\"}";
            }

            this.options = options;

            if (!this.options.coords) {

                throw "Coords are required.";
            }

            if (!this.options.el) {

                this.options.el = GoogleMap.DEFAULTS.el;
            }

            if (!this.options.zoom) {

                this.options.zoom = GoogleMap.DEFAULTS.zoom;
            }

            if (!this.options.styles) {

                this.options.styles = GoogleMap.DEFAULTS.styles;
            }

            this.el = null;
            this.$el = null;
            this.map = null;
            this.markers = [];
            this._markers = [];
            this._infos = [];

            GoogleMaps.addMap(this);
        };

    GoogleMap.prototype.init = function () {

        this.$el = this.options.el.jquery ? this.options.el : $(this.options.el);
        this.el = this.$el[0];

        var mapOptions = {
            zoom: this.options.zoom,
            styles: this.options.styles,
            location: new google.maps.LatLng(this.options.coords[0], this.options.coords[1])
        };

        mapOptions.center = mapOptions.location;

        if (!this.options.controls && !GoogleMap.DEFAULTS.controls) {

            mapOptions.zoomControl = false;
            mapOptions.mapTypeControl = false;
            mapOptions.scaleControl = false;
            mapOptions.streetViewControl = false;
            mapOptions.rotateControl = false;
            mapOptions.fullscreenControl = false;
        }

        if (this.options.mapOptions) {

            mapOptions = $.extend({}, mapOptions, this.options.mapOptions);
        }

        if (typeof this.options.onInit === "function") {

            this.options.onInit(mapOptions);
        }

        this.map = new google.maps.Map(this.el, mapOptions);

        this.initialized = true;

        if (this.options.markers) {

            this.options.markers.forEach(this.addMarker.bind(this));

        } else {

            this.addMarker({
                coords: mapOptions.location,
                icon: this.options.icon,
                info: this.options.info
            });
        }

        this._markers.forEach(function (options) {

            this.addMarker(options);

        }.bind(this));

        this._infos.forEach(function (options) {

            this.addInfo(options);

        }.bind(this));
    };

    GoogleMap.prototype.addMarker = function (options) {

        options = options || {};

        if (!this.initialized) {

            this._markers.push(options);

            return;
        }

        if (options.coords && !(options.coords instanceof google.maps.LatLng)) {

            options.coords = new google.maps.LatLng(options.coords[0], options.coords[1]);
        }

        var marker = new google.maps.Marker({
                position: options.coords || this.map.location,
                map: this.map,
                icon: options.icon || this.options.icon
            });

        if (options.info) {

            this.addInfo({
                content: options.info,
                marker: marker
            });
        }

        this.markers.push(marker);

        return marker;
    };

    GoogleMap.prototype.addInfo = function (options) {

        options = options || {};

        if (!this.initialized) {

            this._infos.push(options);

            return;
        }

        options.marker = options.marker || this.markers[this.markers.length - 1];

        var info = new google.maps.InfoWindow({
                content: options.content
            }),

            touch = false;

        google.maps.event.addListener(options.marker, "touchend", function() {

            touch = true;

            info.open(this.map, this);
        });

        google.maps.event.addListener(options.marker, "click", function() {

            if (touch) {

                touch = false;

                return;
            }

            info.open(this.map, this);
        });

        return info;
    };

    GoogleMap.DEFAULTS = DEFAUlTS;

    GoogleMap.STYLES = {};

    GoogleMap.STYLE = function (name /*, [modifier]*/) {

        if (!GoogleMap.STYLES[name]) {

            return [];
        }

        var style = GoogleMap.STYLES[name]();

        if (arguments[1]) {

            arguments[1](style);
        }

        return style;
    };

}(jQuery));
