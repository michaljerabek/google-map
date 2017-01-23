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
