/*
Linkbox prototype tool
late Dec 2017 - start
update July 2018 - refactor, used bundle-js for "smarter" concatenation


*/

'use strict';


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


// ------------ utility fns --------------------------
function makeIdname(str) {
  var m = str.split('.')[0];
  return m.replace(' ', '-');
}

function removeChildNodes(node) {
  while (node.firstChild) {
    node.removeChild(node.firstChild);
  }
}

// modified version of solution at
// https://stackoverflow.com/questions/3968593/how-can-i-set-multiple-css-styles-in-javascript
// claim is that individual calls faster than updating via cssText
function setStyleOnDomObject(domObject, propertyObject) {
  for (var property in propertyObject)
    domObject.style[property] = propertyObject[property];
}

function debugLog(logType, msg) {
  if ( (gProto.internalSettings.debugLogMode.indexOf(logType) !== -1) ||
    (logType === 'ALL')
  )
    console.log(msg);
}


// ------- screenfilevc.js -------------------------------------

var screenfileVC = {
  init: function() {
    mediator.attach('THUMBNAIL_MENU_OPEN', this.displayThumbnailMenu);
    mediator.attach('THUMBNAIL_MENU_CLOSE', this.closeThumbnailMenu);
  },
  // view load
  setupThumbnailsPanel: function(fileList) {
    fileList.forEach(function(x) {
      // has screen been loaded? - if so, options include overwrite or warn or something
      var screenFileItem = {};
      screenFileItem.fileMeta = x;
      screenFileItem.fileMeta.idname = makeIdname(x.name);
      gProto.screenFiles[screenFileItem.fileMeta.idname] = screenFileItem;
      gProto.mappings.screen2links[screenFileItem.fileMeta.idname] = [];
    });

    var screenThumbnailsPanel = document.getElementById(
      'ScreenThumbnailsPanel'
    );
    // remove all nodes, and recreate all screen thumbnails
    removeChildNodes(screenThumbnailsPanel);

    var thumbnailTemplate = document.getElementsByClassName('thumbnail')[0];
    Object.keys(gProto.screenFiles).forEach(function(x) {
      var screenFile = gProto.screenFiles[x];

      var thumbnail = thumbnailTemplate.cloneNode(true);
      var imgDiv = thumbnail.getElementsByClassName('thumbnail__main')[0];
      var img = imgDiv.getElementsByTagName('img')[0];
      var tbw = thumbnail.getElementsByClassName('thumbnail__bottomWrap')[0];
      var imgDesc = tbw.getElementsByClassName('thumbnailDesc')[0];
      var tsp = thumbnail.getElementsByClassName('thumbnail__sidePanel')[0];
      var cog = tsp.getElementsByClassName('cogButton')[0];

      // thumbnail menu
      cog.addEventListener('click', function(ev) {
        mediator.processEvent(ev, 'THUMBNAIL_MENU_OPEN', this);
      });

      img.id = screenFile.fileMeta.idname + '-thumb';
      img.fmIdName = screenFile.fileMeta.idname; // tie image back to gProto

      imgDiv.addEventListener('click', function(ev) {
        debugLog('INFO', 'img.fmIdName=' + img.fmIdName);
        if (
          mediator.getCurrentMode() !== mediator.getMode('SELECTING_LINKBOX')
        ) {
          // selecting thumbnail to set screen to work on
          mediator.processEvent(ev, 'SETUP_BIG_SCREEN', img);
        } else {
          // part of link construction - selecting thumbnail as the target
          mediator.processEvent(ev, 'LINKBOX_FORMLINK', img);
        }
      });

      imgDesc.innerHTML = screenFile.fileMeta.name;

      // append thumbnail link boxes to imgDiv too
      img.onload = function() {
        // set image attributes, which we should have here.
        screenFile.fileMeta.naturalWidth = this.naturalWidth;
        screenFile.fileMeta.naturalHeight = this.naturalHeight;
        var id = screenFile.fileMeta.idname;
        var imgPixelRatio =
          id[id.length - 1] === 'x' && !isNaN(id[id.length - 2])
            ? parseInt(id[id.length - 2], 10)
            : 1;
        screenFile.fileMeta.imgPixelRatio = imgPixelRatio;

        // load mini link boxes for links mapped to the screen
        var links = gProto.getLinksForScreen(screenFile.fileMeta.idname);
        links.forEach(function(y) {
          var bc = y.src;
          var tmDiv = updateDivWithBoxCoords.call(
            this,
            document.createElement('div'),
            bc
          );
          // var tmDiv = updateDivWithBoxCoords(document.createElement('div'),bc);
          tmDiv.classList.add('srclinkbox--tm');
          imgDiv.appendChild(tmDiv);
        },this);
      };

      screenThumbnailsPanel.appendChild(thumbnail);

      // read in file
      var fr = new FileReader();
      fr.onload = (function(imgX) {
        return function(e) {
          debugLog('INFO','file reader - loading files');
          imgX.src = e.target.result;
          screenFile.fileMeta.src = e.target.result;
        };
      })(img);
      debugLog('INFO','before file reader');

      fr.readAsDataURL(screenFile.fileMeta);
    });
  },
  displayThumbnailMenu: function(ev) {
    var presentDialog = false;

    if (this.parentNode.getElementsByClassName('menu--thumbnailMenu').length) {
      mediator.abort();
      return;
    } else {
      var dialog = document
        .getElementsByClassName('menu--thumbnailMenu')[0]
        .cloneNode(true);
      var thumbnailSidePanel = this.parentNode;
      var thumbnail = thumbnailSidePanel.parentNode;
      thumbnailSidePanel.appendChild(dialog);

      var homeLink = dialog.getElementsByClassName('setAsHomeLink')[0];
      homeLink.addEventListener('click', function(ev) {
        debugLog('INFO','homelink clicked');
        screenfileVC.setHome(thumbnail); // set to the thumbnail item div container
      });
      var deleteLink = dialog.getElementsByClassName('deleteScreenFileLink')[0];
      deleteLink.addEventListener('click', function(ev) {
        var thumbnailMain = thumbnail.getElementsByClassName('thumbnail__main')[0];
        var img = thumbnailMain.getElementsByTagName('img')[0];

        gProto.removeScreenFile(img.fmIdName);

        // if screen file we are deleting is active, update view
        if (gProto.runningSettings.activeScreenId === img.fmIdName) {
          // for now, manually remove nodes.  better approach may be to re-render
          // from model
          var fileDisplayPanel = document.getElementById('FileDisplayPanel');
          var fileDisplayImage = document.getElementById('fileDisplayImage');
          fileDisplayImage.src = '';
          [].slice
            .call(fileDisplayPanel.getElementsByClassName('srclinkbox'))
            .forEach(function(x) {
              x.remove();
            });

          document.getElementById('screenFilenameStat').innerHTML = '';
        }

        thumbnail.remove();
      });
    }
  },
  closeThumbnailMenu: function(ev) {
    // per s.o., event listeners should get removed too.
    this.parentNode.getElementsByClassName('menu--thumbnailMenu')[0].remove();
  },
  setHome: function(thumbnailNode) {
    // remove old home
    if (gProto.exportSettings.homeScreenFile) {
      document
        .getElementById(gProto.exportSettings.homeScreenFile + '-homeIcon')
        .remove();
    }
    // setup new home
    var thumbnailMain = thumbnailNode.getElementsByClassName(
      'thumbnail__main'
    )[0];
    var img = thumbnailMain.getElementsByTagName('img')[0];
    gProto.exportSettings.homeScreenFile = img.fmIdName;

    var svgHomeNode = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'svg'
    );
    var svgUseNode = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'use'
    );
    var origHomeSymbol = document.getElementById('svg-icon-home');

    svgUseNode.setAttributeNS(
      'http://www.w3.org/1999/xlink',
      'xlink:href',
      '#svg-icon-home'
    );
    svgHomeNode.setAttribute('viewBox', origHomeSymbol.getAttribute('viewBox'));
    svgHomeNode.className.baseVal = 'icon icon--home';
    svgHomeNode.id = img.fmIdName + '-homeIcon';
    svgHomeNode.appendChild(svgUseNode);
    thumbnailMain.appendChild(svgHomeNode);
  }
};


