/*jslint indent: 4, white: true, nomen: true, regexp: true, unparam: true, node: true, browser: true, devel: true, nomen: true, plusplus: true, regexp: true, sloppy: true, vars: true*/
/*global GoogleMap*/

GoogleMap.STYLES.desaturate = function () {

    return [
        {
            featureType: "all",
            stylers: [
                {
                    saturation: -100
                }
            ]
        }
    ];
};
