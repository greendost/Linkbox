/* main.js
  prototype tool
  started late Dec 2017
  updated May 2018


*/

// data to drive the view
var gProto = {
  screenFiles: {},
  links: {},
  mappings: {
    screen2links: {}
  },
  settings: {
    versionData: { version: '0.1', date: '2/11/18' },
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
  }
};

var gModeList = {
  OPEN_MENU: { value: 90, modal: false, cancelMode: closeMenu },
  OPEN_THUMBNAIL_MENU: {
    value: 80,
    modal: false,
    cancelMode: closeThumbnailMenu
  },
  BUILDING_LINKBOX: { value: 50, modal: false, cancelMode: noOp },
  SELECTING_LINKBOX: { value: 60, modal: false, cancelMode: unselectLinkbox },
  OPEN_DIALOG_SETTINGS: { value: 100, modal: true, cancelMode: cancelDialog },
  LOAD_SCREENFILES: { value: 100, modal: true, cancelMode: noOp },
  DEFAULT: { value: 0, modal: false, cancelMode: noOp }
};

var gEventList = {
  FILES_LOAD: {
    initialMode: gModeList.LOAD_SCREENFILES,
    resultingMode: gModeList.DEFAULT,
    handler: [handleFiles]
  },
  MENU_OPEN: {
    initialMode: gModeList.OPEN_MENU,
    resultingMode: gModeList.OPEN_MENU,
    handler: [displayMenu]
  },
  MENU_CLOSE: {
    initialMode: gModeList.OPEN_MENU,
    resultingMode: gModeList.DEFAULT,
    handler: [closeMenu]
  },
  THUMBNAIL_MENU_OPEN: {
    initialMode: gModeList.OPEN_THUMBNAIL_MENU,
    resultingMode: gModeList.OPEN_THUMBNAIL_MENU,
    handler: [displayThumbnailMenu]
  },
  THUMBNAIL_MENU_CLOSE: {
    initialMode: gModeList.OPEN_THUMBNAIL_MENU,
    resultingMode: gModeList.DEFAULT,
    handler: [closeThumbnailMenu]
  },
  LINKBOX_START: {
    initialMode: gModeList.BUILDING_LINKBOX,
    resultingMode: gModeList.BUILDING_LINKBOX,
    handler: [startRectangle]
  },
  LINKBOX_COMPLETE: {
    initialMode: gModeList.BUILDING_LINKBOX,
    resultingMode: gModeList.DEFAULT,
    handler: [endRectangle]
  },
  LINKBOX_SELECT: {
    initialMode: gModeList.SELECTING_LINKBOX,
    resultingMode: gModeList.SELECTING_LINKBOX,
    handler: [selectLinkbox]
  },
  LINKBOX_UNSELECT: {
    initialMode: gModeList.SELECTING_LINKBOX,
    resultingMode: gModeList.DEFAULT,
    handler: [unselectLinkbox]
  },
  LINKBOX_FORMLINK: {
    initialMode: gModeList.SELECTING_LINKBOX,
    resultingMode: gModeList.DEFAULT,
    handler: [addTargetToLinkbox]
  },
  LINKBOX_DELETE: {
    initialMode: gModeList.SELECTING_LINKBOX,
    resultingMode: gModeList.DEFAULT,
    handler: [deleteLinkbox]
  },
  DEFAULT_RESUME: {
    initialMode: gModeList.DEFAULT,
    resultingMode: gModeList.DEFAULT,
    handler: [noOp]
  }
};

var gCurrentState = { mode: gModeList.DEFAULT, context: null, abort: false };

