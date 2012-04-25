/**
 *
 * Handles presentation of pagelet blocks within the editor. Depends on the convio noneditable plugin.
 *
 * In WYISWYG mode:
 *   Pagelet blocks contain their noneditable preview content. Pagelet preview content
 *   is loaded via an AJAX call. Any inline parent elements are split when rendering the 
 *   preview content.
 *
 * In source mode:
 *   The preview content is backed-up in an array to avoid extra AJAX requests when switching
 *   back to WYSIWYG mode.
 */

var CmsPageletPlugin = {

  /**
   * Returns information about the plugin as a name/value array.
   * The current keys are longname, author, authorurl, infourl and version.
   *
   * @return {Object} Name/value array containing information about the plugin.
   */
  getInfo : function() {
    return {
      longname : 'CMS Pagelet plugin',
      author : 'Michael Pih (mpih@convio.com)',
      authorurl : 'http://www.convio.com',
      infourl : 'http://twiki.convio.com/twiki/bin/view/Engineering/CmsMcePlugins',
      version : "1.0"
    };
  },

  /**
   * Creates control instances based in the incomming name. This method is normally not
   * needed since the addButton method of the tinymce.Editor class is a more easy way of adding buttons
   * but you sometimes need to create more complex controls like listboxes, split buttons etc then this
   * method can be used to create those.
   *
   * @param {String} n Name of the control to create.
   * @param {tinymce.ControlManager} cm Control manager to use inorder to create new control.
   * @return {tinymce.ui.Control} New control instance or null if no control was created.
   */
  createControl : function(n, cm) {
    return null;
  },

  /**
   * Initializes the plugin, this will be executed after the plugin has been created.
   * This call is done before the editor instance has finished it's initialization so use the onInit event
   * of the editor instance to intercept that event.
   *
   * @param {tinymce.Editor} ed Editor instance that the plugin is initialized in.
   * @param {string} url Absolute URL to where the plugin is located.
   */
  init : function(ed, url) {
    var th = this;
    
    this._url = url;
    
    // An associative array used to cache the preview content of a pagelet node.
    this._pageletSrcArray = [];

    // An associative array used to cache pagelet type registry.
    this._pageletTypeArray = [];

    // Maintains state indicating whether editor is in "visual aid" mode or not.
    this._doVisualAid = true;

    // Used by keyDown and keyPress event handlers.
    this._keyToCancel = null;

    // Register editor commands (API).
    ed.addCommand('pageletShowInsertDialog', function() {
        th.showInsertDialog(ed);
      });
    ed.addCommand('pageletShowAdminDialog', function(node) {
        th.showAdminDialog(ed, node);
      });
    ed.addCommand('pageletPreview', function(node) {
        th.preview(ed, node);
      });
    ed.addCommand('pageletInsert', function(node, type) {
        th.insert(ed, node, type);
      });
    ed.addCommand('pageletInitContextMenu', function(node, menu) {
        th.initContextMenu(node, menu);
      });

    // Register insert pagelet button
    ed.addButton('cms_pagelet', {
        title : 'pagelet.desc',
          cmd : 'pageletShowInsertDialog',
          image : url + '/pagelet.gif'
          });

    // Pre-loads necessary JS and CSS.
    ed.onInit.add(this.handleEditorInit, this);

    // Changes in-editor styles when toggling visual aid mode.
    ed.onVisualAid.add(this.handleVisualAid, this);

    // Handles serialization/de-serialization of pagelet nodes when toggling
    // between preview and source modes.
    ed.onBeforeSetContent.add(this.handleBeforeSetContent, this);
    ed.onSetContent.add(this.handleAfterSetContent, this);
    ed.onBeforeGetContent.add(this.handleBeforeGetContent, this);
    ed.onGetContent.add(this.handleAfterGetContent, this);

    // Prevents inline edits of pagelet content and intercept/redirect specific commands.
    ed.onKeyDown.add(this.handleKeyDown, this);
    ed.onKeyPress.add(this.handleKeyPress, this);

    // Refresh dynamic preview after a paste command.
    //
    // Note: According to TinyMCE source, supposedly this event is 
    //       not supported in all the browsers. I tested this in IE8,FF7 w/o issues. 
    ed.onPaste.add(function(ed, ev) {
      // Add 10ms delay to get a true afterPaste handler.
      window.setTimeout(function() {
        if (MceUtils.containsPageletNode(ed.getBody())) {
          th._collapsePreviewContent(ed);
          th._expandPreviewContent(ed);
        }
      }, 10);
    });

    // Prevents clicking of content within a pagelet node.
    ed.onClick.add(this.handleOnClick, this);
  },

  /**
   * Pops open a modal dialog to insert a new pagelet.
   * After the pagelet selected, the dialog is closed, the pagelet preview content is reloaded.
   * If the pagelet has an admin dialog, it is opened.
   *
   * @param editor The editor
   */
  showInsertDialog : function(editor) {

    var folderID = editor.getParam('cmsFolderID');
    var itemID = editor.getParam('cmsItemID');
    var templateID = editor.getParam('cmsTemplateID');
    var isRTF = editor.getParam('isRTF');
    
    var dialogPath = this._url + '/pagelet-new.jsp?folderID=' + folderID;
    if (itemID) {
      dialogPath += "&itemID=" + itemID;
    }
    if (templateID) {
      dialogPath += "&templateID=" + templateID;
    }
    if (isRTF) {
      dialogPath += "&isRTF=" + isRTF;
    }
    var bm = editor.selection.getBookmark();
    
    var callback = {
      authenticate : true,

      process : function(o) {  
        if (MceUtils.isIE8()) {
          //In IE8 if the dialog is still on the screen, the selection of the editor doesn't work correctly.
          YAHOO.convio.dialog._hide();
        }         
        editor.selection.moveToBookmark(bm);
        var response = null;
        try {
          response = YAHOO.lang.JSON.parse(o.responseText);
        } catch (e) {
          alert("Failed to create component.");
          return;
        }

        if (! response.type) {
          alert("Failed to create component: missing component type.");
          return;
        }

        if (response.error) {
          // An error occurred trying to create a new pagelet.
          var msg = "Failed to insert " + response.type.label + " component.";
          YAHOO.convio.dialog.showError({msg : msg, detail : response.error});
          return;
        }

        var pageletTag = response.type.key + "-" + response.id;
        var content = response.content;

        var ed = tinyMCE.activeEditor;
        var selection = ed.selection;
        

        var pageletEl = ed.dom.create('div', {id : pageletTag}, content);
        pageletEl.className = 'templateComponent';

        // Do styling/alignment.
        var styleFloat = response.float;
        if (styleFloat == null || styleFloat == "none") {
          ed.dom.setStyle(pageletEl, "float", "");
        } else {
          ed.dom.setStyle(pageletEl, "float", styleFloat);
        }

        pageletEl.style.display = "inline";
        pageletEl.style.width = "auto"; 
        MceUtils.setStyleProperty(pageletEl, "marginRight", response.marginRight);
        MceUtils.setStyleProperty(pageletEl, "marginLeft", response.marginLeft);
        MceUtils.setStyleProperty(pageletEl, "marginTop", response.marginTop);
        MceUtils.setStyleProperty(pageletEl, "marginBottom", response.marginBottom);
        MceUtils.setStyleProperty(pageletEl, "width", response.width, response.widthUnits);

        var pageletType = {
          name: response.type.key,
          label: response.type.label,
          adminDialog: response.type.adminPath,
          adminDialogType: response.type.adminDialogType
        };

        ed.execCommand('pageletInsert', pageletEl, pageletType, pageletEl, {skip_undo : true});
      }
    };
    YAHOO.convio.dialog.open(dialogPath, callback);
  },

  /**
   * Pops open a modal dialog to configure a pagelet (if such a configuration dialog exists).
   * After the dialog is closed, the pagelet preview content is reloaded.
   *
   * @param editor The editor
   * @param node   The pagelet node
   */
  showAdminDialog : function(editor, node) {
    if (! node) {
      node = editor.selection.getNode();
    }

    var pageletNode = MceUtils.findPageletNode(editor, node);
    if (pageletNode == null) {
      return;
    }

    var pageletTag = pageletNode.id;
    if (! pageletTag) {
      return;
    }

    var pageletData = MceUtils.parsePageletTag(pageletTag);
    var pageletID = pageletData.id;
    var pageletTypeKey = pageletData.key;

    var pageletType = this._pageletTypeArray[pageletTypeKey];

    var adminDialog = (pageletType != null ? pageletType.adminDialog : null);
    var adminDialogType = (pageletType != null ? pageletType.adminDialogType : null);
    var configScript = (pageletType != null ? pageletType.configScript : null);
    if (adminDialog == null && configScript == null) {
      return;
    }

    // If config script exists, call it instead of popping open the admin dialog.
    if (configScript != null) {
      // Custom config script.

      var pageletArg = {
        id : pageletID,
        node : pageletNode
      };

      var configFn = new Function("pagelet", configScript);
      configFn.call(this, pageletArg);

    } else {
      // Static admin dialog.

      var folderID = editor.getParam('cmsFolderID');
      var typeID = editor.getParam('cmsTypeID');

      if (pageletID == null) {
        // Configure the default version of the pagelet.

        adminDialog = "/admin/pagelet/default.jsp?folderID=" + folderID;
        adminDialog += "&pageletType=" + escape(pageletTypeKey);

      } else {

        if (! adminDialog.match(/^(\/|https?:)/)) {
          adminDialog = this._url + adminDialog;
        }
        adminDialog += adminDialog.match(/\?/) ? "&" : "?";
        adminDialog += "folderID=" + folderID + "&pageletID=" + pageletID;

        if (typeID != null) {
          adminDialog += "&typeID=" + typeID;
        }
      }
      
      var pageletWidth = 440;
      if (pageletTypeKey == "include") {
    	  pageletWidth = 840;
      }

      if (adminDialogType == "yui") {
        // YUI-style admin dialog.

        YAHOO.convio.dialog.open(adminDialog, {
          process: function() {
            // Pagelet config changes -- even though no HTML may have changed -- count
            // as modifications.
            editor.execCommand('cmsSetModified', false, {skip_undo: true});
            editor.execCommand('pageletPreview', pageletNode, pageletNode, {skip_undo: true});
          },
          authenticate: true,
          argument: {}
        });

      } else if (adminDialogType == "window") {
        // window popup admin dialog.

        YAHOO.convio.dialog.popup({
          url : adminDialog,
          width : pageletWidth,
          height : 480,
          authenticate : true,
          inline : true
        }, {}, function(returnValue) {
          // On success, reload the pagelet preview content.
          if (returnValue) {
            // Pagelet config changes -- even though no HTML may have changed -- count
            // as modifications.
            editor.execCommand('cmsSetModified', false, {skip_undo : true});

            editor.execCommand('pageletPreview', pageletNode, pageletNode, {skip_undo : true});
          }
        });
      } else {
        alert("Unrecognized admin dialog type: " + adminDialogType);
        return;
      }
    }
  },

  /**
   * Pops open a modal dialog to configure a pagelet's layout and style.
   * After the dialog is closed, the pagelet preview content is reloaded.
   *
   * @param editor The editor
   */
  showLayoutDialog: function(n) {
    var editor = tinyMCE.activeEditor;

    if (! n || ! MceUtils.isPageletNode(n)) {
      return;
    }

    var pageletTag = n.id;
    if (! pageletTag) {
      return;
    }

    var pageletData = MceUtils.parsePageletTag(pageletTag);
    var pageletID = pageletData.id;
      
    var dialogPath = null;
    if (pageletID != null) {
      dialogPath = this._url + "/pagelet-layout.jsp?pageletID=" + pageletID;
    } else {
      // default pagelet    
      dialogPath = this._url + "/pagelet-layout.jsp?pageletTag=" + pageletTag ;
    }
    var callback = {
      authenticate : true,

      init: function(o) {
        var _loadStyleProperty = function(property, units) {
          var re = /(\d+)(%|px)?/;
          var arr = re.exec(n.style[property]);
          if (arr) {
            setValue("pageletLayoutForm", property, RegExp.$1);
            if (units) {
              setValue("pageletLayoutForm", units, RegExp.$2);
            }
          }
        };

        var styleFloat = editor.dom.getStyle(n, 'float');
        if (styleFloat) {
          setValue("pageletLayoutForm", "float", styleFloat);
        }

        _loadStyleProperty("marginRight");
        _loadStyleProperty("marginLeft");
        _loadStyleProperty("marginTop");
        _loadStyleProperty("marginBottom");

        _loadStyleProperty("width", "widthUnits");
      },

      process: function(o) {
        var _applyStyleProperty = function(property, units) {
          var value = getValue("pageletLayoutForm", property);
          if (isNaN(value) || value < 1) {

            editor.dom.setStyle(n, property, "");
            //YAHOO.util.Dom.setStyle(pageletNode, property, "");
            //pageletNode.style.removeAttribute(property);
            return;
          }
          if (units) {
            value += getValue("pageletLayoutForm", units);
          }

          editor.dom.setStyle(n, property, value);
        };

        var float = getValue("pageletLayoutForm", "float");
        if (float == "none") {
              editor.dom.setStyle(n, "float", '');
        } else {
          editor.dom.setStyle(n, "float", float);
        }

        _applyStyleProperty("marginRight");
        _applyStyleProperty("marginLeft");
        _applyStyleProperty("marginTop");
        _applyStyleProperty("marginBottom");
        _applyStyleProperty("width", "widthUnits");

        editor.undoManager.add();

        // On success, reload the pagelet preview content.
        editor.execCommand('pageletPreview', n, n, {skip_undo : true});
      }
    };

    YAHOO.convio.dialog.open(dialogPath, callback);
  },

  /**
   * Loads the preview content for a pagelet node, clearing any previously cached content.
   *
   * @param editor The editor
   * @param node   The DOM node
   */
  preview : function(editor, node) {
    var pageletNode = MceUtils.findPageletNode(editor, node);
    if (pageletNode == null) {
      return;
    }

    // Clears the cached preview content for the pagelet.
    this._pageletSrcArray[pageletNode.id] = null;

    this._expandPreviewContent(editor);
  },

  /**
   * Inserts a pagelet node at the current selection.
   *
   * @param editor The editor
   * @param node   The pagelet node
   * @param type   The pagelet type
   */
  insert : function(editor, node, type) {
    if (! MceUtils.isPageletNode(node)) {
      return;
    }

    // Set the node non-editable.
    editor.execCommand('noneditableSetNoneditable', false, node, {skip_undo : true});

    MceUtils.insertAtSelection(editor, node);

    // Some components come with special editor configuration.
    // Register and remove the editor configuration.
    var configScript = null;
    var editorConfigDiv = editor.dom.get("editorConfig");
    if (editorConfigDiv
        && YAHOO.util.Dom.hasClass(editorConfigDiv, "editorConfig-" + type.name)) {
      configScript = tinymce.trim(editorConfigDiv.firstChild.nodeValue);
      CmsXBrowser.removeNode(editorConfigDiv,true);
    }
    if (configScript) {
      type.configScript = configScript;
    }

    // Post-process preview contents.
    this._cleanupPreviewContent(node);

    // This may be the first instance of this pagelet type. Register its admin dialog.
    this._registerPageletType(type);

    // Expand preview content.
    editor.execCommand('pageletPreview', node, node, {skip_undo : true});

    if (type.adminDialog != null || type.configScript != null) {
      editor.execCommand('pageletShowAdminDialog', node, node, {skip_undo : true});
    }
  },

  /**
   * Adds pagelet-specific function to the context menu.
   *
   * @param node the pagelet node
   * @param menu the context menu
   */
  initContextMenu: function(node, menu) {
    if (! MceUtils.isPageletNode(node)) {
      return;
    }

    var th = this;
    var ed = tinyMCE.activeEditor;

    var pageletData = MceUtils.parsePageletTag(node.id);
    var pageletTypeKey = pageletData.key;
    var pageletType = this._pageletTypeArray[pageletTypeKey];

    var typeLabel = pageletType.label;
    if (! typeLabel) {
      typeLabel = 'Component';
    }

    MceUtils.selectNonEditable(ed, node);

    // Image pagelets use the image plugin's context menus.
    if (pageletTypeKey != 'image') {
      menu.addSeparator();
      menu.add({title: 'Component Style and Layout...', 
                onclick: function() {
                  th.showLayoutDialog(node);
                }});

      if (pageletType.adminDialog != null || pageletType.configScript != null) {
        menu.add({
            title : 'Manage ' + typeLabel + '...', 
            ui : true,
            onclick : function() {
              ed.execCommand('pageletShowAdminDialog', node, node, {skip_undo : true});
            }
          });
      }
    }
  },

  /**
   * Callback when the editor is initialized.
   */
  handleEditorInit: function(editor) {
    // Styles for visual aids.
    if (YAHOO.env.ua.ie > 0 && YAHOO.env.ua.ie < 9) {
      editor.dom.loadCSS(this._url + '/pagelet.css');
    } else {
      editor.dom.loadCSS(this._url + '/pagelet-gecko.css');
    }
  },

  /**
   * Callback when the editor contents is clicked.
   */
  handleOnClick : function(editor, event) {
    // Prevent clicking of links within a pagelet block.
    var pageletNode = MceUtils.findPageletNode(editor, event.target);
    if (pageletNode != null) {


      // Prevent the default browser behavior for left-clicks,
      // but allow clicks to activate plugin events.
      if (event.button == 0) {
        tinymce.dom.Event.prevent(event);
      }

      // Select the pagelet node.
      MceUtils.selectNonEditable(editor, pageletNode);
    }

    return true;
  },

  /**
   * Callback when a key is pressed within the editor.
   */
  handleKeyDown : function(editor, event) {

    if ((tinymce.isMac ? event.metaKey : event.ctrlKey)) {
      // Ctrl- event.

      switch (event.keyCode) {
      case 67: // Copy
          if (MceUtils.copyNonEditable(editor, 'templateComponent')) {
            tinymce.dom.Event.cancel(event);
            this._keyToCancel = event.keyCode;
          }
        break;

      case 88: // Cut.
        if (MceUtils.cutNonEditable(editor, 'templateComponent')) {
          tinymce.dom.Event.cancel(event);
          this._keyToCancel = event.keyCode;
        }
        break;
        
      default:
        // Ignore key press.
        return;
      }


    } else {
      // Non-ctrl events.

      switch (event.keyCode) {
      case 8:  // Backspace
      case 46: // Delete.
        if (MceUtils.cutNonEditable(editor, 'templateComponent')) {
          tinymce.dom.Event.cancel(event);
          this._keyToCancel = event.keyCode;
          return false; // Cancel the delete key press event.
        }
        break;

      default:
        // Ignore key press.
        return;
      }
    }
  },

  /**
   * keyPress events come after keyDown events for the same keyboard action.
   * When a keyboard action needs to be cancelled, it needs to be cancelled in
   * each event handler.
   */
  handleKeyPress : function(editor, event) {

    var key = event.keyCode;
    var rc = (this._keyToCancel == key) ? tinymce.dom.Event.cancel(event) : true;
    this._keyToCancel = null;

    return rc;
  },

  /**
   * This event gets executed when visual representation for hidden elements are
   * toggled on or off. This enables you to show or hide hidden elements inside
   * the editor in your plugin, for example hidden tables get dotted borders, etc.
   */
  handleVisualAid : function(editor, node, state) {
    this._doVisualAid = (state ? true : false);
    this._setVisualAid(editor, node);
  },

  /**
   * Adds or removes visual aids from a pagelet node.
   */
  _setVisualAid : function(editor, node) {
    var dom = editor.dom;
    var th = this;

    // Toggles visual aid class for a single node.
    var toggleVA = function(n) {
      if (th._doVisualAid) {
        dom.addClass(n, 'mceCmsPageletVA');
      } else {
        dom.removeClass(n, 'mceCmsPageletVA');
      }
    };

    // Apply above function to this and all child nodes.
    MceUtils.visitPageletNodes(node, this, toggleVA);
  },

  /**
   * This event gets executed when the getContent method is called but before
   * the contents gets serialized and returned.
   */
  handleBeforeGetContent : function(editor, context) {
    //alert("++++ pagelet.beforeGetContent: context=" + context.format + "; content=\n" + editor.getBody().innerHTML);

    if (context.format == 'html') {
      this._collapsePreviewContent(editor);
    }
  },

  /**
   * This event gets executed when the getContent method is called and after the
   * contents have been serialized.
   * This enables you to change the contents before it gets returned similar to
   * the onPostProcess event but this only occurs when getContent gets called.
   */
  handleAfterGetContent : function(editor, context) {
    //alert("++++ pagelet.afterGetContent: context=" + context.format + "; content=\n" + editor.getBody().innerHTML);

    if (context.format == 'html') {
      this._expandPreviewContent(editor);
    }
  },

  /**
   * This event gets executed when the setContent method is called but before
   * the contents gets serialized and placed in the editor. This event is
   * useful when you want to change for example BBCode into HTML code before
   * setting it to the document DOM.
   */
  handleBeforeSetContent : function(editor, context) {},

  /**
   * This event gets executed when the setContent method is called and after the
   * serialization with preProcess and postProcess has been completed.
   * This event enables you to change the contents before it gets placed in the
   * editor this is very similar to the onPostProcess event but this only occurs
   * when the setContent method is called.
   */
  handleAfterSetContent : function(editor, context) {
    //alert("++++ pagelet.afterSetContent: content=\n" + editor.getBody().innerHTML);
    this._expandPreviewContent(editor);
  },

  /**
   * Finds the selected pagelet node. If multiple pagelet nodes are selected or additional
   * content outside the pagelet node is selected, then this returns null.
   *
   * @return the pagelet node or null
   */
  _findSelectedPageletNode : function(editor) {
    var pageletNode = MceUtils.findPageletNode(editor, editor.selection.getNode());
    if (tinymce.isIE) {
      if (pageletNode != null && 
          pageletNode == MceUtils.findPageletNode(editor, editor.selection.getStart()) &&
          pageletNode == MceUtils.findPageletNode(editor, editor.selection.getEnd())) {
        return pageletNode;
      }
      return null;
    } else {
      //On FIREFOX, getStart and getEnd don't really work right, so just return it, so it doesn't get 
      //confused.  IF this causes more bugs later, fix those as necessary.
      return pageletNode;
    }  
      
  },

  /**
   * Registers a pagelet type including admin dialog or custom config.
   *
   * @param type The pagelet type object { name, label, adminDialog, configScript }
   *        adminDialog values: null for none, (string) path, (function) custom function
   */
  _registerPageletType : function(type) {
    if (this._pageletTypeArray[type.name] == null) {
      // Only register once per type.
      this._pageletTypeArray[type.name] = {
        label: type.label,
        adminDialog: type.adminDialog,
        adminDialogType: type.adminDialogType,
        configScript: type.configScript
      };
    }
  },

  /**
   * Initializes all nodes in the tree rooted by the given node for preview content.
   * This can be called repeatedly (each time content is changed, for example).
   * The specified node might be replaced.
   */
  _expandPreviewContent : function(editor) {
    //alert("++++ expanding preview content...");

    var node = editor.getBody();

    // Expand all pagelet preview content.
    var expandFn = function(n) {

      // Replace <t:include> with <div class="templateComponent"> equivalent.
      n = this._replaceIncludeTag(editor, n);

      // Split inline parent nodes before populating preview content.
      MceUtils.splitInlineParents(editor, n);

      this._setVisualAid(editor, n);

      var innerhtml = null;
      try {
        if (this._pageletSrcArray[n.id] != null) {
          innerhtml = this._pageletSrcArray[n.id].innerHTML;
        }
      } catch (ex) {}

      if (innerhtml != null) {
        // Replace the existing source.
        editor.dom.setHTML(n, innerhtml);

        // Prevent direct edits to the pagelet block.
        editor.execCommand('noneditableSetNoneditable', false, n, {skip_undo : true});

      } else {
        // Load the pagelet source via AJAX call.

        if (! n.innerHTML) {
          editor.dom.setHTML(n, 'loading...');
        }

        var previewUrl = this._url + '/pagelet-preview.jsp';
        previewUrl += '?folderID=' + editor.getParam("cmsFolderID");
        var itemID = editor.getParam("cmsItemID");
        if (itemID) {
          previewUrl += '&itemID=' + itemID;
        }
        previewUrl += '&pageletTag=' + n.id;

        var srcArray = this._pageletSrcArray;

        var th = this;
        var callback = {
          success : function(o) {
            var response = null;
            try {
              response = YAHOO.lang.JSON.parse(o.responseText);
            } catch (e) {
              alert("Failed to load component." + e);
              return;
            }
          
            if (! response.type) {
              alert("Failed to load component: missing component type.");
              return;
            }

            if (response.error) {
              // An error occurred trying to preview the pagelet.
              // We still need to register the pagelet and show an error placeholder.

              var msg = "Failed to load " + response.type.label + " component.";
              YAHOO.convio.dialog.showError({msg : msg, detail : response.error});

              // Set error placeholder.
              editor.dom.setHTML(n, msg);

              // Prevent direct edits to the pagelet block.
              editor.execCommand('noneditableSetNoneditable', false, n, {skip_undo : true});

              // Enable/disable visual aid.
              th._setVisualAid(editor, n);

              var pageletType = {
                name: response.type.key,
                label: response.type.label,
                adminDialog: response.type.adminPath,
                adminDialogType: response.type.adminDialogType,
                configScript: null
              };

              th._registerPageletType(pageletType);

              return;
            }

            // No errors.
            var content = response.content;

            // Populate the current pagelet node with preview content.
            editor.dom.setHTML(n, content);

            // Some components come with special editor configuration.
            // Register and remove the editor configuration.
            var configScript = null;
            var editorConfigDiv = editor.dom.get("editorConfig");
              if (editorConfigDiv
                  && YAHOO.util.Dom.hasClass(editorConfigDiv, "editorConfig-" + response.type.key)) {
              // Process config script.
              configScript = tinymce.trim(editorConfigDiv.firstChild.nodeValue);
              CmsXBrowser.removeNode(editorConfigDiv,true);
            }

            // Post-process preview contents.
            th._cleanupPreviewContent(n);

            // Prevent direct edits to the pagelet block.
            editor.execCommand('noneditableSetNoneditable', false, n, {skip_undo : true});

            // Enable/disable visual aid.
            th._setVisualAid(editor, n);

            // Clone the current node and push it into the preview stack.
            var newNode = CmsXBrowser.cloneNode(n);
            srcArray[newNode.id] = newNode;

            var pageletType = {
              name: response.type.key,
              label: response.type.label,
              adminDialog: response.type.adminPath,
              adminDialogType: response.type.adminDialogType,
              configScript: configScript
            };

            th._registerPageletType(pageletType);
          }, 

          failure : function(o) {
            YAHOO.convio.dialog.showError({msg : "Failed to load component", detail : o.responseText});
          }, 

          timeout : 10000,
          cache : false,
          argument : [] 
        };

        YAHOO.util.Connect.asyncRequest('GET', previewUrl, callback);

      }
    };

    MceUtils.visitPageletNodes(node, this, expandFn);
  },

  /**
   * Collapse the DOM so that it does not contain any preview content.
   */
  _collapsePreviewContent : function(editor) {

    var node = editor.getBody();

    // Collapse all pagelet preview content.
    var collapseFn = function(n) {

      // Copy/remove the preview contents and save it.
      var newNode = CmsXBrowser.cloneNode(n);
      this._pageletSrcArray[newNode.id] = newNode;

      editor.dom.setHTML(n, '');

      // Disable visual aid class.
      editor.dom.removeClass(n, 'mceCmsPageletVA');

      // Disable noneditable class
      editor.dom.removeClass(n, 'mceNonEditable');
    };
    MceUtils.visitPageletNodes(node, this, collapseFn);
  },

  /**
   * Cleans up preview content.
   *
   * @param node The pagelet node.
   */
  _cleanupPreviewContent : function(node) {

    var removeFn = function(n) {
      // BZ 43416 - Remove the invisible nodes (they cause problems in IE with editor selections).
      // Invisible nodes won't show up in preview anyways.
      if (n) {
        if (n.style && n.style.display == "none") {
          CmsXBrowser.removeNode(n,true);
        }

        // BZ 43493 - Remove onclick handlers from preview content, which may cause JS runtime errors.
        if (n.onclick) {
          n.onclick = null;
        }
      }
    };
    tinymce.walk(node, removeFn, 'childNodes', this);

    // Make sure empty preview content is still displayed.
    if (this._isEmpty(node)) {
      node.innerHTML = '&nbsp;' + node.innerHTML;
    }
  },

  /**
   * Indicates whether a node is empty or not.
   *
   * @param node The node
   * @return true if the node is empty, otherwise false
   */
  _isEmpty : function(node) {
    if (! node) {
      alert("node is required");
    }

    if (! node.innerHTML || /^\s*$/.test(node.innerHTML)) {
      return true;
    }

    if (node.childNodes) {

      var nonContent = true;

      for (var i=0; i<node.childNodes.length; i++) {
        var child = node.childNodes[i];

        var nodeType = child.nodeType;
        var nodeName = child.nodeName.toUpperCase();

        if (nodeType == 1) {
          if (nodeName != 'STYLE' && nodeName != 'MCE:STYLE') {
            // Ignore style rules if the rest of the content is empty.
            nonContent = false;
            break;
          }
        } else if (nodeType == 3) {
          var isWhiteSpace = ('' == tinymce.trim(child.nodeValue));
          if (! isWhiteSpace) {
            // Ignore whitespace if the rest of the content is empty.
            nonContent = false;
            break;
          }
        } else if (nodeType == 8) {
          // Ignore comments.
        } else {
          nonContent = false;
          break;
        }
      }

      if (nonContent) {
        return true;
      }
    }

    return false;
  },

  /**
   * Replaces <t:include> with <div class="templateComponent"> equivalent.
   */
  _replaceIncludeTag : function(editor, node) {
    if (node.nodeName.toLowerCase() == 'include' && node.id) {
      var pageletEl = editor.dom.create('div', {id : node.id}, null);
      pageletEl.className = 'templateComponent';
      editor.dom.replace(pageletEl, node, true);
      return pageletEl;
    }
    return node;
  }

};

// Register plugin
tinymce.PluginManager.requireLangPack('cms_pagelet');
tinymce.create('tinymce.plugins.PageletPlugin', CmsPageletPlugin);
tinymce.PluginManager.add('cms_pagelet', tinymce.plugins.PageletPlugin);
