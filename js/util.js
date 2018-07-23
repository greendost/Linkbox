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