function processEvent(ev, eventName) {
  console.log('processing: ' + eventName);
  gCurrentState.abort = false; // "semiglobal" - set to true in handler when aborting
  console.log('   gCurrentState.mode.value=' + gCurrentState.mode.value);
  if (gEventList[eventName].initialMode.value >= gCurrentState.mode.value) {
    // gCurrentState.mode = gEventList[eventName].initialMode;
    gEventList[eventName].handler[0].call(this, ev);
    if (gCurrentState.abort) {
      gEventList[eventName].initialMode.cancelMode.call(this, ev);
      gCurrentState.mode = gModeList.DEFAULT;
      gCurrentState.context = null;
    } else {
      gCurrentState.mode = gEventList[eventName].resultingMode;
      gCurrentState.context = this;
    }
  } else if (!gCurrentState.mode.modal) {
    gCurrentState.mode.cancelMode.call(gCurrentState.context, ev);
    gCurrentState.mode = gModeList.DEFAULT;
    gCurrentState.context = null;
    //ev.preventDefault(); // why??
  }

  ev.stopPropagation();
}

function cancelDialog() {}
function displayMenu(ev) {
  if (!this.classList.contains('menuEnabled')) {
    // is menu closed, then open it up
    this.classList.add('menuEnabled');
    document.querySelector('#Header #mainMenu').classList.add('openMenu');
  } else {
    // else it is open, so close it
    // processEvent.call(this, ev, 'MENU_CLOSE');
    gCurrentState.abort = true;
  }
}

function closeMenu(ev) {
  this.classList.remove('menuEnabled');
  document.querySelector('#Header #mainMenu').classList.remove('openMenu');
}

function displayThumbnailMenu(ev) {
  var presentDialog = false;
  // if(!hasChildWithClass(this.parentNode.parentNode, 'thumbnailDialog')) {
  //   presentDialog = true;
  // }
  if (hasChildWithClass(this.parentNode.parentNode, 'thumbnailDialog')) {
    gCurrentState.abort = true;
    return;
  } else {
    // remove any other active thumbnail menu - should only be 1
    var dialogArray = Array.prototype.slice.call(
      document.querySelectorAll('.thumbnailItem .thumbnailDialog')
    );
    for (var i = 0; i < dialogArray.length; i++) {
      dialogArray[i].remove();
    }
    // and present this one
    var dialog = document
      .getElementsByClassName('thumbnailDialog')[0]
      .cloneNode(true);
    var thumbnailItem = this.parentNode.parentNode;
    thumbnailItem.appendChild(dialog);
    var homeLink = findDomNodeByClass(dialog, 'setAsHomeLink');
    homeLink.addEventListener('click', function(ev) {
      setHome(thumbnailItem); // set to the thumbnail item div container
    });
    var deleteLink = findDomNodeByClass(dialog, 'deleteScreenFileLink');
    deleteLink.addEventListener('click', function(ev) {
      var thumbnailDiv = findDomNodeByClass(thumbnailItem, 'thumbnailDiv');
      var img = findDomNodeByClass(thumbnailDiv, 'thumbnail');
      delete gProto.screenFiles[img.fmIdName];
      thumbnailItem.remove();
    });
  }
}

function closeThumbnailMenu(ev) {
  // per so, event listeners should get removed too.
  findDomNodeByClass(this.parentNode.parentNode, 'thumbnailDialog').remove();
}

var gActiveScreenId; // currently selected screen file
var divRectCandidate = {}; // linkbox being built
var gSelectedLinks = {}; // currently, 1 link selected at a time

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

function findDomNodeByClass(domNode, className) {
  var childNodes = Array.prototype.slice
    .call(domNode.childNodes)
    .filter(function(x) {
      return x.nodeName !== '#text';
    });
  for (var i = 0; i < childNodes.length; i++) {
    if (childNodes[i].classList.contains(className)) {
      return childNodes[i];
    }
  }
}

function hasChildWithClass(domNode, className) {
  var childNodes = Array.prototype.slice
    .call(domNode.childNodes)
    .filter(function(x) {
      return x.nodeName !== '#text';
    });
  for (var i = 0; i < childNodes.length; i++) {
    if (childNodes[i].classList.contains(className)) return true;
  }
  return false;
}