// --------- linkboxvc.js ----------------------------------

function Linkbox(newId) {
  this.divRect = document.createElement('div');
  this.divRect.id = newId;
  this.divRect.classList.add('srclinkbox');

  this.divRect.addEventListener('click', function(ev) {
    debugLog('INFO_RECTANGLE', 'divRect clicked ' + this.id);

    mediator.processEvent(ev, 'LINKBOX_SELECT', this);
  });

  // we are using click to initiate select.  However, click comes after onmouseup and onmousedown,
  // and we need to make sure those two don't propagate and trigger event handlers on the parent div.
  this.divRect.onmousedown = function(ev) {
    debugLog('INFO_RECTANGLE', 'divRect - onmousedown');

    ev.stopPropagation();
  };
  this.divRect.onmouseup = function(ev) {
    debugLog('INFO_RECTANGLE', 'divRect - onmouseup');

    // this will get fired when building the linkbox, so we should allow it
    // to propagate to that handler on the div - fileDisplayPanel -
    // containing the filedisplay image to finish building the link box.
    if (mediator.getCurrentMode() !== mediator.getMode('BUILDING_LINKBOX'))
      ev.stopPropagation();
  };
}

var linkboxVC = {
  divRectCandidate: {},
  init: function() {
    mediator.attach('LINKBOX_START', this.startRectangle);
    mediator.attach('LINKBOX_COMPLETE', this.endRectangle);
    // triggered in body mouseup
    mediator.attach('LINKBOX_FAILTOCOMPLETE', this.killRectangle);
    mediator.attach('LINKBOX_SELECT', this.selectLinkbox);
    mediator.attach('LINKBOX_UNSELECT', this.unselectLinkbox);
    mediator.attach('LINKBOX_DELETE', this.deleteLinkbox);
    mediator.attach('LINKBOX_FORMLINK', this.addTargetToLinkbox);

    // I tried setting the event listeners on the image, but the div (linkbox)
    // being created - a sibling to the img - appears to intercept some of the 
    // mousemove as well as the mouseup events.
    var fileDisplayPanel = document.getElementById('FileDisplayPanel');
    fileDisplayPanel.addEventListener('mousemove', this.updateRectangle);
    fileDisplayPanel.addEventListener('mousedown', function(ev) {
      mediator.processEvent(ev, 'LINKBOX_START', this);
    });
    fileDisplayPanel.addEventListener('mouseup', function(ev) {
      mediator.processEvent(ev, 'LINKBOX_COMPLETE', this);
    });
  },
  startRectangle: function(ev) {
    var fileDisplayImage = document.getElementById('fileDisplayImage');
    if (fileDisplayImage.src === '') {
      mediator.abort();
      return;
    }
    var rect = fileDisplayImage.getBoundingClientRect();
    var currentLinkboxes = document.getElementsByClassName('srclinkbox');
    var max = 0;
    Array.prototype.slice.call(currentLinkboxes).forEach(function(x) {
      var currentId = x.id.split('-');
      currentId = parseInt(currentId[currentId.length - 1], 10);
      if (max < currentId) max = currentId;
    });
    var nextIdNum = max + 1;
    var nextId =
      gProto.getScreenFile(gProto.runningSettings.activeScreenId).fileMeta
        .idname +
      '-srclinkbox-' +
      nextIdNum;
    var drc = new Linkbox(nextId);

    drc.startX = ev.clientX - rect.left;
    drc.startY = ev.clientY - rect.top;

    this.appendChild(drc.divRect);
    linkboxVC.divRectCandidate = drc;
  },

  updateRectangle: function(ev) {
    if (mediator.getCurrentMode() !== mediator.getMode('BUILDING_LINKBOX'))
      return;
    
    var fileDisplayImage = document.getElementById('fileDisplayImage');
    var bc = computeBoxCoords(
      fileDisplayImage.getBoundingClientRect(),
      linkboxVC.divRectCandidate.startX,
      linkboxVC.divRectCandidate.startY,
      ev.clientX,
      ev.clientY
    );

    var divRect = linkboxVC.divRectCandidate.divRect;

    linkboxVC.divRectCandidate.divRect = updateDivWithBoxCoords.call(
      fileDisplayImage,
      divRect,
      bc
    );
  },

  endRectangle: function(ev) {
    debugLog('INFO_RECTANGLE', 'called end rectangle');
    if (mediator.getCurrentMode() !== mediator.getMode('BUILDING_LINKBOX')) {
      return;
    }

    var fileDisplayImage = document.getElementById('fileDisplayImage');
    var borderWidth = 4;  // alternate idea is JSON config, piped to both SASS and JS
    var bc = computeBoxCoords(
      fileDisplayImage.getBoundingClientRect(),
      linkboxVC.divRectCandidate.startX,
      linkboxVC.divRectCandidate.startY,
      ev.clientX,
      ev.clientY
    );

    // ignore small boxes
    if (bc.height() < 5 || bc.width() < 5) {
      mediator.abort();
      return;
    }

    if( (Math.floor(bc.xFactor*bc.containerWidth) + bc.width()+2*borderWidth) > bc.containerWidth) {
      mediator.abort();
      return;
    }

    var divRect = linkboxVC.divRectCandidate.divRect;

    var link = {};
    link.src = {
      xFactor: bc.xFactor,
      yFactor: bc.yFactor,
      widthFactor: bc.widthFactor,
      heightFactor: bc.heightFactor,
      boxId: divRect.id,
      srcScreenId:
        gProto.screenFiles[gProto.runningSettings.activeScreenId].fileMeta
          .idname
    };
    link.meta = {
      isSelected: false // not used, maybe remove as we track selected via css class on div linkbox
    };
    link.tgt = {
      targetId: ''
    };

    divRect.style.height = link.src.heightFactor * bc.containerHeight + 'px';
    divRect.style.width = link.src.widthFactor * bc.containerWidth + 'px';
    divRect.style.top = link.src.yFactor * bc.containerHeight + 'px';
    divRect.style.left = link.src.xFactor * bc.containerWidth + 'px';

    // update thumbnail of screen tool
    var tm = document.getElementById(
      gProto.screenFiles[gProto.runningSettings.activeScreenId].fileMeta
        .idname + '-thumb'
    );
    var tmDiv = updateDivWithBoxCoords.call(
      tm,
      document.createElement('div'),
      bc
    );
    tmDiv.id = divRect.id + '-thumb';

    tmDiv.classList.add('srclinkbox--tm');
    tm.parentNode.appendChild(tmDiv);

    link.src.tmBoxId = tmDiv.id;
    gProto.links[link.src.boxId] = link;
    gProto.mappings.screen2links[
      gProto.screenFiles[gProto.runningSettings.activeScreenId].fileMeta.idname
    ].push(link.src.boxId);
  },
  killRectangle: function(ev) {
    // if we have screenfile loaded, and user was in process of making a linkbox
    if(linkboxVC.divRectCandidate.divRect) {
      document.getElementById(linkboxVC.divRectCandidate.divRect.id).remove();
    }
    linkboxVC.divRectCandidate = {};
  },

  addTargetToLinkbox: function(ev) {
    // update selected link(s) with target
    var targetScreenId = this.fmIdName;
    debugLog('INFO', 'addTargetToLinkbox: ' + targetScreenId);

    Object.keys(gProto.runningSettings.selectedLinks).forEach(function(x) {
      gProto.links[x].tgt.targetId = targetScreenId;
    });

    // now unselect links
    mediator.processEvent(ev, 'LINKBOX_UNSELECT', mediator.getCurrentContext());
  },

  selectLinkbox: function(ev) {
    // unselect any selected links
    if (this.classList.contains('srclinkbox--selected')) {
      mediator.processEvent(ev, 'LINKBOX_UNSELECT', this);
    } else {
      // update model - unselect links
      gProto.runningSettings.selectedLinks = {};

      // update view
      var linkBoxesDom = document.getElementsByClassName(
        'srclinkbox--selected'
      );
      for (var i = 0; i < linkBoxesDom.length; i++) {
        linkBoxesDom[i].classList.remove('srclinkbox--selected');
      }
      // then select this
      this.classList.add('srclinkbox--selected');
      gProto.runningSettings.selectedLinks[this.id] = true;

      document
        .getElementById('ScreenThumbnailsPanel')
        .classList.add('is-selectable-for-target');

      // show link stat section
      document.getElementById('linkStat').style.display = 'block';
      var ltss = document.getElementById('linkTargetScreenStat');
      if (gProto.links[this.id].tgt.targetId) {
        ltss.classList.remove('is-value-not-set');
        ltss.innerHTML = gProto.links[this.id].tgt.targetId;
      } else {
        ltss.classList.add('is-value-not-set');
        ltss.innerHTML = 'not set';
      }
    }
  },

  unselectLinkbox: function(ev) {
    gProto.runningSettings.selectedLinks = {};

    this.classList.remove('srclinkbox--selected');
    document
      .getElementById('ScreenThumbnailsPanel')
      .classList.remove('is-selectable-for-target');
    document.getElementById('linkStat').style.display = 'none';
  },

  deleteLinkbox: function(ev) {
    Object.keys(gProto.runningSettings.selectedLinks).forEach(function(x) {
      var link = gProto.links[x];

      // remove dom links
      var bigLinkBox = document.getElementById(link.src.boxId);
      bigLinkBox.remove();
      var tmLinkBox = document.getElementById(link.src.tmBoxId);
      tmLinkBox.remove();

      // update global data
      var i = gProto.mappings.screen2links[
        gProto.runningSettings.activeScreenId
      ].indexOf(link.src.boxId);
      if (i > -1) {
        gProto.mappings.screen2links[
          gProto.runningSettings.activeScreenId
        ].splice(i, 1);
      } else {
        debugLog('ERROR', 'unexpected error: i=' + i);
      }
      delete gProto.links[x];
    });
    gProto.runningSettings.selectedLinks = {};
    
    // update view
    document
      .getElementById('ScreenThumbnailsPanel')
      .classList.remove('is-selectable-for-target');
    document.getElementById('linkStat').style.display = 'none';
  }
};

