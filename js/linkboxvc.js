// --------- linkboxvc.js ----------------------------------

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

function addTargetToLinkbox(ev) {
  // update selected link(s) with target
  var targetScreenId = this.fmIdName; // TODO - do I need this line?
  console.log('addTargetToLinkbox: ' + targetScreenId);

  Object.keys(gSelectedLinks).forEach(function(x) {
    gProto.links[x].tgt.targetId = targetScreenId;
  });

  // now unselect links
  processEvent.call(gCurrentState.context, ev, 'LINKBOX_UNSELECT');
  // unselectLinkbox.call(gCurrentState.context, ev); // TODO
}

function selectLinkbox(ev) {
  // unselect any selected links
  if (this.classList.contains('srclinkbox--selected')) {
    processEvent.call(this, ev, 'LINKBOX_UNSELECT');
  } else {
    // update model - unselect links
    gSelectedLinks = {};

    // update view
    var linkBoxesDom = document.getElementsByClassName('srclinkbox--selected');
    for (var i = 0; i < linkBoxesDom.length; i++) {
      linkBoxesDom[i].classList.remove('srclinkbox--selected');
    }
    // then select this
    this.classList.add('srclinkbox--selected');
    gSelectedLinks[this.id] = true;

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
}

function unselectLinkbox(ev) {
  gSelectedLinks = {};

  this.classList.remove('srclinkbox--selected');
  document
    .getElementById('ScreenThumbnailsPanel')
    .classList.remove('is-selectable-for-target');
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
  // console.log('startRectangle');
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

  tmDiv.classList.add('srclinkbox--tm');
  tm.parentNode.appendChild(tmDiv);

  link.src.tmBoxId = tmDiv.id;
  gProto.links[link.src.boxId] = link;
  gProto.mappings.screen2links[
    gProto.screenFiles[gActiveScreenId].fileMeta.idname
  ].push(link.src.boxId);
}