function OkDialog(msg) {
  // background -> dialog box -> message and div-buttonWrapper with ok button
  var msgElem = document.createElement('p');
  msgElem.innerHTML = '<pre>' + msg + '</pre>';
  var okButton = document.createElement('button');
  okButton.innerHTML = 'Ok';
  okButton.style.width = '100%';
  okButton.style.fontSize = '1.2rem';

  okButton.addEventListener('click', function() {
    document.getElementById('OkDialog').remove();
  });
  var buttonWrapper = document.createElement('div');
  buttonWrapper.style.textAlign = 'center';
  buttonWrapper.appendChild(okButton);
  var dialogBox = document.createElement('div');
  dialogBox.id = 'OkDialogBox';
  setStyleOnDomObject(dialogBox, {
    position: 'absolute',
    backgroundColor: '#eee',
    color: '#333',
    left: '50%',
    top: '50%',
    transform: 'translate(-50%, -50%)',
    borderRadius: '4px',
    padding: '1rem'
  });

  dialogBox.appendChild(msgElem);
  dialogBox.appendChild(buttonWrapper);
  var backgroundOverlay = document.createElement('div');
  backgroundOverlay.id = 'OkDialog';
  setStyleOnDomObject(backgroundOverlay, {
    backgroundColor: 'rgba(0,0,0,0.65)',
    height: '100%',
    width: '100%',
    top: '0',
    left: '0',
    'z-index': 1,
    position: 'fixed'
  });

  backgroundOverlay.appendChild(dialogBox);
  document.getElementsByTagName('body')[0].appendChild(backgroundOverlay);
}

function noOp() {} // mainly for atom styling bug

// --------------- core fns --------------------------
// setting up the big screen
function setupFileDisplayPanel() {
  var fileDisplayPanel = document.getElementById('FileDisplay');

  // set image
  var displayFile = document.getElementById('fileDisplayImage');
  displayFile.src = gProto.screenFiles[gActiveScreenId].fileMeta.src; //this.src;
  displayFile.onmousedown = function(ev) {
    // prevent that dragging of img behavior
    ev.preventDefault();
  };

  // remove all links being displayed from prior screen
  var nodeList = document.querySelectorAll('#FileDisplay .srclinkbox');
  nodeList.forEach(function(x) {
    x.remove();
  });

  // add links of new screen
  var links = gProto.getLinksForScreen(gActiveScreenId);
  links.forEach(function(x) {
    // add div of link box to filedisplaypanel
    var bc = x.src;
    var linkDiv = makeLinkBox(bc.boxId);
    linkDiv = updateDivWithBoxCoords.call(displayFile, linkDiv, bc);
    fileDisplayPanel.appendChild(linkDiv);
  });

  // update stat StatPanel
  document.getElementById('screenFilenameStat').innerHTML = this.fmIdName;
}

function addTargetToLinkbox(ev) {
  // update selected link(s) with target
  var targetScreenId = this.fmIdName; // TODO - do I need this line?
  Object.keys(gSelectedLinks).forEach(function(x) {
    gProto.links[x].tgt.targetId = targetScreenId;
  });

  // now unselect links
  gSelectedLinks = {};
  unselectLinkbox.call(gCurrentState.context, ev);
  // and re-render
  // var linkBoxesDom = document.getElementsByClassName('srclinkbox-selected');
  // for(var i = 0; i < linkBoxesDom.length; i++) {
  //   linkBoxesDom[i].classList.remove('srclinkbox-selected');
  // }
}

function setHome(thumbnailNode) {
  // remove old home
  if (gProto.settings.homeScreenFile) {
    document
      .getElementById(gProto.settings.homeScreenFile + '-homeIcon')
      .remove();
  }
  // setup new home
  var thumbnailDiv = findDomNodeByClass(thumbnailNode, 'thumbnailDiv');
  var img = findDomNodeByClass(thumbnailDiv, 'thumbnail');
  gProto.settings.homeScreenFile = img.fmIdName;
  var svgHomeDiv = document
    .getElementsByClassName('homeIcon')[0]
    .cloneNode(true);
  svgHomeDiv.id = img.fmIdName + '-homeIcon';
  img.parentNode.appendChild(svgHomeDiv);
}

