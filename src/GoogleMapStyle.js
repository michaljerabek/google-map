/*jslint indent: 4, white: true, nomen: true, regexp: true, unparam: true, node: true, browser: true, devel: true, nomen: true, plusplus: true, regexp: true, sloppy: true, vars: true*/
/*global jQuery, window, setTimeout, clearTimeout, GoogleMapStyler, GoogleMapFeature, GoogleMapElement, GoogleMapStyleOption*/

(function ($) {

    var FEATURE_ORDER = Object.keys(GoogleMapFeature).map(function (key) {
        return GoogleMapFeature[key].toString();
    });

    var ELEMENT_ORDER = Object.keys(GoogleMapElement).map(function (key) {
        return GoogleMapElement[key].toString();
    });

    /**
     * Třída obsahující styly pro mapu. Obsahuje API pro upravování stylu.
     * (Rozšiřuje Array)
     */
    var GoogleMapStyle = window.GoogleMapStyle = function GoogleMapStyle() {
        this.length = 0;
    };

    GoogleMapStyle.prototype = Object.create(Array.prototype);

    /* Vloži již hotový seznam stylů.
     *
     * styles (Array): styly [{ featureType: String, elementType: String, stylers: Array }, ...]
     */
    GoogleMapStyle.prototype.use = function (styles) {

        styles.forEach(function (style) {
            this.add(style.featureType, style.elementType, style.stylers);
        }, this);

        return this.reset();
    };

    /* Nastaví vlastnost pro aktuální (poslední) nastavení.
     *
     * type (String, Object) - název (viz GoogleMapFeature)
     */
    GoogleMapStyle.prototype.feature = function (type) {

        if (typeof type === "string" || (typeof type === "object" && type !== null)) {

            if (!this.length) {

                this.add();
            }

            this[this.length - 1].featureType = type.toString();
        }

        return this.reset();
    };

    /* Nastaví elementu pro aktuální (poslední) nastavení.
     *
     * type (String, Object) - název (viz GoogleMapElement)
     */
    GoogleMapStyle.prototype.element = function (type) {

        if (typeof type === "string" || (typeof type === "object" && type !== null)) {

            if (!this.length) {

                this.add();
            }

            this[this.length - 1].elementType = type.toString();
        }

        return this.reset();
    };

    /* Nastaví styler pro aktuální (poslední) nastavení.
     *
     * type (String, Object) - název (viz GoogleMapStyler),
     * value - hodnota (viz GoogleMapStyler),
     */
    GoogleMapStyle.prototype.styler = function (type, value) {

        if (typeof type === "string" || (typeof type === "object" && type !== null)) {

            if (!this.length) {

                this.add();
            }

            this[this.length - 1].set(type, value);
        }

        return this.reset();
    };

    /* Nastaví vlastnost, elementu a/nebo styler pro aktuální (poslední) nastavení.
     *
     * feature? (String, Object) - název vlastnosti (viz GoogleMapFeature)
     * element? (String, Object) - název elementu (viz GoogleMapElement)
     * stylers? (Object) - objekt se stylery (viz GoiogleMapStyler): { color: "#ffff00", weight: 0.5 }
     */
    GoogleMapStyle.prototype.set = function (feature, element, stylers) {

        this.feature(feature);
        this.element(element);
        this.styler(stylers);

        return this.reset();
    };

    /* Přidá další nastavení a nastaví pro něj vlastnost, element a/nebo styler.
     *
     * feature? (String, Object) - název vlastnosti (viz GoogleMapFeature)
     * element? (String, Object) - název elementu (viz GoogleMapElement)
     * stylers? (Object) - objekt se stylery (viz GoiogleMapStyler): { color: "#ffff00", weight: 0.5 }
     */
    GoogleMapStyle.prototype.add = function (feature, element, stylers) {

        this[this.length++] = new GoogleMapStyleOption(this);

        this.set(feature, element, stylers);

        return this;
    };

    /* Odstraní nastavení podle zadanách hodnot
     *
     * indexOrOptionOrFeature (Number, String, Object, GoogleMapStyleOption, Array) - index, nastavení nebo název vlastnosti,
     *     případně pole těchto hodnot
     * element? (String, Object) - název elementu
     * subTypes (Boolean) - odstranit i podtypy?
     */
    GoogleMapStyle.prototype.remove = function (indexOrOptionOrFeature, element, subTypes) {

        if (indexOrOptionOrFeature instanceof Array) {

            indexOrOptionOrFeature.forEach(function (option) {
                this.remove(option);
            }, this);

            return this;
        }

        if (indexOrOptionOrFeature instanceof GoogleMapStyleOption) {

            for (var o = this.length - 1; o >= 0; o--) {

                if (indexOrOptionOrFeature === this[o]) {

                    this.splice(o, 1);
                }
            }

            return this.reset();
        }

        if (typeof indexOrOptionOrFeature === "number") {

            this.splice(indexOrOptionOrFeature, 1);

            return this.reset();
        }

        if (typeof indexOrOptionOrFeature === "string" || (typeof indexOrOptionOrFeature === "object" && indexOrOptionOrFeature !== null)) {

            var options = this.get(indexOrOptionOrFeature, element, subTypes);

            options.forEach(function (option) {
                this.remove(option);
            }, this);
        }

        return this;
    };

    /* Najde nastavení podle zadaných hodnot a vráti je v poli.
     *
     * feature? (String, Object) - název vlastnosti
     * element? (String, Object) - název elementu
     * subTypes? (Boolean) - vyhledávat i podtypy?
     */
    GoogleMapStyle.prototype.get = function (feature, element, subTypes) {

        if (feature && !element) {

            return this.filter(function (option) {
                return option.isFeature(feature, subTypes);
            });
        }

        if (element && !feature) {

            return this.filter(function (option) {
                return option.isElement(element, subTypes);
            });
        }

        return this.filter(function (option) {

            if (subTypes) {

                return option.isFeature(feature, true) && option.isElement(element, true);
            }

            return option.is(feature, element);
        });
    };

    /* Nastaví styler pro existující nastavení podle feature a element nebo vytvoří nové nastavení.
     *
     * feature? (String, Object) - název vlastnosti (viz GoogleMapFeature)
     * element? (String, Object) - název elementu (viz GoogleMapElement)
     * stylers? (Object) - objekt se stylery (viz GoiogleMapStyler): { color: "#ffff00", weight: 0.5 }
     */
    GoogleMapStyle.prototype.rewriteOrAdd = function (feature, element, stylers) {

        var found = false;

        this.forEach(function (option, s) {

            if (option.is(feature, element)) {

                this[s].set(stylers);

                found = true;
            }
        }, this);

        if (!found) {

            this.add((feature && feature.toString()) || GoogleMapFeature.all, element, stylers);
        }

        return this.reset();
    };

    /* Seřadí nastavení, aby zanořená následovala po rodičovských.
     *
     * Např: roads.arterial, roads, roads.local => roads, roads.arterial, roads.local
     */
    GoogleMapStyle.prototype.sort = function () {

        if (arguments.length) {

            Array.prototype.sort.apply(this, arguments);

            return this.reset();
        }

        this.sort(function(a, b) {
            return FEATURE_ORDER.indexOf(a.featureType) - FEATURE_ORDER.indexOf(b.featureType) ||
                ELEMENT_ORDER.indexOf(a.elementType) - ELEMENT_ORDER.indexOf(b.elementType);
        });

        return this.reset();
    };

    /* Přepíše nastavení stylů v mapě (zobrazí změněná nastavení) - používá debouncing.
     */
    GoogleMapStyle.prototype.reset = function () {

        this.cancelReset();

        this.resetTimeout = setTimeout(function() {

            if (this.googleMap && this.googleMap.map) {

                this.googleMap.map.setOptions({
                    styles: this
                });
            }

        }.bind(this), 0);

        return this;
    };

    /* Zruši debouncing z metory reset.
     */
    GoogleMapStyle.prototype.cancelReset = function () {

        clearTimeout(this.resetTimeout);

        return this;
    };

    /* Skryje zadanout vlastnost.
     *
     * feature (String, Object) - název vlastnosti (viz GoogleMapFeature)
     */
    GoogleMapStyle.prototype.hide = function (feature) {

        var styler = this.getVisibilityStyler(GoogleMapStyler.visibility.off);

        return this.rewriteOrAdd(feature, GoogleMapElement.all, styler);
    };

    /* Skryje text zadané vlastnosti.
     *
     * feature (String, Object) - název vlastnosti (viz GoogleMapFeature)
     */
    GoogleMapStyle.prototype.hideText = function (feature) {

        var styler = this.getVisibilityStyler(GoogleMapStyler.visibility.off);

        return this.rewriteOrAdd(feature, GoogleMapElement.text, styler);
    };

    /* Skryje výplň textu zadané vlastnosti.
     *
     * feature (String, Object) - název vlastnosti (viz GoogleMapFeature)
     */
    GoogleMapStyle.prototype.hideTextFill = function (feature) {

        var styler = this.getVisibilityStyler(GoogleMapStyler.visibility.off);

        return this.rewriteOrAdd(feature, GoogleMapElement.text.fill, styler);
    };

    /* Skryje čáru textu zadané vlastnosti.
     *
     * feature (String, Object) - název vlastnosti (viz GoogleMapFeature)
     */
    GoogleMapStyle.prototype.hideTextStroke = function (feature) {

        var styler = this.getVisibilityStyler(GoogleMapStyler.visibility.off);

        return this.rewriteOrAdd(feature, GoogleMapElement.text.stroke, styler);
    };

    /* Skryje ikonu zadané vlastnosti.
     *
     * feature (String, Object) - název vlastnosti (viz GoogleMapFeature)
     */
    GoogleMapStyle.prototype.hideIcon = function (feature) {

        var styler = this.getVisibilityStyler(GoogleMapStyler.visibility.off);

        return this.rewriteOrAdd(feature, GoogleMapElement.icon, styler);
    };

    /* Skryje popisek zadané vlastnosti.
     *
     * feature (String, Object) - název vlastnosti (viz GoogleMapFeature)
     */
    GoogleMapStyle.prototype.hideLabels = function (feature) {

        var styler = this.getVisibilityStyler(GoogleMapStyler.visibility.off);

        return this.rewriteOrAdd(feature, GoogleMapElement.labels, styler);
    };

    /* Skryje geometrii zadané vlastnosti.
     *
     * feature (String, Object) - název vlastnosti (viz GoogleMapFeature)
     */
    GoogleMapStyle.prototype.hideGeometry = function (feature) {

        var styler = this.getVisibilityStyler(GoogleMapStyler.visibility.off);

        return this.rewriteOrAdd(feature, GoogleMapElement.geometry, styler);
    };

    /* Skryje výplň zadané vlastnosti.
     *
     * feature (String, Object) - název vlastnosti (viz GoogleMapFeature)
     */
    GoogleMapStyle.prototype.hideFill = function (feature) {

        var styler = this.getVisibilityStyler(GoogleMapStyler.visibility.off);

        return this.rewriteOrAdd(feature, GoogleMapElement.geometry.fill, styler);
    };

    /* Skryje čáru textu zadané vlastnosti.
     *
     * feature (String, Object) - název vlastnosti (viz GoogleMapFeature)
     */
    GoogleMapStyle.prototype.hideStroke = function (feature) {

        var styler = this.getVisibilityStyler(GoogleMapStyler.visibility.off);

        return this.rewriteOrAdd(feature, GoogleMapElement.geometry.stroke, styler);
    };

    /* Zobrazí zadanou vlastnost a případně nastaví barvu a světlost (lightness).
     *
     * feature (String, Object) - název vlastnosti (viz GoogleMapFeature)
     * color? (String) - barva (styler color)
     * lightness? (Number) - světlost (styler lightness)
     */
    GoogleMapStyle.prototype.show = function (feature, color, lightness) {

        var styler = this.getFillStyler(color, lightness);

        return this.rewriteOrAdd(feature, GoogleMapElement.all, styler);
    };

    /* Zobrazí text zadané vlastnosti a případně nastaví barvu a světlost (lightness).
     *
     * feature (String, Object) - název vlastnosti (viz GoogleMapFeature)
     * color? (String) - barva (styler color)
     * lightness? (Number) - světlost (styler lightness)
     */
    GoogleMapStyle.prototype.text = function (feature, color, lightness) {

        var styler = this.getVisibilityStyler(GoogleMapStyler.visibility.on);

        if (color) {
            styler[GoogleMapStyler.color] = color;
        }

        if (lightness) {
            styler[GoogleMapStyler.lightness] = lightness;
        }

        return this.rewriteOrAdd(feature, GoogleMapElement.text, styler);
    };

    /* Zobrazí výplň textu zadané vlastnosti a případně nastaví barvu a světlost (lightness).
     *
     * feature (String, Object) - název vlastnosti (viz GoogleMapFeature)
     * color? (String) - barva (styler color)
     * lightness? (Number) - světlost (styler lightness)
     */
    GoogleMapStyle.prototype.textFill = function (feature, color, lightness) {

        var styler = this.getFillStyler(color, lightness);

        return this.rewriteOrAdd(feature, GoogleMapElement.text.fill, styler);
    };

    /* Zobrazí čáru textu zadané vlastnosti a případně nastaví barvu, světlost (lightness) a sílu.
     *
     * feature (String, Object) - název vlastnosti (viz GoogleMapFeature)
     * color? (String) - barva (styler color)
     * lightness? (Number) - světlost (styler lightness)
     * weight? (Number) - síla čáry (styler weight)
     */
    GoogleMapStyle.prototype.textStroke = function (feature, color, lightness, weight) {

        var styler = this.getStrokeStyler(color, weight, lightness);

        return this.rewriteOrAdd(feature, GoogleMapElement.text.stroke, styler);
    };

    /* Zobrazí ikonu zadané vlastnosti.
     *
     * feature (String, Object) - název vlastnosti (viz GoogleMapFeature)
     */
    GoogleMapStyle.prototype.icon = function (feature) {

        var styler = this.getVisibilityStyler(GoogleMapStyler.visibility.on);

        return this.rewriteOrAdd(feature, GoogleMapElement.icon, styler);
    };

    /* Zobrazí popisek zadané vlastnosti a případně nastaví barvu, světlost (lightness) a sílu čáry.
     *
     * feature (String, Object) - název vlastnosti (viz GoogleMapFeature)
     * color? (String) - barva (styler color)
     * lightness? (Number) - světlost (styler lightness)
     * weight? (Number) - síla čáry (styler weight)
     */
    GoogleMapStyle.prototype.labels = function (feature, color, lightness, weight) {

        var styler = this.getStrokeStyler(color, weight, lightness);

        return this.rewriteOrAdd(feature, GoogleMapElement.labels, styler);
    };

    /* Zobrazí geometrii zadané vlastnosti a případně nastaví barvu, světlost (lightness) a sílu čáry.
     *
     * feature (String, Object) - název vlastnosti (viz GoogleMapFeature)
     * color? (String) - barva (styler color)
     * lightness? (Number) - světlost (styler lightness)
     * weight? (Number) - síla čáry (styler weight)
     */
    GoogleMapStyle.prototype.geometry = function (feature, color, lightness, weight) {

        var styler = this.getStrokeStyler(color, weight, lightness);

        return this.rewriteOrAdd(feature, GoogleMapElement.geometry, styler);
    };

    /* Zobrazí výplň zadané vlastnosti a případně nastaví barvu a světlost (lightness).
     *
     * feature (String, Object) - název vlastnosti (viz GoogleMapFeature)
     * color? (String) - barva (styler color)
     * lightness? (Number) - světlost (styler lightness)
     */
    GoogleMapStyle.prototype.fill = function (feature, color, lightness) {

        var styler = this.getFillStyler(color, lightness);

        return this.rewriteOrAdd(feature, GoogleMapElement.geometry.fill, styler);
    };

    /* Zobrazí čáru zadané vlastnosti a případně nastaví barvu, světlost (lightness) a sílu.
     *
     * feature (String, Object) - název vlastnosti (viz GoogleMapFeature)
     * color? (String) - barva (styler color)
     * lightness? (Number) - světlost (styler lightness)
     * weight? (Number) - síla čáry (styler weight)
     */
    GoogleMapStyle.prototype.stroke = function (feature, color, lightness, weight) {

        var styler = this.getStrokeStyler(color, weight, lightness);

        return this.rewriteOrAdd(feature, GoogleMapElement.geometry.stroke, styler);
    };


    /* Pro interní účely. Vrátí styler visibility.
     *
     * state - hodnota styleru visibility
     */
    GoogleMapStyle.prototype.getVisibilityStyler = function (state) {

        var styler = {};
        styler[GoogleMapStyler.visibility] = state.toString();

        return styler;
    };

    /* Pro interní účely. Vrátí stylery pro výplň.
     *
     * color (String) - hodnota styleru color
     * lightness (Nubmer) - hodnota styleru lightness
     * excludeVisibility (Boolean) - nepřidávat styler visibility
     */
    GoogleMapStyle.prototype.getFillStyler = function (color, lightness, excludeVisibility) {

        var styler = excludeVisibility ? {} : this.getVisibilityStyler(GoogleMapStyler.visibility.on);

        if (typeof color === "string") {
            styler[GoogleMapStyler.color] = color;
        }

        if (typeof lightness === "number" || typeof lightness === "string") {
            styler[GoogleMapStyler.lightness] = lightness;
        }

        return styler;
    };

    /* Pro interní účely. Vrátí stylery pro čáru.
     *
     * color (String) - hodnota styleru color
     * weight (Nubmer) - hodnota styleru weight
     * lightness (Nubmer) - hodnota styleru lightness
     * excludeVisibility (Boolean) - nepřidávat styler visibility
     */
    GoogleMapStyle.prototype.getStrokeStyler = function (color, weight, lightness, excludeVisibility) {

        var styler = this.getFillStyler(color, lightness, excludeVisibility);

        if (typeof weight === "number" || typeof weight === "string") {
            styler[GoogleMapStyler.weight] = weight;
        }

        return styler;
    };

}(jQuery));