// some helper linbox fns
function computeBoxCoords(containerRect, origX, origY, currentX, currentY) {
  var rect = containerRect;
  var lastX = currentX - rect.left;
  var lastY = currentY - rect.top;
  var h = Math.abs(lastY - origY);
  var w = Math.abs(lastX - origX);
  var startX = Math.min(lastX, origX);
  var startY = Math.min(lastY, origY);

  var xFactor = startX / rect.width;
  var yFactor = startY / rect.height;
  var widthFactor = w / rect.width;
  var heightFactor = h / rect.height;

  return {
    xFactor: xFactor,
    yFactor: yFactor,
    widthFactor: widthFactor,
    heightFactor: heightFactor,
    containerWidth: rect.width,
    containerHeight: rect.height,
    width: function() {
      return this.containerWidth * this.widthFactor;
    },
    height: function() {
      return this.containerHeight * this.heightFactor;
    }
  };
}

// currently for position absolute divs (where parent is position relative)
function updateDivWithBoxCoords(div, bc) {
  var scrollX = 0;
  var scrollY = 0;
  var rect = this.getBoundingClientRect();

  var top = 0;
  var left = 0;
  div.style.height = bc.heightFactor * rect.height + 'px';
  div.style.width = bc.widthFactor * rect.width + 'px';
  debugLog(
    'INFO_BUILDRECT',
    'rect.height=' + rect.height + ' rect.width=' + rect.width
  );
  debugLog(
    'INFO_BUILDRECT',
    'bc.xFactor=' + bc.xFactor + ' bc.yFactor=' + bc.widthFactor
  );
  div.style.top = scrollY + top + bc.yFactor * rect.height + 'px';
  div.style.left = scrollX + left + bc.xFactor * rect.width + 'px';
  return div;
}