function setupThumbnailsPanel() {
  var waitingTitle = document.getElementById('waitingTitle');
  waitingTitle.style.display = 'none';

  var screenThumbnailsPanel = document.getElementById('ScreenThumbnailsPanel');
  // remove all nodes, and recreate all screen thumbnails
  removeChildNodes(screenThumbnailsPanel);

  var thumbnailTemplate = document.getElementsByClassName('thumbnailItem')[0];
  Object.keys(gProto.screenFiles).forEach(function(x) {
    var screenFile = gProto.screenFiles[x];

    var thumbnailItem = thumbnailTemplate.cloneNode(true);
    var imgDiv = findDomNodeByClass(thumbnailItem, 'thumbnailDiv');
    var img = findDomNodeByClass(imgDiv, 'thumbnail');
    var tbw = findDomNodeByClass(thumbnailItem, 'thumbnailBottomWrapper');
    var imgDesc = findDomNodeByClass(tbw, 'thumbnailDesc');
    var cog = findDomNodeByClass(tbw, 'cogIconWrapper');

    // thumbnail menu
    cog.addEventListener('click', function(ev) {
      processEvent.call(this, ev, 'THUMBNAIL_MENU_OPEN');
    });

    img.id = screenFile.fileMeta.idname + '-thumb';
    img.fmIdName = screenFile.fileMeta.idname; // tie image back to gProto
    img.addEventListener('click', function(ev) {
      console.log(this.fmIdName + ' click');
      if (gCurrentState.mode !== gModeList.SELECTING_LINKBOX) {
        // selecting thumbnail to set screen to work on
        gActiveScreenId = screenFile.fileMeta.idname;
        setupFileDisplayPanel.call(this);
      } // part of link construction - selecting thumbnail as the target
      else {
        processEvent.call(this, ev, 'LINKBOX_FORMLINK');
      }
    });

    img.addEventListener('dblclick', function() {
      // console.log(this.fmIdName + " dblclick");
      // remove old home
      // if(gProto.settings.homeScreenFile) {
      //   document.getElementById(gProto.settings.homeScreenFile + "-homeIcon").remove();
      // }
      // // setup new home
      // gProto.settings.homeScreenFile = this.fmIdName;
      // var svgHomeDiv = document.getElementsByClassName('homeIcon')[0].cloneNode(true);
      // svgHomeDiv.id = this.fmIdName + "-homeIcon";
      // this.parentNode.appendChild(svgHomeDiv);
      setHome(this.parentNode.parentNode);
    });

    imgDesc.innerHTML = screenFile.fileMeta.name;
    // imgDiv.style.position = 'relative';
    // imgDiv.appendChild(img);

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
      // console.log('file loaded - ' + screenFile.fileMeta.name + " nw="
      // + screenFile.fileMeta.naturalWidth + " nh=" + screenFile.fileMeta.naturalHeight);

      // load mini link boxes for links mapped to the screen
      var links = gProto.getLinksForScreen(screenFile.fileMeta.idname);
      links.forEach(function(y) {
        var bc = y.src;
        // does this refer to img here ??
        var tmDiv = updateDivWithBoxCoords.call(
          this,
          document.createElement('div'),
          bc
        );
        tmDiv.classList.add('srclinkbox-tm');
        imgDiv.appendChild(tmDiv);
      });
    };

    // var thumbnailItem = document.createElement('div');
    // thumbnailItem.classList.add('thumbnailItem');
    // thumbnailItem.appendChild(imgDiv);
    // thumbnailItem.appendChild(imgDesc);

    screenThumbnailsPanel.appendChild(thumbnailItem);
    var fr = new FileReader();
    fr.onload = (function(imgX) {
      return function(e) {
        imgX.src = e.target.result;
        screenFile.fileMeta.src = e.target.result;
      };
    })(img);
    fr.readAsDataURL(screenFile.fileMeta);
  });
}

