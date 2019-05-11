//? if (FEATURES.GPT_LINE_ITEMS) {
shellInterface.DistrictmDmxHtb = {
    render: SpaceCamp.services.RenderService.renderDfpAd.bind(null, 'DistrictmDmxHtb')
};

if (__directInterface.Layers.PartnersLayer.Partners.DistrictmDmxHtb) {
    shellInterface.DistrictmDmxHtb = shellInterface.DistrictmDmxHtb || {};
    shellInterface.DistrictmDmxHtb.adResponseCallback = __directInterface.Layers.PartnersLayer.Partners.DistrictmDmxHtb.adResponseCallback;
}
//? }
