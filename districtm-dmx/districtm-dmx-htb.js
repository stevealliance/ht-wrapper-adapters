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

var ConfigValidators = require('config-validators.js');
var Scribe = require('scribe.js');
var PartnerValidation = require('districtm-dmx-htb-validator.js');

////////////////////////////////////////////////////////////////////////////////
// Main ////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

/**
 * Partner module template
 *
 */

function DistrictmDmxHtb(config) {
    var __baseClass;
    var __profile;
    var __endpoint = '//dmx.districtm.io/b/v1';
    function __renderPixel() {
        Network.img({
            url: decodeURIComponent('//cdn.districtm.io/ids/index.html'),
            method: 'GET'
        });
    }

    function __generateRequestObj(BidRequest) {
        throw Whoopsie('SHIT AGAIN', BidRequest)
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
            networkParamOverrides: {
                method: 'POST',
                contentType: 'text/plain'
            },
            data: dmxrequest,
            callbackId: id
        };
    }

    function __parseResponse(sessionId, adResponse, returnParcels) {
        if (!adResponse.tags) {
            if (__profile.enabledAnalytics.requestTime) {
                __baseClass._emitStatsEvent(sessionId, 'hs_slot_pass', headerStatsInfo);
            }
            //curReturnParcel.pass = true;

            return;
        }

        var bids = adResponse.tags;

        /* --------------------------------------------------------------------------------- */

        for (var j = 0; j < returnParcels.length; j++) {
            var curReturnParcel = returnParcels[j];

            var headerStatsInfo = {};
            var htSlotId = curReturnParcel.htSlot.getId();
            headerStatsInfo[htSlotId] = {};
            headerStatsInfo[htSlotId][curReturnParcel.requestId] = [curReturnParcel.xSlotName];

            var curBid;

            for (var i = 0; i < bids.length; i++) {
                /**
                 * This section maps internal returnParcels and demand returned from the bid request.
                 * In order to match them correctly, they must be matched via some criteria. This
                 * is usually some sort of placements or inventory codes. Please replace the someCriteria
                 * key to a key that represents the placement in the configuration and in the bid responses.
                 */

                /* ----------- Fill this out to find a matching bid for the current parcel ------------- */
                if (curReturnParcel.uuid === bids[i].uuid) {
                    curBid = bids[i];
                    bids.splice(i, 1);

                    break;
                }
            }

            /* No matching bid found so its a pass */
            if (!curBid) {
                if (__profile.enabledAnalytics.requestTime) {
                    __baseClass._emitStatsEvent(sessionId, 'hs_slot_pass', headerStatsInfo);
                }
                curReturnParcel.pass = true;

                continue;
            }

            /* ---------- Fill the bid variables with data from the bid response here. ------------ */

            /* Using the above variable, curBid, extract various information about the bid and assign it to
             * these local variables */

            var bidIsPass = curBid.nobid;
            if (!bidIsPass) {
                curBid = curBid.ads[0];
                var banner = curBid.rtb.banner;

                /* The bid price for the given slot */
                var bidPrice = curBid.cpm;

                /* The size of the given slot */
                var bidSize = [Number(banner.width), Number(banner.height)];

                /* The creative/adm for the given slot that will be rendered if is the winner.
                 * Please make sure the URL is decoded and ready to be document.written.
                 */
                var bidCreative = banner.content;

                /* The dealId if applicable for this slot. */
                var bidDealId = typeof curBid.deal_id !== 'undefined' ? curBid.deal_id : null;

                /* OPTIONAL: tracking pixel url to be fired AFTER rendering a winning creative.
                 * If firing a tracking pixel is not required or the pixel url is part of the adm,
                 * leave empty;
                 */
                var pixelUrl = curBid.rtb.trackers[0].impression_urls[0] || '';
            }
            curBid = null;
            if (bidIsPass) {
                //? if (DEBUG) {
                Scribe.info(__profile.partnerId + ' returned pass for { id: ' + adResponse.id + ' }.');
                //? }
                if (__profile.enabledAnalytics.requestTime) {
                    __baseClass._emitStatsEvent(sessionId, 'hs_slot_pass', headerStatsInfo);
                }
                curReturnParcel.pass = true;

                continue;
            }

            if (__profile.enabledAnalytics.requestTime) {
                __baseClass._emitStatsEvent(sessionId, 'hs_slot_bid', headerStatsInfo);
            }

            curReturnParcel.size = bidSize;
            curReturnParcel.targetingType = 'slot';
            curReturnParcel.targeting = {};
            var targetingCpm = '';

            //? if (FEATURES.GPT_LINE_ITEMS) {
            var sizeKey = Size.arrayToString(curReturnParcel.size);
            targetingCpm = __baseClass._bidTransformers.targeting.apply(bidPrice);

            if (bidDealId !== null) {
                curReturnParcel.targeting[__baseClass._configs.targetingKeys.pmid] = [sizeKey + '_' + bidDealId];
                curReturnParcel.targeting[__baseClass._configs.targetingKeys.pm] = [sizeKey + '_' + targetingCpm];
            } else {
                curReturnParcel.targeting[__baseClass._configs.targetingKeys.om] = [sizeKey + '_' + targetingCpm];
            }
            curReturnParcel.targeting[__baseClass._configs.targetingKeys.id] = [curReturnParcel.requestId];
            //? }

            //? if (FEATURES.RETURN_CREATIVE) {
            curReturnParcel.adm = bidCreative;
            if (pixelUrl) {
                curReturnParcel.winNotice = __renderPixel.bind(null, pixelUrl);
            }
            //? }

            //? if (FEATURES.RETURN_PRICE) {
            curReturnParcel.price = Number(__baseClass._bidTransformers.price.apply(bidPrice));
            //? }

            var pubKitAdId = RenderService.registerAd({
                sessionId: sessionId,
                partnerId: __profile.partnerId,
                adm: bidCreative,
                requestId: curReturnParcel.requestId,
                size: curReturnParcel.size,
                price: targetingCpm ? targetingCpm : undefined,
                dealId: bidDealId ? bidDealId : undefined,
                timeOfExpiry: __profile.features.demandExpiry.enabled ? __profile.features.demandExpiry.value + System.now() : 0,
                auxFn: __renderPixel,
                auxArgs: [pixelUrl]
            });

            //? if (FEATURES.INTERNAL_RENDER) {
            curReturnParcel.targeting.pubKitAdId = pubKitAdId;
            //? }
        }
    }

    function adResponseCallback(adResponse) {
        /* Get callbackId from adResponse here */
        var callbackId = 0;
        __baseClass._adResponseStore[callbackId] = adResponse;
    }

    /* =====================================
    * Constructors
    * ---------------------------------- */

    (function __constructor() {
        EventsService = SpaceCamp.services.EventsService;
        RenderService = SpaceCamp.services.RenderService;
        ComplianceService = SpaceCamp.services.ComplianceService;

        /* =============================================================================
         * STEP 1  | Partner Configuration
         * -----------------------------------------------------------------------------
         *
         * Please fill out the below partner profile according to the steps in the README doc.
         */

        /* ---------- Please fill out this partner profile according to your module ------------ */
        __profile = {
            partnerId: 'DistrictmDmxHtb',
            namespace: 'DistrictmDmxHtb',
            statsId: 'DMX',
            version: '2.5',
            targetingType: 'slot',
            enabledAnalytics: {
                requestTime: true
            },
            features: {
                demandExpiry: {
                    enabled: true,
                    value: 300
                },
                rateLimiting: {
                    enabled: false,
                    value: 0
                }
            },
            bidUnitInCents: 100,
            targetingKeys: {
                id: 'ix_dmx_id',
                om: 'ix_dmx_cpm',
                pm: 'ix_dmx_cpm',
                pmid: 'ix_dmx_dealid'
            },
            lineItemType: Constants.LineItemTypes.ID_AND_SIZE,
            callbackType: Partner.CallbackTypes.NONE,
            architecture: Partner.Architectures.FSRA,
            requestType: Partner.RequestTypes.ANY
        };

        //? if (DEBUG) {
        var results = ConfigValidators.partnerBaseConfig(configs) || PartnerValidation(configs);

        if (results) {
            throw Whoopsie('INVALID_CONFIG', results);
        }
        //? }

        __baseClass = Partner(__profile, configs, null, {
            parseResponse: __parseResponse,
            generateRequestObj: __generateRequestObj,
            adResponseCallback: adResponseCallback
        });
    })();

    /* =====================================
    * Public Interface
    * ---------------------------------- */

    var derivedClass = {
        /* Class Information
         * ---------------------------------- */

        //? if (DEBUG) {
        __type__: 'DistrictmDmxHtb',
        //? }

        //? if (TEST) {
        __baseClass: __baseClass,
        //? }

        /* Data
         * ---------------------------------- */

        //? if (TEST) {
        profile: __profile,
        //? }

        /* Functions
         * ---------------------------------- */

        //? if (TEST) {
        parseResponse: __parseResponse,
        generateRequestObj: __generateRequestObj,
        adResponseCallback: adResponseCallback
        //? }
    };

    return Classify.derive(__baseClass, derivedClass);
}

////////////////////////////////////////////////////////////////////////////////
// Exports /////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

module.exports = DistrictmDmxHtb;