// essentially, start here.  Take user's selected files, and add them
// to our list of screenFiles in gProto.  Then generate the thumbnails
// from this list.
function handleFiles() {
  var fileList = this.files;
  var files = Array.prototype.slice.call(fileList);

  files.forEach(function(x) {
    // TODO does x exist? - if so, overwrite or warn or something
    var screenFileItem = {};
    screenFileItem.fileMeta = x;
    screenFileItem.fileMeta.idname = makeIdname(x.name);
    gProto.screenFiles[screenFileItem.fileMeta.idname] = screenFileItem;
    gProto.mappings.screen2links[screenFileItem.fileMeta.idname] = [];
  });

  setupThumbnailsPanel();
}

// ---- Link box functions ----------------------------------------

function computeBoxCoords(containerRect, origX, origY, currentX, currentY) {
  // var rect = this.getBoundingClientRect();
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
  //- var scrollX = window.scrollX; var scrollY = window.scrollY;
  var scrollX = 0;
  var scrollY = 0;
  var rect = this.getBoundingClientRect();
  //- var positionAttr = window.getComputedStyle(this.parentNode).getPropertyValue('position')
  //- var top = positionAttr === 'absolute' ? 0 : rect.top;
  //- var left = positionAttr === 'absolute' ? 0 : rect.left;
  var top = 0;
  var left = 0;
  div.style.height = bc.heightFactor * rect.height + 'px';
  div.style.width = bc.widthFactor * rect.width + 'px';
  // console.log('rect.height=' + rect.height + ' rect.width=' + rect.width);
  // console.log('bc.xFactor=' + bc.xFactor + ' bc.yFactor=' + bc.widthFactor);
  div.style.top = scrollY + top + bc.yFactor * rect.height + 'px';
  div.style.left = scrollX + left + bc.xFactor * rect.width + 'px';
  return div;
}

function selectLinkbox(ev) {
  // if(this.classList.contains('srclinkbox-selected')) {
  //   this.classList.remove('srclinkbox-selected');
  // } else {
  //   this.classList.add('srclinkbox-selected');
  // }

  // if(gSelectedLinks[this.id])
  //   delete gSelectedLinks[this.id];
  // else
  //   gSelectedLinks[this.id] = true;

  // unselect any selected links

  if (this.classList.contains('srclinkbox-selected')) {
    processEvent.call(this, ev, 'LINKBOX_UNSELECT');
  } else {
    // unselect links
    gSelectedLinks = {};
    // and re-render
    var linkBoxesDom = document.getElementsByClassName('srclinkbox-selected');
    for (var i = 0; i < linkBoxesDom.length; i++) {
      linkBoxesDom[i].classList.remove('srclinkbox-selected');
    }
    // then select this
    this.classList.add('srclinkbox-selected');
    gSelectedLinks[this.id] = true;

    // show link stat section

    document.getElementById('linkStat').style.display = 'block';
    var ltss = document.getElementById('linkTargetScreenStat');
    if (gProto.links[this.id].tgt.targetId) {
      ltss.classList.remove('value-not-set');
      ltss.innerHTML = gProto.links[this.id].tgt.targetId;
    } else {
      ltss.classList.add('value-not-set');
      ltss.innerHTML = 'not set';
    }
  }

  //
  // var isOriginallySelected = this.classList.contains('srclinkbox-selected');

  // unselect links
  // gSelectedLinks = {};
  // // and re-render
  // var linkBoxesDom = document.getElementsByClassName('srclinkbox-selected');
  // for(var i = 0; i < linkBoxesDom.length; i++) {
  //   linkBoxesDom[i].classList.remove('srclinkbox-selected');
  // }
  //
  // if(!isOriginallySelected) {
  //   this.classList.add('srclinkbox-selected');
  //   gSelectedLinks[this.id] = true;
  // }
}

function unselectLinkbox(ev) {
  this.classList.remove('srclinkbox-selected');
  document.getElementById('linkStat').style.display = 'none';
}

