/**
 * @author:             Districtm
 * @license:            UNLICENSED
 * @technical-contact:  Steve Alliance <steve@districtm.net>
 * @business-contact:   Kate Dye <kate@districtm.net>
 */

/**
 * This file contains the necessary validation for the partner configuration.
 * This validation will be performed on the partner specific configuration object
 * that is passed into the wrapper. The wrapper uses an outside library called
 * schema-insepctor to perform the validation. Information about it can be found here:
 * https://atinux.fr/schema-inspector/.
 */

'use strict';

////////////////////////////////////////////////////////////////////////////////
// Dependencies ////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

var SchemaInspector = require('../../../libs/external/schema-inspector.js');

////////////////////////////////////////////////////////////////////////////////
// Main ////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

function partnerValidator(configs) {
    var result = SchemaInspector.validate({
        type: 'object',
        properties: {
            xSlots: {
                type: 'object',
                properties: {
                    '*': {
                        type: 'object',
                        properties: {
                            dmxid: {
                                type: 'number'
                            },
                            memberid: {
                                type: 'number'
                            },
                            sizes: {
                                type: 'array',
                                minLength: 1,
                                items: {
                                    type: 'array',
                                    exactLength: 2,
                                    items: {
                                        type: 'number'
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }, configs);

    if (!result.valid) {
        return result.format();
    }

    return null;
};

module.exports = partnerValidator;
