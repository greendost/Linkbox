// ------- model  ------------------------------------
// data to drive the view
var gProto = {
  screenFiles: {},
  links: {},
  mappings: {
    screen2links: {}
  },
  internalSettings: {
    debugLogMode: [],
    versionData: { version: '0.3', date: '7/22/18' },
    appTitle: 'LinkBox'
  },
  runningSettings: {
    selectedLinks: {}, // currently, 1 link selected at a time
    activeScreenId: '' // currently selected screen file
  },
  exportSettings: {
    homeScreenFile: '',
    downloadFilename: 'proto1.html',
    downloadTitle: 'Prototype',
    imgPath: '' // relative path to image folder
  },
  getLinksForScreen: function(screenId) {
    var linkNames = this.mappings.screen2links[screenId];
    var selectedLinks = [];
    for (var i = 0; i < linkNames.length; i++) {
      selectedLinks.push(this.links[linkNames[i]]);
    }
    return selectedLinks;
  },
  getScreenFile: function(screenId) {
    return this.screenFiles[screenId];
  },
  removeScreenFile: function(screenId) {
    delete gProto.screenFiles[screenId];

    // remove links
    gProto.mappings.screen2links[screenId].forEach(function(x) {
      delete gProto.links[x];
    });

    delete gProto.mappings.screen2links[screenId];

    // if it's the home screen
    if (gProto.exportSettings.homeScreenFile === screenId) {
      gProto.exportSettings.homeScreenFile = '';
    }
  }
};