function deleteLinkbox(ev) {
  Object.keys(gSelectedLinks).forEach(function(x) {
    var link = gProto.links[x];

    // remove dom links
    var bigLinkBox = document.getElementById(link.src.boxId);
    bigLinkBox.remove();
    var tmLinkBox = document.getElementById(link.src.tmBoxId);
    tmLinkBox.remove();

    // update global data
    var i = gProto.mappings.screen2links[gActiveScreenId].indexOf(
      link.src.boxId
    );
    if (i > -1) {
      gProto.mappings.screen2links[gActiveScreenId].splice(i, 1);
    } else {
      console.log('unexpected error: i=' + i);
    }
    delete gProto.links[x];
  });
  gSelectedLinks = {};
  document.getElementById('linkStat').style.display = 'none';
}

function makeLinkBox(newId) {
  var divRect = document.createElement('div');
  divRect.id = newId;
  divRect.classList.add('srclinkbox');
  // divRect.addEventListener('dblclick', function(ev) {
  //   console.log('divRect doubleclick');
  // });
  divRect.addEventListener('click', function(ev) {
    console.log('divRect clicked ' + this.id);
    processEvent.call(this, ev, 'LINKBOX_SELECT');
  });

  // we are using click to initiate select.  However, click comes after onmouseup and onmousedown,
  // and we need to make sure those two don't propagate and trigger event handlers on the parent div.
  divRect.onmousedown = function(ev) {
    console.log('divRect - onmousedown');
    ev.stopPropagation();
  };
  divRect.onmouseup = function(ev) {
    console.log('divRect - onmouseup');

    // this will get fired when building the linkbox, so we should allow it
    // to propagate to that handler on the div containing the filedisplay image
    // to finish building the link box.
    if (gCurrentState.mode !== gModeList.BUILDING_LINKBOX) ev.stopPropagation();
  };

  return divRect;
}

// create source linkbox (where user will click)
function startRectangle(ev) {
  console.log('startRectangle');
  // gIsStartingRectangle = true;
  // var rect = this.getBoundingClientRect();
  var fileDisplayImage = document.getElementById('fileDisplayImage');
  if (fileDisplayImage.src === '') {
    gCurrentState.abort = true;
    return;
  }
  var rect = fileDisplayImage.getBoundingClientRect();
  // var nextIdNum = 1 + document.getElementsByClassName('srclinkbox').length;
  var currentLinkboxes = document.getElementsByClassName('srclinkbox');
  var max = 0;
  Array.prototype.slice.call(currentLinkboxes).forEach(function(x) {
    var currentId = x.id.split('-');
    currentId = parseInt(currentId[currentId.length - 1], 10);
    if (max < currentId) max = currentId;
  });
  var nextIdNum = max + 1;
  var nextId =
    gProto.getScreenFile(gActiveScreenId).fileMeta.idname +
    '-srclinkbox-' +
    nextIdNum;
  var divRect = makeLinkBox(nextId);
  // divRect.id =
  //   gProto.screenFiles[gActiveScreenId].fileMeta.idname +
  //   '-srclinkbox-' +
  //   nextIdNum; // ?? pagedesc + ...

  divRectCandidate.startX = ev.clientX - rect.left;
  divRectCandidate.startY = ev.clientY - rect.top;
  divRectCandidate.divRect = divRect;
  // document.getElementById('fileDisplayImage').appendChild(divRectCandidate.divRect);
  this.appendChild(divRectCandidate.divRect);
}

function updateRectangle(ev) {
  if (gCurrentState.mode !== gModeList.BUILDING_LINKBOX) return;
  // console.log('mousemove - building linkbox');

  var fileDisplayImage = document.getElementById('fileDisplayImage');
  var bc = computeBoxCoords(
    fileDisplayImage.getBoundingClientRect(),
    divRectCandidate.startX,
    divRectCandidate.startY,
    ev.clientX,
    ev.clientY
  );

  var divRect = divRectCandidate.divRect;

  // divRectCandidate.divRect = updateDivWithBoxCoords.call(this,divRect, bc);
  divRectCandidate.divRect = updateDivWithBoxCoords.call(
    fileDisplayImage,
    divRect,
    bc
  );
}

