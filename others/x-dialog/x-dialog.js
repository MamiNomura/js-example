/**
 *
 * X-browser dialog methods.
 **/

YAHOO.namespace("convio.dialog");
YAHOO.convio.dialog = {

  // Used to maintain state across multiple dialogs.
  _dialogStack: [],

  /**
   * Opens an inline modal dialog.
   * 
   * @param url       The dialog url
   * @param listeners  The dialog listeners:
   *        listeners.argument - (object) optional arguments to pass to the listeners functions
   *        listeners.init     - (function) fired when the dialog is loaded
   *        listeners.validate   (function) validation listener for the dialog
   *        listeners.process  - (function) fired when the dialog is successfully submitted
   *        listeners.failure  - (function) fired if there is an error submitting the dialog
   *        listeners.destroy  - (function) fired during cleanup of dialog
   *        listeners.authenticate - (boolean) true to include an authentication check, otherwise false.
   *                                Defaults to false.
   *        listeners.destroy  - (function) fired during cleanup of dialog
   *        listeners.isReady  - (function) checks if the dialog is ready to submit/cancel
   *                                Returns true/false. Defaults to false.
   *        config   Optional dialog config
   */
  open: function(url, listeners, config) {
    if (!url) {
      alert("url is required");
      return;
    }

    listeners = listeners || {};
    listeners.authenticate = listeners.authenticate && YAHOO.convio.authenticator;

    config = config || {};
    
    // Show a temporary "Loading" window.
    this._loading();

    // Load the dialog contents.
    var doLoadDialog = {
      success : function(o) {

        // Fetch the title from the first <title></title> element.
        var title = YAHOO.convio.dialog._getTagContent(o.responseText, "title");
        if (title == null) {
          alert("Failed to fetch dialog title.");
        }

        // Fetch the body from the first <body></body> element.
        var body = YAHOO.convio.dialog._getTagContent(o.responseText, "body");
        if (body == null) {
          body = o.responseText;
        }

        // Default inline listeners.
        try {
          listeners.init = listeners.init || YAHOO.convio.dialog._getTagFunction(o.responseText, "init", "dialogArguments");
          listeners.validate = listeners.validate || YAHOO.convio.dialog._getTagFunction(o.responseText, "validate", "dialogArguments");
          listeners.process = listeners.process || YAHOO.convio.dialog._getTagFunction(o.responseText, "process", "response");
          listeners.destroy = listeners.destroy || YAHOO.convio.dialog._getTagFunction(o.responseText, "destroy", "dialogArguments");
        } catch (err) {
          throw err;
        } finally {
          YAHOO.convio.dialog.wait.hide();
        }

        YAHOO.convio.dialog._newDialog(title, body, listeners, config);
      },
      
      failure : function(o) {
        YAHOO.convio.dialog.wait.hide();

        YAHOO.convio.dialog.showAlert({
            title: "Sorry, An Error Occurred",
            msg: o.statusText + " [" + o.status + "]"
          });
      },

      cache : false
    };

    if (listeners.authenticate) {
      // Make sure user is authenticated before loading dialog.
      YAHOO.convio.authenticator.connect("GET", url, doLoadDialog);
    } else {
      YAHOO.util.Connect.asyncRequest("GET", url, doLoadDialog);
    }
  },

  /**
   * Fetches the form data associated with the current dialog.
   *
   * @return the form data, possibly null
   */
  getArgs: function() {
    var dialog = YAHOO.convio.dialog._getDialog();
    return (dialog && dialog.callback) ? dialog.callback.argument : null;
  },

  /**
   * Fetches the form data associated with the current dialog.
   *
   * @return the form data, possibly null
   */
  getFormData: function() {
    var dialog = YAHOO.convio.dialog._getDialog();
    return (dialog ? dialog.getData() : null);
  },

  /**
   * Fetches the form element associated with the current dialog.
   *
   * @return the form node, possibly null
   */
  getForm : function() {
    var dialog = YAHOO.convio.dialog._getDialog();
    return (dialog ? dialog.form : null);
  },

  /**
   * Fetches the form data associated with the current dialog.
   *
   * @return the form data, possibly null
   */
  getID : function() {
    var reg = YAHOO.convio.dialog._getRegistry();
    return (reg ? reg.id : null);
  },

  /**
   * Fetches the buttons associated with the current dialog.
   *
   * @return the buttons array, possibly null
   */
  getButtons : function() {
    var dialog = YAHOO.convio.dialog._getDialog();
    return (dialog ? dialog.getButtons() : null);
  },

  /**
   * Adds an error to the dialog. Use this during validation.
   *
   * e.g., 
   *  YAHOO.convio.dialog.addError("name", "Name is required");
   *  YAHOO.convio.dialog.addError("Username or email is required");
   *
   * @param id  The element ID where the error message should be displayed
   * @param msg The error message
   */
  addError : function(id, msg) {
    if (! msg) {
      msg = id;
      id = "";
    }

    var errors = YAHOO.convio.dialog._getErrors();
    if (errors == null) {
      errors = new Array();
    }
    errors.push({
        id : id,
        msg : msg
      });
  },

  /**
   * Registers a post-process listener. 
   * Post-process listeners are fired in the calling scope AFTER the dialog is closed.
   * 
   *
   * @param fn A post-process listener.
   */
  addPostProcessListener : function(fn) {
    var registry = YAHOO.convio.dialog._getRegistry();
    if (registry && registry.listeners) {
      registry.listeners.postProcess = fn;
    }
  },

  /**
   * Redraws the dialog.
   * Workaround needed for BZ 44536.
   */
  redraw : function() {
    var dialog = YAHOO.convio.dialog._getDialog();
    if (dialog) {
      dialog.hide();
      dialog.show();
    }
  },

  /**
   * Centers the dialog.
   */
  center: function() {
    var dialog = YAHOO.convio.dialog._getDialog();
    if (dialog) {
      dialog.center();
    }
  },

  /**
   * Registers the dialog.
   */
  _register : function(id, dialog, listeners) {
    YAHOO.convio.dialog._dialogStack.push({
        id: id,
        dialog: dialog,
        listeners: listeners,
        errors: []
      });
  },

  /**
   * Fetches the current dialog registry.
   */
  _getRegistry : function() {
    var registry = null;
    if (YAHOO.convio.dialog._dialogStack.length > 0) {
      registry = YAHOO.convio.dialog._dialogStack[YAHOO.convio.dialog._dialogStack.length-1];
    }
    return registry;
  },

  /**
   * Fetches the current dialog.
   */
  _getDialog : function() {
    var registry = YAHOO.convio.dialog._getRegistry();
    return (registry ? registry.dialog : null);
  },

  /**
   * Shows a temporary "Loading" window.
   */
  _loading : function(msg) {

    var msg = msg || "Loading, please wait...";

    if (!YAHOO.convio.dialog.wait) {
      YAHOO.convio.dialog.wait = new YAHOO.widget.Panel("wait",  
                                                        { width: "240px", 
                                                          fixedcenter: true, 
                                                          close: false, 
                                                          draggable: false, 
                                                          zindex:350000,
                                                          modal: true,
                                                          visible: false
                                                        });

      YAHOO.convio.dialog.wait.setHeader(msg);
      YAHOO.convio.dialog.wait.setBody('<img src="/components/x-dialog/loading.gif" />');
      YAHOO.convio.dialog.wait.render(document.body);
    }

    YAHOO.convio.dialog.wait.setHeader(msg);
    YAHOO.convio.dialog.wait.show();
  },

  /**
   * Parses the tag contents from a larger block of text.
   */
  _getTagContent : function(text, name) {

    var startTag = "<" + name + ">";
    var endTag = "</" + name + ">";
    var tagLength = startTag.length;

    // Fetch the title from the first <tag></tag> element.
    var tagContent = null;
    var start = text.indexOf(startTag);
    var end = text.indexOf(endTag);
    if (start >= 0 && end > start) {
      tagContent = text.substring(start + tagLength, end);
    }

    return tagContent;
  },

  /**
   * Parses the tag contents from a larger block of text into a one-arg function.
   */
  _getTagFunction : function(text, name, argName) {
    var tagFn = null;
    var tagScript = YAHOO.convio.dialog._getTagContent(text, name);
    if (tagScript != null) {
      try {
        tagFn = new Function(argName, tagScript);
      } catch (err) {
        alert("Failed to compile the " + name + " script.");
        throw err;
      }
    }
    return tagFn;
  },

  /**
   * Instantiates, registers, and opens the new dialog.
   */
  _newDialog : function(title, body, listeners, config) {
    // Set listeners defaults.
    listeners = listeners || {};
    listeners.argument = listeners.argument || {};
    listeners.init = listeners.init || null;
    listeners.validate = listeners.validate || null;
    listeners.process = listeners.process || null;
    listeners.postProcess = null;
    listeners.destroy = listeners.destroy || null;
    listeners.failure = listeners.failure || function(o) {
      alert("Submission failed: " + o.status);
    };
    listeners.isReady = listeners.isReady || function() {
      return true;
    };


    config = config || {};
    config.width = config.width || null;
    config.height = config.height || null;

    // Configure buttons.
    if (! config.buttons) {
      config.buttons = [{ text:"OK", handler:YAHOO.convio.dialog.submit, isDefault:true },
                        { text:"Cancel", handler:YAHOO.convio.dialog.cancel }];
    }

    // Instantiate the YUI Dialog.
    var dialogID = "xDialog" + new Date().getTime();
    var dialog = new YAHOO.widget.Dialog(dialogID,
      { postmethod : 'async',
        visible : false, 
        modal : true,
        constraintoviewport : true,
        buttons : config.buttons,
        width : config.width,
        height : config.height
      });

    // Add a errors header placeholder if none exists.
    if (! body.match(/id=\"convioErrors\"/)) {
      body = "<div class=\"convioErrorsMain\" id=\"convioErrors\" style=\"display:none;\"></div>\n" + body;
    }

    // Replace dialogID placeholders.
    body = body.replace(/[\$]dialogID/g, dialogID);

    // Make all inline error placeholders unique to this dialog.
    body = body.replace(/id=\"convioErrors([^\"]+)\"/g, 
                        "id=\"convioErrors-" + dialogID + "$1\"");
    body = body.replace(/id=\"convioErrors\"/g, 
                        "id=\"convioErrors-" + dialogID + "\"");

    // Dialog contents.
    dialog.setHeader(title);
    dialog.setBody(body);

    if (config.buttons.length == 0) {
      dialog.setFooter("");
    }

    // Dialog callbacks: success and failure handlers.
    dialog.callback = {
      success : function(o) {
        YAHOO.convio.dialog._callAndDestroy(listeners.process, o);
      },
      upload : function(o) {
        YAHOO.convio.dialog._callAndDestroy(listeners.process, o);
      },
      failure : function(o) {
        if (listeners.authenticate) {
          switch (o.status) {
          case 401:
            YAHOO.convio.authenticator.doAuthenticate();
            return;
          case 403:
            YAHOO.convio.authenticator.doForbidden();
            return;
          default:
            YAHOO.convio.dialog._callAndDestroy(listeners.failure, o);
          }
        }
      },
      argument : listeners.argument,
      authenticate : listeners.authenticate, // Custom hook for dialog authenticator.
      timeout : 10000,
      cache : false
    };

    if (listeners.validate) {
      dialog.validate = function() {

        YAHOO.convio.dialog._clearErrors();

        listeners.validate(listeners.argument);

        var isValid = true;
        var errors = YAHOO.convio.dialog._getErrors();

        if (errors && errors.length > 0) {
          // There were form errors.
          isValid = false;
          YAHOO.convio.dialog.wait.hide();
          YAHOO.convio.dialog._displayErrors();
        }

        return isValid;
      };
    }

    // Register the dialog.
    YAHOO.convio.dialog._register(dialogID, dialog, listeners);

    // Hide the loading window.
    YAHOO.convio.dialog.wait.hide();

    // BZ 50337: Make sure scrolling is added to the parent document
    //           just in case the dialog is too large to fit on screen.
    //           Restore the original overflow style when the dialog is closed.
    // Note: This does not work in IE if scrolling is disabled.
    if (YAHOO.convio.dialog._dialogStack.length == 1) {
      var el = document.body;
      var ogOverflowStyle = YAHOO.util.Dom.getStyle(el, "overflow") || "";
      dialog.beforeRenderEvent.subscribe(function() {
          YAHOO.util.Dom.setStyle(el, "overflow", "auto");
        });
      dialog.destroyEvent.subscribe(function() {
          YAHOO.util.Dom.setStyle(el, "overflow", ogOverflowStyle);
        });
    }

    // Render the dialog.
    dialog.render(document.body);

    // BZ 42979 - Hack the YUI dialog default behavior.
    //            Make the dialog close (X) button the same as the cancel button.
    //            This should happen after the dialog is rendered but before it is
    //            visible.
    var dialogEl = document.getElementById(dialogID);
    var closeButtons = YAHOO.util.Dom.getElementsByClassName("container-close", "a", dialogEl);
    for (var i=0; i<closeButtons.length; i++) {
      YAHOO.util.Event.removeListener(closeButtons[i], "click");
      YAHOO.util.Event.addListener(closeButtons[i], "click", function(e, o) {
          YAHOO.convio.dialog.cancel();
        });
    }

    dialog.show();
    dialog.center();
    dialog.focusFirst();

    // Fix action-less forms.
    if (dialog.form && dialog.form.action == "") {
      dialog.form.action = "/components/x-dialog/post.jsp";
    }

    // Fire the onload handler.
    if (listeners.init) {
      listeners.init(listeners.argument);
    }
  },

  /**
   * Submits the dialog.
   */
  submit : function() {
    var dialog = YAHOO.convio.dialog._getDialog();
    if (dialog) {

      var listeners = YAHOO.convio.dialog._getRegistry().listeners;
      if (! listeners.isReady()) {
        return;
      }

      // Processing keeps dialog modal just in case processing takes awhile.
      YAHOO.convio.dialog._loading("Processing, please wait...");

      if (dialog.callback && dialog.callback.authenticate) {
        YAHOO.convio.authenticator.requireAuth(function() {
            dialog.submit();
          });
      } else {
        dialog.submit();
      }
    }
  },

  /**
   * Cancels the dialog.
   */
  cancel : function() {
    var dialog = YAHOO.convio.dialog._getDialog();
    if (dialog) {
      var listeners = YAHOO.convio.dialog._getRegistry().listeners;
      if (! listeners.isReady()) {
        return;
      }

      dialog.cancel();
      YAHOO.convio.dialog._destroy();
    }
  },

  /**
   * Hides the current dialog (and the "wait" dialog), so it doesn't confuse TinyMCE on IE8
   */
  _hide: function() {
    var registry = YAHOO.convio.dialog._getRegistry();
    if (!registry) {
      return;
    }
    registry.dialog.hide();
    YAHOO.convio.dialog.wait.hide();
  },

  /**
   * Destroys the current dialog and cleans up any remaining state.
   */
  _destroy : function() {
    var registry = YAHOO.convio.dialog._getRegistry();
    if (! registry) {
      return;
    }

    var args = YAHOO.convio.dialog.getArgs();

    var destroyListener = registry.listeners.destroy;
    try {
      if (destroyListener != null) {
        destroyListener(args);
      }
    } finally {
      registry = YAHOO.convio.dialog._dialogStack.pop();
      registry.dialog.destroy();
    }
  },

  /**
   * Call the function and then destroy the dialog.
   */
  _callAndDestroy : function(fn, o) {
    var registry = YAHOO.convio.dialog._getRegistry();
    if (! registry) {
      return;
    }

    var error = null;
     try {
      if (fn != null) { 
        fn(o);
      }
    } catch (e) {
      error = e;
    } finally {
      // Destroy the dialog after the callback has returned.
      YAHOO.convio.dialog._destroy();

      YAHOO.convio.dialog.wait.hide();

      // Rethrow any caught exceptions.
      if (error != null) {
        // Some debuggers will point to this part of the code if an exception is 
        // generated from the try {} block. To locate the root cause of the exception, 
        // remove the try/catch/finally skeleton.
        // http://blog.hackedbrain.com/archive/2009/03/27/6165.aspx
        throw error;
      }
    }

    // Fire post-process listener in parent scope.
    var postProcessListener = registry.listeners.postProcess;
    if (postProcessListener != null) {
      postProcessListener();
    }
  },

  /**
   * Fetches the error map.
   */
  _getErrors : function() {
    var registry = YAHOO.convio.dialog._getRegistry();
    return registry ? registry.errors : null;
  },

  /**
   * Display any errors messages.
   */
  _displayErrors : function() {

    var dialogID = YAHOO.convio.dialog._getRegistry().id;
    var errors = YAHOO.convio.dialog._getErrors();

    var generalErrorMsg = "There was a problem with your submission.";
    for (var i=0; i<errors.length; i++) {

      var msg = "";
      var id = errors[i].id;
      if (id == null || id == "") {
        generalErrorMsg += " " + errors[i].msg;

      } else {
        id = "convioErrors-" + dialogID + "-" + id;
        msg = errors[i].msg;

        var errNode = document.getElementById(id);
        if (errNode) {
          errNode.style.display = '';
          errNode.innerHTML = "<span class=\"convioError\">" + msg + "</span>";
        }
      }
    }

    // Display general errors.
    var errNode = document.getElementById("convioErrors-" + dialogID);
    errNode.style.display = '';
    errNode.innerHTML = generalErrorMsg;

    YAHOO.convio.dialog.redraw();
  },

  /**
   * Clears the error messages.
   */
  _clearErrors : function() {
    var dialogID = YAHOO.convio.dialog._getRegistry().id;
    var errors = YAHOO.convio.dialog._getErrors();
    for (var i=0; i<errors.length; i++) {
      var id = errors[i].id;
      if (id == null || id == "") {
        id = "convioErrors-" + dialogID;
      } else {
        id = "convioErrors-" + dialogID + "-" + id;
      }

      var errNode = document.getElementById(id);
      if (errNode) {
        errNode.innerHTML = "";
        errNode.style.display = 'none';
      }
    }

    var defaultErrNode = document.getElementById("convioErrors-" + dialogID);
    defaultErrNode.innerHTML = "";
    defaultErrNode.style.display = 'none';

    YAHOO.convio.dialog._getRegistry().errors = new Array();
  },


  /**
   * Pops open a new modal dialog window. This is intended for legacy dialog support.
   *
   * @param windowProperties  window properties (url, authenticate, height, width).
   * @param dialogParams      optional dialog parameters
   * @param callbackFn        callback function fired when the dialog is closed
   */
  popup : function(windowProperties, dialogParams, callbackFn) {
    windowProperties.authenticate = windowProperties.authenticate || YAHOO.convio.authenticator;

    if (windowProperties && windowProperties.authenticate) {
      YAHOO.convio.authenticator.requireAuth(function() {
          var result = CmsXBrowser.showDialog(windowProperties, dialogParams);
          if (callbackFn) {
            callbackFn(result);
          }
        });

    } else {

      var result = CmsXBrowser.showDialog(windowProperties, dialogParams);
      if (callbackFn) {
        callbackFn(result);
      }
    }
  },

  /**
   * Pops open an error dialog.
   *
   * @param o        The error dialog configuration
   *        o.msg    The error title
   *        o.detail The error details (e.g., stack trace)
   *        o.showDetail flag indicating whether to display the detailed message as the body or the hidden body
   *                      of the error dialog.
   */
  showError: function(o) {

    var DEFAULT_TEXT = "An unexpected error occurred while saving your changes. " +
      "Please try again.  If the problem persists, contact technical support for help. ";

    o = o || {};
    o.msg = o.msg || "Sorry, An Error Occurred";
    o.detail = o.detail || "No details available.";
    o.showDetail = (o.showDetail !== false); // defaults to true.

    var handleCancel = function() {
      this.cancel();
      this.destroy();
    };
    
    var toggleDetails = function() {
      var button = this.getButtons()[0];
      
      var originalLabel = button.get("label");
      if (originalLabel == "Show Details") {
        // Hide details.
        button.set("label", "Hide Details");
        this.setBody(DEFAULT_TEXT + "<p />Details:<div class=\"errorDetail\" style=\"overflow:scroll;position:relative;height:200px;width:470px;border:2px white inset;background-color:white;white-space:pre;padding:6px;font-family:monospace;font-size:x-small\">" + o.detail + "</div>");
      } else {
        // Show details.
        button.set("label", "Show Details");
        this.setBody(DEFAULT_TEXT);
      }
    };

    var buttons = null;
    if (o.showDetail) {
      buttons = [{ text:"Show Details", handler:toggleDetails },
                 { text:"OK", handler:handleCancel, isDefault:true }];
    } else {
      buttons = [{ text:"OK", handler:handleCancel, isDefault:true }];
    }

    var dialogID = "errorDialog-" + new Date().getTime();
    var dialog = new YAHOO.widget.Dialog(dialogID, {
        fixedcenter: true,
        visible: false, 
        modal: true,
        constraintoviewport: true,
        width: '500px',
        buttons: buttons
      });

    dialog.setHeader(o.msg);

    if (o.showDetail) {
      dialog.setBody(DEFAULT_TEXT);
    } else {
      dialog.setBody(o.detail);
    }

    dialog.render(document.body);
    dialog.show();
  },

  /**
   * Pops open an error dialog.
   *
   * @param o         The error dialog configuration
   *        o.msg     The error title
   *        o.process The callback Fn (no args)
   */
  showAlert: function(o) {

    o = o || {};
    o.title = o.title || "Alert";
    o.msg = o.msg || "Sorry, An Error Occurred";
    o.process = o.process || null;
    o.width = o.width || '300px';

    var doProcess = function() {
      this.cancel();
      this.destroy();

      if (o.process) {
        try {
          o.process();
        } catch (err) {
          // Do nothing.
        }
      }
    };
    
    var dialogID = "alertDialog-" + new Date().getTime();
    var dialog = new YAHOO.widget.SimpleDialog(dialogID, {
        width: o.width,
        fixedcenter: true,
        visible: false, 
        draggable: false,
        close: false,
        modal: true,
        text: o.msg,
        icon: YAHOO.widget.SimpleDialog.ICON_INFO,
        constraintoviewport: true,
        buttons: [{ text:"OK", handler:doProcess, isDefault:true }]
      });

    dialog.setHeader(o.title);
    dialog.render(document.body);
    dialog.show();
  },

  /**
   * Pops open an warning dialog.
   *
   * @param o         The error dialog configuration
   *        o.msg     The error title
   *        o.process The callback Fn (no args)
   */
  showWarning: function(o) {

    o = o || {};
    o.title = o.title || "Warning";
    o.msg = o.msg || "Do you want to continue?";
    o.process = o.process || null;

    var handleNo = function() {
      this.cancel();
      this.destroy();
    };

    var handleYes = function() {
      this.cancel();
      this.destroy();

      if (o.process) {
        try {
          o.process();
        } catch (err) {
          // Do nothing.
        }
      }
    };
    
    var dialogID = "warningDialog-" + new Date().getTime();
    var dialog = new YAHOO.widget.SimpleDialog(dialogID, {
        width: '300px',
        fixedcenter: true,
        visible: false, 
        draggable: false,
        close: false,
        modal: true,
        text: o.msg,
        icon: YAHOO.widget.SimpleDialog.ICON_WARN,
        constraintoviewport: true,
        buttons: [ {text:"Yes", handler:handleYes}, 
                   {text:"No",  handler:handleNo, isDefault:true} ] 
      });

    dialog.setHeader(o.title);
    dialog.render(document.body);
    dialog.show();
  }


};