/* --- statpanelVC ------------------------  */

var statpanelVC = {
  init: function() {
    document
      .getElementsByClassName('remove-link')[0]
      .addEventListener('click', function(ev) {
        mediator.processEvent(ev, 'LINKBOX_DELETE', this);
      });
  }
};


// ------- exporter  ------------------------------------
function buildLinkHandler(areaId, srcScreenId, targetScreenId) {
  var result = `document.getElementById('${areaId}')
      .addEventListener('click',function(ev) {
        ev.preventDefault();
        document.getElementById('${srcScreenId}').style.display='none';
        document.getElementById('${targetScreenId}').style.display='block';
        history.pushState({url: '${targetScreenId}'},'','');
        gCurrentScreen = '${targetScreenId}';
      });`;

  return result;
}

function buildOutputHTML() {
  var titleHTML =
    '<title>' + gProto.exportSettings.downloadTitle + '</title>' + '\n';
  var styleSection =
    '<style>' +
    '\n' +
    '* { padding: 0; margin: 0;}' +
    '\n' +
    'img { display: block; }' +
    '\n' +
    '.init-state {display: none;}' +
    '\n' +
    '</style>' +
    '\n';
  var headSection =
    '<head>' + '\n' + titleHTML + styleSection + '</head>' + '\n';

  var divSection = '';
  var scriptCode = '';
  var preScript = `var gCurrentScreen = '${
    gProto.exportSettings.homeScreenFile
  }';`;
  scriptCode += preScript;

  var screenFiles = Object.keys(gProto.screenFiles);
  for (var i = 0; i < screenFiles.length; i++) {
    var screenFileId = screenFiles[i];
    var screenFile = gProto.screenFiles[screenFileId];
    var mapName = screenFileId + '-map';

    var imgX = '<img';
    // <img srcset="dt-home.png, dt-home2x.png 2x" src="dt-home.png"
    // + 'dt-home.png, dt-home2x.png 2x'
    // if retinaImage i.e. using multiple sets of images, based on adding 2x file
    var srcSetPath = screenFile.fileMeta.name;
    if (
      screenFileId[screenFileId.length - 1] === 'x' &&
      !isNaN(screenFileId[screenFileId.length - 2])
    ) {
      var ratio = parseInt(screenFileId[screenFileId.length - 2], 10);
      var baseFile = srcSetPath.split('.')[0]; // assuming '<filename>2x.png' and one period
      var baseFile =
        baseFile.substr(0, baseFile.length - 2) +
        '.' +
        srcSetPath.split('.')[1];
      srcSetPath = baseFile + ', ' + srcSetPath + ' 2x';
    }
    imgX += " srcset='" + srcSetPath + "'";
    imgX += " src='" + screenFile.fileMeta.name + "'";
    imgX += " usemap='#" + mapName + "'";
    imgX += "'/>";

    // find all links on current screen file
    var mapX = "<map name='" + mapName + "'>";
    var linkNames = gProto.mappings.screen2links[screenFileId];
    for (var j = 0; j < linkNames.length; j++) {
      var linkName = linkNames[j];

      var link = gProto.links[linkName];
      var x1 =
        link.src.xFactor *
        (screenFile.fileMeta.naturalWidth / screenFile.fileMeta.imgPixelRatio);
      var y1 =
        link.src.yFactor *
        (screenFile.fileMeta.naturalHeight / screenFile.fileMeta.imgPixelRatio);
      var x2 =
        x1 +
        link.src.widthFactor *
          (screenFile.fileMeta.naturalWidth /
            screenFile.fileMeta.imgPixelRatio);
      var y2 =
        y1 +
        link.src.heightFactor *
          (screenFile.fileMeta.naturalHeight /
            screenFile.fileMeta.imgPixelRatio);
      mapX += '<area ' + "id='" + linkName + "'";
      mapX += " shape='rect'";
      mapX += " coords='" + [x1, y1, x2, y2].join(',') + "'";
      mapX += " href='is-this-needed'" + '>';
      mapX += '\n';

      scriptCode += buildLinkHandler(
        linkName,
        link.src.srcScreenId,
        link.tgt.targetId
      );
    }
    mapX += '</map>' + '\n';

    var initState =
      screenFileId === gProto.exportSettings.homeScreenFile
        ? ''
        : " class='init-state'";
    var divX =
      "<div id='" +
      screenFile.fileMeta.idname +
      "'" +
      initState +
      '>' +
      imgX +
      mapX +
      '</div>' +
      '\n';
    divSection += divX;
  } // end process screenfile iteration

  // additional code
  var postCode = `
    // initialize
    history.replaceState({url: '${
      gProto.exportSettings.homeScreenFile
    }'},'','');

    window.addEventListener('popstate', function(ev) {
      var srcDivPage = ev.state.url;
      document.getElementById(srcDivPage).style.display = 'block';
      document.getElementById(gCurrentScreen).style.display = 'none';
      gCurrentScreen = srcDivPage;
    });
  `;
  scriptCode += postCode;

  var scriptSection =
    '<' + 'script' + '> ' + scriptCode + '</' + 'script' + '>' + '\n';
  var bodySection =
    '<body>' + '\n' + divSection + scriptSection + '</body>' + '\n';
  var testHtmlString =
    '<!DOCTYPE html>' +
    '\n' +
    '<html>' +
    '\n' +
    headSection +
    bodySection +
    '</html>';

  var testData = 'data:' + ',' + encodeURIComponent(testHtmlString);
  return testData;
}


