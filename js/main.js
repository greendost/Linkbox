/* main.js  */

// require ./commentary.js
// require ./model.js
// require ./util.js
// require ./screenfilevc.js
// require ./linkboxvc.js
// require ./exporter.js

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
    document.querySelector('#mainMenu').classList.add('is-open');
  } else {
    // else it is open, so close it
    // processEvent.call(this, ev, 'MENU_CLOSE');
    gCurrentState.abort = true;
  }
}

function closeMenu(ev) {
  this.classList.remove('menuEnabled');
  document.querySelector('#mainMenu').classList.remove('is-open');
}

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

function noOp() {} // mainly for atom styling bug ??

// --------------- App VC --------------------------
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

// ------- View - html/CSS + event listener logic to call mediator -------------
// ------- event listeners attach ------------------------------------

// menu
document
  .getElementsByClassName('barsButton')[0]
  .addEventListener('click', function(ev) {
    processEvent.call(this, ev, 'MENU_OPEN');
  });

// delete
// document
//   .getElementsByClassName('barsButton')[0]
//   .addEventListener('dblclick', function(ev) {
//     console.log('bars button doubleclick');
//     ev.preventDefault();
//   });

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

// menu function - probably extract and put with appVC
document
  .getElementById('settingsModalLink')
  .addEventListener('click', function(ev) {
    var dialogOverlay = document.getElementsByClassName('modal__background')[0];
    dialogOverlay.style.display = 'block';
    var dialog = document.getElementById('settingsModal');
    dialog.style.display = 'block';

    document.getElementById('web-page-title').value =
      gProto.settings.downloadTitle;
    document.getElementById('web-page-filename').value =
      gProto.settings.downloadFilename;

    document
      .querySelector('#settingsModal .save')
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
      .querySelector('#settingsModal .cancel')
      .addEventListener('click', function(ev) {
        dialog.style.display = 'none';
        dialogOverlay.style.display = 'none';
      });
  });

// menu function - probably extract and put with appVC
document
  .getElementById('aboutDialogLink')
  .addEventListener('click', function(ev) {
    var msgNode = document
      .getElementsByClassName('text-about')[0]
      .cloneNode(true);
    Array.prototype.slice
      .call(msgNode.getElementsByClassName('app-title'))
      .forEach(function(x) {
        x.innerHTML = gProto.settings.appTitle;
      });
    msgNode.getElementsByClassName('app-versionnumber')[0].innerHTML =
      gProto.settings.versionData.version;
    msgNode.getElementsByClassName('app-versiondate')[0].innerHTML =
      gProto.settings.versionData.date;
    OkDialog('About', msgNode);
  });

var downloadLink = document.getElementById('downloadLink');
downloadLink.addEventListener('click', function(ev) {
  // error checks
  // console.log('download link - click');
  if (!gProto.settings.homeScreenFile) {
    var msgNode = document.createElement('div');
    var paraNode = document.createElement('p');
    paraNode.innerHTML =
      'We need the home screen set; this option is available on the thumbnail menu';
    msgNode.appendChild(paraNode);
    OkDialog('Please review', msgNode);
    ev.preventDefault();
    return;
  }
  this.href = buildOutputHTML();
});

document
  .getElementsByClassName('remove-link')[0]
  .addEventListener('click', function(ev) {
    processEvent.call(this, ev, 'LINKBOX_DELETE');
  });

// catch all so to speak.  Helps with the menu toggle off
document
  .getElementsByTagName('body')[0]
  .addEventListener('click', function(ev) {
    console.log('body clicked');
    processEvent.call(this, ev, 'DEFAULT_RESUME');
  });

// final things
downloadLink.download = gProto.settings.downloadFilename;
