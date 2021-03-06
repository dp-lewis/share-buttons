/*jslint browser: true*/
/*global CustomEvent*/
var mergeobjects = require('./util/mergeobjects.js');

// polyfill custom events
if (!window.CustomEvent) {
  (function () {
    function CustomEvent(event, params) {
      var evt;
      if (document.createEvent) {
        params = params || { bubbles: false, cancelable: false, detail: undefined };
        evt = document.createEvent('CustomEvent');
        evt.initCustomEvent(event, params.bubbles, params.cancelable, params.detail);
      }
      return evt;
    }

    CustomEvent.prototype = window.Event.prototype;
    window.CustomEvent = CustomEvent;
  }());
}

function basicProviderVerification(button, id) {
  var returnVal = false;
  if (button.hostname.indexOf(id) !== -1) {
    returnVal = true;
  }
  return returnVal;
}

var Sharebuttons = function (options) {
  this.settings = mergeobjects(this.defaults, options || {});
  this.providers = [];
};

Sharebuttons.prototype = {

  defaults: {
    'selector': '[data-sharebutton]', // default selector to use to get the links
    'loadedClass': 'is-loaded', // class applied to the share button once the count is fetched
    'countSelector': '[data-sharecount]', // selector for the child element that contains the count number
    'newWindow': true, // determines whether a new window should be opened
    'newWindowSettings': 'width=520,height=420,resizable=yes,scrollbars=yes', // settings passed to window.open
    'newWindowName': 'sharebuttons', // name given to window.open
    'defaultProviderId': 'unknown', // if there is no provider plugin, the ID will default to this
    'onShare': function () { return; } // This callback is dispatched after a share button is clicked on
  },

  init: function () {
    this.prepButtons(document.querySelectorAll(this.settings.selector), this.providers);
    return this;
  },

  updateSettings: function (options) {
    this.settings = mergeobjects(this.defaults, options || {});
  },

  addProviders: function (providers) {
    var i;
    for (i = 0; i < providers.length; i = i + 1) {
      this.providers.push(providers[i]);
    }
  },

  jsonp: require('./util/jsonp.js'),

  urlParams: require('./util/urlvars.js'),

  prepButtons: function (buttons, providers) {
    var i;
    // loop through buttons and update the DOM with provider info
    for (i = 0; i < buttons.length; i = i + 1) {
      this.updateDOM(buttons[i], this.findProvider(buttons[i], providers));
    }
  },

  findProvider: function (button, providers) {
    var i, validProvider;

    // loop through the providers and see if the button matches any of them
    for (i = 0; i < providers.length; i = i + 1) {
      if ((providers[i].neededBy && providers[i].neededBy(button)) || (providers[i].id && basicProviderVerification(button, providers[i].id))) {
        validProvider = providers[i];
      }
    }

    return validProvider;
  },

  updateDOM: function (button, provider) {
    var that = this;

    this.bindEvent(button, provider);

    // only fetch the count if there's a dom element for it to go in
    if (button.querySelector(that.settings.countSelector)) {
      provider.fetchCount(button, function (count) {
        that.insertCount(button, count);

        if (button.dispatchEvent) {
          button.dispatchEvent(new CustomEvent('shareCountLoaded'));
        }
      });
    }
  },

  bindEvent: function (button, provider) {
    var that = this;
    if (button.addEventListener) {
      button.addEventListener('click', function (ev) {
        // if we're opening a new window then cancel default behaviour
        // but we'll let IE8 fallback to a default link
        if (that.settings.newWindow === true && ev.preventDefault) {
          ev.preventDefault();
          ev.stopPropagation();

          window.open(ev.currentTarget.href, that.settings.newWindowName, that.settings.newWindowSettings);

          // if there's a callback for sharing trigger it with some data
          that.settings.onShare({
            provider: provider ? provider.id : that.settings.defaultProviderId
          });
        } // end if newWindow
      }, false);
    }
  },

  insertCount: function (button, number) {
    button.querySelector(this.settings.countSelector).innerHTML = number;
    button.className += ' ' + this.settings.loadedClass;
  }
};

module.exports = Sharebuttons;
