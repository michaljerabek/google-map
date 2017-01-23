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

    GoogleMap.DEFAULTS = DEFAUlTS;

    GoogleMap.STYLES = {};

    GoogleMap.STYLES.empty = function () {

        return [];
    };

    GoogleMap.prototype.init = function () {

        this.$el = this.options.el.jquery ? this.options.el : $(this.options.el);
        this.el = this.$el[0];

        var mapOptions = {
            zoom: this.options.zoom,
            location: new google.maps.LatLng(this.options.coords[0], this.options.coords[1])
        };

        if (this.options.styles instanceof window.GoogleMapStyle) {

            mapOptions.styles = this.options.styles.getStyles();

        } else {

            mapOptions.styles = this.options.styles;
        }

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

    GoogleMap.getStyles = function (name, modifier) {

        var style;

        if (!GoogleMap.STYLES[name]) {

            style = new GoogleMapStyle(GoogleMap.STYLES.empty());

        } else {

            style = new GoogleMapStyle(GoogleMap.STYLES[name]());
        }

        if (typeof modifier === "function") {

            modifier.call(style);
        }

        return style;
    };


    var GoogleMapStyle = window.GoogleMapStyle = function GoogleMapStyle(styles) {

        this.styles = styles || [];
    };

    GoogleMapStyle.prototype.set = function (featureType, elementType, styles, unsetSubtypes) {

        var styleFound = false;

        this.each(function (style) {

            if ((style.featureType === featureType || (!style.featureType && !featureType)) && (style.elementType === elementType || (!style.elementType && !elementType))) {

                style.stylers = this.toStylers(styles);

                styleFound = true;

                return false;
            }
        });

        if (!styleFound) {

            this.styles.push({
                featureType: featureType,
                elementType: elementType,
                stylers: this.toStylers(styles)
            });
        }

        if (unsetSubtypes) {

            this.findSubtypes(featureType, elementType).forEach(function (style) {

                this.unset(style.featureType, style.elementType);

            }.bind(this));
        }
    };

    GoogleMapStyle.prototype.all = function (featureType, elementType, styles, unsetSubtypes) {

        this.each(function (style) {

            if ((style.featureType === featureType || !featureType || (style.featureType && style.featureType.indexOf(featureType + ".") === 0)) && (style.elementType === elementType || (!style.elementType && !elementType))) {

                style.stylers = this.toStylers(styles);
            }
        });

        if (unsetSubtypes) {

            this.findSubtypes(featureType, elementType).forEach(function (style) {

                this.unset(style.featureType, style.elementType);

            }.bind(this));
        }
    };

    GoogleMapStyle.prototype.unset = function (featureType, elementType, subtypes) {

        this.each(function (style, i) {

            if ((style.featureType === featureType || (!style.featureType && !featureType)) && (style.elementType === elementType || (!style.elementType && !elementType))) {

                this.styles.splice(i, 1);

                return false;
            }
        });

        if (subtypes) {

            this.findSubtypes(featureType, elementType).forEach(function (style) {

                this.unset(style.featureType, style.elementType);

            }.bind(this));
        }
    };

    GoogleMapStyle.prototype.add = function (featureType, elementType, styles, removeSubtypes) {

        var styleFound = false;

        this.each(function (style) {

            if ((style.featureType === featureType || (!style.featureType && !featureType)) && (style.elementType === elementType || (!style.elementType && !elementType))) {

                $.each(styles, function (name, newValue) {

                    var found = false;

                    $.each(style.stylers, function (i, styler) {

                        if (typeof styler[name] !== "undefined") {

                            style.stylers[i][name] = newValue;

                            found = true;

                            return false;
                        }
                    });

                    if (!found) {

                        var newStyler = {};

                        newStyler[name] = newValue;

                        style.stylers = style.stylers || [];

                        style.stylers.push(newStyler);
                    }
                });

                styleFound = true;

                return false;
            }
        });

        if (!styleFound) {

            this.set(featureType, elementType, styles);
        }

        if (removeSubtypes) {

            this.findSubtypes(featureType, elementType).forEach(function (style) {

                this.remove(style.featureType, style.elementType, styles);

            }.bind(this));
        }
    };

    GoogleMapStyle.prototype.remove = function (featureType, elementType, styles, subtypes) {

        styles = typeof styles === "string" ? [styles] : styles;

        var styleFound = false;

        this.each(function (style) {

            if ((style.featureType === featureType || (!style.featureType && !featureType)) && (style.elementType === elementType || (!style.elementType && !elementType))) {

                styles.forEach(function (name) {

                    $.each(style.stylers, function (i, styler) {

                        if (typeof styler[name] !== "undefined") {

                            style.stylers.splice(i, 1);

                            return false;
                        }
                    });
                }.bind(this));

                if (!style.stylers.length) {

                    this.unset(featureType, elementType);
                }

                styleFound = true;

                return false;
            }
        });

        if (!styleFound) {

            this.unset(featureType, elementType, subtypes);
        }

        if (subtypes) {

            this.findSubtypes(featureType, elementType).forEach(function (style) {

                this.remove(style.featureType, style.elementType, styles);

            }.bind(this));
        }
    };

    GoogleMapStyle.prototype.toStylers = function (styles) {

        var stylers = [];

        $.each(styles, function (name, value) {

            var styler = {};

            styler[name] = value;

            stylers.push(styler);
        });

        return stylers;
    };

    GoogleMapStyle.prototype.findSubtypes = function (featureType, elementType) {

        var substyles = [],

            featureTypeDot = featureType ? featureType + "." : null,
            elementTypeDot = elementType ? elementType + "." : null;

        this.each(function (style) {

            var added = false,

                styleHasFeature = !!style.featureType,
                styleHasElement = !!style.elementType,
                styleIsFeature = style.featureType === featureType,
                styleIsElement = style.elementType === elementType,
                styleIsFeatureSubtype = styleHasFeature && (style.featureType.indexOf(featureTypeDot) === 0 || (featureType === "all" && style.featureType !== "all")),
                styleIsElementSubtype = styleHasElement && (style.elementType.indexOf(elementTypeDot) === 0 || (elementType === "all" && style.elementType !== "all"));

            if ((!styleHasFeature && !featureType) || (styleHasFeature && (styleIsFeature || styleIsFeatureSubtype))) {

                if (styleHasElement && styleIsElementSubtype) {

                    added = substyles.push(style);
                }
            }

            if (!added && (!elementType && (!styleHasElement || (styleHasFeature && styleIsFeatureSubtype)))) {

                if (styleHasFeature && styleIsFeatureSubtype) {

                    added = substyles.push(style);
                }
            }

            if (!added && styleHasFeature && styleHasElement) {

                if (((styleIsFeature && styleIsElementSubtype) || (styleIsFeatureSubtype && styleIsElement)) || (styleIsElementSubtype && styleIsFeatureSubtype)) {

                    added = substyles.push(style);
                }

                if (!added && styleIsFeature && !elementType && styleHasElement) {

                    added = substyles.push(style);
                }
            }
        });

        return substyles;
    };

    GoogleMapStyle.prototype.each = function (fn) {

        this.getStyles().forEach(fn.bind(this));
    };

    GoogleMapStyle.prototype.getStyles = function () {

        return this.styles;
    };

}(jQuery));