// --- App VC -------------------------------------------------

var AppVC = {
  init: function() {
    mediator.attach('FILES_LOAD', this.handleFiles);
    mediator.attach('MENU_OPEN', this.displayMenu);
    mediator.attach('MENU_CLOSE', this.closeMenu);
    mediator.attach('MENU_ITEM_CLICK', this.handleMenuItemClick);
    mediator.attach('SETUP_BIG_SCREEN', this.setupFileDisplayPanel);
    mediator.attach('DEFAULT_RESUME', mediator.noOp);

    // load screenfiles - menu option.  click to trigger input type=file element
    // to get file select dialog box
    document
      .getElementById('fileElemClickerLink')
      .addEventListener('click', function(ev) {
        mediator.processEvent(
          ev,
          'MENU_ITEM_CLICK',
          document.getElementsByClassName('barsButton')[0]
        );
        document.getElementById('fileElem').click();
      });

    document.getElementById('fileElem').addEventListener('click', function(ev) {
      ev.stopPropagation();
    });
    document
      .getElementById('fileElem')
      .addEventListener('change', function(ev) {
        mediator.processEvent(ev, 'FILES_LOAD', this);
        // for browsers like Chrome that really do check for change in files selected,
        // this will allow us to re-select same file(s) to upload.
        this.value = ''; 
      });

    document
      .getElementsByClassName('barsButton')[0]
      .addEventListener('click', function(ev) {
        if (mediator.getCurrentMode() === mediator.getMode('OPEN_MENU')) {
          mediator.processEvent(ev, 'MENU_CLOSE', this);
        } else {
          mediator.processEvent(ev, 'MENU_OPEN', this);
        }
      });

    // menu handlers
    document
      .getElementById('aboutDialogLink')
      .addEventListener('click', aboutDialogHandler);

    document
      .getElementById('settingsModalLink')
      .addEventListener('click', settingsDialogHandler);

    document
      .getElementById('downloadLink')
      .addEventListener('click', downloadFileHandler);

    // catch all so to speak.  Helps with the menu toggle off
    document
      .getElementsByTagName('body')[0]
      .addEventListener('click', function(ev) {
        debugLog('INFO_BODY', 'body clicked');
        mediator.processEvent(ev, 'DEFAULT_RESUME', this);
      });
    document
    .getElementsByTagName('body')[0]
    .addEventListener('mouseup', function(ev) {
      debugLog('INFO_BODY', 'mouse up over body');
      if(mediator.getCurrentMode() === mediator.getMode('BUILDING_LINKBOX')) {
        mediator.processEvent(ev, 'LINKBOX_FAILTOCOMPLETE', document.getElementById('FileDisplayPanel'));
      }
    });
  },
  handleFiles: function() {
    var fileList = Array.prototype.slice.call(this.files);
    screenfileVC.setupThumbnailsPanel(fileList);

    var waitingTitle = document.getElementById('waitingTitle');
    waitingTitle.style.display = 'none';
  },
  setupFileDisplayPanel: function() {
    // update model
    gProto.runningSettings.activeScreenId = this.fmIdName;

    // update views
    var fileDisplayPanel = document.getElementById('FileDisplayPanel');
    var displayFile = document.getElementById('fileDisplayImage');
    displayFile.src =
      gProto.screenFiles[gProto.runningSettings.activeScreenId].fileMeta.src;
    displayFile.onmousedown = function(ev) {
      // prevent that dragging of img behavior
      ev.preventDefault();
    };

    // remove all links being displayed from prior screen
    var nodeList = document.querySelectorAll('#FileDisplayPanel .srclinkbox');
    nodeList.forEach(function(x) {
      x.remove();
    });

    // add links of new screen
    var links = gProto.getLinksForScreen(gProto.runningSettings.activeScreenId);
    links.forEach(function(x) {
      // add div of link box to filedisplaypanel
      var bc = x.src;
      var linkDiv = new Linkbox(bc.boxId).divRect;
      linkDiv = updateDivWithBoxCoords.call(displayFile, linkDiv, bc);
      fileDisplayPanel.appendChild(linkDiv);
    });

    // update stat StatPanel
    document.getElementById('screenFilenameStat').innerHTML =
      gProto.runningSettings.activeScreenId;
  },

  // menu fns
  displayMenu: function(ev) {
    if (!this.classList.contains('menuEnabled')) {
      // is menu closed, then open it up
      this.classList.add('menuEnabled');
      document.querySelector('#mainMenu').classList.add('is-open');
    } else {
      // else it is open, so close it
      mediator.abort();
    }
  },
  closeMenu: function(ev) {
    this.classList.remove('menuEnabled');
    document.querySelector('#mainMenu').classList.remove('is-open');
  },
  handleMenuItemClick: function(ev) {
    mediator.processEvent(ev, 'MENU_CLOSE', this);
  }
};

