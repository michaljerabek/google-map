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
     * fnOrDeep (Function, Boolean) - v případě true, zavolá funkci pro každý styl
     * fn (Function)
     */
    GoogleMapStyle.prototype.each = function (fnOrDeep, fn) {

        if (fnOrDeep === true) {

            this.getStyles().forEach(function (style) {

                if (style.stylers) {

                    style.stylers.forEach(function (styler) {

                        fn.call(this, styler, style.featureType, style.elementType);
                    });
                }
            });

            return;
        }

        this.getStyles().forEach(fnOrDeep.bind(this));
    };

    /**
     * Vratí pole se styly.
     */
    GoogleMapStyle.prototype.getStyles = function () {

        return this.styles;
    };


}(jQuery));
