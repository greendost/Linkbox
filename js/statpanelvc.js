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
