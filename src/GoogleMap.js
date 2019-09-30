/*jslint indent: 4, white: true, nomen: true, regexp: true, unparam: true, node: true, browser: true, devel: true, nomen: true, plusplus: true, regexp: true, sloppy: true, vars: true*/
/*global jQuery, google, HTMLElement, GoogleMapHTMLOverlay, GoogleMaps, GoogleMapStyle*/

(function ($) {

    /*
     * Vytvoří novou mapu.
     *
     * options - {
     *     el: "#map" | $() | HTMLElement, - element, do kterého se vloží mapa
     *     coords: [50.0879712, 14.4172372] | LatLng, - souřadnice "výchozího místa" (použije se jako střed mapy, což lze přepsat v options)
     *     icon: "marker.png", - obrázek pro vlastní pin
     *     markers: [{icon: "marker.png", coords: [], info: "", options: {}, id: "" | 0, group: ""}], - více vlastních pinů
     *     addMarker: false, - jestli přidávat marker, pokud není nastaveno icon
     *     html: "" | HTMLElement | {html: "" | HTMLElement, coords: [] | Marker | LatLng, draw: function} | [...] - html obsah na mapě
     *     zoom: 14, - přiblížení mapy
     *     styles: [] | GoogleMapStyle, - styl mapy
     *     info: "", - informace zobrazující se u výchozího markeru
     *     options: {}, - nastavení přidávající k mapě další nastavení
     *     controls: false, - ne/zobrazovat všechny ovládací prvky (lze přepsat v options)
     *     centerToLocationOnResize: 0 | true - vycentrovat mapu na coords při změně velikosti okna (pokud je zadáno coords) | číslo nastavuje, za jak dlouho po události resize považovat změnu velikosti za ukončenou
     *     fitBoundsOnResize: 0 | true - nastvit mapu při změně velikosti okna, aby byly vidět všechny markery (pokud není zadáno coords) | číslo nastavuje, za jak dlouho po události resize považovat změnu velikosti za ukončenou
     * }
     * */
    var DEFAUlTS = { /*Výchozí nastavení je možné změnit v GoogleMap.DEFAULTS.*/
            el: "#map",

            zoom: 14,
            controls: false,
            styles: [],
            centerToLocationOnResize: 0,
            fitBoundsOnResize: 0
        },

        GoogleMap = window.GoogleMap = function GoogleMap(options) {

            if (typeof options !== "object") {

                throw "Options required.";
            }

            this.options = $.extend({}, DEFAUlTS, options);

            if (!this.options.el) {

                this.options.el = GoogleMap.DEFAULTS.el;
            }

            if (!this.options.zoom) {

                this.options.zoom = GoogleMap.DEFAULTS.zoom;
            }

            if (!this.options.styles) {

                this.options.styles = GoogleMap.DEFAULTS.styles;
            }

            this.options.styles.googleMap = this;

            this.el = null;
            this.$el = null;
            this.map = null;

            this._noCoordsOnInit = !this.options.coords;

            this._animations = {};
            this._$animEl = $("<div></div>");

            this._idHTMLCounter = 0;
            this._idMarkerCounter = 0;
            this._idInfoCounter = 0;

            this._markers = [];
            this._markersDefers = {};
            this._infos = [];
            this._infosDefers = {};
            this._htmls = [];
            this._htmlsDefers = {};

            this.markers = {};
            this.groupedMarkers = {};
            this.infos = {};
            this.HTMLs = {};

            this.markerId = null;
            this.infoId = null;
            this.HTMLId = null;

            this._defer = $.Deferred();

            GoogleMaps.addMap(this);
        },

        generateId = function (type) {

            switch (type) {

                case "HTML"  : return !this.HTMLs[++this._idHTMLCounter]     ? this._idHTMLCounter   : generateId.call(this, type);
                case "Marker": return !this.markers[++this._idMarkerCounter] ? this._idMarkerCounter : generateId.call(this, type);
                case "Info"  : return !this.infos[++this._idInfoCounter]     ? this._idInfoCounter   : generateId.call(this, type);
            }
        },

        closeAllInfos = function () {

            $.each(this.infos, function (id, info) {

                info.close();
            });
        },

        initInfoEvents = function (info, marker) {

            var touch = false,

                _this = this;

            google.maps.event.addListener(marker, "touchend", function() {

                touch = true;

                closeAllInfos.call(_this);

                info.open(this.map, this);
            });

            google.maps.event.addListener(marker, "click", function() {

                if (touch) {

                    touch = false;

                    return;
                }

                closeAllInfos.call(_this);

                info.open(this.map, this);
            });
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

        this.bounds = new google.maps.LatLngBounds();

        this.$el = this.options.el.jquery ? this.options.el : $(this.options.el);
        this.el = this.$el[0];

        var mapOptions = {
            zoom: this.options.zoom
        };

        if (this.options.coords instanceof google.maps.LatLng) {

            mapOptions.location = this.options.coords;

        } else if (this.options.coords) {

            mapOptions.location = new google.maps.LatLng(this.options.coords[0], this.options.coords[1]);
        }

        mapOptions.styles = this.options.styles || (window.GoogleMapStyle ? new GoogleMapStyle(): GoogleMap.STYLES.empty());

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

        if (this.options.centerToLocationOnResize) {

            this.initCenterToLocationOnResize(this.options.centerToLocationOnResize);
        }

        if (this.options.fitBoundsOnResize) {

            this.initFitBoundsOnResize(this.options.fitBoundsOnResize);
        }

        this.initialized = true;

        if (this.options.icon || this.options.addMarker) {

            this.markerId = generateId.call(this, "Marker");

            if (this.options.info) {

                this.infoId = generateId.call(this, "Info");
            }

            this.addMarker({
                coords: mapOptions.location,
                icon: this.options.icon,
                info: this.options.info,
                infoId: this.options.infoId,
                id: this.markerId
            });
        }

        if (this.options.markers) {

            this.options.markers.forEach(this.addMarker.bind(this));
        }

        if (this.options.html) {

            if (this.options.html instanceof Array) {

                this.options.html.forEach(this.addHTML.bind(this));

            } else {

                this.HTMLId = generateId.call(this, "HTML");

                this.addHTML({
                    html: this.options.html,
                    id: this.HTMLId
                });
            }
        }

        this._markers.forEach(this.addMarker.bind(this));
        this._infos.forEach(this.addInfo.bind(this));
        this._htmls.forEach(this.addHTML.bind(this));

        if (this._noCoordsOnInit) {

            this.fitBounds();
        }

        if (typeof this.options.onInit === "function") {

            this.options.onInit.call(this);
        }

        this._defer.resolve(this, this.markers[this.markerId], this.markerId);
    };

    GoogleMap.prototype.promise = function () {

        return this._defer.promise();
    };

    /**
     * Přidá k mapě marker. Vrátí Promise.
     * Všechny markery jsou v instance.markers.
     *
     * options - {
     *     coords: [1, 1] | LatLng, - souřadnice markeru
     *     icon: "marker.png", - ikona markeru
     *     options: {}, - ostatní nastavení markeru
     *     info: "" - informace zobrazované u markeru
     *     id: id Markeru, podle kterého je možné najít příslušný objekt
     *     infoId: id Infa, podle kterého je možné najít příslušný objekt,
     *     group: "" - skupina markerů
     * }
     */
    GoogleMap.prototype.addMarker = function (options) {

        options = options || {};

        var id = options.id || generateId.call(this, "Marker"),

            defer = this._markersDefers[options.id] || $.Deferred();

        if (!this.initialized) {

            options.id = options.id || id;

            this._markers.push(options);
            this._markersDefers[options.id] = defer;

            return defer.promise();
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
                marker: marker,
                id: options.infoId
            });
        }

        this.markers[id] = marker;

        options.group = options.group || "no-group";

        this.groupedMarkers[options.group] = this.groupedMarkers[options.group] || {};
        this.groupedMarkers[options.group][id] = marker;

        this.bounds.extend(marker.position);

        defer.resolve(this, marker, id);

        return defer.promise();
    };

    /**
     * Vrátí instanci InfoWindow podle id.
     *
     * id - id Markeru
     */
    GoogleMap.prototype.getMarker = function (id) {

        return this.markers[id] || null;
    };

    /**
     * Přidá informace k markeru. Vrátí Promise.
     * Info se zobrazuje při kliknutí (a touchend) na pin. Všechny info jsou v instance.infos.
     *
     * options - {
     *     content: "", - obsah
     *     options: {}, - další nastavení
     *     marker: Marker - marker, ke kterému se má info přiřadit (pokud není nastaveno použije se poslední)
     *     id: id Infa, podle kterého je možné najít příslušný objekt
     * }
     */
    GoogleMap.prototype.addInfo = function (options) {

        options = options || {};

        var id = options.id || generateId.call(this, "Info"),

            defer = this._infosDefers[options.id] || $.Deferred();

        if (!this.initialized) {

            options.id = options.id || id;

            this._infos.push(options);
            this._infosDefers[options.id] = defer;

            return defer.promise();
        }

        options.marker = options.marker || this.markers[this.markers.length - 1];

        var infoOptions = {
            content: options.content
        };

        if (options.options) {

            infoOptions = $.extend({}, infoOptions, options.options);
        }

        var info = new google.maps.InfoWindow(infoOptions);

        initInfoEvents.call(this, info, options.marker);

        this.infos[id] = info;

        defer.resolve(this, info, id);

        return defer.promise();
    };

    /**
     * Vrátí instanci InfoWindow podle id.
     *
     * id - id Infa
     */
    GoogleMap.prototype.getInfo = function (id) {

        return this.infos[id] || null;
    };

    /**
     * Přidá do mapy vlastní HTML obsah. Vrátí Promise.
     * Všechny HTML jsou v instance.HTMLs.
     *
     * options - "<div></div>" | {
     *     html: "" | HTMLElement, - vlastní HTML obsah
     *     coords: [1, 1] | LatLng | Marker, - souřadnice, kam vložit HTML (pokud není nastaveno, použije se location mapy)
     *     draw: function, - vlastní funkce zajišťující vykreslení HTML
     *     id: id HTML, podle kterého je možné najít příslušný objekt
     * }
     */
    GoogleMap.prototype.addHTML = function (options) {

        options = options || {};

        var id = options.id || generateId.call(this, "HTML"),

            defer = this._htmlsDefers[options.id] || $.Deferred();

        if (!this.initialized) {

            if (typeof options === "string") {

                options = {
                    html: options,
                    id: id
                };

            } else {

                options.id = options.id || id;
            }

            this._htmls.push(options);
            this._htmlsDefers[options.id] = defer;

            return defer.promise();
        }

        var html = typeof options === "string" || options instanceof HTMLElement ? options : options.html,
            position = typeof options === "object" && !(options instanceof HTMLElement) ? options.coords : null,
            draw = typeof options === "object" && !(options instanceof HTMLElement) ? options.draw : null,

            overlay,

            resolve = function () { defer.resolve(this, overlay, id); }.bind(this);

        overlay = new GoogleMapHTMLOverlay(this.map, html, position, draw, resolve);

        this.HTMLs[id] = overlay;

        return defer.promise();
    };

    /**
     * Vrátí instanci GoogleMapHTMLOverlay podle id.
     *
     * id - id HTML
     */
    GoogleMap.prototype.getHTML = function (id) {

        return this.HTMLs[id] || null;
    };

    /**
     * Při změně velikosti okna zarovná mapu na střed location.
     *
     * ms (Number) - debouncing
     */
    GoogleMap.prototype.initCenterToLocationOnResize = function (ms) {

        if (this.resizeCenterToLocationInitialized) {

            return;
        }

        var debounce = typeof ms === "number",

            _this = this;

        google.maps.event.addDomListener(window, "resize", function () {

            if (debounce) {

                clearTimeout(debounce);

                debounce = setTimeout(_this.centerToLocation.bind(_this), ms);

                return;
            }

            _this.centerToLocation();
        });

        this.resizeCenterToLocationInitialized = true;
    };

    /**
     * Při změně velikosti okna zarovná mapu tak, aby byly vidět všechny markery.
     *
     * ms (Number) - debouncing
     */
    GoogleMap.prototype.initFitBoundsOnResize = function (ms) {

        if (this.resizeFitBoundsInitialized) {

            return;
        }

        var debounce = typeof ms === "number",

            _this = this;

        google.maps.event.addDomListener(window, "resize", function () {

            if (debounce) {

                clearTimeout(debounce);

                debounce = setTimeout(_this.fitBounds.bind(_this), ms);

                return;
            }

            _this.fitBounds();
        });

        this.resizeFitBoundsInitialized = true;
    };

    /**
     * Zarovná mapu na střed location.
     */
    GoogleMap.prototype.centerToLocation = function () {

        this.map.setCenter(this.map.location);
    };

    /**
     * Zarovná mapu tak, aby byly viddět všechny markery.
     */
    GoogleMap.prototype.fitBounds = function () {

        this.map.fitBounds(this.bounds);
    };

    /**
     * Zarovná mapu na střed zadaného objektu.
     *
     * object (String) - id Markeru nabo HTML
     * object (LatLng, Array) - souřadnice
     */
    GoogleMap.prototype.center = function (object) {

        if (typeof object === "string" || typeof object === "number") {

            object = this.getMarker(object) || this.getHTML(object);
        }

        if (object instanceof Array) {

            object = new google.maps.LatLng(object[0], object[1]);
        }

        if (object instanceof google.maps.LatLng) {

            this.map.setCenter(object);

        } else if (object && object.position) {

            this.map.setCenter(object.position);

        } else {

            this.centerToLocation();
        }
    };

    /**
     * Aktivuje animaci zadaného Markeru.
     *
     * marker (String, Marker) - id Markeru nebo Marker
     * duration (Number) - délka animace
     * animation (google.maps.Animation) - typ animace (Výchozí: BOUNCE)
     */
    GoogleMap.prototype.animate = function (marker, duration, animation) {

        if (typeof marker === "string" || typeof marker === "number") {

            marker = this.getMarker(marker);
        }

        if (marker) {

            var animId = marker.getPosition().toString();

            clearTimeout(this._animations[animId]);

            if (marker.getAnimation() !== null) {

                marker.setAnimation(null);
            }

            marker.setAnimation(animation || google.maps.Animation.BOUNCE);

            this._animations[animId] = setTimeout(marker.setAnimation.bind(marker, null), duration || 2800);
        }
    };

    /**
     * Aktivuje animaci skupiny Markerů.
     *
     * group (String) - název skupiny
     * duration (Number) - délka animace
     * animation (google.maps.Animation) - typ animace (Výchozí: BOUNCE)
     */
    GoogleMap.prototype.animateGroup = function (group, duration, animation) {

        $.each(this.groupedMarkers[group], function (i, marker) {

            this.animate(marker, duration, animation);

        }.bind(this));
    };

    /**
     * Nastaví zadanému Markeru opacity.
     *
     * marker (String, Marker) - id Markeru nebo Marker
     * opacity (Number) - opacity
     * duration (Number) - délka animace
     * easing (String) - easing
     */
    GoogleMap.prototype.opacity = function (marker, opacity, duration, easing) {

        if (typeof marker === "string" || typeof marker === "number") {

            marker = this.getMarker(marker);
        }

        if (marker && duration) {

            var initOpacity;

            this._$animEl.stop(true, true).animate({opacity: opacity}, {
                duration: duration,
                progress: function (x, pct) {

                    if (typeof initOpacity !== "number") {

                        initOpacity = typeof marker.getOpacity() === "number" ? marker.getOpacity() : marker.getVisible() ? 1 : 0;
                    }

                    var toAnimate = initOpacity - opacity;

                    if (toAnimate) {

                        marker.setOpacity(initOpacity - (toAnimate * pct));
                    }

                    if (!marker.getVisible() && opacity > 0) {

                        marker.setVisible(true);
                    }

                    if (opacity === 0 && pct === 1) {

                        marker.setVisible(false);
                    }
                },
                easing: easing || "linear"
            });

            return;
        }

        marker.setOpacity(opacity);

        marker.setVisible(opacity > 0);
    };

    /**
     * Nastaví opacity skupině Markerů.
     *
     * group (String) - název skupiny
     * opacity (Number) - opacity
     * duration (Number) - délka animace
     * easing (String) - easing
     */
    GoogleMap.prototype.groupOpacity = function (group, opacity, duration, easing) {

        if (duration) {

            var initOpacity = [];

            this._$animEl.stop(true, true).animate({opacity: opacity}, {
                duration: duration,
                progress: function (x, pct) {

                    $.each(this.groupedMarkers[group], function (m, marker) {


                        if (typeof initOpacity[m] !== "number") {

                            initOpacity[m] = typeof marker.getOpacity() === "number" ? marker.getOpacity() : marker.getVisible() ? 1 : 0;
                        }

                        var toAnimate = initOpacity[m] - opacity;

                        if (toAnimate) {

                            marker.setOpacity(initOpacity[m] - (toAnimate * pct));
                        }

                        if (!marker.getVisible() && opacity > 0) {

                            marker.setVisible(true);
                        }

                        if (opacity === 0 && pct === 1) {

                            marker.setVisible(false);
                        }

                    }.bind(this));
                }.bind(this),
                easing: easing || "linear"
            });

            return;
        }

        $.each(this.groupedMarkers[group], function (m, marker) {

            marker.setOpacity(opacity);

            marker.setVisible(opacity > 0);

        }.bind(this));
    };

    /**
     * Zobrazí zadaný Marker.
     *
     * marker (String, Marker) - id Markeru nebo Marker
     * duration (Number) - délka animace
     * easing (String) - easing
     */
    GoogleMap.prototype.show = function (marker, duration, easing) {

        this.opacity(marker, 1, duration, easing);
    };

    /**
     * Zobrazí skupinu Markerů.
     *
     * group (String) - název skupiny
     * duration (Number) - délka animace
     * easing (String) - easing
     */
    GoogleMap.prototype.showGroup = function (group, duration, easing) {

        this.groupOpacity(group, 1, duration, easing);
    };

    /**
     * Skryje zadaný Marker.
     *
     * marker (String, Marker) - id Markeru nebo Marker
     * duration (Number) - délka animace
     */
    GoogleMap.prototype.hide = function (marker, duration, easing) {

        this.opacity(marker, 0, duration, easing);
    };

    /**
     * Srkyje skupinu Markerů.
     *
     * group (String) - název skupiny
     * duration (Number) - délka animace
     */
    GoogleMap.prototype.hideGroup = function (group, duration, easing) {

        this.groupOpacity(group, 0, duration, easing);
    };

    /**
     * Zvýrazní zadaný marker.
     *
     * markerToHightlight (String, Marker, Boolean) - id Markeru nebo Marker; pokud je false, zvýraznění se zruší
     * opacity (Number) - jakou opacity mají mít ostatní markery
     * duration (Number) - délka animace
     * easing (String) - easing
    */
    GoogleMap.prototype.highlight = function (markerToHightlight, duration, opacity, easing) {

        opacity = opacity || 0;

        if (typeof markerToHightlight === "string" || typeof markerToHightlight === "number") {

            markerToHightlight = this.getMarker(markerToHightlight);
        }

        if (duration) {

            var initOpacity = [];

            this._$animEl.stop(true).animate({opacity: opacity}, {
                duration: duration,
                progress: function (x, pct) {

                    $.each(this.markers, function (m, marker) {

                        if (typeof initOpacity[m] !== "number") {

                            initOpacity[m] = typeof marker.getOpacity() === "number" ? marker.getOpacity() : marker.getVisible() ? 1 : 0;
                        }

                        var targetOpacity = marker !== markerToHightlight && markerToHightlight !== false ? opacity : 1,

                            toAnimate = initOpacity[m] - targetOpacity;

                        if (toAnimate) {

                            marker.setOpacity(initOpacity[m] - (toAnimate * pct));
                        }

                        if (targetOpacity === 0 && pct === 1) {

                            marker.setVisible(false);
                        }

                        if (targetOpacity > 0 && !marker.getVisible()) {

                            marker.setVisible(true);
                        }
                    });

                }.bind(this),
                easing: easing || "linear"
            });

            return;
        }

        $.each(this.markers, function (m, marker) {

            if (opacity) {

                marker.setOpacity(marker === markerToHightlight || markerToHightlight === false ? 1 : opacity);

                if (marker === markerToHightlight || markerToHightlight === false || opacity > 0) {

                    marker.setVisible(true);
                }

                if (marker !== markerToHightlight && markerToHightlight === false && opacity === 0) {

                    marker.setVisible(false);
                }

            } else {

                if (marker === markerToHightlight || markerToHightlight === false) {

                    marker.setOpacity(1);
                }

                marker.setVisible(marker === markerToHightlight || markerToHightlight === false);
            }
        });
    };

    /**
     * Zvýrazní skupinu Markerů.
     *
     * groupToHighlight (String, Boolean) - název skupiny; pokud je false, zvýraznění se odstraní
     * opacity (Number) - jakou opacity mají mít ostatní markery
     * duration (Number) - délka animace
     * easing (String) - easing
    */
    GoogleMap.prototype.highlightGroup = function (groupToHighlight, duration, opacity, easing) {

        opacity = opacity || 0;

        if (duration) {

            var initOpacity = {};

            this._$animEl.stop(true).animate({opacity: opacity}, {
                duration: duration,
                progress: function (x, pct) {

                    $.each(this.groupedMarkers, function (group) {

                        if (typeof initOpacity[group] !== "object") {

                            initOpacity[group] = [];
                        }

                        $.each(this.groupedMarkers[group], function (m, marker) {

                            if (typeof initOpacity[group][m] !== "number") {

                                initOpacity[group][m] = typeof marker.getOpacity() === "number" ? marker.getOpacity() : marker.getVisible() ? 1 : 0;
                            }

                            var targetOpacity = group !== groupToHighlight && groupToHighlight !== false ? opacity : 1,

                                toAnimate = initOpacity[group][m] - targetOpacity;

                            if (toAnimate) {

                                marker.setOpacity(initOpacity[group][m] - (toAnimate * pct));
                            }

                            if (targetOpacity === 0 && pct === 1) {

                                marker.setVisible(false);
                            }

                            if (targetOpacity > 0 && !marker.getVisible()) {

                                marker.setVisible(true);
                            }

                        }.bind(this));

                    }.bind(this));

                }.bind(this),
                easing: easing || "linear"
            });

            return;
        }

        $.each(this.groupedMarkers, function (group) {

            $.each(this.groupedMarkers[group], function (m, marker) {

                if (opacity) {

                    marker.setOpacity(group === groupToHighlight || groupToHighlight === false ? 1 : opacity);

                    if (group === groupToHighlight || groupToHighlight === false || opacity > 0) {

                        marker.setVisible(true);
                    }


                    if (group !== groupToHighlight && groupToHighlight === false && opacity === 0) {

                        marker.setVisible(false);
                    }

                } else {

                    if (group === groupToHighlight || groupToHighlight === false) {

                        marker.setOpacity(1);
                    }

                    marker.setVisible(group === groupToHighlight || groupToHighlight === false);
                }

            }.bind(this));
        }.bind(this));
    };

    /**
     * Přiřadí k mapě event listener a vrátí jeho instanci.
     *
     * type (String) - typ události (click, ...)
     * cb (Function) - funkce, která se má spustit při události
     */
    GoogleMap.prototype.on = function (type, cb) {

        return this.map.addListener(type, cb);
    };

    /*
     * Odstraní z mapy event listener.
     *
     * listener - instance event listeneru
     */
    GoogleMap.prototype.off = function (listener) {

        this.map.removeListener(listener);
    };

    /**
     * Přiřadí k Markeru event listener a vrátí jeho instanci.
     *
     * marker (String, Marker) - id Markeru nebo Marker
     * type (String) - typ události (click, ...)
     * cb (Function) - funkce, která se má spustit při události
     */
    GoogleMap.prototype.onMarker = function (marker, type, cb) {

        if (typeof marker === "string" || typeof marker === "number") {

            marker = this.getMarker(marker);
        }

        return google.maps.event.addListener(marker, type, cb);
    };

    /*
     * Odstraní z Markeru event listener.
     *
     * listener - instance event listeneru
     */
    GoogleMap.prototype.offMarker = function (listener) {

        google.maps.event.removeListener(listener);
    };

}(jQuery));