// ok dialog function
function OkDialog(title, msgNode) {
  var okButton = document.querySelector('#okModal button');
  function closeDialog(ev) {
    backgroundOverlay.style.display = 'none';
    dialogBox.style.display = 'none';
    dialogBoxContent.getElementsByTagName('div')[0].remove();
    this.removeEventListener('click', closeDialog);
  }
  okButton.addEventListener('click', closeDialog);

  // now set content
  var dialogBox = document.getElementById('okModal');

  // set title
  dialogBox
    .getElementsByClassName('modal__title')[0]
    .getElementsByTagName('h1')[0].innerHTML = title;

  // now set content
  var dialogBoxContent = dialogBox.getElementsByClassName('modal__content')[0];
  dialogBoxContent.appendChild(msgNode);
  dialogBox.style.display = 'block';

  var backgroundOverlay = document.getElementsByClassName(
    'modal__background'
  )[0];

  backgroundOverlay.style.display = 'block';
}

// menu handlers
function settingsDialogHandler(ev) {
  var dialogOverlay = document.getElementsByClassName('modal__background')[0];
  dialogOverlay.style.display = 'block';
  var dialog = document.getElementById('settingsModal');
  dialog.style.display = 'block';

  document.getElementById('web-page-title').value =
    gProto.exportSettings.downloadTitle;
  document.getElementById('web-page-filename').value =
    gProto.exportSettings.downloadFilename;

  document
    .querySelector('#settingsModal .save')
    .addEventListener('click', function(ev) {
      dialog.style.display = 'none';
      dialogOverlay.style.display = 'none';
      gProto.exportSettings.downloadTitle = document.getElementById(
        'web-page-title'
      ).value;
      gProto.exportSettings.downloadFilename = document.getElementById(
        'web-page-filename'
      ).value;
      document.getElementById('downloadLink').download =
        gProto.exportSettings.downloadFilename;
    });
  document
    .querySelector('#settingsModal .cancel')
    .addEventListener('click', function(ev) {
      dialog.style.display = 'none';
      dialogOverlay.style.display = 'none';
    });
}

