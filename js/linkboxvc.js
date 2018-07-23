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
