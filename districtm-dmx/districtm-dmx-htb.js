/**
 * @author:             Districtm
 * @license:            UNLICENSED
 * @technical-contact:  Steve Alliance <steve@districtm.net>
 * @business-contact:   Kate Dye <kate@districtm.net>
 */

'use strict';

////////////////////////////////////////////////////////////////////////////////
// Dependencies ////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

var Browser = require('browser.js');
var Classify = require('classify.js');
var Constants = require('constants.js');
var Partner = require('partner.js');
var Size = require('size.js');
var SpaceCamp = require('space-camp.js');
var System = require('system.js');
var Network = require('network.js');
var Utilities = require('utilities.js');
var Whoopsie = require('whoopsie.js');
var EventsService;
var RenderService;
var ComplianceService;

var PartnerValidation = require('districtm-dmx-validator.js')

////////////////////////////////////////////////////////////////////////////////
// Main ////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

/**
 * Partner module template
 *
 */

function DistrictmDmxHtb(config) {

    /**
     * Reference to the district base class.
     * @private {object}
     */
    var __baseClass;

    /**
     * Profile for variable for this partner
     * @private {object}
     */
    var __profile;

    /**
     * Bidding url endpoint
     * @private {string}
     */
    var __endpoint = '//dmx.districtm.io/b/v1';

    /**
     * @params {object[]} bidRequest
     * @return {object}
     */
    function __generateRequestObj(BidRequest) {
        var requestedUrl = Browser.getProtocol() + __endpoint;
        var id = System.generateUniqueId();
        var gdprStatus = ComplianceService.gdpr.getConsent();
        var gdprPrivacyEnable = ComplianceService.isPrivacyEnabled();
        var dmxrequest = {
            id: id,
            site: {
                publisher: { id: String(BidRequest[0].xSlotRef.memberid) }
            }
        };
        if (gdprPrivacyEnable) {
            dmxrequest.regs = {};
            dmxrequest.regs.ext = {};
            dmxrequest.regs.ext.gdpr = gdprStatus.applies ? 1 : 0;
            dmxrequest.user = {};
            dmxrequest.user.ext = {};
            dmxrequest.user.ext.consent = gdprStatus.consentString;
        }
        var tags = BidRequest.map(function (bid) {
            bid.id = System.generateUniqueId();
            bid.tagid = String(bid.xSlotRef.dmxid);
            bid.secure = window.location.protocal === 'https' ? 1 : 0;
            bid.banner = {
                topframe: 1,
                w: bid.xSlotRef.sizes[0][0],
                h: bid.xSlotRef.sizes[0][1],
                format: bid.sizes.map(function (s) {
                    return {
                        w: s[0],
                        h: s[1]
                    };
                })
            };
            return bid;
        });
        dmxrequest.imp = tags;

        return {
            url: requestedUrl,
            method: 'POST',
            data: dmxrequest
        };
    }
}
