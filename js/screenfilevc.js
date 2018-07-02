// ------- screenfilevc.js -------------------------------------

function displayThumbnailMenu(ev) {
  var presentDialog = false;

  if (hasChildWithClass(this.parentNode, 'menu--thumbnailMenu')) {
    gCurrentState.abort = true;
    return;
  } else {
    // remove any other active thumbnail menu - should only be 1
    var dialogArray = Array.prototype.slice.call(
      document.querySelectorAll('.thumbnail menu--thumbnailMenu')
    );
    for (var i = 0; i < dialogArray.length; i++) {
      dialogArray[i].remove();
    }
    // and present this one
    var dialog = document
      .getElementsByClassName('menu--thumbnailMenu')[0]
      .cloneNode(true);
    var thumbnailSidePanel = this.parentNode;
    var thumbnail = thumbnailSidePanel.parentNode;
    thumbnailSidePanel.appendChild(dialog);

    var homeLink = findDomNodeByClass(dialog, 'setAsHomeLink');
    homeLink.addEventListener('click', function(ev) {
      setHome(thumbnail); // set to the thumbnail item div container
    });
    var deleteLink = findDomNodeByClass(dialog, 'deleteScreenFileLink');
    deleteLink.addEventListener('click', function(ev) {
      var thumbnailMain = findDomNodeByClass(thumbnail, 'thumbnail__main');
      var img = thumbnailMain.getElementsByTagName('img')[0];
      // delete gProto.screenFiles[img.fmIdName];
      // if (gProto.settings.homeScreenFile === img.fmIdName) {
      //   gProto.settings.homeScreenFile = '';
      // }
      gProto.removeScreenFile(img.fmIdName);

      // if screen file we are deleting is active, update view
      if (gActiveScreenId === img.fmIdName) {
        // for now, manually remove nodes.  better approach may be to re-render
        // from model
        var fileDisplayPanel = document.getElementById('FileDisplay');
        var fileDisplayImage = document.getElementById('fileDisplayImage');
        fileDisplayImage.src = '';
        [].slice
          .call(fileDisplay.getElementsByClassName('srclinkbox'))
          .forEach(function(x) {
            x.remove();
          });

        document.getElementById('screenFilenameStat').innerHTML = '';
      }

      thumbnail.remove();
    });
  }
}

function closeThumbnailMenu(ev) {
  // per s.o., event listeners should get removed too.
  findDomNodeByClass(this.parentNode, 'menu--thumbnailMenu').remove();
}

function setHome(thumbnailNode) {
  // remove old home
  if (gProto.settings.homeScreenFile) {
    document
      .getElementById(gProto.settings.homeScreenFile + '-homeIcon')
      .remove();
  }
  // setup new home
  var thumbnailMain = findDomNodeByClass(thumbnailNode, 'thumbnail__main');
  var img = thumbnailMain.getElementsByTagName('img')[0];
  // var img = findDomNodeByClass(thumbnailMain, 'thumbnail');
  gProto.settings.homeScreenFile = img.fmIdName;
  // var svgHomeDiv = document
  //   .getElementsByClassName('homeIcon')[0]
  //   .cloneNode(true);
  // svgHomeDiv.id = img.fmIdName + '-homeIcon';

  var svgHomeNode = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'svg'
  );
  var svgUseNode = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'use'
  );
  var origHomeSymbol = document.getElementById('svg-icon-home');
  // var home = origHomeSymbol.cloneNode(true);
  // home.id = '';
  // home.style.display = 'block';
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

function setupThumbnailsPanel() {
  var waitingTitle = document.getElementById('waitingTitle');
  waitingTitle.style.display = 'none';

  var screenThumbnailsPanel = document.getElementById('ScreenThumbnailsPanel');
  // remove all nodes, and recreate all screen thumbnails
  removeChildNodes(screenThumbnailsPanel);

  var thumbnailTemplate = document.getElementsByClassName('thumbnail')[0];
  Object.keys(gProto.screenFiles).forEach(function(x) {
    var screenFile = gProto.screenFiles[x];

    var thumbnail = thumbnailTemplate.cloneNode(true);
    var imgDiv = findDomNodeByClass(thumbnail, 'thumbnail__main');
    // var img = findDomNodeByClass(imgDiv, 'thumbnail');
    var img = imgDiv.getElementsByTagName('img')[0];
    var tbw = findDomNodeByClass(thumbnail, 'thumbnail__bottomWrap');
    var imgDesc = findDomNodeByClass(tbw, 'thumbnailDesc');
    var tsp = findDomNodeByClass(thumbnail, 'thumbnail__sidePanel');
    var cog = findDomNodeByClass(tsp, 'cogButton');

    // thumbnail menu
    cog.addEventListener('click', function(ev) {
      processEvent.call(this, ev, 'THUMBNAIL_MENU_OPEN');
    });

    img.id = screenFile.fileMeta.idname + '-thumb';
    img.fmIdName = screenFile.fileMeta.idname; // tie image back to gProto
    // img.addEventListener('click', function(ev) {
    imgDiv.addEventListener('click', function(ev) {
      console.log('img.fmIdName=' + img.fmIdName);
      // console.log(this.fmIdName + ' click');
      if (gCurrentState.mode !== gModeList.SELECTING_LINKBOX) {
        // selecting thumbnail to set screen to work on
        gActiveScreenId = screenFile.fileMeta.idname;
        // setupFileDisplayPanel.call(this);
        setupFileDisplayPanel.call(img);
      } // part of link construction - selecting thumbnail as the target
      else {
        // processEvent.call(this, ev, 'LINKBOX_FORMLINK');
        processEvent.call(img, ev, 'LINKBOX_FORMLINK');
      }
    });

    // img.addEventListener('dblclick', function() {
    //   setHome(this.parentNode.parentNode);
    // });

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
        tmDiv.classList.add('srclinkbox--tm');
        imgDiv.appendChild(tmDiv);
      });
    };

    screenThumbnailsPanel.appendChild(thumbnail);
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
