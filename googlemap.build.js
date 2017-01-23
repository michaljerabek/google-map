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
/*jslint indent: 4, white: true, nomen: true, regexp: true, unparam: true, node: true, browser: true, devel: true, nomen: true, plusplus: true, regexp: true, sloppy: true, vars: true*/
/*global jQuery, google, HTMLElement, GoogleMapHTMLOverlay, GoogleMaps, GoogleMapStyle*/

(function ($) {

    /*
     * Vytvoří novou mapu.
     *
     * options - {
     *     el: "#map", - element, do kterého se vloží mapa
     *     coords: [50.0879712, 14.4172372] | LatLng, - souřadnice "výchozího místa" (použije se jako střed mapy, což lze přepsat v options)
     *     icon: "marker.png", - obrázek pro vlastní pin
     *     markers: [{icon: "marker.png", coords: [], info: "", options: {}}], - více vlastních pinů
     *     addMarker: false, - jestli přidávat marker, pokud není nastaveno icon
     *     html: "" | HTMLElement | {html: "" | HTMLElement, coords: [] | Marker | LatLng, draw: function} | [...] - html obsah na mapě
     *     zoom: 14, - přiblížení mapy
     *     styles: [] | GoogleMapStyle, - styl mapy
     *     info: "", - informace zobrazující se u výchozího markeru
     *     options: {}, - nastavení přidávající k mapě další nastavení
     *     controls: false - ne/zobrazovat všechny ovládací prvky (lze přepsat v options)
     * }
     * */
    var DEFAUlTS = { /*Výchozí nastavení je možné změnit v GoogleMap.DEFAULTS.*/
            el: "#map",

            zoom: 13,
            controls: false,
            styles: []
        },

        GoogleMap = window.GoogleMap = function GoogleMap(options) {

            if (typeof options !== "object") {

                throw "Options required.";
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
            this.infos = [];
            this._htmls = [];
            this.HTMLs = [];

            GoogleMaps.addMap(this);
        };

    GoogleMap.DEFAULTS = DEFAUlTS;

    GoogleMap.STYLES = {};

    /*Prázdný styl.*/
    GoogleMap.STYLES.empty = function () {

        return [];
    };

    /**
     * Inicializuje mapu včetně markerů, infoboxů a html.
     */
    GoogleMap.prototype.init = function () {

        this.$el = this.options.el.jquery ? this.options.el : $(this.options.el);
        this.el = this.$el[0];

        var mapOptions = {
            zoom: this.options.zoom
        };

        if (this.options.coords instanceof google.maps.LatLng) {

            mapOptions.location = this.options.coords;

        } else {

            mapOptions.location = new google.maps.LatLng(this.options.coords[0], this.options.coords[1]);
        }

        if (this.options.styles instanceof GoogleMapStyle) {

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

        if (this.options.options) {

            mapOptions = $.extend({}, mapOptions, this.options.options);
        }

        this.map = new google.maps.Map(this.el, mapOptions);

        this.initialized = true;

        if (this.options.markers) {

            this.options.markers.forEach(this.addMarker.bind(this));

        } else if (this.options.icon || this.options.addMarker) {

            this.addMarker({
                coords: mapOptions.location,
                icon: this.options.icon,
                info: this.options.info
            });
        }

        if (this.options.html) {

            if (this.options.html instanceof Array) {

                this.options.html.forEach(this.addHTML.bind(this));

            } else {

                this.addHTML(this.options.html);
            }
        }

        this._markers.forEach(this.addMarker.bind(this));
        this._infos.forEach(this.addInfo.bind(this));
        this._htmls.forEach(this.addHTML.bind(this));

        if (typeof this.options.onInit === "function") {

            this.options.onInit.call(this);
        }
    };

    /**
     * Přidá k mapě marker. Pokud je mapa inicializovaná vrátí instanci Markeru.
     * Všechny markery jsou v instance.markers.
     *
     * options - {
     *     coords: [1, 1] | LatLng, - souřadnice markeru
     *     icon: "marker.png", - ikona markeru
     *     options: {}, - ostatní nastavení markeru
     *     info: "" - informace zobrazované u markeru
     * }
     */
    GoogleMap.prototype.addMarker = function (options) {

        options = options || {};

        if (!this.initialized) {

            this._markers.push(options);

            return;
        }

        if (options.coords && !(options.coords instanceof google.maps.LatLng)) {

            options.coords = new google.maps.LatLng(options.coords[0], options.coords[1]);
        }

        var markerOptions = {
            position: options.coords || this.map.location,
            map: this.map,
            icon: options.icon || this.options.icon
        };

        if (options.options) {

            markerOptions = $.extend({}, markerOptions, options.options);
        }

        var marker = new google.maps.Marker(markerOptions);

        if (options.info) {

            this.addInfo({
                content: options.info,
                marker: marker
            });
        }

        this.markers.push(marker);

        return marker;
    };

    /**
     * Přidá informace k markeru. Pokud je mapa inicializovaná vrátí instanci InfoWindow.
     * Info se zobrazuje při kliknutí (a touchend) na pin. Všechny info jsou v instance.infos.
     *
     * options - {
     *     content: "", - obsah
     *     options: {}, - další nastavení
     *     marker: Marker - marker, ke kterému se má info přiřadit (pokud není nastaveno použije se poslední)
     * }
     */
    GoogleMap.prototype.addInfo = function (options) {

        options = options || {};

        if (!this.initialized) {

            this._infos.push(options);

            return;
        }

        options.marker = options.marker || this.markers[this.markers.length - 1];

        var infoOptions = {
            content: options.content
        };

        if (options.options) {

            infoOptions = $.extend({}, infoOptions, options.options);
        }

        var info = new google.maps.InfoWindow(infoOptions),

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

        this.infos.push(info);

        return info;
    };

    /**
     * Přidá do mapy vlastní HTML obsah. Pokud je mapa inicializovaná vrátí instanci GoogleMapHTMLOverlay.
     * Všechny HTML jsou v instance.HTMLs.
     *
     * options - "<div></div>" | {
     *     html: "" | HTMLElement, - vlastní HTML obsah
     *     coords: [1, 1] | LatLng | Marker, - souřadnice, kam vložit HTML (pokud není nastaveno, použije se location mapy)
     *     draw: function - vlastní funkce zajišťující vykreslení HTML
     * }
     */
    GoogleMap.prototype.addHTML = function (options) {

        if (!this.initialized) {

            this._htmls.push(options);

            return;
        }

        var html = typeof options === "string" || options instanceof HTMLElement ? options : options.html,
            position = typeof options === "object" && !(options instanceof HTMLElement) ? options.coords : null,
            draw = typeof options === "object" && !(options instanceof HTMLElement) ? options.draw : null,

            overlay = new GoogleMapHTMLOverlay(this.map, html, position, draw);

        this.HTMLs.push(overlay);

        return overlay;
    };

    /**
     * Varátí styl podle jména. Pokud styl neexistuje, vrátí styl "empty".
     * Vrací instanci GoogleMapStyle.
     *
     * name (String) - název stylu
     * modifier (Function) - funkce pro úpravu stylu
     */
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


}(jQuery));
/*jslint indent: 4, white: true, nomen: true, regexp: true, unparam: true, node: true, browser: true, devel: true, nomen: true, plusplus: true, regexp: true, sloppy: true, vars: true*/
/*global jQuery, google, GoogleMaps*/

(function ($) {

    /**
     * Třída zajišťující vložení vlastního HTML do mapy.
     *
     * map - instance Map
     * html (String | HTMLElement) - HTML obsah
     * position - [1, 1] | LatLng | Marker - suřadnice, kam HTML vložit (pokud není nastaveno, použije se location mapy)
     * drawFn (Function) - vlastní funkce pro vykreslení mapy
     */
    var GoogleMapHTMLOverlay = window.GoogleMapHTMLOverlay = function GoogleMapHTMLOverlay(map, html, position, drawFn) {

        this.html = html;

        this.$el = null;
        this.el = null;

        this.map = map;

        if (drawFn) {

            this.draw = drawFn;
        }

        if (position instanceof google.maps.LatLng) {

            this.position = position;

        } else if (position instanceof google.maps.Marker) {

            this.position = position.position;

        } else if (position instanceof Array) {

            this.position = new google.maps.LatLng(position[0], position[1]);

        } else {

            this.position = this.map.location;
        }

        this.setMap(map);
    };

    /*Prototype GoogleMapHTMLOverlay je potřeba nastavit až po inicializace, protože potřebujeme globální objekt google.*/
    GoogleMaps.$EVENT.on("googleMapInit.GoogleMap", function () {

        GoogleMapHTMLOverlay.prototype = new google.maps.OverlayView();

        /*
         * Povinná metoda pro přidání mapy.
         * */
        GoogleMapHTMLOverlay.prototype.onAdd = function() {

            var panes = this.getPanes();

            this.$el = $("<div></div>");

            this.$el
                .css("position", "absolute")
                .html(this.html)
                .appendTo(panes.overlayLayer);

            this.el = this.$el[0];
        };

        /*
         * Povinná metoda pro vykreslení mapy.
         * Zarovná HTML doprostřed nad souřadnice.
         * */
        GoogleMapHTMLOverlay.prototype.draw = function() {

            var overlayProjection = this.getProjection(),

                position = overlayProjection.fromLatLngToDivPixel(this.position),
                size = {
                    width: this.$el.outerWidth(),
                    height: this.$el.outerHeight()
                };

            this.el.style.left = (position.x - (size.width / 2)) + "px";
            this.el.style.top = (position.y - size.height) + "px";
        };

        /*
         * Povinná metoda pro odstranění HTML.
         */
        GoogleMapHTMLOverlay.prototype.onRemove = function() {

            this.$el.remove();

            this.$el = null;
            this.el = null;
        };

        /*
         * Následující funkce volají stejnojmenné funkce jQuery (kromě show/hide, které fungují jako fadeIn/fadeOut) na nejvyšším elementu HTML.
         */
        GoogleMapHTMLOverlay.prototype.show = function() {

            return this.$el.fadeIn.apply(this.$el, arguments);
        };

        GoogleMapHTMLOverlay.prototype.hide = function() {

            return this.$el.fadeOut.apply(this.$el, arguments);
        };

        GoogleMapHTMLOverlay.prototype.animate = function() {

            return this.$el.animate.apply(this.$el, arguments);
        };

        GoogleMapHTMLOverlay.prototype.css = function() {

            return this.$el.css.apply(this.$el, arguments);
        };

        GoogleMapHTMLOverlay.prototype.find = function() {

            return this.$el.find.apply(this.$el, arguments);
        };
    });


}(jQuery));
/*jslint indent: 4, white: true, nomen: true, regexp: true, unparam: true, node: true, browser: true, devel: true, nomen: true, plusplus: true, regexp: true, sloppy: true, vars: true*/
/*global jQuery*/

(function ($) {


    /**
     * Třída obsahující styly pro mapu. Obsahuje jednoduché API pro upravování stylu.
     *
     * styles (Array) - styly pro mapu: https://developers.google.com/maps/documentation/javascript/style-reference
     */
    var GoogleMapStyle = window.GoogleMapStyle = function GoogleMapStyle(styles) {

        this.styles = styles || [];
    };

    /**
     * Nastaví styly pro zadaný featureType a elementType. Pokud existuje, přepíše se. Jinak se vytvoří nový styl.
     * https://developers.google.com/maps/documentation/javascript/style-reference
     *
     * featureType (String) - nastavovaná vlastnost
     * elementType (String) - nastavovaný element
     * styles - {
     *     color: "#fff000",
     *     lightness: 20
     * }
     * unsetSubtypes (Boolean) - odstraní všechny styly, které jsou podtypem tohoto stylu (viz GoogleMapStyle.prototype.findSubtypes)
     */
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

    /**
     * Přepíše styly pro zadaný elementType ve všech featureType. Pokud je featureType false nebo "all", přenastaví se u všech,
     * které odpovídají elementType. Pokud je featureType zadán, přenastaví se i všechny podtypy.
     * https://developers.google.com/maps/documentation/javascript/style-reference
     *
     * featureType (String) - nastavovaná vlastnost
     * elementType (String) - nastavovaný element
     * styles - {
     *     color: "#fff000",
     *     lightness: 20
     * }
     * unsetSubtypes (Boolean) - odstraní všechny styly, které jsou podtypem tohoto stylu (viz GoogleMapStyle.prototype.findSubtypes)
     */
    GoogleMapStyle.prototype.all = function (featureType, elementType, styles, unsetSubtypes) {

        this.each(function (style) {

            if ((style.featureType === featureType || !featureType || featureType === "all" || (style.featureType && style.featureType.indexOf(featureType + ".") === 0)) && (style.elementType === elementType || (!style.elementType && !elementType))) {

                style.stylers = this.toStylers(styles);
            }
        });

        if (unsetSubtypes) {

            this.findSubtypes(featureType, elementType).forEach(function (style) {

                this.unset(style.featureType, style.elementType);

            }.bind(this));
        }
    };

    /**
     * Odstraní všechy styly pro zadaný featureType a elementType.
     * https://developers.google.com/maps/documentation/javascript/style-reference
     *
     * featureType (String) - odstraňovaná vlastnost
     * elementType (String) - odstraňovaný element
     * styles - {
     *     color: "#fff000",
     *     lightness: 20
     * }
     * subtypes (Boolean) - odstraní všechny styly, které jsou podtypem tohoto stylu (viz GoogleMapStyle.prototype.findSubtypes)
     */
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

    /**
     * Přidá styly k zadanému featureType a elementType. Pokud kombinace neexistuje, vytvoří se nový styl.
     * Pokud vlastnost již u stylu je, přepíše se.
     * https://developers.google.com/maps/documentation/javascript/style-reference
     *
     * featureType (String) - nastavovaná vlastnost
     * elementType (String) - nastavovaný element
     * styles - {
     *     color: "#fff000",
     *     lightness: 20
     * }
     * removeSubtypes (Boolean) - odstraní všechny styly specifikované ve styles, které jsou podtypem tohoto stylu (viz GoogleMapStyle.prototype.findSubtypes)
     */
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

                this.remove(style.featureType, style.elementType, Object.keys(styles));

            }.bind(this));
        }
    };

    /**
     * Odstraní styly patřící k featureType a elementType.
     * https://developers.google.com/maps/documentation/javascript/style-reference
     *
     * featureType (String) - vlastnost, ze které se styl odsraňuje
     * elementType (String) - element, ze kterého se styl odsraňuje
     * styles (String | Array) - styly, které se mají odstranit
     * subtypes (Boolean) - odstraní všechny styly specifikované ve styles, které jsou podtypem tohoto stylu (viz GoogleMapStyle.prototype.findSubtypes)
     */
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

    /**
     * Převede objekt se styly na stylery vyžadované Google Maps API.
     */
    GoogleMapStyle.prototype.toStylers = function (styles) {

        var stylers = [];

        $.each(styles, function (name, value) {

            var styler = {};

            styler[name] = value;

            stylers.push(styler);
        });

        return stylers;
    };

    /**
     * Vyhledá všechny podtypy pro featureType a elementType a vrátí je v poli.
     * Logika je komplikovaná, ale asi ne moc geniální. FeatureType je považován za
     * důležitější než elementType, takže pokud není featureType zadán, pak podtypy
     * elementTypu, které jsou zároveň přiřazeny k featureType nejsou považovány za podtyp.
     *
     * featureType (String) - vlastnost, podle které se hledá podtyp
     * elementType (String) - element, podle kterého se hledá podtyp
     */
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

    /**
     * Spustí funkci pro každý styl.
     *
     * fn (Function)
     */
    GoogleMapStyle.prototype.each = function (fn) {

        this.getStyles().forEach(fn.bind(this));
    };

    /**
     * Vratí pole se styly.
     */
    GoogleMapStyle.prototype.getStyles = function () {

        return this.styles;
    };


}(jQuery));