function aboutDialogHandler(ev) {
  var msgNode = document
    .getElementsByClassName('text-about')[0]
    .cloneNode(true);
  Array.prototype.slice
    .call(msgNode.getElementsByClassName('app-title'))
    .forEach(function(x) {
      x.innerHTML = gProto.internalSettings.appTitle;
    });
  msgNode.getElementsByClassName('app-versionnumber')[0].innerHTML =
    gProto.internalSettings.versionData.version;
  msgNode.getElementsByClassName('app-versiondate')[0].innerHTML =
    gProto.internalSettings.versionData.date;
  OkDialog('About', msgNode);
}

function downloadFileHandler(ev) {
  // error checks
  if (!gProto.exportSettings.homeScreenFile) {
    var msgNode = document.createElement('div');
    var paraNode = document.createElement('p');
    paraNode.innerHTML =
      'We need the home screen set. This option is available on the thumbnail menu next to each screen.';
    msgNode.appendChild(paraNode);
    OkDialog('Please review', msgNode);
    ev.preventDefault();
    return;
  }
  this.href = buildOutputHTML();
}












/* main.js  */
// --- mediator --------------------------------
var mediator = (function() {
  function noOp() {}

  var _processingQ = [];

  return {
  _currentState: {},
  _eventList: {},
  _modeList: {
    OPEN_MENU: { value: 90, modal: false, cancelMode: AppVC.closeMenu },
    OPEN_THUMBNAIL_MENU: {
      value: 80,
      modal: false,
      cancelMode: screenfileVC.closeThumbnailMenu
    },
    BUILDING_LINKBOX: { value: 50, modal: false, cancelMode: linkboxVC.killRectangle },
    SELECTING_LINKBOX: {
      value: 60,
      modal: false,
      cancelMode: linkboxVC.unselectLinkbox
    },
    // OPEN_DIALOG_SETTINGS: { value: 100, modal: true, cancelMode: cancelDialog },
    LOAD_SCREENFILES: { value: 100, modal: true, cancelMode: noOp },
    DEFAULT: { value: 0, modal: false, cancelMode: noOp }
  },
  init: function() {
    this._eventList = {
      FILES_LOAD: {
        initialMode: this._modeList.LOAD_SCREENFILES,
        resultingMode: this._modeList.DEFAULT
      },
      MENU_OPEN: {
        initialMode: this._modeList.OPEN_MENU,
        resultingMode: this._modeList.OPEN_MENU
      },
      MENU_CLOSE: {
        initialMode: this._modeList.OPEN_MENU,
        resultingMode: this._modeList.DEFAULT
      },
      MENU_ITEM_CLICK: {
        initialMode: this._modeList.OPEN_MENU,
        resultingMode: this._modeList.OPEN_MENU
      },
      THUMBNAIL_MENU_OPEN: {
        initialMode: this._modeList.OPEN_THUMBNAIL_MENU,
        resultingMode: this._modeList.OPEN_THUMBNAIL_MENU
      },
      THUMBNAIL_MENU_CLOSE: {
        initialMode: this._modeList.OPEN_THUMBNAIL_MENU,
        resultingMode: this._modeList.DEFAULT
      },
      LINKBOX_START: {
        initialMode: this._modeList.BUILDING_LINKBOX,
        resultingMode: this._modeList.BUILDING_LINKBOX
      },
      LINKBOX_COMPLETE: {
        initialMode: this._modeList.BUILDING_LINKBOX,
        resultingMode: this._modeList.DEFAULT
      },
      LINKBOX_FAILTOCOMPLETE: {
        initialMode: this._modeList.BUILDING_LINKBOX,
        resultingMode: this._modeList.DEFAULT
      },
      LINKBOX_SELECT: {
        initialMode: this._modeList.SELECTING_LINKBOX,
        resultingMode: this._modeList.SELECTING_LINKBOX
      },
      LINKBOX_UNSELECT: {
        initialMode: this._modeList.SELECTING_LINKBOX,
        resultingMode: this._modeList.DEFAULT
      },
      LINKBOX_FORMLINK: {
        initialMode: this._modeList.SELECTING_LINKBOX,
        resultingMode: this._modeList.DEFAULT
      },
      LINKBOX_DELETE: {
        initialMode: this._modeList.SELECTING_LINKBOX,
        resultingMode: this._modeList.DEFAULT
      },
      SETUP_BIG_SCREEN: {
        initialMode: this._modeList.DEFAULT,
        resultingMode: this._modeList.DEFAULT
      },
      DEFAULT_RESUME: {
        initialMode: this._modeList.DEFAULT,
        resultingMode: this._modeList.DEFAULT
      }
    };

    this._currentState = {
      mode: this._modeList.DEFAULT,
      context: null,
      abort: false,
    };
  },
  attach: function(eventType, callback) {
    this._eventList[eventType].handler = callback;
  },
  processEvent: function(ev, eventName, context) {
    debugLog('INFO', 'mediator processing: ' + eventName);

    if(_processingQ.length) {
      _processingQ[_processingQ.length-1].passThrough = true;
    }
    _processingQ.push({eventName: eventName, passThrough: false});

    this._currentState.abort = false; // "semiglobal" - set to true in handler when aborting
    this._currentState.runningEvent = true; // "semiglobal" - set to true in handler when aborting

    debugLog(
      'INFO',
      '\t_currentState.mode.value=' + this._currentState.mode.value
    );
    if (!context) {
      context = this;
    }

    if (
      this._eventList[eventName].initialMode.value >=
      this._currentState.mode.value
    ) {
      // _currentState.mode = _eventList[eventName].initialMode;
      // e.g. big menu triggers cancel of thumbnail menu or selected linkbox
      // later on, might consider a stack of currentState.
      if(this._eventList[eventName].initialMode.value > this._currentState.mode.value) {
        this._currentState.mode.cancelMode.call(this._currentState.context, ev);
      }

      // make the call
      this._eventList[eventName].handler.call(context, ev);

      // ok, let's handle whether action went through, or was aborted
      if (this._currentState.abort) {
        this._eventList[eventName].initialMode.cancelMode.call(context, ev);
        this._currentState.mode = this._modeList.DEFAULT;
        this._currentState.context = null;
      } else {
        // if event is not marked pass through, then update mode and context
        if(!_processingQ[_processingQ.length-1].passThrough) {
          this._currentState.mode = this._eventList[eventName].resultingMode;
          this._currentState.context = context;
        }
      }
    }
    // any event, even if it doesn't go through, can still turn off a current mode 
    // unless we're in a modal dialog
    else if (!this._currentState.mode.modal) {
      // another approach - instead of cancelMode function, there could be 
      // cancelMode event, which would allow mode and context to be updated normally
      this._currentState.mode.cancelMode.call(this._currentState.context, ev);
      this._currentState.mode = this._modeList.DEFAULT;
      this._currentState.context = null;
    }

    _processingQ.pop();
    ev.stopPropagation();
  },
  abort: function() {
    this._currentState.abort = true;
  },
  getCurrentMode: function() {
    return this._currentState.mode;
  },
  getCurrentContext: function() {
    return this._currentState.context;
  },
  getMode: function(modeStr) {
    // no checks
    return this._modeList[modeStr];
  },
  noOp: noOp
  }
})();

// --- end mediator -------------------------------------------

mediator.init();

AppVC.init();
screenfileVC.init();
statpanelVC.init();
linkboxVC.init();

// final things
downloadLink.download = gProto.exportSettings.downloadFilename;



