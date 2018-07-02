// ------- model  ------------------------------------
// data to drive the view
var gProto = {
  screenFiles: {},
  links: {},
  mappings: {
    screen2links: {}
  },
  settings: {
    versionData: { version: '0.2', date: '7/1/18' },
    homeScreenFile: '',
    downloadFilename: 'proto1.html',
    downloadTitle: 'Prototype',
    imgPath: '', // relative path to image folder
    appTitle: 'LinkBox'
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
    if (gProto.settings.homeScreenFile === screenId) {
      gProto.settings.homeScreenFile = '';
    }
  }
};

//TODO
var gActiveScreenId; // currently selected screen file
var divRectCandidate = {}; // linkbox being built
var gSelectedLinks = {}; // currently, 1 link selected at a time