function endRectangle(ev) {
  console.log('endRectangle');
  if (gCurrentState.mode !== gModeList.BUILDING_LINKBOX) {
    gCurrentState.abort = true;
    return;
  }

  // var bc = computeBoxCoords.call(this,divRectCandidate.startX, divRectCandidate.startY, ev.clientX, ev.clientY);
  // var bc = computeBoxCoords.call(this.getBoundingClientRect(),divRectCandidate.startX, divRectCandidate.startY, ev.clientX, ev.clientY);
  var fileDisplayImage = document.getElementById('fileDisplayImage');
  var bc = computeBoxCoords(
    fileDisplayImage.getBoundingClientRect(),
    divRectCandidate.startX,
    divRectCandidate.startY,
    ev.clientX,
    ev.clientY
  );

  if (bc.height() < 5 || bc.width() < 5) {
    gCurrentState.abort = true;
    return; // ignore small boxes
  }

  // var divRect = divRectCandidate.divRect;
  var divRect = divRectCandidate.divRect;

  var link = {};
  link.src = {
    xFactor: bc.xFactor,
    yFactor: bc.yFactor,
    widthFactor: bc.widthFactor,
    heightFactor: bc.heightFactor,
    boxId: divRect.id,
    srcScreenId: gProto.screenFiles[gActiveScreenId].fileMeta.idname
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
    gProto.screenFiles[gActiveScreenId].fileMeta.idname + '-thumb'
  );
  var tmDiv = updateDivWithBoxCoords.call(
    tm,
    document.createElement('div'),
    bc
  );
  tmDiv.id = divRect.id + '-thumb';

  tmDiv.classList.add('srclinkbox-tm');
  tm.parentNode.appendChild(tmDiv);

  link.src.tmBoxId = tmDiv.id;
  gProto.links[link.src.boxId] = link;
  gProto.mappings.screen2links[
    gProto.screenFiles[gActiveScreenId].fileMeta.idname
  ].push(link.src.boxId);
}

// ------- event listeners attach ------------------------------------

// menu
document
  .getElementsByClassName('barsIconWrapper')[0]
  .addEventListener('click', function(ev) {
    processEvent.call(this, ev, 'MENU_OPEN');
  });

var fileDisplay = document.getElementById('FileDisplay');
fileDisplay.addEventListener('mousemove', updateRectangle);
fileDisplay.addEventListener('mousedown', function(ev) {
  processEvent.call(this, ev, 'LINKBOX_START');
});
fileDisplay.addEventListener('mouseup', function(ev) {
  processEvent.call(this, ev, 'LINKBOX_COMPLETE');
});

// load screenfiles - menu option.  click to trigger input type=file element
// to get file select dialog box
document
  .getElementById('fileElemClicker')
  .addEventListener('click', function(ev) {
    document.getElementById('fileElem').click();
  });

document.getElementById('fileElem').addEventListener('change', function(ev) {
  processEvent.call(this, ev, 'FILES_LOAD');
});

document
  .getElementById('settingsDialogLink')
  .addEventListener('click', function(ev) {
    var dialogOverlay = document.getElementsByClassName('dialogOverlay')[0];
    dialogOverlay.style.display = 'block';
    var dialog = document.getElementById('SettingsDialog');
    dialog.style.display = 'block';

    document.getElementById('web-page-title').value =
      gProto.settings.downloadTitle;
    document.getElementById('web-page-filename').value =
      gProto.settings.downloadFilename;

    document
      .querySelector('#SettingsDialog .save')
      .addEventListener('click', function(ev) {
        dialog.style.display = 'none';
        dialogOverlay.style.display = 'none';
        gProto.settings.downloadTitle = document.getElementById(
          'web-page-title'
        ).value;
        gProto.settings.downloadFilename = document.getElementById(
          'web-page-filename'
        ).value;
        document.getElementById('downloadLink').download =
          gProto.settings.downloadFilename;
      });
    document
      .querySelector('#SettingsDialog .cancel')
      .addEventListener('click', function(ev) {
        dialog.style.display = 'none';
        dialogOverlay.style.display = 'none';
      });
  });

