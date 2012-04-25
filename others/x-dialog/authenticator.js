/**
 * $Source: /home/cvs/cvsroot/cms/integration/web/components/x-dialog/authenticator.js,v $
 * $Author: mpih $
 * $Revision: 1.2 $
 * $Date: 2009/08/08 00:20:40 $
 *
 * Authenticator.
 **/

YAHOO.namespace("convio.authenticator");
YAHOO.convio.authenticator = {

  isInitialized : false,
  checkUrl : null,
  doAuthenticate : null,
  doForbidden : null,

  /**
   * Initializes the authenticator.
   *
   * @param config.checkUrl       The URL that performs the authentication check.
   * @param config.doAuthenticate Listener fired when the user is not authenticated. 
   *                                Intended to authenticate the user.
   */
  init : function(config) {
    if (config && config.checkUrl && config.doAuthenticate && config.doForbidden) {
      this.checkUrl = config.checkUrl;
      this.doAuthenticate = config.doAuthenticate;
      this.doForbidden = config.doForbidden;
      this.isInitialized = true;
    } else {
      alert("Failed to initialize authenticator: checkUrl/authenticate are required.");
      return;
    }
  },

  /**
   * Makes sure the user is authenticated before making a YUI AJAX call.
   *
   * @param method   The method
   * @param url      The URL
   * @param callback The callback
   */
  connect : function(method, url, callback) {
    this.requireAuth(function() {
        YAHOO.util.Connect.asyncRequest(method, url, callback);
      });
  },

  /**
   * Makes sure the user is authenticated before making the function call.
   *
   * @param fn The function to call if the user is authenticated
   */
  requireAuth : function(fn) {
    if (! this.isInitialized) {
      alert("Authenticator has not been initialized.");
      return;
    }

    var th = this;

    var checkCallback = {
      cache : false,

      success : function(r) {
        try {
          var response = YAHOO.lang.JSON.parse(r.responseText);
        } catch (e) {
          if (YAHOO.convio.dialog.wait) {
            YAHOO.convio.dialog.wait.hide();
          }
          alert("Invalid authentication check response: " + r.responseText);
          return;
        }

        if (response.resultCode == "authenticated") {
          // Authenticated. Continue with original operation.

          fn();

        } else {
          // Not authenticated. Fire authentication listener.

          if (YAHOO.convio.dialog.wait) {
            YAHOO.convio.dialog.wait.hide();
          }

          th.doAuthenticate();
        }
      },

      failure : function(r) {
        if (YAHOO.convio.dialog.wait) {
          YAHOO.convio.dialog.wait.hide();
        }
        alert("Authentication check failed: " + r.status);
      }
    };

    YAHOO.util.Connect.asyncRequest("GET", this.checkUrl, checkCallback);
  }

};