document
  .getElementById('aboutDialogLink')
  .addEventListener('click', function(ev) {
    var msg = `Prototypical version ${gProto.settings.versionData.version}, ${
      gProto.settings.versionData.date
    }

Quick tool to make interactive prototypes from images.

Prototypical will accept png images, whether from professional tools such as
Sketch or Photoshop, or hand-drawn.  Once loaded, you can go through each screen,
defining clickable areas that can be mapped to other screens.

Once all links have been setup, you can then download an html file into the
directory with your images, and run it locally in the browser.  In addition,
you can upload the html file to your server and have others try out your prototype.
  `;

    OkDialog(msg);
  });

var downloadLink = document.getElementById('downloadLink');
downloadLink.addEventListener('click', function(ev) {
  // error checks
  // console.log('download link - click');
  if (!gProto.settings.homeScreenFile) {
    OkDialog(
      'Oops.  Please set the home screen (double-click thumbnail) and then try again.'
    );
    ev.preventDefault();
    return;
  }
  this.href = buildOutputHTML();
});

// document.getElementById('setAsHomeLink').addEventListener('click', function(ev) {
//   setHome(this.parentNode.parentNode);  // set to the thumbnail item div container
// });

// document.getElementById('deleteScreenFileLink').addEventListener('click', function(ev) {
//   var thumbnailItem = this.parentNode.parentNode;
//   var thumbnailDiv = findDomNodeByClass(thumbnailItem, 'thumbnailDiv');
//   var img = findDomNodeByClass(thumbnailDiv, 'thumbnail');
//   delete gProto.screenFiles[img.fmIdName];
//   thumbnailItem.remove();
// });

document
  .getElementsByClassName('remove-link')[0]
  .addEventListener('click', function(ev) {
    processEvent.call(this, ev, 'LINKBOX_DELETE');
  });

// catch all so to speak.  Helps with the menu toggle off
document
  .getElementsByTagName('body')[0]
  .addEventListener('click', function(ev) {
    // console.log('body clicked');
    processEvent.call(this, ev, 'DEFAULT_RESUME');
  });

// ------- download  ------------------------------------
function buildLinkHandler(areaId, srcScreenId, targetScreenId) {
  var result =
    "document.getElementById('" + areaId + "').addEventListener('click',";
  result += 'function(ev) { ';
  result += 'ev.preventDefault();' + '\n';
  result +=
    "document.getElementById('" +
    srcScreenId +
    "').style.display = 'none';" +
    '\n';
  result +=
    "document.getElementById('" +
    targetScreenId +
    "').style.display = 'block';" +
    '\n';
  result += '});';
  result += '\n';
  return result;
}

function buildOutputHTML() {
  var titleHTML = '<title>' + gProto.settings.downloadTitle + '</title>' + '\n';
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

  var screenFiles = Object.keys(gProto.screenFiles);
  for (i = 0; i < screenFiles.length; i++) {
    var screenFileId = screenFiles[i];
    var screenFile = gProto.screenFiles[screenFileId];
    var mapName = screenFileId + '-map';

    var imgX = '<img';
    // <img srcset="dt-home.png, dt-home2x.png 2x" src="dt-home.png"
    // + 'dt-home.png, dt-home2x.png 2x'
    // TODO if retinaImage i.e. using multiple sets of images, based on adding 2x file
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
      screenFileId === gProto.settings.homeScreenFile
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

  //- var divSection = "<h1>Downloaded</h1>"+ "\n";
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
  // downloadLink.href = testData;
  return testData;
}

downloadLink.download = gProto.settings.downloadFilename;
